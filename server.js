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
  const question = req.body && req.body.question;

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

app.listen(PORT, () => {
  console.log(`Auto-Mobile is running: open http://localhost:${PORT}`);
  console.log(isConfigured() ? "AI: on" : "AI: off (no ANTHROPIC_API_KEY in .env), using built-in rules");
});
