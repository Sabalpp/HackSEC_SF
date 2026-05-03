# PDF Final Handoff

Use branch `PDF-final`.

For the cost data, use only:

```text
src/data/cost_data.csv
```

That CSV has the full cost dataset for both supported vehicles:

- `ugv` / `Land Unit`
- `drone` / `Air Unit`

It includes all 14 source component categories from the Skunk Works dataset for each vehicle profile.

To generate the high-level report:

1. Run the app with `npm run dev -- --host 127.0.0.1 --port 4180`.
2. Open `http://localhost:4180/`.
3. Pick a theater.
4. Select `Land Unit` or `Air Unit`.
5. Run the simulation.
6. When the post-simulation report opens, click the PDF download button.

The downloaded PDF is the high-level report. It includes executive summary, risk register, readiness detail, environmental drivers, component trend index, deployment checklist, and cost exposure estimate.
