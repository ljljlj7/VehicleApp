// Auto-Mobile web server.
// It serves the page in /public and answers the page's data requests under /api.
const express = require("express");
const fs = require("fs");
const path = require("path");
const { check } = require("./advisor");
const { askAI, isConfigured } = require("./ai");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data", "db.json");

// Read and write the saved data (made-up sample data only, see README).
function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2) + "\n");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// The page asks for the demo owner's vehicle and service history here.
app.get("/api/garage", (req, res) => {
  const db = readDb();
  res.json({ vehicle: db.vehicle, history: db.history });
});

// Safety words we always flag, even if the AI forgets to.
const SAFETY_WORDS = /\b(brake|brakes|tire|tires|tyre|steering|suspension|airbag|ball joint|leak)/i;
const SAFETY_NOTE = "Safety item: if you are unsure, have a qualified technician inspect it before driving further.";

// The page sends the user's question here. We try the AI first; if it is not set up,
// fails, times out or gives an unusable answer, we fall back to the built-in rules (M1).
app.post("/api/check", async (req, res) => {
  const db = readDb();
  const garage = { vehicle: db.vehicle, history: db.history };
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

function parseItem(body) {
  const b = body || {};
  const item = String(b.item || "").trim();
  if (!item) return { error: "Please describe the service or repair." };
  if (item.length > 120) return { error: "Please keep the description under 120 characters." };

  const date = String(b.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return { error: "Please pick the date of the service." };
  if (date > new Date().toISOString().slice(0, 10)) return { error: "The date cannot be in the future." };

  const mileage = parseKm(b.mileageKm);
  if (mileage.error) return mileage;

  const costText = String(b.cost ?? "").trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(costText)) return { error: "Cost must be a number in dollars, for example 94.50 (use 0 if it was free)." };

  if (!["done", "recommended"].includes(b.status)) return { error: "Please choose whether the work was done or only recommended." };

  const shop = String(b.shop || "").trim().slice(0, 80) || "Not given";
  return { entry: { date, mileageKm: mileage.km, item, status: b.status, cost: Number(costText), shop } };
}

// Update the vehicle's current mileage (saved, so it is still there after a reload).
app.put("/api/vehicle/mileage", (req, res) => {
  const { km, error } = parseKm(req.body && req.body.mileageKm);
  if (error) return res.status(400).json({ error });
  const db = readDb();
  db.vehicle.mileageKm = km;
  writeDb(db);
  res.json({ vehicle: db.vehicle });
});

// Add an item to the service history (saved, so it is still there after a reload).
app.post("/api/history", (req, res) => {
  const { entry, error } = parseItem(req.body);
  if (error) return res.status(400).json({ error });
  const db = readDb();
  const id = db.history.reduce((max, h) => Math.max(max, h.id), 0) + 1;
  db.history.push({ id, ...entry });
  writeDb(db);
  res.status(201).json({ entry: { id, ...entry } });
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
