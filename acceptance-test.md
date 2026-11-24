# Acceptance tests: Auto-Mobile

Each test is one action and the result we expect to see. A person runs every test by clicking in the app before a milestone is called done. Write the date and your name in the last two columns.

| ID | Do this | Expect this | Last run | Run by |
|----|---------|-------------|----------|--------|
| T1 | Paste "I received this quote from the dealer for $200 dollars to replace my air filter is that worth it?" | Check for standard pricing in local area for air filter replacement to provide recommendation of reasonability to user. | | |
| T2 | Paste "my 2025 toyota rav4 has 7000km, what can i expect for my next service appointment" | Find 2025 Toyota Rav4 service level intervals from official manuals and service recommendations to provide information. | | |
| T3 | Paste "My brakes are reported to be 1mm and recommended to be replaced immediately, am I ok to leave them?" | Check official recommendations, but ensure anything safety related is immediately flagged, legal liability disclaimer provided and prompt for user to follow up with trained professional if unsure. | | |
| T4 | submit with an empty box | message prompting user to fill in info | | |
| T5 | Paste "tell me about my service history" | provide user with detailed list of service history that has been uploaded .  Split history with confirmed work and recommended. | | |
| T6 | I have a 2026 Toyota Rav4 Hybrid | Clarify trim and details and request mileage to pull appropriate official manuals and documents. | | |
| T7 | add an item | when page is reloaded new data should be loaded | | |
| T8 | Submit with letters instead of numbers for mileage | Should not be allowed, should redirect user to enter numerical input | | |
