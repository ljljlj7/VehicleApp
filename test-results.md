# Test results: Auto-Mobile

Results from the builder (Claude Code) clicking through `acceptance-test.md` in the running app, on a phone-sized screen.
The empty "Last run" and "Run by" columns in `acceptance-test.md` are for the team's tester to fill in after their own run.

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
