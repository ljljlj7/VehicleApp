// Browser logic: load the sample vehicle and history, send questions to the
// server, and show the answer with follow-up choices.

const money = (n) => "$" + Number(n).toFixed(2);
const range = (r) => (r.low === r.high ? money(r.low) : `${money(r.low)} – ${money(r.high)}`);
const km = (n) => Number(n).toLocaleString("en-CA") + " km";

// Small helper to build elements safely (textContent avoids injecting HTML).
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children.filter((c) => c != null && c !== false));
  return node;
}

function linkList(links) {
  return el("ul", { className: "links" },
    ...links.map((l) => el("li", {}, el("a", { href: l.url, target: "_blank", rel: "noopener", textContent: l.label }))));
}

function plainList(items) {
  return el("ul", { className: "plain" }, ...items.map((t) => el("li", { textContent: t })));
}

// Build one history row.
function historyRow(entry) {
  return el("li", {},
    el("div", {},
      el("div", { textContent: entry.item }),
      el("div", { className: "meta", textContent: `${entry.date} · ${km(entry.mileageKm)} · ${entry.shop}` })),
    el("div", { className: "cost", textContent: money(entry.cost) }));
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

// --- Rendering an answer ---------------------------------------------------

const IMPORTANCE = { safety: "Safety critical", important: "Important", routine: "Routine" };

function serviceBlock(s) {
  const pastWork = s.history.length
    ? el("p", { className: "note", textContent:
        "In your history: " + s.history.map((h) => `${h.status === "done" ? "done" : "recommended"} ${h.date} at ${km(h.mileageKm)} (${money(h.cost)})`).join("; ") })
    : null;

  return el("div", { className: "service" },
    el("div", { className: "service-head" },
      el("strong", { textContent: s.name }),
      el("span", { className: `pill ${s.importance}`, textContent: IMPORTANCE[s.importance] })),
    el("p", { textContent: s.importanceNote }),
    s.timingNote && el("p", { className: "note", textContent: s.timingNote }),
    pastWork,
    el("dl", { className: "facts" },
      el("dt", { textContent: "Typical shop price" }), el("dd", { textContent: range(s.shopCost) }),
      el("dt", { textContent: "Parts if you DIY" }), el("dd", { textContent: range(s.partsCost) }),
      el("dt", { textContent: "DIY difficulty" }),
      el("dd", {},
        el("span", { className: "dots", textContent: "●".repeat(s.diy.level) + "○".repeat(5 - s.diy.level) }),
        ` ${s.diy.level}/5 · ${s.diy.label} · about ${s.diy.minutes} min`)));
}

// Step 6–7 of the main task: the user picks what extra help they want.
function followUpBlock(answer) {
  const panel = el("div", { className: "followup-panel" });

  const show = (kind) => {
    if (kind === "none") {
      panel.replaceChildren(el("p", { className: "note", textContent: "No problem. Nothing has been approved or booked; the decision is yours." }));
      return;
    }
    panel.replaceChildren(...answer.services.map((s) => el("div", { className: "service" },
      el("strong", { textContent: s.name }),
      ...(kind === "diy"
        ? [el("h4", { textContent: "Parts" }), plainList(s.parts),
           el("h4", { textContent: "Tools" }), plainList(s.tools),
           el("h4", { textContent: "Guides" }), linkList(s.guides)]
        : [el("p", { textContent: `Typical shop price ${range(s.shopCost)}; parts ${range(s.partsCost)}.` }),
           el("h4", { textContent: "Research pricing" }), linkList(s.pricing)]))));
  };

  const btn = (label, kind) => el("button", { type: "button", className: "secondary", textContent: label, onclick: () => show(kind) });

  return el("div", { className: "followup" },
    el("p", {}, el("strong", { textContent: answer.followUp })),
    el("div", { className: "choices" },
      btn("Parts & tools to DIY", "diy"),
      btn("Pricing research", "pricing"),
      btn("No thanks", "none")),
    panel);
}

function renderAnswer(a) {
  const parts = [];

  if (a.safety) parts.push(el("p", { className: "safety", role: "alert", textContent: a.safety }));
  if (a.vehicle) parts.push(el("p", { className: "meta", textContent:
    a.vehicle.label + (a.vehicle.mileageKm != null ? ` · ${km(a.vehicle.mileageKm)}` : "") }));
  parts.push(el("p", { textContent: a.message }));

  if (a.quote) {
    parts.push(el("div", { className: `verdict ${a.quote.verdict}` },
      el("strong", { textContent: `Quoted ${money(a.quote.quoted)} · typical ${range(a.quote)}` }),
      el("div", { textContent: a.quote.text })));
  } else if (a.typical) {
    parts.push(el("p", { className: "note", textContent: `No price given. Typical shop price: ${range(a.typical)}.` }));
  }

  if (a.services) parts.push(...a.services.map(serviceBlock), followUpBlock(a));

  if (a.schedule) parts.push(plainList(a.schedule.items));

  if (a.ask) parts.push(plainList(a.ask));

  if (a.history) {
    const list = (title, rows) => [el("h4", { textContent: title }),
      rows.length ? el("ul", { className: "history" }, ...rows.map(historyRow)) : el("p", { className: "note", textContent: "None on file." })];
    parts.push(...list("Confirmed work", a.history.done), ...list("Recommended, not done yet", a.history.recommended));
  }

  if (a.sources && a.sources.length) parts.push(el("h4", { textContent: "Sources" }), linkList(a.sources));
  parts.push(el("p", { className: "fine", textContent: a.disclaimer }));

  const box = document.getElementById("answer");
  box.replaceChildren(...parts);
  box.hidden = false;
}

document.getElementById("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = document.getElementById("question").value;
  const box = document.getElementById("answer");
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    renderAnswer(await res.json());
  } catch {
    box.textContent = "Could not reach the server. Is it running?";
    box.hidden = false;
  }
});

loadGarage().catch(() => {
  document.getElementById("vehicle-line").textContent =
    "Could not load your vehicle. Is the server running?";
});
