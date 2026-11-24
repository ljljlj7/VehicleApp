// Browser logic: load the sample vehicle and history, and show them on the page.

const money = (n) => "$" + Number(n).toFixed(2);
const km = (n) => Number(n).toLocaleString("en-CA") + " km";

// Build one history row safely (textContent avoids injecting HTML).
function historyRow(entry) {
  const li = document.createElement("li");
  const left = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = entry.item;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${entry.date} · ${km(entry.mileageKm)} · ${entry.shop}`;
  left.append(title, meta);

  const cost = document.createElement("div");
  cost.className = "cost";
  cost.textContent = money(entry.cost);

  li.append(left, cost);
  return li;
}

async function loadGarage() {
  const res = await fetch("/api/garage");
  const { vehicle, history } = await res.json();

  document.getElementById("vehicle-line").textContent =
    `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} · ${km(vehicle.mileageKm)}`;

  const done = document.getElementById("history-done");
  const recommended = document.getElementById("history-recommended");
  done.replaceChildren(...history.filter((h) => h.status === "done").map(historyRow));
  recommended.replaceChildren(...history.filter((h) => h.status === "recommended").map(historyRow));
}

// M0: the ask box is visible but answers arrive in milestone M1.
document.getElementById("ask-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const answer = document.getElementById("answer");
  answer.textContent = "Answers are coming in the next version (M1).";
  answer.hidden = false;
});

loadGarage().catch(() => {
  document.getElementById("vehicle-line").textContent =
    "Could not load your vehicle. Is the server running?";
});
