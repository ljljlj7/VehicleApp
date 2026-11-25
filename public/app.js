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

// One item in the "What's due" panel.
const DUE_LABEL = { overdue: "Overdue", soon: "Due now", later: "" };

function dueItem(item) {
  const source = el("a", { href: item.link.url, target: "_blank", rel: "noopener", textContent: item.link.label });
  return el("li", { className: `due ${item.status}` },
    el("div", { className: "service-head" },
      el("strong", { textContent: item.name }),
      DUE_LABEL[item.status] && el("span", { className: `pill ${item.status}`, textContent: DUE_LABEL[item.status] })),
    el("div", { textContent: item.text.when }),
    item.includes && item.status !== "later" && el("div", { className: "meta", textContent: `Includes: ${item.includes}` }),
    el("div", { className: "meta" }, [item.text.expected, item.text.last].filter(Boolean).join(" · "), " · ", source));
}

function renderGarage(garage) {
  const { vehicle, car, due } = garage;
  const history = [...garage.history].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  document.getElementById("vehicle-line").textContent =
    `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} · ${km(car.mileageKm)}`;
  document.getElementById("car-line").textContent =
    `Simulated date: ${car.todayLabel}` + (car.kmPerWeek != null ? ` · You drive about ${km(car.kmPerWeek)} a week` : "");
  document.getElementById("mileage").placeholder = `e.g. ${car.mileageKm}`;

  if (due) {
    const now = due.items.filter((i) => i.status !== "later");
    const next = due.items.filter((i) => i.status === "later").slice(0, 4);
    document.getElementById("due-now").replaceChildren(now.length
      ? el("ul", { className: "due-list" }, ...now.map(dueItem))
      : el("p", { className: "note", textContent: "Nothing is due right now." }));
    document.getElementById("due-next").replaceChildren(...next.map(dueItem));
    document.getElementById("due-source").textContent =
      "Each item is due at a distance or after a time, whichever comes first. Dates are estimates from how much you drive.";
  }

  const select = document.getElementById("service-select");
  const picked = select.value;
  select.replaceChildren(
    el("option", { value: "", textContent: "Pick a service…" }),
    ...garage.serviceOptions.map((o) => el("option", { value: o.id, textContent: o.name })));
  select.value = picked;

  const done = document.getElementById("history-done");
  const recommended = document.getElementById("history-recommended");
  done.replaceChildren(...history.filter((h) => h.status === "done").map(historyRow));
  recommended.replaceChildren(...history.filter((h) => h.status === "recommended").map(historyRow));
}

async function loadGarage() {
  const res = await fetch("/api/garage");
  renderGarage(await res.json());
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

// "Report a problem": lets the user flag a wrong answer for the developers.
function reportBlock(question, answer) {
  const box = el("div", { className: "report" });
  const open = el("button", { type: "button", className: "link-button", textContent: "Report a problem with this answer" });
  open.onclick = () => {
    const comment = el("textarea", { rows: 2, placeholder: "What looks wrong? (optional)" });
    const send = el("button", { type: "button", className: "secondary", textContent: "Send report" });
    send.onclick = async () => {
      send.disabled = true;
      try {
        await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, answer, comment: comment.value }),
        });
        box.replaceChildren(el("p", { className: "note", textContent: "Thanks. The report was saved for the developers to review." }));
      } catch {
        send.disabled = false;
        box.append(el("p", { className: "note", textContent: "Could not send the report. Please try again." }));
      }
    };
    box.replaceChildren(comment, send);
  };
  box.append(open);
  return box;
}

function renderAnswer(a, question) {
  const parts = [];

  parts.push(el("span", {
    className: `badge ${a.source}`,
    textContent: a.source === "ai" ? "AI answer" : "Basic answer",
  }));
  if (a.notice) parts.push(el("p", { className: "notice", textContent: a.notice }));
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
  parts.push(reportBlock(question, a));
  parts.push(el("p", { className: "fine", textContent: a.disclaimer }));

  const box = document.getElementById("answer");
  box.replaceChildren(...parts);
  box.hidden = false;
}

// --- Messages and saving -----------------------------------------------------

function showMsg(id, text, kind) {
  const msg = document.getElementById(id);
  msg.textContent = text;
  msg.className = `field-msg ${kind}`;
  msg.hidden = !text;
}

// Send JSON to the server. Always resolves to { ok, data } with a readable error.
async function sendJson(url, method, body) {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data: res.ok ? data : { error: data.error || "Something went wrong. Please try again." } };
  } catch {
    return { ok: false, data: { error: "Could not reach the server. Check your connection and try again." } };
  }
}

// Same rule as the server: whole numbers only, commas or spaces allowed.
const isKm = (text) => /^\d+$/.test(String(text).trim().replace(/[,\s]/g, ""));
const KM_MSG = "Mileage must be a number in km, using digits only (for example 7500).";

document.getElementById("mileage-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("mileage");
  if (!isKm(input.value)) {
    showMsg("mileage-msg", KM_MSG, "error");
    input.focus();
    input.select();
    return;
  }
  const { ok, data } = await sendJson("/api/vehicle/mileage", "PUT", { mileageKm: input.value });
  if (!ok) return showMsg("mileage-msg", data.error, "error");
  showMsg("mileage-msg", "Mileage saved.", "ok");
  renderGarage(data);
});

// Demo: the simulated car drives a week; mileage, date and the due list update.
document.getElementById("simulate-week").addEventListener("click", async (event) => {
  const button = event.target;
  button.disabled = true;
  const { ok, data } = await sendJson("/api/car/simulate-week", "POST", {});
  button.disabled = false;
  if (!ok) return showMsg("simulate-msg", data.error, "error");
  showMsg("simulate-msg", `A week later: ${km(data.car.mileageKm)} on ${data.car.todayLabel}.`, "ok");
  renderGarage(data);
});

// "Other" needs a description; for listed services it is optional.
document.getElementById("service-select").addEventListener("change", (event) => {
  document.getElementById("details-hint").textContent = event.target.value === "other" ? "(required)" : "(optional)";
});

document.getElementById("item-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  // Quick checks in the browser; the server checks everything again.
  const problems = [
    [!values.service, "service", "Please pick the service from the list."],
    [values.service === "other" && !values.item.trim(), "item", "Please describe the service or repair."],
    [!values.date, "date", "Please pick the date of the service."],
    [!isKm(values.mileageKm), "mileageKm", KM_MSG],
  ].find(([bad]) => bad);
  if (problems) {
    showMsg("item-msg", problems[2], "error");
    form.elements[problems[1]].focus();
    return;
  }
  const { ok, data } = await sendJson("/api/history", "POST", values);
  if (!ok) return showMsg("item-msg", data.error, "error");
  form.reset();
  document.getElementById("details-hint").textContent = "(optional)";
  showMsg("item-msg", `Saved "${data.entry.item}" to your history.`, "ok");
  await loadGarage();
});

document.getElementById("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const questionBox = document.getElementById("question");
  const question = questionBox.value.trim();
  if (!question) {
    showMsg("question-msg", "Please type your question or paste the quote first.", "error");
    questionBox.focus();
    return;
  }
  showMsg("question-msg", "", "error");
  const box = document.getElementById("answer");
  const button = event.target.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Checking… (can take up to a minute)";
  box.replaceChildren(el("p", { className: "note", textContent: "Looking up your vehicle, the service schedule and local prices…" }));
  box.hidden = false;
  try {
    const { ok, data } = await sendJson("/api/check", "POST", { question });
    if (ok) {
      renderAnswer(data, question);
    } else {
      box.hidden = true;
      showMsg("question-msg", data.error, "error");
    }
  } finally {
    button.disabled = false;
    button.textContent = "Check it";
  }
});

loadGarage().catch(() => {
  document.getElementById("vehicle-line").textContent =
    "Could not load your vehicle. Is the server running?";
});
