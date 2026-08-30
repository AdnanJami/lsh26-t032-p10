# <PROJECT NAME>

Solution for **LofiStack Hackathon 2026 — P##**

## Project information

- **Team:** `Larpcoder`
- **Team ID:** `LSH26-T032`
- **Problem:** `P10 — Prepaid Meter Recharge Advisor`
- **Live application:** https://adnanjami.github.io/lsh26-t032-p10/
- **Demo video:** Optional link, maximum three minutes

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

Application plots meter balance over timeline, and recharge calculations for specific deadlines and probable run-out date for specific rate of consumption.

## Requirements

| Requirement              | Status                             | Where to verify       |
| ------------------------ | ---------------------------------- | --------------------- |
| R1 — Dataset | Complete | Upload a JSON dataset via the 'Upload JSON' button then choose case in index.html / https://adnanjami.github.io/lsh26-t032-p10/ |
| R2 — Plot Balance Line Chart | Complete | Check line graph on index.html / https://adnanjami.github.io/lsh26-t032-p10/ |
| R3 — Run-out date & recharge calculator | Complete | Enter date in calculator of index.html / https://adnanjami.github.io/lsh26-t032-p10/  |
| R4 — Habit comparison | Complete | Check habit comparison section in index.html / https://adnanjami.github.io/lsh26-t032-p10/ |

## How to test the application

1. Open the live application.
2. Upload the sample data file provided with all 25 cases (P10_prepaid_meter_public.json) using the 'Upload JSON' button on top right corner.
3. Choose a case using the 'Active Case' dropdown list.
4. The balance graph is automatically plotted for the 6 months, with calculators for 

### Test or sample data
Loading:
Just enter the live URL

Sample data entry:
1. Click on the 'Upload JSON' button on top right corner.
2. Locate using file explorer and choose the sample data file provided with all 25 cases (P10_prepaid_meter_public.json) 

Reset:
Simply refresh the page.


## Run locally

### Requirements

- Runtime: Just a browser to open index.html
- Database: None

### Setup

```bash
git clone https://github.com/AdnanJami/lsh26-t032-p10.git
cd .\\lsh26-t032-p10\\
start .\index.html
```

Do not include real passwords, tokens or API keys. List only variable names in `.env.example`.

## Problem-solving approach

- checked sample data structure and transform it in various manners to extract meaningful results and patterns
- chose to create a static single-page website with custom dataset upload option. Contains a line graph plotter and calculator to fulfill user requirements
- rebuilt the meter history from the limited data provided to be able to perform any further calculations.
- used a calculator to add up the values against shown values

## Technology used

- **Frontend:** \HTML+JS+CSS
- **Backend:** \None
- **Database:** \None
- **Deployment:** \GitHub Pages
- **Other material tools:** \Gemini

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence                |
| ----------------- | --------------- | ------------------ | ----------------------- |
| Abrar Ur Alam           | `TrulyFalse`    | \Entire Project    | Commit: 510c055ee79cc9b7849576076e076cf5768b14fe |



## AI usage

Gemini

## Major design decisions

- **Decision:** \Static website, as each family simply needs a tool that calculates based on their data. Personal electricity-consumption data can be provided as JSON.

## Known limitations

- No backend support to store history into profiles, no manual input method.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
