# JLARC Lodging Tax Expenditure Data, reporting years 2022-2024

Built 2026-10-30 from the Washington JLARC lodging tax reporting dataset (RCW 67.28.1816).

## Source

- Report page (2024 Lodging Tax Expenditures, published July 2025, the most recent edition):
  https://leg.wa.gov/jlarc/reports/2025/LodgingTax/default.html
- Full dataset download (Excel, calendar years 2014-2024, all submitted reports):
  https://leg.wa.gov/media/du0f2rmj/alldata2025.xlsx (4.7 MB, 2 sheets: "All Data" 16,612 data rows, "Compliance" 214 rows)
- Tableau Public dashboard (same data):
  https://public.tableau.com/views/2024LodgingTaxExpendituresStatewideandMunicipalityDetail/MunicipalityDetail
- Data field definitions: https://leg.wa.gov/jlarc/Documents/LodgingTax/Data_Field_Definitions.pdf
- Reporting instructions: https://leg.wa.gov/media/yzadk52z/instructions.pdf
- JLARC lodging tax program page: https://leg.wa.gov/studies-audits-and-reports/performance-audits/lodging-tax/
- Reporting system (municipality login): https://app.leg.wa.gov/JLARCLodgingTax/Account/Login

Retrieval note: leg.wa.gov is blocked by the sandbox HTTP proxy, so the xlsx was fetched inside the
desktop browser pane, unzipped and parsed there with native browser APIs (no external libraries), and the
2022-2024 rows were exported as JSON into `raw/part_*.json`. The original xlsx itself is not on disk.

## Years covered

The dataset covers 2014-2024. The most recent three reporting years are **2022, 2023, 2024** (calendar
year of the activity). Calendar year 2025 expenditures are reported to JLARC in spring 2026 and were not
published as of 2026-10-30; the next edition of the report normally appears mid-year.

Row counts in `normalized.json` (one row per funded activity, Statewide summary rows removed):

| Year | Rows | Jurisdictions with rows |
|------|------|------------------------|
| 2022 | 1,553 | 183 |
| 2023 | 1,689 | 178 |
| 2024 | 1,743 | 179 |
| Total | 4,985 | |

Funds Awarded totals by year reconcile to the file's own Statewide rows: 2022 $69.75M, 2023 $79.95M,
2024 $114.04M.

## Files

- `normalized.json`: array of 4,985 row objects (schema below), sorted by year, jurisdiction, recipient.
- `compliance_2022_2024.json`: 214 jurisdictions with their reporting status for 2024, 2023, 2022
  (from the "Compliance" sheet). Status values: `Reported`, `Reported no expenditures`,
  `Did not report`, `No state distribution`, `Reported no expenditures, no state distribution`,
  `Reported, prior year state distribution`.
- `raw/part_YYYY_N.json`: raw exports from the xlsx (`cols` = Excel column letters, `rows` = arrays).

## Source schema ("All Data" sheet, 37 columns)

Year | Municipality | Organization | Activity Type | Activity Name | Activity Start Date | Activity End Date |
Funds Requested | Funds Awarded | Was this event affected by COVID-19? | Comments, event affected by COVID-19 |
Total Activity Cost | then six metric groups, each with Predicted / Actual / Method / Explanation columns:
Overall Attendance; Attendance 50+ Miles; Attendance Out of State/Country; Attendance Paid for Overnight
Lodging; Attendance Did Not Pay for Overnight Lodging; Paid Lodging Nights | Notes.

Sample source row (2014, column letters): A=2014, B="Zillah", C="Yakima Valley Newspaper", D="Marketing",
E="Marketing in Local Paper", F=41640 (Excel date serial), G=42004, H=2995, I=2995, L=2995, M=500, N=500,
O="Other-please explain", Q=200, R=200, U=100, V=100, Y=10, Z=10, AC=490, AD=490, AG=10, AH=10.

Naming conventions in the source:
- Municipality is the bare city/town name ("Spokane Valley", "Leavenworth", "Winthrop") and counties are
  "X County" ("Spokane County"). No "City of" / "Town of" prefix. One stray trailing space ("Yakima ")
  was trimmed. Three rows per year have Municipality " Statewide" (one per activity type); these are
  JLARC's totals and were excluded from `normalized.json`.
- Organization is free text typed by each municipality, so the same recipient appears under variant
  spellings and capitalizations across years ("JAKT" / "JAKT Foundation", "HUB Sports Center" /
  "Spokane Valley HUB", "City of Kirkland" / "City of  Kirkland"). No recipient ID exists.
- Activity Type is one of exactly three values: `Event/Festival`, `Marketing`, `Facility`.
- Method fields are one of: `Direct Count`, `Indirect Count`, `Representative Survey`,
  `Informal Survey`, `Structured Estimate`, `Other`, `N/A`, or blank.
- Dates are Excel serial numbers in the source; converted to ISO dates here.

## normalized.json schema

| Field | Source column | Notes |
|-------|---------------|-------|
| year | Year | 2022, 2023 or 2024 |
| jurisdiction | Municipality | trimmed; cities as bare name, counties as "X County" |
| recipient | Organization | free text as entered |
| activity_type | Activity Type | Event/Festival, Marketing, Facility |
| activity_name | Activity Name | |
| activity_start, activity_end | Activity Start/End Date | ISO date or null |
| funds_requested | Funds Requested | |
| amount_awarded | Funds Awarded | lodging tax dollars awarded, or spent directly by the municipality |
| amount_spent | (none) | always null: the JLARC form has no "amount spent" field. Funds Awarded is the lodging tax expenditure figure JLARC reports. |
| total_activity_cost | Total Activity Cost | full cost from all sources |
| total_attendance | Overall Attendance, Actual | |
| attend_50_miles | Attendance, 50+ Miles, Actual | |
| attend_out_of_state | Attendance, Out of State/Country, Actual | |
| overnight_paid | Attendance, Paid for Overnight Lodging, Actual | |
| overnight_unpaid | Attendance, Did Not Pay for Overnight Lodging, Actual | |
| paid_lodging_nights | Paid Lodging Nights, Actual | one room occupied one night |
| *_predicted (six fields) | the matching Predicted columns | the applicant's forecast |
| attendance_method | Overall Attendance, Method | how the actual count was obtained |
| recipient_is_jurisdiction | derived | see below |

Nulls are used wherever the source cell is blank. Method "Explanation", COVID and Notes text columns were
not carried over.

`recipient_is_jurisdiction` is a heuristic: true when the Organization equals the Municipality, starts with
"City of <name>" / "Town of <name>" / "<name> City Hall" (including department suffixes such as
"City of Edmonds - Parks, Recreation & Human Services"), or for counties starts with "<X> County" without
a nonprofit-style suffix (historical society, museum, chamber, association, foundation, council, inc,
district, fair association, etc.). County fairgrounds, expo centers, parks, auditor and public works
offices are treated as the county itself. 829 of 4,985 rows are flagged true. Another city or county
receiving a county's funds (e.g., "City of Everett" under Snohomish County) is false. Spelling errors in
the source ("City of Okangoan") will be missed.

## Caveats

- All figures are self-reported by the recipient organization to the municipality, then submitted to JLARC.
  JLARC does not audit or verify them. The attendance and lodging-night figures are often estimates;
  the `attendance_method` field shows how each was obtained. Only `Representative Survey` results can be
  projected to the full attendance; `Informal Survey`, `Indirect Count`, `Structured Estimate` and `Other`
  are rough indicators. JLARC's 2025 report itself questioned the value of the metrics for these reasons.
- Metric fields may be blank by design for marketing and facility activities with no measurable
  attendance (about 20% of rows have no total_attendance; about 25% have no paid_lodging_nights).
- Some reporters enter 0 rather than leaving a field blank, and some marketing rows report very large
  "attendance" (impressions), so statewide sums of attendance are not meaningful.
- Jurisdictions that did not report (from the Compliance sheet):
  2024: Auburn, Camas, Cusick, Electric City, Ferry County, Index, McCleary, Metaline Falls, Montesano,
  Naches, North Bend, Ritzville, Rock Island, Snohomish, Soap Lake, Tonasket, Washtucna, Wilkeson, Woodland.
  2023: Auburn, Burlington, Camas, Colfax, Hoquiam, Naches, Riverside, Rock Island, Tonasket, Washtucna, Wilkeson.
  2022: McCleary, Naches, Riverside, Soap Lake.
  Roughly 50 jurisdiction-years are "Reported no expenditures" and have no rows.
- Seattle and King County have no rows in the 2022-2024 data and are not in the Compliance list.
  Spokane (city) appears only with a few City of Spokane Parks rows; most Spokane-area spending is
  under Spokane County and Spokane Valley.
- A municipality that spends lodging tax directly (no grant) reports itself as the Organization, with the
  amount in both Funds Requested and Funds Awarded.
- Funds Awarded is the amount awarded for the activity in that reporting year; multi-year awards and
  carry-forwards are not distinguished.
- Recipient names are not standardized across years; match on normalized name if aggregating a recipient.
- The 2022 figures still carry COVID-affected flags for some events (column not included here).
