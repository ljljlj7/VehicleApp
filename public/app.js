// Browser logic: show the car, its service timeline and history; send questions to the
// server and show the answer with follow-up choices.

const money = (n) => "$" + Number(n).toFixed(2);
const range = (r) => (r.low === r.high ? money(r.low) : `${money(r.low)} – ${money(r.high)}`);
const km = (n) => Number(n).toLocaleString("en-CA") + " km";
const shortDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// Small helper to build elements safely (textContent avoids injecting HTML).
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children.flat(Infinity).filter((c) => c != null && c !== false && c !== ""));
  return node;
}
const extLink = (l, text = l.label) => el("a", { href: l.url, target: "_blank", rel: "noopener", textContent: text });

function plainList(items) {
  return el("ul", { className: "plain" }, items.map((t) => el("li", { textContent: t })));
}

// --- The car, the timeline and the history -----------------------------------

// The timeline: Toyota-style cards. Each service opens a pop-up with its details.
function openService(item, context) {
  document.getElementById("service-dialog-context").textContent = context;
  document.getElementById("service-dialog-title").textContent = item.name;
  document.getElementById("service-dialog-text").textContent = item.description || "";
  const link = document.getElementById("service-dialog-link");
  link.href = item.link.url;
  link.textContent = `Open Toyota's maintenance schedule (${item.link.label.replace("Toyota schedule ", "")})`;
  document.getElementById("service-dialog").showModal();
}

function visitCard(v, i) {
  const overdue = i === 0 && v.kmLeft <= 0;
  const kind = i === 0 ? (overdue ? "overdue" : "next") : "later";
  const label = i === 0 ? (overdue ? "Overdue" : "Next service") : "Later";
  const dateText = overdue ? `Overdue by ${km(-v.kmLeft)}` : v.dateLabel ? `Est. ${v.dateLabel}` : "";
  const context = [label, km(v.km), dateText].filter(Boolean).join(" · ");
  return el("li", { className: `visit ${kind}` },
    el("div", { className: "visit-top" },
      el("p", { className: "visit-label", textContent: label }),
      el("p", { className: "visit-km", textContent: km(v.km) }),
      el("p", { className: "visit-date", textContent: dateText }),
      i === 0 && !overdue && v.inLabel && el("p", { className: "visit-when", textContent: v.inLabel.replace(/^in /, "In ") })),
    el("ul", { className: "visit-items" }, v.items.map((it) => el("li", {},
      el("button", { type: "button", className: "service-link", textContent: it.name, onclick: () => openService(it, context) })))));
}

function lastCard(last) {
  return el("li", { className: "visit past" },
    el("div", { className: "visit-top" },
      el("p", { className: "visit-label", textContent: "Last service" }),
      el("p", { className: "visit-km", textContent: km(last.km) }),
      el("p", { className: "visit-date", textContent: last.dateLabel })),
    el("ul", { className: "visit-items" }, el("li", { textContent: last.item })));
}

// Close the pop-up when clicking outside it.
document.getElementById("service-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

// --- Service history: open recommendations, then everything else -------------

let currentGarage = null;
const TAGS = { recommended: "Recommended", declined: "Declined" };

// One history row. With actions (in the history panel) it gets Edit / Delete,
// and an open recommendation also gets Mark done / Decline.
function historyRow(h, withActions = false) {
  const action = (label, onclick, cls = "") => el("button", { type: "button", className: `row-action ${cls}`, textContent: label, onclick });
  return el("li", {},
    el("span", { className: "what" }, h.item,
      TAGS[h.status] && !(withActions && h.status === "recommended") && el("span", { className: `tag ${h.status}`, textContent: TAGS[h.status] })),
    el("span", { className: "cost", textContent: money(h.cost) }),
    el("span", { className: "meta", textContent: `${shortDate(h.date)} · ${km(h.mileageKm)} · ${h.shop}` }),
    withActions && el("span", { className: "row-actions" },
      h.status === "recommended" && action("Mark done", () => startEdit(h, "done"), "strong"),
      h.status === "recommended" && action("Decline", () => decline(h)),
      action("Edit", () => startEdit(h)),
      action("Delete", () => removeEntry(h))));
}

function renderHistory(garage) {
  const newestFirst = (a, b) => b.date.localeCompare(a.date) || b.id - a.id;
  const open = garage.history.filter((h) => h.status === "recommended").sort(newestFirst);
  const rest = garage.history.filter((h) => h.status !== "recommended").sort(newestFirst);
  document.getElementById("open-recs").hidden = open.length === 0;
  document.getElementById("recs-list").replaceChildren(...open.map((h) => historyRow(h, true)));
  document.getElementById("history-list").replaceChildren(...rest.map((h) => historyRow(h, true)));
}

// The service list in two groups: scheduled (updates reminders) and repairs / other (history only).
function renderServiceSelect(options) {
  const select = document.getElementById("service-select");
  const picked = select.value;
  const group = (label, key) => el("optgroup", { label },
    options.filter((o) => o.group === key).map((o) => el("option", { value: o.id, textContent: o.name })));
  select.replaceChildren(
    el("option", { value: "", textContent: "Pick a service…" }),
    group("Scheduled by Toyota (updates your reminders)", "scheduled"),
    group("Repairs and other work (kept in your history)", "repair"));
  select.value = picked;
}

function renderGarage(garage) {
  const { vehicle, car } = garage;

  document.getElementById("vehicle-line").textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`;
  document.getElementById("car-line").textContent = `${km(car.mileageKm)} · ${car.todayLabel}`;
  document.getElementById("mileage").placeholder = `e.g. ${car.mileageKm}`;

  document.getElementById("timeline").replaceChildren(
    ...[garage.lastService && lastCard(garage.lastService), ...garage.timeline.map(visitCard)].filter(Boolean));
  document.getElementById("due-source").textContent = car.kmPerWeek != null
    ? `Dates are estimates from your driving (about ${km(car.kmPerWeek)} a week). Click a service for details.`
    : "";
  // Start with the last service and the next one in view.
  document.getElementById("timeline").scrollLeft = 0;
  updateScrollButtons();

  currentGarage = garage;
  renderHistory(garage);
  renderServiceSelect(garage.serviceOptions);
}

async function loadGarage() {
  const res = await fetch("/api/garage");
  renderGarage(await res.json());
}

// Arrow buttons for the timeline (it also scrolls with a trackpad or touch).
function updateScrollButtons() {
  const t = document.getElementById("timeline");
  document.getElementById("scroll-back").disabled = t.scrollLeft <= 2;
  document.getElementById("scroll-forward").disabled = t.scrollLeft + t.clientWidth >= t.scrollWidth - 2;
}
document.getElementById("timeline").addEventListener("scroll", updateScrollButtons, { passive: true });
window.addEventListener("resize", updateScrollButtons);
for (const [id, dir] of [["scroll-back", -1], ["scroll-forward", 1]]) {
  document.getElementById(id).addEventListener("click", () => {
    const t = document.getElementById("timeline");
    t.scrollBy({ left: dir * t.clientWidth * 0.8 });
  });
}

// --- Rendering an answer ---------------------------------------------------

const IMPORTANCE = { safety: "Safety critical", important: "Important", routine: "Routine" };

function serviceBlock(s) {
  const pastWork = s.history.length
    ? el("p", { className: "note", textContent:
        "In your history: " + s.history.map((h) => `${{ done: "done", recommended: "recommended", declined: "declined" }[h.status]} ${shortDate(h.date)} at ${km(h.mileageKm)} (${money(h.cost)})`).join("; ") })
    : null;
  const fact = (label, ...value) => el("div", {}, el("dt", { textContent: label }), el("dd", {}, ...value));

  return el("div", { className: "service" },
    el("div", { className: "service-head" },
      el("h3", { textContent: s.name }),
      el("span", { className: `importance ${s.importance}`, textContent: IMPORTANCE[s.importance] })),
    s.timingNote && el("p", { textContent: s.timingNote }),
    pastWork,
    el("dl", { className: "facts" },
      fact("Typical shop price", range(s.shopCost)),
      fact("Parts if you DIY", range(s.partsCost)),
      fact("DIY difficulty",
        el("span", { className: "dots", textContent: "●".repeat(s.diy.level) + "○".repeat(5 - s.diy.level) }),
        ` ${s.diy.level}/5`)),
    el("p", { className: "note", textContent: `${s.importanceNote} DIY: ${s.diy.label}, about ${s.diy.minutes} min.` }));
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
           el("h4", { textContent: "Guides" }), el("ul", { className: "links" }, s.guides.map((g) => el("li", {}, extLink(g))))]
        : [el("p", { textContent: `Typical shop price ${range(s.shopCost)}; parts ${range(s.partsCost)}.` }),
           el("h4", { textContent: "Research pricing" }), el("ul", { className: "links" }, s.pricing.map((p) => el("li", {}, extLink(p))))]))));
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
        box.replaceChildren(el("p", { textContent: "Thanks. The report was saved for the developers to review." }));
      } catch {
        send.disabled = false;
        box.append(el("p", { textContent: "Could not send the report. Please try again." }));
      }
    };
    box.replaceChildren(comment, send);
  };
  box.append(open);
  return box;
}

function renderAnswer(a, question) {
  const parts = [];

  parts.push(el("div", { className: "answer-head" },
    el("span", { className: `badge ${a.source}`, textContent: a.source === "ai" ? "AI answer" : "Basic answer" }),
    a.notice && el("span", { className: "notice", textContent: a.notice })));
  if (a.safety) parts.push(el("p", { className: "safety", role: "alert", textContent: a.safety }));
  parts.push(el("p", { className: "answer-message", textContent: a.message }));

  if (a.quote) {
    parts.push(el("div", { className: `verdict ${a.quote.verdict}` },
      el("strong", { textContent: `Quoted ${money(a.quote.quoted)} · typical ${range(a.quote)}` }),
      el("span", { textContent: a.quote.text })));
  }

  if (a.services) parts.push(...a.services.map(serviceBlock), followUpBlock(a));
  if (a.schedule) parts.push(plainList(a.schedule.items));
  if (a.ask) parts.push(plainList(a.ask));

  if (a.history) {
    const list = (title, rows) => el("div", {}, el("h4", { textContent: title }),
      rows.length ? el("ul", { className: "history" }, rows.map((h) => historyRow(h))) : el("p", { className: "note", textContent: "None on file." }));
    parts.push(list("Confirmed work", a.history.done), list("Recommended, not done yet", a.history.recommended));
  }

  parts.push(el("div", { className: "answer-foot" },
    a.sources && a.sources.length && el("p", { className: "sources" }, "Sources: ", a.sources.map((s) => extLink(s))),
    el("p", { textContent: a.disclaimer }),
    reportBlock(question, a)));

  const box = document.getElementById("answer");
  box.replaceChildren(...parts);
  box.hidden = false;
}

// --- Messages and saving -----------------------------------------------------

function showMsg(id, text, kind) {
  const msg = document.getElementById(id);
  msg.textContent = text;
  msg.className = `${msg.classList.contains("toast") ? "toast" : "field-msg"} ${kind}`;
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

// Demo: the simulated car drives a week; mileage, date and the timeline update.
let toastTimer;
document.getElementById("simulate-week").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  const { ok, data } = await sendJson("/api/car/simulate-week", "POST", {});
  button.disabled = false;
  clearTimeout(toastTimer);
  if (!ok) return showMsg("simulate-msg", data.error, "error");
  showMsg("simulate-msg", `A week later: ${km(data.car.mileageKm)} on ${data.car.todayLabel}.`, "ok");
  toastTimer = setTimeout(() => { document.getElementById("simulate-msg").hidden = true; }, 3000);
  renderGarage(data);
});

// --- Adding and editing history ---------------------------------------------

const itemForm = document.getElementById("item-form");
// Note: form.elements.item is a built-in function, so the "item" field is read with namedItem("item").
const optionFor = (id) => (currentGarage ? currentGarage.serviceOptions.find((o) => o.id === id) : null);

// Under the service list: say whether this choice updates the reminders.
function updateServiceHint() {
  const editing = Boolean(itemForm.elements.id.value);
  const value = itemForm.elements.service.value;
  const option = optionFor(value);
  const hint = document.getElementById("service-hint");
  hint.hidden = !option;
  if (option) {
    hint.textContent = option.group === "scheduled"
      ? "Scheduled by Toyota: saving it as done updates your service timeline."
      : "Kept in your history; it doesn't change the service timeline.";
  }
  document.getElementById("details-hint").textContent = editing ? "" : value === "other" ? "(required)" : "(optional)";
  updateOtherHint();
}

// Typing a listed service under "Other": suggest picking it from the list instead.
function bestMatch(text) {
  const words = text.toLowerCase();
  let best = null;
  for (const o of currentGarage.serviceOptions) {
    for (const k of o.keywords || []) {
      const escaped = k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(words) && (!best || k.length > best.k.length)) best = { o, k };
    }
  }
  return best && best.o;
}

function updateOtherHint() {
  const hint = document.getElementById("other-hint");
  const match = itemForm.elements.service.value === "other" && currentGarage && bestMatch(itemForm.elements.namedItem("item").value);
  hint.hidden = !match;
  if (!match) return;
  const why = match.group === "scheduled" ? "That one updates your reminders." : "It's in the list.";
  hint.replaceChildren(`Did you mean "${match.name}"? ${why} `,
    el("button", { type: "button", className: "row-action strong", textContent: "Use it", onclick: () => {
      itemForm.elements.service.value = match.id;
      updateServiceHint();
    } }));
}

itemForm.elements.service.addEventListener("change", updateServiceHint);
itemForm.elements.namedItem("item").addEventListener("input", updateOtherHint);

function setFormMode(entry) {
  const editing = Boolean(entry);
  document.getElementById("add-item-summary").textContent = editing ? "Edit service" : "Add a service";
  document.getElementById("item-submit").textContent = editing ? "Save changes" : "Save";
  document.getElementById("item-cancel").hidden = !editing;
  document.getElementById("details-label").textContent = editing ? "Description" : "Details";
}

// Edit an entry. "Mark done" is an edit with status done, today's (simulated) date and km.
function startEdit(h, status = null) {
  const f = itemForm.elements;
  itemForm.reset();
  f.id.value = h.id;
  f.service.value = optionFor((h.services || [])[0]) ? h.services[0] : "other";
  f.namedItem("item").value = h.item;
  f.date.value = status === "done" ? currentGarage.car.today : h.date;
  f.mileageKm.value = status === "done" ? currentGarage.car.mileageKm : h.mileageKm;
  f.cost.value = h.cost;
  f.status.value = status || h.status;
  f.shop.value = h.shop === "Not given" ? "" : h.shop;
  setFormMode(h);
  updateServiceHint();
  showMsg("item-msg", status === "done" ? "Check the date, mileage and cost, then save." : "", "ok");
  const details = document.getElementById("add-item");
  details.open = true;
  details.scrollIntoView({ block: "nearest" });
  f.service.focus();
}

function stopEdit() {
  itemForm.reset();
  itemForm.elements.id.value = "";
  setFormMode(null);
  updateServiceHint();
}

document.getElementById("item-cancel").addEventListener("click", () => {
  stopEdit();
  showMsg("item-msg", "", "ok");
  document.getElementById("add-item").open = false;
});

// Send an existing entry back with some fields changed (used by Decline).
function entryBody(h, changes) {
  return { service: (h.services || [])[0] || "other", item: h.item, date: h.date, mileageKm: String(h.mileageKm),
    cost: String(h.cost), status: h.status, shop: h.shop === "Not given" ? "" : h.shop, ...changes };
}

async function decline(h) {
  const { ok, data } = await sendJson(`/api/history/${h.id}`, "PUT", entryBody(h, { status: "declined" }));
  if (!ok) return alert(data.error);
  await loadGarage();
}

async function removeEntry(h) {
  if (!confirm(`Delete "${h.item}" from your history?`)) return;
  const { ok, data } = await sendJson(`/api/history/${h.id}`, "DELETE", {});
  if (!ok) return alert(data.error);
  if (itemForm.elements.id.value === String(h.id)) stopEdit();
  await loadGarage();
}

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(itemForm));
  // Quick checks in the browser; the server checks everything again.
  const problems = [
    [!values.service, "service", "Please pick the service from the list."],
    [values.service === "other" && !values.item.trim(), "item", "Please describe the service or repair."],
    [!values.date, "date", "Please pick the date of the service."],
    [!isKm(values.mileageKm), "mileageKm", KM_MSG],
  ].find(([bad]) => bad);
  if (problems) {
    showMsg("item-msg", problems[2], "error");
    itemForm.elements[problems[1]].focus();
    return;
  }
  const editing = Boolean(values.id);
  const { ok, data } = editing
    ? await sendJson(`/api/history/${values.id}`, "PUT", values)
    : await sendJson("/api/history", "POST", values);
  if (!ok) return showMsg("item-msg", data.error, "error");
  stopEdit();
  showMsg("item-msg", `${editing ? "Updated" : "Saved"} "${data.entry.item}".`, "ok");
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
  box.replaceChildren(el("p", { className: "note", textContent: "Looking up your car, the service schedule and local prices…" }));
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
  document.getElementById("vehicle-line").textContent = "Could not load your car. Is the server running?";
});
