# PRD: Auto-Mobile

Team: Team 5 | Course: ENTI 633, Fall 2026 | Last updated: 2026-11-25

This file is the source of truth for the product. If a request conflicts with it, change this file first.

## 1. Pitch
A personalized maintenance minder app for someone's vehicle, provides recommendations based on factory service milestones.  Advises user on recommended work importance and difficulty to DIY.

The app connects to the car, so it knows the mileage without the user typing it in. With the factory schedule and the service history it shows what is due now and what is coming next, with an estimated date. When the dealer recommends work, the user asks the app: it checks the recommendation and quote against the car's schedule, history, owner's manual and local prices, and rates how hard it is to do yourself.

## 2. Problem and user
**User.** Personal vehicle owner with varying ranges of automotive knowledge and handiness skill.

**Problem.** Vehicle repair recommendations are presented to user and they have no way of verifying validity, complexity of problems and rely on quotes from dealer/mechanic blindly. Owners also don't know what is due until the dealer tells them, so the dealer sets the agenda.

**Today.** Ask others for opinions, research online, go for a second opinion at dealer/mechanic.

**Evidence.** Recommendations are flagged as critical repairs and quoted at a higher rate than could be fixed by user themselves or at a different provider.  Customer ends up paying more or replaces/repairs issues that did not have to be done yet.

**Why an app and not a chat.** Anyone can paste their car, mileage, history and quote into a chat like Claude and get a similar answer. A chat cannot:
- warn the owner before they ask. The app knows the mileage (from the car) and the schedule, so it shows what is due.
- keep the history working. The owner still enters the service history, but only once, and every entry updates what is due.
- reliably use the right manual. Manuals are hard to find on manufacturer websites; the app has the owner's manual for the exact car and cites its pages.

## 3. Main user task
**Task A: Know what is due (the minder).**
1. The app reads the car's mileage (simulated in the prototype).
2. It compares the mileage, the car's age and the service history with the factory schedule.
3. The main screen shows what is due now and what is next, at which mileage, with an estimated date based on how much the owner drives.

**Task B: Check a dealer recommendation or quote.**

**Start.** I went to take my car into the dealer for an oil change and they did their standard inspection.  Provided me with "critical" repair/replacement recommendations and a quote.  Specifically, gave me a replace cabin and engine air filter for $170.  Not sure if that is a good price, or if I could do it myself easily for cheaper.

1. user uploads or prompts with recommended service/repair and cost estimate if available.
2. product checks current mileage and recommended service, compares with other sources to provide recommendation.
3. product provides commentary on importance of service/repair with estimated cost.
4. Product provides estimated cost to compare to give user a base line.
5. product also provides user with estimated difficulty to remedy task on DIY scale
6. Prompts user to decide if further information on costing or parts/tools required is necessary
7. Resulting response from user dictates products response of additional tools and resources for diy or additional documents/info for pricing research.

**Result.** The user quickly understands if service/repair is normal or expected.  Also, understands if the cost suitability, as well as gives user ability to determine if service/repair is something they could DIY for cheaper.

## 4. Scope
### Must have
- F1 Legal disclaimer protecting product and company of liability and recommendation to get professional advice and review.
- F2 Repository of factory technical manuals and recommended service intervals. The maintenance schedule is converted from Toyota Canada's official maintenance schedule (in km) into structured data by AI, then checked by a second, independent read of the PDF that compares every item at every service visit (no human check in the prototype). Each schedule item keeps its page as the source. The owner's manual is stored as searchable pages.
- F3 user interface that allows information for vehicles to be entered to reference manuals and recommended service. Based on mileage input.
- F4 sourced links to any information presented as facts
- F5 logged history of vehicle to use as a reference source. New entries are picked from a list of services, so each one updates what is due.
- F6 "What's due" panel on the main screen: due now, and next items with mileage and estimated date. Items are due by distance (km) only; the date is an estimate from how much the owner drives. (Prototype simplification: Toyota's "every 6 months" time limit is not used, so low-mileage drivers may be told later than Toyota requires.)
- F7 Simulated car connection: mileage readings come from sample data and the screen says "Connected car (simulated)". A "Simulate a week of driving" button moves the simulated date forward and adds kilometres, for the demo. The user can still correct the mileage by hand.
- F8 Mileage prediction: the app estimates when each next item will be due from the average distance driven.
- F9 The AI gets the app's context: current mileage, the due list, the schedule and the service history. It looks things up in the owner's manual first and searches the web only for prices, DIY guides and owner forum posts.

### Nice to have (cut first if short on time)
- The question box remembers the conversation, so the user can ask follow-up questions.
- Later: upload a photo of an invoice and the AI fills in the service history.

### Will not build
- full repository of all brands, will start with small number of brands/vehicles to make proof of concept
- integration with VIN number to pull vehicle data history
- over engineered and cluttered
- auto approval of invoices for service or commitment to any work without user approval.
- a real connection to the car. The prototype uses simulated mileage readings only.
- the "severe driving conditions" schedule (towing, dusty roads, short trips). Normal conditions only.

### Look and layout
Works on phone, clean and modern with simple trendy look with no major clutter and smooth user experience flow.

## 5. AI in the product
**Role.** Agentic. The AI takes several steps or uses tools on its own.

**What the AI does.** Reads and interprets user prompt or loaded service quote.  AI will evaluate information and cross check it with the official technical manuals and service for the vehicle.  Also, compare with any historical data for that vehicle, provide additional information like forum posts were available.  Provide the user with an estimate of costs and reasonability of quote.  Provide user with a realistic complexity scale if DIY to service/repair and offer links to guides and videos.  prompt user for follow ups to aid in review and decision.

**What the AI does not do.** The due list is worked out by normal code, not by the AI, so it is the same every time and works without the AI. The AI is used (1) once per maintenance guide, to convert the schedule into structured data, and (2) to answer the user's questions, using the app's context and the owner's manual first and web search second.

**When the AI is wrong or unavailable.** Recommendations and facts should include links to sources, when AI cannot find the answer it should immediately ask user for further information rather than provide partial data.  all sources and recommendations can be reported to developers for correction.

## 6. Data, privacy and security
**Data.** Product will have access to uploaded documents and data provided by user.  Examples include vehicle make, model and year.  As well as service and maintenance history.  Uploaded documents will also include contact information and service history and quotes.  None of this data should be sent or shared without user permission.

The mileage readings from the "car" are made-up sample data. The schedule and manual come from Toyota's published documents, with page references. The manual PDFs are not saved to GitHub (too large, and Toyota owns them); the manual text is, so the repository must stay private.

**Personal or confidential data.** Yes.

**Safeguards.** No real tenant names or phone numbers in the demo. The AI service key is stored in the builder's Secrets panel. The README states that the app is a course prototype.

## 7. Acceptance tests
13 tests in acceptance-test.md (T1–T8 original, T9–T13 for the minder and the manual). The product is done when a person has clicked through all of them and each one passes.

## 8. Milestones
- M0 Skeleton: the app opens and shows the main screen with made-up sample data
- M1 Main task: the whole user task works from start to result, without AI yet
- M2 AI feature: the AI part works, and the app copes when the AI is wrong or unavailable
- M3 Edges: empty inputs, error messages, and data still there after a reload
- M4 Ship: README, test results, screenshots, and a published link or a rehearsed laptop demo
- M5a Minder: simulated car, "What's due" panel with estimated dates, history picked from a list, using the sample schedule (works without AI)
- M5b Real schedule: the schedule converted from the official Toyota maintenance guide and double-checked by a second AI read; the owner's manual turned into searchable pages
- M6 AI with context: the AI uses the due list, schedule, history and owner's manual; manual first, web second (needs an API key)

## 9. Team and builder
**Main builder.** Claude Code

**Who does what.**
- Builder: Joel (owns the Claude account and sends the prompts)
- Spec keeper: Ray (edits the spec form and PRD.md)
- Tester: Linus(clicks through every test before each saved version)
- Log keeper: Jill (build-log.md and screenshots)

## 10. Open questions
- Does the manager want a weekly summary? Ask in the next interview.
- How would a real product get the mileage from the car (car data services, a plug-in device in the car's diagnostic port, the car maker's app)? This is the main business risk.
- Interview question: "Would you just ask ChatGPT or Claude instead?"
- Should the app later ask about severe driving conditions?
