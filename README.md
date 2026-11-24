# PRD: Auto-Mobile

Team: Team 5 | Course: ENTI 633, Fall 2026 | Last updated: 2026-11-24

This file is the source of truth for the product. If a request conflicts with it, change this file first.

## 1. Pitch
A personalized maintenance minder app for someone's vehicle, provides recommendations based on factory service milestones.  Advises user on recommended work importance and difficulty to DIY.

## 2. Problem and user
**User.** Personal vehicle owner with varying ranges of automotive knowledge and handiness skill.

**Problem.** Vehicle repair recommendations are presented to user and they have no way of verifying validity, complexity of problems and rely on quotes from dealer/mechanic blindly

**Today.** Ask others for opinions, research online, go for a second opinion at dealer/mechanic.

**Evidence.** Recommendations are flagged as critical repairs and quoted at a higher rate than could be fixed by user themselves or at a different provider.  Customer ends up paying more or replaces/repairs issues that did not have to be done yet.

## 3. Main user task
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
- F2 Repository of factory technical manuals and recommended service intervals.
- F3 user interface that allows information for vehicles to be entered to reference manuals and recommended service. Based on mileage input.
- F4 sourced links to any information presented as facts
- F5 logged history of vehicle to use as a reference source.

### Will not build
- full repository of all brands, will start with small number of brands/vehicles to make proof of concept
- integration with VIN number to pull vehicle data history
- over engineered and cluttered
- auto approval of invoices for service or commitment to any work without user approval.

### Look and layout
Works on phone, clean and modern with simple trendy look with no major clutter and smooth user experience flow.

## 5. AI in the product
**Role.** Agentic. The AI takes several steps or uses tools on its own.

**What the AI does.** Reads and interprets user prompt or loaded service quote.  AI will evaluate information and cross check it with the official technical manuals and service for the vehicle.  Also, compare with any historical data for that vehicle, provide additional information like forum posts were available.  Provide the user with an estimate of costs and reasonability of quote.  Provide user with a realistic complexity scale if DIY to service/repair and offer links to guides and videos.  prompt user for follow ups to aid in review and decision.

**When the AI is wrong or unavailable.** Recommendations and facts should include links to sources, when AI cannot find the answer it should immediately ask user for further information rather than provide partial data.  all sources and recommendations can be reported to developers for correction.

## 6. Data, privacy and security
**Data.** Product will have access to uploaded documents and data provided by user.  Examples include vehicle make, model and year.  As well as service and maintenance history.  Uploaded documents will also include contact information and service history and quotes.  None of this data should be sent or shared without user permission.

**Personal or confidential data.** Yes.

**Safeguards.** No real tenant names or phone numbers in the demo. The AI service key is stored in the builder's Secrets panel. The README states that the app is a course prototype.

## 7. Acceptance tests
8 tests in acceptance-tests.md. The product is done when a person has clicked through all of them and each one passes.

## 8. Milestones
- M0 Skeleton: the app opens and shows the main screen with made-up sample data
- M1 Main task: the whole user task works from start to result, without AI yet
- M2 AI feature: the AI part works, and the app copes when the AI is wrong or unavailable
- M3 Edges: empty inputs, error messages, and data still there after a reload
- M4 Ship: README, test results, screenshots, and a published link or a rehearsed laptop demo

## 9. Team and builder
**Main builder.** Claude Code

**Who does what.**
- Builder: Joel (owns the Claude account and sends the prompts)
- Spec keeper: Ray (edits the spec form and PRD.md)
- Tester: Linus(clicks through every test before each saved version)
- Log keeper: Jill (build-log.md and screenshots)

## 10. Open questions
- Does the manager want a weekly summary? Ask in the next interview.
