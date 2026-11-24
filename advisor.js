// Rule-based advisor (M1, no AI yet).
// It reads the user's question, matches it against the sample knowledge base,
// and builds a structured answer the page can show. In M2 the AI plugs in here.
const fs = require("fs");
const path = require("path");

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

function dueNote(service, mileageKm) {
  if (!service.replaceEveryKm) return null;
  const every = fmtKm(service.replaceEveryKm);
  if (mileageKm == null) return `Usually due every ${every}. Tell us your mileage to check timing.`;
  if (mileageKm < service.replaceEveryKm * 0.8) {
    return `Usually due every ${every}. At ${fmtKm(mileageKm)} this is likely early, unless an inspection found it dirty or damaged.`;
  }
  return `Usually due every ${every}. At ${fmtKm(mileageKm)} it is likely due or close to due.`;
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
    timingNote: s.safety ? brakeNote(s, ctx.thicknessMm) : dueNote(s, ctx.mileageKm),
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
  const base = { disclaimer: KB.disclaimer, sources: [KB.schedule.source] };

  // 1. Service history
  if (/history|past service|work (was )?done/.test(text)) {
    return {
      ...base, kind: "history",
      vehicle: { label: vehicleLabel(garage.vehicle), mileageKm: garage.vehicle.mileageKm },
      message: "Here is the service history on file, split into confirmed work and recommendations.",
      history: {
        done: garage.history.filter((h) => h.status === "done"),
        recommended: garage.history.filter((h) => h.status === "recommended"),
      },
      sources: [],
    };
  }

  // Which vehicle are we talking about? A vehicle named in the question wins over the saved one.
  const usingSaved = !said;
  const vehicle = said || garage.vehicle;
  const mileageKm = saidMileage ?? (usingSaved ? garage.vehicle.mileageKm : null);
  const vLabel = vehicleLabel(vehicle);
  const ctx = {
    vehicleText: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    mileageKm,
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

  // 4. Next service for a known vehicle and mileage
  if (wantsSchedule || said) {
    const every = KB.schedule.everyKm;
    const nextAtKm = Math.floor(mileageKm / every) * every + every;
    const items = KB.schedule.items
      .filter((i) => nextAtKm % i.everyKm === 0)
      .map((i) => (i.service ? KB.services.find((s) => s.id === i.service).name : i.text));
    return {
      ...base, kind: "schedule",
      vehicle: { label: vLabel, mileageKm },
      message: `At ${fmtKm(mileageKm)}, your next scheduled service is at ${fmtKm(nextAtKm)} (${fmtKm(nextAtKm - mileageKm)} from now).`,
      schedule: { nextAtKm, items },
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
