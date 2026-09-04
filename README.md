# Time Ledger

A browser-based work-hours ledger with weekly session tracking, week-scoped balances, one-off leave/day-off exclusions, and monthly weekly CSV exports.

## Local development

```bash
npm install
npm run dev
```

All data is stored in the browser's local storage. No account or backend is required.

## Checks

```bash
npm test
npm run lint
npm run build
```

## How totals work

- Recurring workdays and daily target hours are configured in Settings.
- A date marked as leave or a day off has a zero-hour target.
- Sessions already recorded on an excluded date remain visible, but do not contribute to totals.
- Time deficits and surpluses can carry between days in the same Monday–Sunday week, then reset for the next week.
- Monthly CSV files contain one row per calendar week segment inside the selected month, followed by a monthly total.
