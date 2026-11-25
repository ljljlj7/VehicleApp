// Auto-Mobile web server.
// It serves the page in /public and answers the page's data requests under /api.
const express = require("express");
const fs = require("fs");
const path = require("path");
const { check } = require("./advisor");
const { askAI, isConfigured } = require("./ai");
const minder = require("./minder");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data", "db.json");
const SAMPLE_FILE = path.join(__dirname, "data", "db-sample.json"); // the starting sample data, for "Reset demo"
const KB = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "knowledge.json"), "utf8"));

// Read and write the saved data (made-up sample data only, see README).
function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2) + "\n");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Services the user can pick when adding history, in two groups:
// "scheduled" (Toyota's schedule: logging one updates the reminders) and
// "repair" (known repairs and "Other": kept in the history only).
// Keywords let the page suggest a listed service when "Other" text matches one.
function serviceOptions(vehicle) {
  const schedule = minder.scheduleFor(vehicle.modelId);
  const scheduled = schedule
    ? schedule.items.filter((i) => !i.partOf).map((i) => ({ id: i.id, name: i.name, group: "scheduled", keywords: i.keywords || [] }))
    : [];
  const repairs = KB.services.filter((s) => !scheduled.some((o) => o.id === s.id))
    .map((s) => ({ id: s.id, name: s.name, group: "repair", keywords: s.keywords || [] }));
  return [...scheduled, ...repairs, { id: "other", name: "Other (describe it below)", group: "repair", keywords: [] }];
}

const STATUSES = ["done", "recommended", "declined"];

// Everything the main screen shows: the car, what is due, the history.
function garageView(db) {
  const { car, due, timeline, lastService } = minder.garageStatus(db.vehicle, db.car, db.history);
  return {
    vehicle: { ...db.vehicle, mileageKm: car.mileageKm },
    car,
    due,
    timeline,
    lastService,
    history: db.history,
    serviceOptions: serviceOptions(db.vehicle),
  };
}

// Save a mileage reading for the car's (simulated) today, replacing one already saved for that day.
function saveReading(db, km) {
  db.car.readings = db.car.readings.filter((r) => r.date !== db.car.today);
  db.car.readings.push({ date: db.car.today, km });
  db.vehicle.mileageKm = km;
}

// The page asks for the demo owner's car, what is due and the service history here.
app.get("/api/garage", (req, res) => {
  res.json(garageView(readDb()));
});

// Demo button: the simulated car drives a normal week. The date moves 7 days forward
// and the mileage goes up by the car's usual weekly distance.
app.post("/api/car/simulate-week", (req, res) => {
  const db = readDb();
  const now = minder.latestReading(db.car.readings);
  const perDay = minder.kmPerDay(db.car.readings, db.car.today) || 30;
  db.car.today = minder.addDays(db.car.today, 7);
  saveReading(db, Math.round(now.km + perDay * 7));
  writeDb(db);
  res.json(garageView(db));
});

// Safety words we always flag, even if the AI forgets to.
const SAFETY_WORDS = /\b(brake|brakes|tire|tires|tyre|steering|suspension|airbag|ball joint|leak)/i;
const SAFETY_NOTE = "Safety item: if you are unsure, have a qualified technician inspect it before driving further.";

// The page sends the user's question here. We try the AI first; if it is not set up,
// fails, times out or gives an unusable answer, we fall back to the built-in rules (M1).
app.post("/api/check", async (req, res) => {
  const db = readDb();
  const garage = { vehicle: db.vehicle, history: db.history, car: db.car };
  const question = String((req.body && req.body.question) || "").trim();
  if (!question) {
    return res.status(400).json({ error: "Please type your question or paste the quote first." });
  }
  if (question.length > 4000) {
    return res.status(400).json({ error: "That is too long. Please keep it under 4,000 characters." });
  }

  if (!isConfigured()) {
    return res.json({ ...check(question, garage), source: "rules", notice: "AI is not set up, so this is a basic answer from built-in sample data." });
  }

  try {
    const answer = await askAI(question, garage);
    // Guardrails on the AI's answer.
    if (answer.kind === "history") {
      answer.history = {
        done: db.history.filter((h) => h.status === "done"),
        recommended: db.history.filter((h) => h.status === "recommended"),
      };
    }
    if (!answer.safety && SAFETY_WORDS.test(String(question))) answer.safety = SAFETY_NOTE;
    if (answer.services && !answer.sources.length) {
      answer.notice = "No sources were found for this answer. Treat it with caution and check with a professional.";
    }
    res.json({ ...answer, source: "ai" });
  } catch (err) {
    console.error("AI failed, using built-in rules:", err.message);
    res.json({ ...check(question, garage), source: "rules", notice: "The AI is unavailable right now, so this is a basic answer from built-in sample data." });
  }
});

// --- Checking what the user typed ------------------------------------------

// Mileage must be whole numbers only (commas and spaces allowed, e.g. "7,500").
function parseKm(value) {
  const text = String(value ?? "").trim().replace(/[,\s]/g, "");
  if (!/^\d+$/.test(text)) return { error: "Mileage must be a number in km, using digits only (for example 7500)." };
  const km = Number(text);
  if (km > 1000000) return { error: "That mileage looks too high. Please check it (in km)." };
  return { km };
}

// A history item: the service is picked from the list (so the minder can count it),
// with an optional description; "Other" needs a description.
// When editing (existing is given), the text field holds the whole description.
function parseItem(body, db, existing = null) {
  const b = body || {};
  const option = serviceOptions(db.vehicle).find((o) => o.id === b.service);
  if (!option) return { error: "Please pick the service from the list." };
  const details = String(b.item || "").trim();
  if (option.id === "other" && !details) return { error: "Please describe the service or repair." };
  const item = existing ? details || option.name
    : option.id === "other" ? details : details ? `${option.name}: ${details}` : option.name;
  if (item.length > 120) return { error: "Please keep the description under 120 characters." };

  const date = String(b.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return { error: "Please pick the date of the service." };
  // The car's clock is simulated, so "the future" means after the car's today.
  if (date > db.car.today) return { error: "The date cannot be in the future." };

  const mileage = parseKm(b.mileageKm);
  if (mileage.error) return mileage;

  const costText = String(b.cost ?? "").trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(costText)) return { error: "Cost must be a number in dollars, for example 94.50 (use 0 if it was free)." };

  if (!STATUSES.includes(b.status)) return { error: "Please choose whether the work was done, recommended or declined." };

  const shop = String(b.shop || "").trim().slice(0, 80) || "Not given";
  // An entry can cover several services (e.g. "oil change, tire rotation"): keep them when editing
  // unless the user picked a different main service.
  const services = option.id === "other" ? []
    : existing && (existing.services || [])[0] === option.id ? existing.services : [option.id];
  return { entry: { date, mileageKm: mileage.km, item, services, status: b.status, cost: Number(costText), shop } };
}

// Correct the car's current mileage by hand (saved as today's reading, so it survives a reload).
app.put("/api/vehicle/mileage", (req, res) => {
  const { km, error } = parseKm(req.body && req.body.mileageKm);
  if (error) return res.status(400).json({ error });
  const db = readDb();
  // An odometer never goes backwards: compare with the last reading before today.
  const earlier = db.car.readings.filter((r) => r.date < db.car.today).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (earlier && km < earlier.km) {
    return res.status(400).json({ error: `Mileage cannot be lower than the last reading (${minder.fmtKm(earlier.km)} on ${minder.fmtDate(earlier.date)}).` });
  }
  saveReading(db, km);
  writeDb(db);
  res.json(garageView(db));
});

// Add an item to the service history (saved, so it is still there after a reload).
app.post("/api/history", (req, res) => {
  const db = readDb();
  const { entry, error } = parseItem(req.body, db);
  if (error) return res.status(400).json({ error });
  const id = db.history.reduce((max, h) => Math.max(max, h.id), 0) + 1;
  db.history.push({ id, ...entry });
  writeDb(db);
  res.status(201).json({ entry: { id, ...entry } });
});

// Edit a history item (also used for "Mark done" and "Decline" on a recommendation).
app.put("/api/history/:id", (req, res) => {
  const db = readDb();
  const index = db.history.findIndex((h) => String(h.id) === req.params.id);
  if (index < 0) return res.status(404).json({ error: "That service is no longer in your history. Please reload the page." });
  const { entry, error } = parseItem(req.body, db, db.history[index]);
  if (error) return res.status(400).json({ error });
  db.history[index] = { id: db.history[index].id, ...entry };
  writeDb(db);
  res.json({ entry: db.history[index] });
});

// Delete a history item.
app.delete("/api/history/:id", (req, res) => {
  const db = readDb();
  const before = db.history.length;
  db.history = db.history.filter((h) => String(h.id) !== req.params.id);
  if (db.history.length === before) return res.status(404).json({ error: "That service is no longer in your history. Please reload the page." });
  writeDb(db);
  res.json({ ok: true });
});

// "Reset demo": put the sample car, readings and history back to the start (for testing and demos).
// Problem reports are kept: they are feedback for the developers, not test data.
app.post("/api/reset", (req, res) => {
  const sample = JSON.parse(fs.readFileSync(SAMPLE_FILE, "utf8"));
  sample.reports = readDb().reports;
  writeDb(sample);
  res.json(garageView(sample));
});

// "Report a problem" with an answer: saved for the developers to review.
app.post("/api/report", (req, res) => {
  const { question, answer, comment } = req.body || {};
  const db = readDb();
  db.reports.push({
    date: new Date().toISOString(),
    question: String(question || "").slice(0, 2000),
    comment: String(comment || "").slice(0, 2000),
    answer,
  });
  writeDb(db);
  res.json({ ok: true });
});

// Anything unexpected (for example a broken request) gets a plain message, not a crash.
app.use((err, req, res, next) => {
  console.error("Request failed:", err.message);
  res.status(err.status && err.status < 500 ? err.status : 500)
    .json({ error: "Something went wrong on our side. Please try again." });
});

app.listen(PORT, () => {
  console.log(`Auto-Mobile is running: open http://localhost:${PORT}`);
  console.log(isConfigured() ? "AI: on" : "AI: off (no ANTHROPIC_API_KEY in .env), using built-in rules");
});
