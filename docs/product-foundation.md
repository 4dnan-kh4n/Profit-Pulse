# Profit Pulse — Product Foundation

This document records the product decisions needed before building signup, onboarding, and the analytics API. The first release accepts manual entries. It does not depend on point-of-sale, accounting, payroll, fuel-price, or competitor-data integrations.

## Product promise

Profit Pulse helps a small-business owner understand where money comes from, where it goes, what needs attention, and what they could check next. It explains the evidence behind each suggestion. It does not promise savings or business growth.

## Users and business selection

The primary user is an owner or manager entering information for one business. The account may later support multiple businesses, but the first version should begin with one business per account unless implementation time allows a clean multi-business model.

Onboarding flow:

1. Select a broad category: Retail, Food, Personal services, Transport, Manufacturing, Professional services, Agriculture, Other.
2. Select a business type from a searchable list filtered by category (for example Retail → Grocery shop; Personal services → Salon; Transport → Trucking / local delivery).
3. If the exact type is missing, choose “Other in this category” and enter a short business name.
4. Show a plain-language confirmation: “We’ll ask about [business type]. Is this right?” Allow the owner to change it.
5. Ask shared questions, then show only relevant category questions. Let users skip nonessential questions and mark unknown values as “I don’t know.”

Detailed demo questionnaires: grocery shop, salon, and transport. Other business types use the shared business and expense questions, optional custom expense categories, and a clear “limited insights” state until a tailored questionnaire exists. Do not show diesel, inventory, appointment, or production questions to unrelated businesses.

## Data entry cadence

Use monthly reporting periods for the first release. The owner can create a period, enter totals, save a draft, and mark it complete. Every amount stores a currency code and period. Keep quantity units explicit (litres, items, trips, hours, vehicles). Do not silently combine different periods or currencies.

### Shared questions (all businesses)

Required to create a useful basic monthly summary:

| Field | Input | Rule / purpose |
|---|---|---|
| Business name and type | Short answer + selected type | Business identity and question routing |
| Reporting month | Month selector | Enables period comparison |
| Currency | Dropdown | Default INR for this project; owner can change it |
| Total sales / revenue | Amount | Non-negative; can be marked unknown |
| Other income | Amount, optional | Kept separate from sales |
| Expense categories and amounts | Repeatable category + amount | Rent, wages, utilities, supplies, repairs, fees, other; custom category allowed |
| Employee count | Whole number, optional | Context only; do not infer salary from headcount |
| Total wages paid | Amount, optional | Prefer actual monthly total over estimating from headcount |
| Notes | Short answer, optional | Explain unusual events or estimates |

Ask owners whether amounts are exact or estimated. Record the answer and data completeness so insights can be qualified.

### Grocery shop questions

Shared questions plus:

- Number of products tracked (optional, for scope only).
- For each tracked item: item name, quantity bought, purchase cost per unit, quantity sold, quantity remaining, selling price per unit, and low-stock level.
- Optional stock loss / expiry amount for the month.
- Stock unit (each, kg, litre, pack, or custom).

Minimum useful stock insight: item name, reporting period, opening or purchased quantity, quantity sold or closing quantity, and purchase cost. If opening/closing values are missing, do not label an item slow-moving; report that the data is incomplete.

### Salon questions

Shared questions plus:

- Appointments completed and cancelled (optional).
- Available appointment hours and booked hours (optional).
- Service name, count, and price (optional detail).
- Products / consumables bought and used, with amount and unit (optional).
- Employee wages remain a direct entered total; employee count is context only.

Minimum useful capacity insight: available hours and booked hours for the same period. Minimum useful service insight: service name, count, and price. Do not infer demand from revenue alone.

### Transport questions

Shared questions plus:

- Vehicle count and vehicle identifier/name.
- Trips completed per vehicle (optional).
- Distance or kilometres per vehicle (optional).
- Fuel quantity and total fuel cost; optionally price per litre and litres purchased.
- Driver count and total driver pay; optionally pay per driver.
- Repairs and maintenance by vehicle, amount, and date/month.
- Other trip-linked costs (tolls, permits, loading) as optional categories.

Minimum useful fuel-cost insight: fuel quantity and total cost, or a directly entered period fuel total. Price-per-litre comparisons require litres and total spend from the same period. Driver-pay comparisons require number of drivers and total driver pay. Never claim market rates without a verified, dated benchmark dataset.

## Analytics rules

All arithmetic is deterministic and calculated from saved values. AI may explain a finding in simple language, but may not invent or alter figures.

- Total income = sales + other income.
- Total expenses = sum of entered expense amounts. Avoid double-counting wages or stock if the owner has included them in another total; use categories and explain what is included.
- Estimated operating remainder = total income − total expenses. Label this “money left before unentered costs” when completeness is unknown; it is not necessarily accounting profit.
- Expense share = category amount ÷ total expenses, only when total expenses > 0.
- Revenue change = (current period − previous period) ÷ previous period, only if both periods exist and previous period > 0.
- Inventory estimated value = quantity on hand × purchase cost per unit, only when both are known and units match.
- Low stock = current quantity ≤ owner’s low-stock level.
- Vehicle fuel unit cost = fuel spend ÷ litres, only when litres > 0 and period/currency align.
- Employee average pay may be shown only when employee count > 0 and total wages are known; label as a simple average, not a market comparison.

Never calculate a percentage from a zero denominator. Missing values stay missing rather than becoming zero. Show which inputs were used and identify estimated or incomplete data.

## Recommendation rules

Generate a small set of rule-based findings first. AI can turn each finding into a short explanation with: evidence, why it may matter, one next check, and a confidence/data-quality note.

Examples:

- Grocery: “Six tracked items are at or below your low-stock level.” Evidence: item quantities and owner-set thresholds. Next check: confirm counts before reordering.
- Grocery: “Fresh stock is your largest recorded cost.” Evidence: category totals. Next check: compare purchase and sales records for the same month. Do not assume it is waste.
- Salon: “22 available hours were not booked.” Evidence: available hours minus booked hours. Next check: compare quiet times with appointment history. Do not promise an offer will fill them.
- Transport: “Fuel cost per litre is higher than last month.” Evidence: same-currency fuel totals and litres in both periods. Next check: verify receipts, fuel volume, and route mix before changing suppliers.
- Transport: “Repairs increased for vehicle X.” Evidence: repair entries by vehicle across two periods. Next check: inspect the repair records and vehicle condition.

Without enough or reliable data, say “Not enough information yet,” state which fields are missing, and suppress the recommendation. Never compare one owner with unnamed “other businesses” unless the product has a documented, current, like-for-like data source and shows its scope and date.

## Initial data model

- `User`: email, password hash / auth provider, display name, timestamps.
- `Business`: owner user ID, name, category ID, business type ID, custom type label, currency, location context if volunteered, timestamps.
- `ReportingPeriod`: business ID, month, status (draft/complete), completeness and estimate metadata.
- `FinancialEntry`: business ID, period ID, kind (revenue/expense), category, amount, currency, note, estimated flag.
- `EmployeeSummary`: business ID, period ID, employee count, total wages, estimated flag. Avoid storing employee names or personal payroll details in the MVP.
- `InventoryItem` and `InventorySnapshot`: business ID, item metadata/unit/threshold; period, opening/bought/sold/closing quantities, unit cost, optional sales price.
- `BusinessActivityEntry`: business ID, period ID, activity type (appointment/trip/vehicle/fuel/repair), optional entity label, quantity/unit, amount/currency, note.
- `Insight`: business ID, period ID, rule ID, evidence snapshot, explanation, confidence, missing-data list, created timestamp.

Every business-owned record must be authorized through the authenticated owner’s business ID. Never trust a client-supplied business ID without checking ownership on the server.

## API areas (initial plan)

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/business-types?category=...`
- `POST /api/businesses`, `GET /api/businesses/current`, `PATCH /api/businesses/current`
- `GET /api/assessment/questions?businessType=...`
- `POST /api/periods`, `GET /api/periods`, `GET /api/periods/:periodId`, `PATCH /api/periods/:periodId`
- `PUT /api/periods/:periodId/financial-entries`
- `PUT /api/periods/:periodId/employees`
- `PUT /api/periods/:periodId/inventory`
- `PUT /api/periods/:periodId/activity`
- `GET /api/analytics/summary?period=...`, `GET /api/analytics/trends`, `GET /api/insights?period=...`

Use consistent validation and error responses. Enforce authentication, ownership, allowed enums, numeric bounds, currency, and period matching on the server.

## MVP acceptance criteria

- An owner can choose and confirm a business type; questions match that type.
- “Other” businesses can record shared income and expenses without seeing irrelevant specialist questions.
- The owner can save and edit a monthly period with exact or estimated values.
- Dashboard totals match the entered values and clearly explain their meaning.
- Missing data is visible and never silently treated as zero.
- Recommendations show their evidence and next check, or explain what information is missing.
- A user cannot read or change another business’s records by changing a URL or request ID.
- The flow works on mobile, has loading/empty/error states, and does not require analytics expertise.

## Immediate build sequence

1. Implement business category/type selection and confirmation using the taxonomy above.
2. Implement shared monthly questions and the three detailed demo questionnaires.
3. Store one draft reporting period and validate ownership and input constraints.
4. Add deterministic summary calculations and test their edge cases.
5. Show the dashboard and rule-based findings; add AI wording only after evidence and missing-data handling work.
