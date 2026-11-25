# Test results: Auto-Mobile

Results from the builder (Claude Code) clicking through `acceptance-test.md` in the running app, on a phone-sized screen.
The empty "Last run" and "Run by" columns in `acceptance-test.md` are for the team's tester to fill in after their own run.

## Last service = service visits only; date and km pre-filled: 2026-11-25

- "Last service" now shows only a logged Toyota **service visit**. The sample's Nov 2 early oil change no longer
  appears there (it still moves the oil change to the 24,000 km card, and it is in the history), so the sample timeline
  starts with "Next service 8,000 km".
- "Add a service" opens with the car's (simulated) date and current km filled in, and follows "Simulate a week".

Clicked through in Chrome at 1280 px: first card "Next service / 8,000 km / Est. Dec 2026"; form on open Nov 25, 2026 ·
7,000 km; after Simulate a week Dec 2, 2026 · 7,200 km; logging "Service visit" created "Last service / 7,200 km / Dec 2026"
(next service then 15,200 km). T1–T16 re-run: pass (basic answers).

## Service history: scheduled vs. other work: 2026-11-25

Changes: the service list has two groups ("Scheduled by Toyota (updates your reminders)" and "Repairs and other work
(kept in your history)") with a one-line hint under it; "Other" text that matches a listed service shows "Did you mean …?
Use it"; history entries can be edited and deleted; open recommendations are listed together with Mark done / Decline;
new status "Recommended, declined"; the timeline's "Last service" counts scheduled services only.

Clicked through in Chrome at 1280 px (basic answers):

| ID | What we saw | Result |
|----|-------------|--------|
| T14 | "Mark done" on "Replace cabin and engine air filters" opened "Edit service" filled with Nov 25, 2026, 7,000 km, $170, status Done; saved with $60; after reload the open list is gone and the entry is in the history as done | Pass |
| T15 | Edited "Wiper blades replaced (front)" from $35 to $42.50: kept after reload; deleted it: gone after reload | Pass |
| T16 | "Other" + "oil change at Quick Lube" → "Did you mean "Engine oil and filter replacement"? That one updates your reminders. Use it"; Use it switched the list to it | Pass |
| Also | Declining a brake fluid recommendation moved it to the history with a "Declined" tag. A wiper blade repair did not replace the "Last service" card. Editing "Oil and filter change, tire rotation" kept both services. | Pass |
| T1–T12 | Re-run, unchanged | Pass (basic answers) |

Screenshot: `16-history-panel.jpg`.

## Service pop-up: 2026-11-25

Simplified: the details panel under the timeline is gone. Each service in a card is a link that opens a pop-up with
Toyota's description and a link to the schedule PDF (opens in the browser at the right page). Re-run in Chrome at
1280 px: T11 pop-up "Next service · 8,000 km · Est. Dec 2026 / Inspection & tire rotation / Toyota checks the lights…",
link `/docs/toyota-schedule-2025-rav4-le-awd.pdf#page=3`, opens in a new tab. T1–T10 and T12 pass as before (basic
answers). Screenshot: `15-timeline-details.jpg` now shows the pop-up.

## Timeline details, local PDF, 200 km a week: 2026-11-25

- Clicking a timeline card now shows what each service includes (Toyota's wording) in a panel below the timeline,
  instead of linking to Toyota's site, which forced a download of the PDF.
- The source link opens the app's own copy of Toyota's 5-page schedule PDF in the browser at the right page (T11).
- The sample car drives exactly 200 km a week (history km adjusted to match: 6,343 km on Nov 2); "Simulate a week"
  adds 200 km. The owner's supplement PDF is no longer used and was deleted.
- Phone header fixed: brand, car, then the two buttons on their own row.

Re-run in Chrome at 1280 px: T1–T12 pass as before (basic answers); T10 now 7,000 → 7,200 km on Dec 2, 2026; T11 opens
`/docs/toyota-schedule-2025-rav4-le-awd.pdf#page=3` in the browser. Screenshot of the details panel: `15-timeline-details.jpg`.

## Redesign (desktop first, service timeline): 2026-11-25

**Where:** laptop (Mac), http://localhost:3000, clicked through by a script in Chrome at **desktop width (1280 px)**;
the layout was also checked at phone width (400 px). **AI:** off, so every question got a **Basic answer**.

What changed for the tests: the car is in the top bar; "What's due" is now a **service timeline** (last service, next
service, later services); the mileage box is behind **Correct mileage**; the history form is **Add a service** → **Save**.

| ID | What we saw | Result |
|----|-------------|--------|
| T1 | Quote above the typical range; Toyota only inspects the air filter at each visit; source p. 3 | Pass (basic answer) |
| T2 | "Due now: Service visit … Due at 8,000 km. At your driving, that's around Dec 30, 2026" | Pass (basic answer) |
| T3 | Red safety warning, "do not leave them", disclaimer | Pass (basic answer) |
| T4 | "Please type your question or paste the quote first." | Pass |
| T5 | History split into confirmed and recommended | Pass (basic answer) |
| T6 | Asks for trim and mileage | Pass (basic answer) |
| T7 | Added "Engine oil and filter replacement" (7,100 km), reloaded: in the history, shown as the "Last service" card, timeline recalculated | Pass (a bug where the service list was empty was found and fixed in this run) |
| T8 | "eight thousand" under Correct mileage refused | Pass |
| T9 | Top bar: car, "Connected car (simulated)", 7,000 km · Nov 25, 2026. Timeline: last service 6,500 km (Nov 2026); next service 8,000 km, est. Dec 2026, in about 5 weeks; later visits to 80,000 km with what is included | Pass |
| T10 | Simulate a week: 7,198 km · Dec 2, 2026; next service "in about 4 weeks"; kept after reload | Pass |
| T11 | Source link under the timeline: "Toyota Canada maintenance schedule, 2025 RAV4 LE AWD (p. 1)", opens the PDF at page 1 | Pass |
| T12 | "Toyota rotates the tires at every service visit. Next service visit: due at 8,000 km" | Pass (basic answer) |
| T13 | Needs the AI (M6) | Not run |

Screenshots: `11-T9-whats-due.jpg` (desktop main screen), `12-T12-is-it-due.jpg`, `13-T7-T8-service-list-and-mileage.jpg`,
`14-phone-layout.jpg`. **Not run:** AI mode, a real phone, a person clicking through.

## M5b Real schedule: 2026-11-25

**Where:** laptop (Mac), http://localhost:3000, clicked through by a script in Chrome at phone size (400 px wide).
**AI:** off (no API key), so every question got a **Basic answer**.
**Schedule:** Toyota Canada's official 2025 RAV4 LE AWD maintenance schedule (km), plus the "every 6 months or 8,000 km"
rule from Toyota Canada's 2025 owner's supplement (p. 25). The demo car is now an LE AWD to match.

**Update (same day): due points by km only.** The 6-month time limit was dropped for the prototype (team decision);
dates are now only estimates from driving. The June "complimentary inspection" no longer counts as a scheduled visit,
so the first service visit is due at Toyota's 8,000 km. Re-run after the change, all in Chrome at phone size:
T2 "Due now: Service visit … Due at 8,000 km. At your driving, that's around Dec 30, 2026"; T9 shows the same on the
main screen; T10 7,198 km on Dec 2 after a simulated week, kept after reload; T12 "Toyota rotates the tires at every
service visit. Next service visit: due at 8,000 km"; T1, T3–T8 and T11 unchanged. All pass (basic answers); the
schedule's second read still matches the PDF. The result rows below are from the run before this change.

**Second read of the schedule:** a separate script re-read the Toyota PDF and compared all 11 schedule items at every
service visit from 8,000 to 120,000 km, plus the cited pages. Result: all items match, no problems found.

| ID | What we saw | Result |
|----|-------------|--------|
| T1 | $200 quote above the typical range; "Toyota Canada's schedule has no set replacement interval for the engine air filter: it is removed and inspected at every service visit and replaced only if found dirty or damaged"; sources: schedule p. 3 and supplement p. 25 | Pass (basic answer) |
| T2 | "Due now: Service visit (inspection and tire rotation). Due at 10,150 km or by Dec 14, 2026"; then oil at 22,500 km, detailed inspection at 32,000 km, brake fluid at 48,000 km; sources: schedule p. 1 | Pass (basic answer) |
| T3 | Red safety warning, "do not leave them", disclaimer | Pass (basic answer) |
| T4 | Empty box refused with a message | Pass |
| T5 | History split into confirmed and recommended | Pass (basic answer) |
| T6 | Asks for trim and mileage (the 2026 Hybrid still uses a sample schedule) | Pass (basic answer) |
| T7 | Added "Engine oil and filter replacement" from the list, reloaded: still there, next oil moved to 23,100 km | Pass |
| T8 | "eight thousand" refused under Correct the mileage | Pass |
| T9 | Connected car (simulated), 7,000 km; service visit due now with what it includes; four items coming up | Pass |
| T10 | Simulate a week: 7,198 km on Dec 2, 2026; still there after reload | Pass |
| T11 | Link reads "Toyota schedule p. 1" and opens Toyota Canada's schedule PDF at page 1 | Pass |
| T12 | "Toyota rotates the tires at every service visit. Next service visit: due at 10,150 km or by Dec 14, 2026" | Pass (basic answer) |
| T13 | The owner's manual is now stored as 588 searchable pages (oil type and capacity on pages 498–499), but answering from it needs the AI (M6) | Not run |

**Not run:** AI mode (no key), a real phone, a person clicking through (Linus to do).

## M5a Minder: 2026-11-25

**Where:** laptop (Mac), http://localhost:3000, clicked through by a script in Chrome at phone size (400 px wide).
**AI:** off (no API key), so every question got a **Basic answer**. **Schedule:** still the made-up sample schedule (M5b replaces it).

| ID | What we did | What we saw | Result |
|----|-------------|-------------|--------|
| T1 | Pasted the $200 air filter quote | Quote above the typical $50–$90 range; "Not due yet according to the schedule. Due at 48,000 km"; history shows the dealer's $170 recommendation; DIY 1/5 | Pass (basic answer) |
| T2 | Pasted "my 2025 toyota rav4 has 7000km…" | "1 item is due now": multi-point inspection at 10,150 km or by Dec 14, 2026; then tire rotation, oil change, cabin filter with km and dates | Pass (basic answer, sample schedule) |
| T3 | Pasted the 1 mm brakes question | Red safety warning, "do not leave them", disclaimer | Pass (basic answer) |
| T4 | Pressed "Check it" with an empty box | "Please type your question or paste the quote first." | Pass |
| T5 | Pasted "tell me about my service history" | Confirmed work and recommended, split | Pass (basic answer) |
| T6 | Pasted "I have a 2026 Toyota Rav4 Hybrid" | Asks for trim and mileage | Pass (basic answer) |
| T7 | Added "Oil and filter change" from the new service list, then reloaded | Item still in history after reload, and the oil change's next due point moved to 23,100 km | Pass (note: the service is now picked from a list) |
| T8 | Typed "eight thousand" under **Correct the mileage**, pressed Update | Refused: "Mileage must be a number in km…" | Pass (note: the mileage box is now under "Correct the mileage") |
| T9 | Opened the app | "Connected car (simulated)", 7,000 km, about 198 km a week; "What's due" shows the inspection as due now, four items coming up with km and dates | Pass |
| T10 | Pressed "Simulate a week of driving", then reloaded | 7,198 km on Dec 2, 2026; inspection now "in 12 days"; both still there after reload | Pass |
| T11 | Checked the link on a due item | Opens toyota.com/owners, but **no page number** yet | Not passed yet: needs the real guide (M5b) |
| T12 | Pasted "The dealer says I need a tire rotation, is it due?" | "Not due yet according to the schedule. Due at 14,500 km or by May 2, 2027… Last done Nov 2, 2026 at 6,500 km" | Pass (basic answer, sample schedule; guide page comes in M5b) |
| T13 | – | Not built yet (owner's manual lookup, M5b/M6) | Not run |

Also checked through the server: mileage lower than the last reading is refused; history dated after the car's
simulated date is refused; "Other" without a description is refused. Screenshots: `11-T9-whats-due.jpg`,
`12-T12-is-it-due.jpg`, `13-T7-T8-service-list-and-mileage.jpg`.

**Not run:** AI mode (no key), a real phone, a person clicking through (Linus to do).

## M4 Ship: 2026-11-24

**Date:** 2026-11-24  **Version:** M3 code on `main` (commit 522fdce)  **Where:** laptop, http://localhost:3000

## Important: two answer modes

The app has two ways of answering questions (T1, T2, T3, T5, T6):

- **AI answer:** Claude looks up the vehicle, history, schedule and local prices, with source links. Needs an Anthropic API key with credits.
- **Basic answer:** built-in rules and made-up sample data. Used automatically when the AI is off or fails.

On 2026-11-24 the AI could not answer: in the codespace the key was accepted but the account had **no API credits**
("credit balance is too low"), and the laptop has no key. So every question below was answered in **Basic answer** mode.
The AI mode is **not run** yet. Re-run T1, T2, T3, T5 and T6 once credits are added.

## Results

| ID | What we did | What we saw | Result | Screenshot |
|----|-------------|-------------|--------|------------|
| T1 | Pasted the $200 air filter quote | Quote marked **above** the typical $50–$90 shop range; routine, likely early at 7,000 km; DIY 1/5 with parts and guide links; history shows the earlier $170 recommendation | Pass (basic answer). AI: not run | `02-T1-quote-check.jpg`, `03-T1-diy-follow-up.jpg` |
| T2 | Pasted "my 2025 toyota rav4 has 7000km…" | Next service at 8,000 km: tire rotation and multi-point inspection, with source link | Pass (basic answer, sample schedule). AI: not run | `04-T2-next-service.jpg` |
| T3 | Pasted the 1 mm brakes question | Red safety warning at the top; "1 mm is well below the ~3 mm replacement point. Do not leave them"; disclaimer; advice to get a professional to confirm | Pass (basic answer). AI: not run | `05-T3-brakes-safety.jpg` |
| T4 | Pressed "Check it" with an empty box | "Please type your question or paste the quote first." Cursor returns to the box | Pass | `06-T4-empty-box.jpg` |
| T5 | Pasted "tell me about my service history" | History split into confirmed work and recommended, not done yet | Pass (basic answer). AI: not run | `07-T5-service-history.jpg` |
| T6 | Pasted "I have a 2026 Toyota Rav4 Hybrid" | Asks which trim (LE, XLE, XSE, Limited, Woodland) and the current mileage | Pass (basic answer). AI: not run | `08-T6-asks-trim-and-mileage.jpg` |
| T7 | Added "Wiper blades replaced (front)", then reloaded the page | The item is still in the history after the reload (also checked: updated mileage stays after reload) | Pass | `09-T7-item-saved-after-reload.jpg` |
| T8 | Typed "eight thousand" in the mileage box and pressed Update | Refused: "Mileage must be a number in km, using digits only (for example 7500)." Field selected to retype | Pass | `10-T8-letters-in-mileage.jpg` |

## Also checked

- **AI unavailable:** with no key, with an invalid key, and with a valid key but no credits, every question still got a
  Basic answer and a yellow note explaining that the AI is unavailable. Nothing crashed.
- **Report a problem:** the button saved a report to the data file.

## Not run

- T1, T2, T3, T5, T6 in **AI answer** mode (needs API credits).
- Any test on a real phone. All runs used a phone-sized browser window.
