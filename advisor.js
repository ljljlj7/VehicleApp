// Rule-based advisor (M1, no AI yet).
// It reads the user's question, matches it against the sample knowledge base,
// and builds a structured answer the page can show. In M2 the AI plugs in here.
// Since M5a, "is it due?" comes from the minder (schedule + mileage + history).
const fs = require("fs");
const path = require("path");
const minder = require("./minder");

const KB = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "knowledge.json"), "utf8"));

const fmtKm = (n) => Number(n).toLocaleString("en-CA") + " km";
const search = (base, q) => base + encodeURIComponent(q);
const vehicleLabel = (v) => [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");

// --- Reading the question -------------------------------------------------

function findVehicle(text) {
  // Check longer names first so "rav4 hybrid" wins over "rav4".
  const ordered = [...KB.vehicles].sort((a, b) => b.match[0].length - a.match[0].length);
  const yearMatch = text.match(/\b(20\d\d)\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const hit = ordered.find((v) => v.match.some((m) => text.includes(m)));
  if (!hit) return null;
  const trim = hit.trims.find((t) => new RegExp(`\\b${t.toLowerCase()}\\b`).test(text)) || null;
  return { ...hit, year: year || hit.year, trim };
}

function findMileage(text) {
  const m = text.match(/(\d[\d,]*)\s*(km|kms|kilometers|kilometres)\b/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function findPrice(text) {
  const m = text.match(/\$\s*(\d[\d,]*(?:\.\d+)?)/) || text.match(/(\d[\d,]*(?:\.\d+)?)\s*(dollars|bucks)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function findThicknessMm(text) {
  const m = text.match(/(\d+(?:\.\d+)?)\s*mm\b/);
  return m ? Number(m[1]) : null;
}

function findServices(text) {
  return KB.services.filter((s) => {
    // "air filter" alone means the engine filter, unless only "cabin" is said.
    if (s.id === "engine_air_filter") {
      return text.includes("engine") && text.includes("filter")
        || (text.includes("air filter") && !text.includes("cabin"));
    }
    return s.keywords.some((k) => text.includes(k));
  });
}

// --- Building the answer --------------------------------------------------

function historyFor(service, history) {
  const words = service.keywords;
  return history.filter((h) => words.some((w) => h.item.toLowerCase().includes(w)));
}

// What the schedule says about this service, worked out by the minder.
function dueNote(service, due) {
  if (!due) return "Tell us your mileage to check this against the maintenance schedule.";
  const entry = minder.findItem(due.schedule, service.id);
  if (!entry) return "This is not on the regular maintenance schedule; it depends on what an inspection finds.";
  // Some services have no interval of their own: they are part of a regular visit.
  if (entry.partOf) {
    const visit = due.items.find((i) => i.id === entry.partOf);
    if (!visit) return entry.note;
    const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
    return [entry.note, `Next ${visit.name.toLowerCase()}: ${lower(visit.text.when)}.`, visit.text.expected && `${visit.text.expected}.`].filter(Boolean).join(" ");
  }
  const item = due.items.find((i) => i.id === service.id);
  const { when, expected, last } = item.text;
  const lead = {
    overdue: "Overdue according to the schedule.",
    soon: "Due soon according to the schedule.",
    later: "Not due yet according to the schedule.",
  }[item.status];
  const advice = item.status === "later" ? "Unless an inspection found it worn, dirty or damaged, it can likely wait." : "";
  return [lead, `${when}.`, expected && `${expected}.`, `${last}.`, advice].filter(Boolean).join(" ");
}

// Run the minder for the car in the question. For the saved car we also know its
// history, its (simulated) date and how much it is driven; for any other car only km.
function dueFor(vehicleId, mileageKm, garage, usingSaved) {
  const schedule = minder.scheduleFor(vehicleId);
  if (!schedule || mileageKm == null) return null;
  if (usingSaved && garage.car) {
    const rate = minder.kmPerDay(garage.car.readings, garage.car.today);
    return {
      schedule,
      items: minder.computeDue({ schedule, mileageKm, today: garage.car.today, startDate: garage.vehicle.startDate, history: garage.history, rate }),
    };
  }
  return { schedule, items: minder.computeDue({ schedule, mileageKm }) };
}

// Sources for an answer: the schedule pages it relied on, and the 6-month rule if it used dates.
function scheduleSources(schedule, serviceIds = []) {
  if (!schedule) return [];
  const pages = [...new Set(serviceIds.map((id) => minder.findItem(schedule, id)).filter(Boolean).map((i) => i.page))];
  const links = pages.length ? pages.map((p) => minder.pageLink(schedule, p)) : [minder.pageLink(schedule, schedule.items[0].page)];
  return [...links.map((l) => ({ label: `${schedule.source.label}${l.label.startsWith("Toyota") ? `, ${l.label.replace("Toyota schedule ", "")}` : ""}`, url: l.url })),
    ...(schedule.timeSource ? [schedule.timeSource] : [])];
}

function brakeNote(service, mm) {
  if (mm == null) return "Ask the shop for the measured pad thickness in mm to judge urgency.";
  if (mm <= 2) return `${mm} mm is well below the ~${service.minThicknessMm} mm replacement point. Do not leave them: get them replaced soon and have a professional confirm.`;
  if (mm <= service.minThicknessMm) return `${mm} mm is at the ~${service.minThicknessMm} mm replacement point. Plan to replace them soon.`;
  return `${mm} mm is above the ~${service.minThicknessMm} mm replacement point. Ask the shop why they recommend replacing now.`;
}

function quoteVerdict(quoted, low, high) {
  if (quoted == null) return null;
  let verdict;
  if (quoted > high * 1.15) verdict = "high";
  else if (quoted < low * 0.85) verdict = "low";
  else verdict = "fair";
  const text = {
    high: "This quote is above the typical shop range. Consider a second quote or doing it yourself.",
    low: "This quote is below the typical range. Check what it includes.",
    fair: "This quote is within the typical shop range.",
  }[verdict];
  return { quoted, low, high, verdict, text };
}

function serviceCard(s, ctx) {
  const v = ctx.vehicleText;
  return {
    id: s.id,
    name: s.name,
    importance: s.importance,
    importanceNote: s.importanceNote,
    timingNote: s.safety ? brakeNote(s, ctx.thicknessMm) : dueNote(s, ctx.due),
    history: ctx.history ? historyFor(s, ctx.history) : [],
    shopCost: s.shopCost,
    partsCost: s.partsCost,
    diy: { ...s.diy, label: KB.diyScale[s.diy.level] },
    parts: s.parts,
    tools: s.tools,
    guides: [{ label: `Video guides: ${v} ${s.name.toLowerCase()}`, url: search("https://www.youtube.com/results?search_query=", `${v} ${s.name}`) }],
    pricing: [
      { label: `Search prices near you: ${s.name.toLowerCase()}`, url: search("https://www.google.com/search?q=", `${s.name} cost ${v} near me`) },
      { label: `Search parts prices: ${s.parts[0]}`, url: search("https://www.google.com/search?q=", `${v} ${s.parts[0]} price`) },
    ],
  };
}

function check(question, garage) {
  const text = String(question || "").toLowerCase();
  const said = findVehicle(text);
  const saidMileage = findMileage(text);
  const services = findServices(text);

  // 1. Service history
  if (/history|past service|work (was )?done/.test(text)) {
    return {
      disclaimer: KB.disclaimer, kind: "history",
      vehicle: { label: vehicleLabel(garage.vehicle), mileageKm: garage.vehicle.mileageKm },
      message: "Here is the service history on file, split into confirmed work and recommendations.",
      history: {
        done: garage.history.filter((h) => h.status === "done"),
        recommended: garage.history.filter((h) => h.status === "recommended"),
      },
      sources: [],
    };
  }

  // Which vehicle are we talking about? A vehicle named in the question wins over the saved one,
  // unless it is the saved car itself (same model and year).
  const usingSaved = !said || (said.id === garage.vehicle.modelId && said.year === garage.vehicle.year);
  const vehicle = usingSaved ? { ...garage.vehicle, trim: (said && said.trim) || garage.vehicle.trim } : said;
  const vehicleId = usingSaved ? garage.vehicle.modelId : said.id;
  const mileageKm = saidMileage ?? (usingSaved ? garage.vehicle.mileageKm : null);
  const vLabel = vehicleLabel(vehicle);
  const due = dueFor(vehicleId, mileageKm, garage, usingSaved);
  const schedule = minder.scheduleFor(vehicleId);
  const base = { disclaimer: KB.disclaimer, sources: scheduleSources(schedule, services.map((s) => s.id)) };
  const ctx = {
    vehicleText: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    mileageKm,
    due,
    thicknessMm: findThicknessMm(text),
    history: usingSaved ? garage.history : null,
  };

  // 2. A recommended service or quote
  if (services.length) {
    const cards = services.map((s) => serviceCard(s, ctx));
    const low = services.reduce((n, s) => n + s.shopCost.low, 0);
    const high = services.reduce((n, s) => n + s.shopCost.high, 0);
    const safety = services.some((s) => s.safety)
      ? "Safety item: brakes affect your ability to stop. If in any doubt, have a qualified technician inspect them before driving further."
      : null;
    return {
      ...base, kind: "service",
      vehicle: { label: vLabel, mileageKm },
      message: `Here is what we found for ${services.map((s) => s.name.toLowerCase()).join(" and ")} on your ${vLabel}.`,
      safety,
      quote: quoteVerdict(findPrice(text), low, high),
      typical: { low, high },
      services: cards,
      followUp: "Would you like more detail?",
    };
  }

  // 3. A vehicle was named but we need more detail to look up the right manual
  const wantsSchedule = /next service|expect|upcoming|schedule|due/.test(text);
  if (said && (!said.trim && !wantsSchedule || saidMileage == null)) {
    const ask = [];
    if (!said.trim) ask.push(`Which trim is it? (${said.trims.join(", ")})`);
    if (saidMileage == null) ask.push("What is the current mileage in km?");
    return {
      ...base, kind: "clarify",
      vehicle: { label: vLabel, mileageKm: null },
      message: `Got it: a ${vLabel}. To pull the right manual and service schedule we need a little more:`,
      ask,
    };
  }

  // 4. What is due for a known vehicle and mileage (from the minder)
  if ((wantsSchedule || said) && due) {
    const LABEL = { overdue: "Overdue", soon: "Due now", later: "Next" };
    const shown = [...due.items.filter((i) => i.status !== "later"), ...due.items.filter((i) => i.status === "later").slice(0, 3)];
    const items = shown.map((i) => `${LABEL[i.status]}: ${i.name}. ${[i.text.when, i.text.expected].filter(Boolean).join(". ")}.`);
    const dueNow = shown.filter((i) => i.status !== "later").length;
    return {
      ...base, kind: "schedule",
      vehicle: { label: vLabel, mileageKm },
      message: `At ${fmtKm(mileageKm)}, ${dueNow ? `${dueNow === 1 ? "1 item is" : `${dueNow} items are`} due now` : "nothing is due yet"} on your ${vLabel}. Here is what the maintenance schedule says:`,
      schedule: { items },
    };
  }

  // 5. Nothing matched: ask instead of guessing
  return {
    ...base, kind: "unknown",
    message: "We could not match that to a service in our sample data. Tell us the service or repair you were quoted (for example air filter, brakes, oil change), the price, and your vehicle's year, model and mileage.",
    sources: [],
  };
}

module.exports = { check };
