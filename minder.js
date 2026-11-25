// The minder (M5a): works out what is due and when, from the maintenance schedule,
// the car's mileage readings and the service history. Plain code, no AI, so the
// answer is the same every time and works without an API key.
const fs = require("fs");
const path = require("path");

const SCHEDULES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "schedules.json"), "utf8"));

const DUE_SOON_KM = 1000;     // "due now" when this close in km...
const DUE_SOON_DAYS = 30;     // ...or in days
const RATE_WINDOW_DAYS = 90;  // driving speed is averaged over the last 90 days

// --- Dates as "YYYY-MM-DD" text (UTC, so time zones never shift a day) -----
const DAY_MS = 86400000;
const toTime = (d) => Date.parse(d + "T00:00:00Z");
const toDate = (t) => new Date(t).toISOString().slice(0, 10);
const addDays = (d, n) => toDate(toTime(d) + n * DAY_MS);
const daysBetween = (a, b) => Math.round((toTime(b) - toTime(a)) / DAY_MS);
function addMonths(d, n) {
  const x = new Date(toTime(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return toDate(x.getTime());
}

const fmtKm = (n) => Math.round(n).toLocaleString("en-CA") + " km";
const fmtDate = (d) => new Date(toTime(d)).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function inTime(days) {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in about ${Math.round(days / 7)} weeks`;
  if (days < 730) return `in about ${Math.round(days / 30.4)} months`;
  return `in about ${Math.round(days / 365)} years`;
}

function scheduleFor(modelId) {
  return SCHEDULES.vehicles[modelId] || null;
}

// The schedule entry for a service (e.g. "cabin_air_filter"), if the schedule mentions it.
function findItem(schedule, serviceId) {
  return schedule ? schedule.items.find((i) => i.id === serviceId) || null : null;
}

// Link to the schedule PDF, opened at the item's page.
function pageLink(schedule, page) {
  if (page == null) return { label: "Source", url: schedule.source.url };
  return { label: `Toyota schedule p. ${page}`, url: `${schedule.source.url}#page=${page}` };
}

// The latest reading is the car's current mileage.
function latestReading(readings) {
  return [...readings].sort((a, b) => a.date.localeCompare(b.date)).at(-1) || null;
}

// Average km per day over the last 90 days of readings (all readings if there are too few).
function kmPerDay(readings, today) {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  let window = sorted.filter((r) => r.date >= addDays(today, -RATE_WINDOW_DAYS));
  if (window.length < 2) window = sorted;
  const first = window[0];
  const last = window.at(-1);
  const days = daysBetween(first.date, last.date);
  return days > 0 ? Math.max(0, (last.km - first.km) / days) : null;
}

// Plain-language lines for one due item.
function describe(item) {
  const when = item.dueKm != null && item.dueDate
    ? `Due at ${fmtKm(item.dueKm)} or by ${fmtDate(item.dueDate)}, whichever comes first`
    : item.dueKm != null ? `Due at ${fmtKm(item.dueKm)}` : `Due by ${fmtDate(item.dueDate)}`;

  let expected;
  if (item.status === "overdue") {
    expected = item.kmLeft != null && item.kmLeft <= 0
      ? `Overdue by ${fmtKm(-item.kmLeft)}`
      : `Overdue since ${fmtDate(item.dueDate)}`;
  } else if (item.expected && item.daysLeft != null) {
    expected = `At your driving, that's around ${fmtDate(item.expected)} (${inTime(item.daysLeft)})`;
  } else if (item.kmLeft != null) {
    expected = `${fmtKm(item.kmLeft)} from now`;
  } else {
    expected = "";
  }

  const last = item.lastDone
    ? `Last done ${fmtDate(item.lastDone.date)} at ${fmtKm(item.lastDone.mileageKm)}`
    : "Not done yet";

  return { when, expected, last };
}

const STATUS_ORDER = { overdue: 0, soon: 1, later: 2 };

// Work out every schedule item's next due point. Items that are "part of" another item
// (e.g. the air filter check is part of the service visit) have no interval of their own.
// today, startDate and rate may be missing (e.g. a car that is not in the garage): then only km is used.
function computeDue({ schedule, mileageKm, today = null, startDate = null, history = [], rate = null }) {
  const items = schedule.items.filter((item) => !item.partOf).map((item) => {
    const done = history
      .filter((h) => h.status === "done" && (h.services || []).includes(item.id))
      .sort((a, b) => b.date.localeCompare(a.date) || b.mileageKm - a.mileageKm)[0] || null;

    const dueKm = item.everyKm ? (done ? done.mileageKm : 0) + (done ? item.everyKm : (item.firstKm ?? item.everyKm)) : null;
    const since = done ? done.date : startDate;
    const dueDate = item.everyMonths && since ? addMonths(since, item.everyMonths) : null;

    const kmLeft = dueKm != null ? dueKm - mileageKm : null;
    // When will the car reach the due mileage, at its usual driving speed?
    const kmDate = kmLeft != null && today && rate ? addDays(today, Math.max(0, Math.round(kmLeft / rate))) : null;
    const expected = [kmDate, dueDate].filter(Boolean).sort()[0] || null;
    const daysLeft = expected && today ? daysBetween(today, expected) : null;

    const overdue = (kmLeft != null && kmLeft <= 0) || Boolean(dueDate && today && dueDate < today);
    const soon = !overdue && ((kmLeft != null && kmLeft <= DUE_SOON_KM) || (daysLeft != null && daysLeft <= DUE_SOON_DAYS));

    const result = {
      id: item.id,
      name: item.name,
      status: overdue ? "overdue" : soon ? "soon" : "later",
      dueKm,
      dueDate,
      kmLeft,
      expected,
      daysLeft,
      lastDone: done ? { date: done.date, mileageKm: done.mileageKm } : null,
      page: item.page,
      includes: item.includes || null,
      link: pageLink(schedule, item.page),
    };
    return { ...result, text: describe(result) };
  });

  return items.sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    || (a.expected || "9999").localeCompare(b.expected || "9999")
    || (a.kmLeft ?? Infinity) - (b.kmLeft ?? Infinity));
}

// Everything the main screen needs about the garage car.
function garageStatus(vehicle, car, history) {
  const schedule = scheduleFor(vehicle.modelId);
  const reading = latestReading(car.readings);
  const mileageKm = reading ? reading.km : vehicle.mileageKm;
  const rate = kmPerDay(car.readings, car.today);
  return {
    car: {
      connection: car.connection,
      today: car.today,
      todayLabel: fmtDate(car.today),
      mileageKm,
      kmPerWeek: rate != null ? Math.round(rate * 7) : null,
    },
    due: schedule
      ? { source: schedule.source, items: computeDue({ schedule, mileageKm, today: car.today, startDate: vehicle.startDate, history, rate }) }
      : null,
  };
}

module.exports = { scheduleFor, findItem, pageLink, computeDue, garageStatus, kmPerDay, latestReading, addDays, fmtDate, fmtKm };
