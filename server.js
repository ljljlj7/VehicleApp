// Auto-Mobile web server.
// It serves the page in /public and answers the page's data requests under /api.
const express = require("express");
const fs = require("fs");
const path = require("path");
const { check } = require("./advisor");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data", "db.json");

// Read the saved data (made-up sample data only, see README).
function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// The page asks for the demo owner's vehicle and service history here.
app.get("/api/garage", (req, res) => {
  const db = readDb();
  res.json({ vehicle: db.vehicle, history: db.history });
});

// The page sends the user's question here and gets back a structured answer.
app.post("/api/check", (req, res) => {
  const db = readDb();
  res.json(check(req.body && req.body.question, { vehicle: db.vehicle, history: db.history }));
});

app.listen(PORT, () => {
  console.log(`Auto-Mobile is running: open http://localhost:${PORT}`);
});
