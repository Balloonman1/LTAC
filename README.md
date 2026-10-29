# WA Lodging Tax Grants (LTAC)

Single-page site listing LTAC grant programs for the 100 Washington cities and counties with the most hotel tax revenue, plus Poulsbo: funding cycle (annual, twice a year, rolling, biennial, none), application deadlines, presentation requirements, committee rosters, staff contacts, funding guidance documents (guidelines, resolutions, award lists), and alternative funding routes where a jurisdiction has no open LTAC pool.

- `index.html` is the whole site. The data is embedded in the `<script id="data">` block near the bottom.
- `data.json` is the same data as a standalone file for editing. After editing it, paste the contents into the `<script id="data" type="application/json">` block in `index.html`.
- The "today" date used for open/closed status is set at the top of the script (`const TODAY`). Update it when refreshing the data.

Data was compiled from official city and county pages, application packets, agendas and minutes as of October 29, 2026. Each record carries a `confidence` field and a `members_as_of` date.

## Follow lists and sorting

- Every card has a Follow button; "My list" in the toolbar shows only followed jurisdictions. The Sort menu orders by soonest deadline, most dollars open to applicants, largest total fund, or name.
- On the claude.ai artifact version, visitors enter an email to create or open their own list. Lists are stored in the artifact's shared data store under `lists/<email>` as `{email, follows[], created, lastSeen, visits, userId}`. Saving requires the visitor to be signed in to claude.ai with at least Contributor ("can interact") access to the artifact. To see who has a list, ask Claude for an export of the `lists` collection.
- On this static copy (Netlify), lists are saved in the browser's local storage only and no email is collected.

## Pool fields

- `total_pool_usd`: total lodging tax available for allocation in the latest cycle.
- `competitive_pool_usd`: dollars actually awarded or open to outside applicants after standing commitments (DMO contracts, debt, the jurisdiction's own facilities). `pool_note` shows the arithmetic and whether it is an estimate.
