# WA Lodging Tax Grants (LTAC)

Single-page site listing LTAC grant programs for the 100 Washington cities and counties with the most hotel tax revenue, plus Poulsbo: funding cycle (annual, twice a year, rolling, biennial, none), application deadlines, presentation requirements, committee rosters, staff contacts, funding guidance documents (guidelines, resolutions, award lists), and alternative funding routes where a jurisdiction has no open LTAC pool.

- `index.html` is the whole site. The data is embedded in the `<script id="data">` block near the bottom.
- `data.json` is the same data as a standalone file for editing. After editing it, paste the contents into the `<script id="data" type="application/json">` block in `index.html`.
- The "today" date used for open/closed status comes from the `asof` field in the `<script id="meta">` block. Update it when refreshing the data.
- The site has seven views, routed by URL hash: `#directory`, `#map`, `#finder`, `#kit`, `#benchmarks`, `#guidelines`, `#board`. `#j-<slug>` jumps to one jurisdiction's card.

Data was compiled from official city and county pages, application packets, agendas and minutes as of October 29, 2026. Each record carries a `confidence` field and a `members_as_of` date.

## Follow lists and sorting

- Every card has a Follow button; "My list" in the toolbar shows only followed jurisdictions. The Sort menu orders by soonest deadline, most dollars open to applicants, largest total fund, or name.
- On the claude.ai artifact version, visitors enter an email to create or open their own list. Lists are stored in the artifact's shared data store under `lists/<email>` as `{email, follows[], created, lastSeen, visits, userId}`. Saving requires the visitor to be signed in to claude.ai with at least Contributor ("can interact") access to the artifact. To see who has a list, ask Claude for an export of the `lists` collection.
- On this static copy (Netlify), lists are saved in the browser's local storage only and no email is collected.

## Pool fields

- `total_pool_usd`: total lodging tax available for allocation in the latest cycle.
- `competitive_pool_usd`: dollars actually awarded or open to outside applicants after standing commitments (DMO contracts, debt, the jurisdiction's own facilities). `pool_note` shows the arithmetic and whether it is an estimate.

## For-profit eligibility

`for_profit` per record: `yes` (program text admits businesses), `sponsor` (for-profits apply through a nonprofit or public fiscal sponsor), `no` (local guidelines say nonprofit/public only), `unknown` (not stated). The site's "What hotel tax dollars can legally fund" section summarizes RCW 67.28.1816 and .1817 and MRSC's guidance that the statute does not bar for-profit applicants.

## Views

- **Directory**: the searchable, sortable cards. Each card shows its last-verified date and a "Report a correction" link.
- **Map**: WA counties colored by program status, dollars open to applicants, or room nights reported; city dots sized by competitive pool.
- **Finder**: describe an event (county, timing, budget, overnight draw, for-profit status) and get ranked programs with a reason for each.
- **Application kit**: a room-night and visitor estimator, a budget template with totals and a reduced-award table, and a post-event report template, all copyable.
- **Benchmarks**: charts and a sortable table comparing pools, award counts, event award sizes, event room nights and event dollars per room night.
- **Guidelines**: the statute and MRSC summary plus a model set of LTAC guidelines a city can adopt.
- **Board**: cities post what events they want; producers post what they bring. Posts are stored in the artifact's `board` collection (public read, contributor write). On the static copy posts stay in the browser only.

## JLARC award history

`jlarc/normalized.json` holds 4,985 rows from the Joint Legislative Audit and Review Committee's lodging tax reporting (years 2022 to 2024), downloaded from https://leg.wa.gov/media/du0f2rmj/alldata2025.xlsx. Fields: year, jurisdiction, recipient, activity_type (Event/Festival, Marketing, Facility), amount_awarded, attendance and overnight figures, paid_lodging_nights and predicted variants, attendance_method, recipient_is_jurisdiction. `jlarc/compliance_2022_2024.json` lists which jurisdictions reported each year.

Caveats: figures are self-reported by recipients; about a quarter of rows have no lodging-night figure; 19 jurisdictions did not report for 2024; Seattle and King County have no rows. Room nights on cards and benchmarks count only Event/Festival recipients because marketing and facility recipients (DMOs, chambers) report county-wide totals. Rows where the recipient is the jurisdiction itself are excluded from award counts.

## Corrections and deadline reminders

- "Report a correction" on a card writes to the artifact's `corrections` collection. Ask Claude for an export to review them.
- Visitors who sign in with an email on the artifact get reminder emails 30, 14 and 3 days before each deadline on their follow list, sent by a weekly scheduled task that reads the `lists` collection and this repo's `data.json`.
