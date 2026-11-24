# AGENTS.md

Rules for any AI coding agent working on this project.

## Project
Auto-Mobile: A personalized maintenance minder app for someone's vehicle, provides recommendations based on factory service milestones.  Advises user on recommended work importance and difficulty to DIY.
Read PRD.md and acceptance-tests.md before any work. PRD.md is the source of truth. If a request conflicts with it, stop and ask.

## Who you are working with
- We are MBA students with little programming experience. Explain each technical choice in one plain sentence.
- Our deadline is 3 December 2026. Prefer the simplest approach that passes the acceptance tests.

## How to work
- Build one milestone at a time, in the order given in PRD.md. Do not start the next milestone unprompted.
- Before editing, list the files you will change. Stop and ask only if the work goes beyond the current milestone.
- Do not add features, libraries or services that PRD.md does not require. Suggest them and wait.
- Keep working features working. If a change puts one at risk, say so first.
- After each milestone, report what changed, how to open or run the app, and which acceptance tests a person should now click through.
- Do not say a test passes unless you ran it in the running app. If you could not run it, say "not run".
- If you used placeholder data or skipped something, say so plainly.
- Save a version (commit) after each milestone whose tests pass, with a message that names the milestone.

## Will not build
- full repository of all brands, will start with small number of brands/vehicles to make proof of concept
- integration with VIN number to pull vehicle data history
- over engineered and cluttered
- auto approval of invoices for service or commitment to any work without user approval.

## Stack
No preference. Propose the simplest stack for this product and wait for approval before creating files.

## Commands
After the app first runs, write the install, run and test commands here and keep them current.

- Needs: Node.js LTS (`winget install --id OpenJS.NodeJS.LTS -e`)
- Install: `npm install`
- Run: `npm start`, then open http://localhost:3000 (stop with Ctrl+C)
- Test: no automated tests yet; click through acceptance-test.md in the running app

## Data and secrets
- Never write an API key, password or token into code, chat or a file that is saved to GitHub. Read keys from environment variables.
- Keep .env in .gitignore. Maintain .env.example with the key names and no values.
- Use made-up sample data. Do not add real personal or confidential data.
- Every database table has an access rule. A visitor who is not signed in can read or change nothing except what PRD.md says is public.
- If the app has no login, store sample data only and say so in the README.
- Calls to an AI service go through the server side, so the key never reaches the browser.

## At the end of a session, when asked
- Add an entry to build-log.md: date, request, what was built, decisions, known problems, next step.
- Update README.md only when we ask for it.
- Change only the Commands section of this file. Propose any other change and wait.
