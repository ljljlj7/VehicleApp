// AI advisor (M2). Runs on the server only, so the API key never reaches the browser.
// Claude reads the question, looks up the vehicle, history and reference data with
// tools, searches the web for prices, manuals and forum posts, and returns one
// structured answer. If anything goes wrong, server.js falls back to advisor.js.
const fs = require("fs");
const path = require("path");
const { Anthropic } = require("@anthropic-ai/sdk");
const { betaTool } = require("@anthropic-ai/sdk/helpers/beta/json-schema");

const KB = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "knowledge.json"), "utf8"));
const MODEL = "claude-opus-5-5";
const TIME_LIMIT_MS = 120000;

// True when a key is configured. The SDK reads ANTHROPIC_API_KEY from the environment (.env).
const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

const SYSTEM = `You are the advisor inside Auto-Mobile, a maintenance helper for personal vehicle owners in Canada.
A user brings a dealer or mechanic recommendation, often with a quote, or a question about their vehicle's service.
Help them judge whether the work is expected for their mileage, how important it is, whether the price is reasonable,
and how hard it would be to do themselves.

How to work:
- Use get_garage for the user's saved vehicle, mileage and service history. Use lookup_reference for the app's reference
  service data and schedule. Use web_search to check the official maintenance schedule, typical local prices (CAD),
  owner forum posts, and DIY guides or videos.
- Every fact you present needs a source link. Only use URLs that came from search results or tool results; never write
  a URL from memory. Put the links in sources, guides and pricing.
- If you cannot tell which vehicle, which mileage, or which service is meant, do not give a partial answer: answer with
  kind "clarify" and list the questions in ask. The same applies when the needed facts cannot be found.
- Anything that affects safety (brakes, tires, steering, suspension, airbags, leaks) must have a plain-language safety
  note telling the user to have a qualified technician confirm if unsure.
- Never approve, book or commit the user to any work. The decision is always theirs.
- Use kind "history" when the user asks about their service history (the app shows the saved list itself).
- Give your answer by calling give_answer exactly once, then stop. Keep text short and plain; the user is not a mechanic.`;

const link = {
  type: "object",
  properties: { label: { type: "string" }, url: { type: "string" } },
  required: ["label", "url"],
  additionalProperties: false,
};
const money = {
  type: "object",
  properties: { low: { type: "number" }, high: { type: "number" } },
  required: ["low", "high"],
  additionalProperties: false,
};
const strings = { type: "array", items: { type: "string" } };

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["service", "schedule", "history", "clarify", "unknown"] },
    message: { type: "string", description: "One or two sentences that answer the user directly." },
    safety: { type: "string", description: "Safety warning, only for safety-related items." },
    vehicle_label: { type: "string", description: 'e.g. "2025 Toyota RAV4 LE"' },
    mileage_km: { type: "number" },
    quote: {
      type: "object",
      description: "Only when the user gave a price.",
      properties: {
        quoted: { type: "number" },
        low: { type: "number", description: "Typical local shop price, low end (CAD)" },
        high: { type: "number", description: "Typical local shop price, high end (CAD)" },
        verdict: { type: "string", enum: ["high", "fair", "low"] },
        text: { type: "string" },
      },
      required: ["quoted", "low", "high", "verdict", "text"],
      additionalProperties: false,
    },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          importance: { type: "string", enum: ["safety", "important", "routine"] },
          importance_note: { type: "string" },
          timing_note: { type: "string", description: "Is it expected at this mileage, given the schedule and history?" },
          shop_cost: money,
          parts_cost: money,
          diy_level: { type: "integer", minimum: 1, maximum: 5, description: "1 very easy … 5 leave to a professional" },
          diy_minutes: { type: "integer" },
          parts: strings,
          tools: strings,
          guides: { type: "array", items: link },
          pricing: { type: "array", items: link },
        },
        required: ["name", "importance", "importance_note", "timing_note", "shop_cost", "parts_cost",
          "diy_level", "diy_minutes", "parts", "tools", "guides", "pricing"],
        additionalProperties: false,
      },
    },
    schedule_items: strings,
    ask: strings,
    sources: { type: "array", items: link },
  },
  required: ["kind", "message", "sources"],
  additionalProperties: false,
};

// Turn Claude's answer into the same shape the page already renders for M1 answers.
function toUiShape(a) {
  const ok = (l) => l && /^https?:\/\//i.test(l.url);
  const links = (ls) => (ls || []).filter(ok);
  return {
    kind: a.kind,
    message: a.message,
    safety: a.safety || null,
    vehicle: a.vehicle_label ? { label: a.vehicle_label, mileageKm: a.mileage_km ?? null } : null,
    quote: a.quote || null,
    services: a.services && a.services.length
      ? a.services.map((s) => ({
          name: s.name,
          importance: s.importance,
          importanceNote: s.importance_note,
          timingNote: s.timing_note,
          history: [],
          shopCost: s.shop_cost,
          partsCost: s.parts_cost,
          diy: { level: s.diy_level, minutes: s.diy_minutes, label: KB.diyScale[s.diy_level] },
          parts: s.parts,
          tools: s.tools,
          guides: links(s.guides),
          pricing: links(s.pricing),
        }))
      : undefined,
    followUp: a.services && a.services.length ? "Would you like more detail?" : undefined,
    schedule: a.schedule_items && a.schedule_items.length ? { items: a.schedule_items } : undefined,
    ask: a.ask && a.ask.length ? a.ask : undefined,
    sources: links(a.sources),
    disclaimer: KB.disclaimer,
  };
}

// Ask Claude. Resolves to an answer, or throws so the caller can fall back.
async function askAI(question, garage) {
  const client = new Anthropic({ timeout: 90000, maxRetries: 1 });
  let answer = null;

  const tools = [
    betaTool({
      name: "get_garage",
      description: "The user's saved vehicle (year, make, model, trim, current mileage in km) and service history.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async () => JSON.stringify(garage),
    }),
    betaTool({
      name: "lookup_reference",
      description: "The app's reference data: supported vehicles and trims, a sample maintenance schedule, and per-service price, interval and DIY estimates. Treat it as a starting point to verify, not as fact.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async () => JSON.stringify({ vehicles: KB.vehicles, schedule: KB.schedule, services: KB.services, diyScale: KB.diyScale }),
    }),
    betaTool({
      name: "give_answer",
      description: "Deliver the final answer to the user. Call exactly once, at the end.",
      inputSchema: ANSWER_SCHEMA,
      run: async (input) => {
        answer = input;
        return "Answer delivered. End your turn now.";
      },
    }),
    { type: "web_search_20260209", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "CA" } },
  ];

  const run = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    tools,
    max_iterations: 10,
    messages: [{ role: "user", content: question }],
  });

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI took too long")), TIME_LIMIT_MS);
  });
  try {
    const final = await Promise.race([run.runUntilDone(), timeout]);
    if (final.stop_reason === "refusal") throw new Error("AI declined to answer");
  } finally {
    clearTimeout(timer);
  }
  if (!answer) throw new Error("AI did not return an answer");
  return toUiShape(answer);
}

module.exports = { askAI, isConfigured };
