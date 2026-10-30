# WA Lodging Tax Grants (LTAC)

Single-page site listing LTAC grant programs for all 219 Washington cities and counties that levy a lodging tax (every jurisdiction in JLARC's reporting list): funding cycle (annual, twice a year, rolling, biennial, none), application deadlines, presentation requirements, committee rosters, staff contacts, funding guidance documents (guidelines, resolutions, award lists), and alternative funding routes where a jurisdiction has no open LTAC pool.

- `index.html` is the whole site. The data is embedded in the `<script id="data">` block near the bottom.
- `data.json` is the same data as a standalone file for editing. After editing it, paste the contents into the `<script id="data" type="application/json">` block in `index.html`.
- The "today" date used for open/closed status comes from the `asof` field in the `<script id="meta">` block. Update it when refreshing the data.
- The site has seven views, routed by URL hash: `#directory`, `#map`, `#finder`, `#kit`, `#benchmarks`, `#guidelines`, `#board`. `#j-<slug>` jumps to one jurisdiction's card.

Data was compiled from official city and county pages, application packets, agendas and minutes as of October 29, 2026. Each record carries a `confidence` field and a `members_as_of` date.

## Follow lists and sorting

- Every card has a Follow button; "My list" in the toolbar shows only followed jurisdictions. The Sort menu orders by soonest deadline, most dollars open to applicants, largest total fund, or name.
- On the claude.ai artifact version, visitors enter an email to create or open their own list. Lists are stored in the artifact's shared data store under `lists/<email>` as `{email, follows[], created, lastSeen, visits, userId}`. Saving requires the visitor to be signed in to claude.ai with at least Contributor ("can interact") access to the artifact. To see who has a list, ask Claude for an export of the `lists` collection.
- On the Netlify copy, lists, board posts and corrections are stored in Netlify Blobs through the serverless function in `netlify/functions/store.mjs` (served at `/api/store`). Visitors browse freely; they are asked for an email only when they tap Follow. Export: `GET /api/store?c=lists&export=1&key=<ADMIN_KEY>` (same for `board` and `corrections`). `ADMIN_KEY` is an environment variable set in the Netlify site settings; exports are disabled until it is set.

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
- **Top events**: the 300 largest lodging-tax-funded events ranked by reported paid room nights (or attendance, tax dollars, dollars per night), with organizer, every funder, and estimate-versus-actual from each year's post-event report. Built from `jlarc/events.json`, which groups Event/Festival rows by organizer and activity name, merges name variants, counts nights once across co-funders, and drops marketing and facility contracts filed as events.
- **Other funding**: a catalog of non-lodging-tax programs (TPAs, arts commissions, city event funds, port districts, community and corporate foundations, tribal funds, state and federal programs) from `grants/statewide.json` and `grants/local.json` plus the per-card alternatives. A finder takes a location, event type, applicant type and timing and returns city, county, regional and statewide programs with next deadlines; a calendar lists every posted future deadline and the rolling programs.
- **Guidelines**: the statute and MRSC summary plus a model set of LTAC guidelines a city can adopt.
- **Board**: cities post what events they want; producers post what they bring. Posts are stored in the artifact's `board` collection (public read, contributor write). On the static copy posts stay in the browser only.

## JLARC award history

`jlarc/normalized.json` holds 4,985 rows from the Joint Legislative Audit and Review Committee's lodging tax reporting (years 2022 to 2024), downloaded from https://leg.wa.gov/media/du0f2rmj/alldata2025.xlsx. Fields: year, jurisdiction, recipient, activity_type (Event/Festival, Marketing, Facility), amount_awarded, attendance and overnight figures, paid_lodging_nights and predicted variants, attendance_method, recipient_is_jurisdiction. `jlarc/compliance_2022_2024.json` lists which jurisdictions reported each year.

Caveats: figures are self-reported by recipients; about a quarter of rows have no lodging-night figure; 19 jurisdictions did not report for 2024; Seattle and King County have no rows. Room nights on cards and benchmarks count only Event/Festival recipients because marketing and facility recipients (DMOs, chambers) report county-wide totals. Rows where the recipient is the jurisdiction itself are excluded from award counts.

## 2025 and 2026 award lists

`awards2526/out_*.json` hold award lists for funding years 2025 and 2026 (and 2027 where decided) pulled from council and commissioner minutes, LTAC recommendation memos, resolutions and local news for the 128 programs, since JLARC suspended 2025 reporting. They appear on cards as "minutes" rows in the award history table, in the jurisdiction detail view, and in event details where the recipient matches.

## Corrections and deadline reminders

- "Report a correction" on a card writes to the artifact's `corrections` collection. Ask Claude for an export to review them.
- Visitors who sign in with an email on the artifact get reminder emails 30, 14 and 3 days before each deadline on their follow list, sent by a weekly scheduled task that reads the `lists` collection and this repo's `data.json`.
