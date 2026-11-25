# Laptop demo script: Auto-Mobile (about 5 minutes)

## Before the demo (10 minutes ahead)

1. Open PowerShell and go to the project folder: `cd "C:\Users\lafre\Downloads\VehicleApp"`
2. Reset the sample data so the demo starts clean: `git checkout -- data/db.json`
3. Start the app: `npm.cmd start`. Check it prints `Auto-Mobile is running` and `AI: on` or `AI: off`.
4. Open http://localhost:3000 in the browser. Press F12 → device toolbar (Ctrl+Shift+M) and pick a phone size,
   so the audience sees the phone layout. Press F12 again to hide the tools.
5. Keep `acceptance-test.md` open in another window so you can copy the test questions.

**AI or not?** With `AI: on` (a `.env` key with credits), answers take 20–60 seconds and say "AI answer".
With `AI: off`, answers are instant and say "Basic answer". Both are fine for the demo; say which one is showing.
If the AI fails during the demo, the app switches to a basic answer by itself; point at the yellow note. That *is*
part of the product (PRD section 5).

## The demo

| Step | Say | Do | Audience sees |
|------|-----|----|---------------|
| 0a | "The app is connected to the car, so it knows the mileage. For the prototype we simulate that." | Point at **My car** and **What's due** | 7,000 km, about 198 km a week; inspection due now, what comes next with dates |
| 0b | "A chat can't do this: it tells you before you ask." | Press **Simulate a week of driving** two or three times | Mileage and date go up; the inspection gets closer, then turns red (overdue) after Dec 14 |
| 1 | "A dealer told our user their $200 air filter job was needed. Is it?" | Paste T1 and press **Check it** | Quote marked above the typical range, routine, likely early at 7,000 km, DIY 1/5 |
| 2 | "Could they do it themselves?" | Press **Parts & tools to DIY** | Parts, tools, video guide link |
| 3 | "And to compare prices?" | Press **Pricing research** | Price search links |
| 4 | "Safety comes first." | Paste T3 (1 mm brakes) | Red safety warning, "do not leave them", disclaimer |
| 5 | "It knows the car's history." | Paste T5 (service history) | Confirmed work vs recommended |
| 6 | "If it doesn't know enough, it asks instead of guessing." | Paste T6 (2026 RAV4 Hybrid) | Asks for trim and mileage |
| 7 | "You log a service once, and the reminders update." | Open **Add a service item**, pick **Multi-point inspection**, the simulated date shown under My car, the current km, $0, press **Save item**, then press F5 | The item is still there after the reload, and the inspection moves from "due now" to "coming up" |
| 8 | "And it checks what you type." | Open **Correct the mileage**, type `eight thousand`, press **Update**; then press **Check it** with an empty box | Both refused with a clear message |
| 9 | "If something looks wrong, users can flag it." | Click **Report a problem with this answer** | Report saved for the developers |

Close with: "Everything here is sample data in a course prototype; real use would need official manuals and a login."

## If something goes wrong

- **Page doesn't load:** check the PowerShell window still shows the app running; if not, run `npm.cmd start` again.
- **`npm` error about scripts being disabled:** use `npm.cmd`, not `npm`.
- **"Port 3000 in use":** another copy is running. Close the other PowerShell window, or restart the laptop.
- **AI answer is slow:** keep talking through what it is doing (looking up the schedule, local prices, guides); it can take up to a minute.

## After the demo

Reset the sample data again: `git checkout -- data/db.json`
