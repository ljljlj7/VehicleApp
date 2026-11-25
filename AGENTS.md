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

- Needs: Node.js 22.9 or newer (LTS) and Git. Windows: `winget install --id OpenJS.NodeJS.LTS -e` and `winget install --id Git.Git -e`. Mac: the LTS installer from nodejs.org or `brew install node`.
- Get the code: `git clone https://github.com/ljljlj7/VehicleApp.git` (private repository; the user must be invited and signed in to GitHub).
- Install: `npm install` (Windows PowerShell: `npm.cmd install`, because plain `npm` is blocked by its script setting)
- Run: `npm start` (Windows PowerShell: `npm.cmd start`), then open http://localhost:3000; stop with Ctrl+C. It prints `AI: off` without a key; that is expected.
- Run in GitHub Codespaces: on github.com/ljljlj7/VehicleApp click Code → Codespaces → Create codespace on main, type `npm start`, then Ports tab → port 3000 → globe icon to open it in a browser tab.
- Update an existing copy: stop the app, `git checkout -- data/db.json`, `git pull`, `npm install`, start again.
- Reset the sample data: the "Reset demo" button in the app (or `git checkout -- data/db.json`).
- AI key (optional): local `.env` (copy `.env.example`), never uploaded; or GitHub → Settings → Codespaces → Secrets → `ANTHROPIC_API_KEY` for repository `ljljlj7/VehicleApp`, then restart the codespace. Without a key the app uses built-in rules.
- Test: no automated tests; click through acceptance-test.md (T1–T17) in the running app; expected results are in test-results.md.
- Setting it up for a teammate to test: install and start only; do not change, commit or push project files.

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
