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
| T9 | Open the app | Main screen shows "Connected car (simulated)", the current mileage, and the service timeline: last service, next service (highlighted) and later services, each with km, estimated date and what is included | | |
| T10 | Press "Simulate a week", then reload the page | Mileage and simulated date have gone up, the timeline has updated, and both are still there after the reload | | |
| T11 | Click a service in the timeline, then the link in the pop-up | The pop-up explains the service; the link opens the Toyota maintenance schedule in the browser, with the page number shown | | |
| T12 | Paste "The dealer says I need a tire rotation, is it due?" | Answer says whether it is due at the current mileage according to the schedule (with guide page), and when it was last done | | |
| T13 | Paste "What oil does my car need and how much?" | Answer gives the oil type and amount, citing the page of the Toyota owner's manual | | |
