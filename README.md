# WA Lodging Tax Grants (LTAC)

Single-page site listing LTAC grant programs for the 100 Washington cities and counties with the most hotel tax revenue, plus Poulsbo: funding cycle (annual, twice a year, rolling, biennial, none), application deadlines, presentation requirements, committee rosters, staff contacts, funding guidance documents (guidelines, resolutions, award lists), and alternative funding routes where a jurisdiction has no open LTAC pool.

- `index.html` is the whole site. The data is embedded in the `<script id="data">` block near the bottom.
- `data.json` is the same data as a standalone file for editing. After editing it, paste the contents into the `<script id="data" type="application/json">` block in `index.html`.
- The "today" date used for open/closed status is set at the top of the script (`const TODAY`). Update it when refreshing the data.

Data was compiled from official city and county pages, application packets, agendas and minutes as of October 29, 2026. Each record carries a `confidence` field and a `members_as_of` date.
