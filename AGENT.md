# AGENT.md - eliran-dashboard

## Project
eliran-dashboard for א.ש מקלחונים מעוצבים.

Local path: `D:\יבגני\אלירן מקלחונים\eliran_dashboard`

GitHub: https://github.com/welltrading/eliran-dashboard

Local server: http://localhost:3001

## Core Rules
- Start in Plan Mode.
- Make small, focused changes.
- Reuse existing patterns.
- Run `npm run build` after meaningful changes.
- Do not commit or push without approval.
- Keep this file under 200 lines.

## Airtable Safety
- Read-only Airtable access is allowed for dashboards and validation.
- Do not create, update, or delete Airtable records without explicit approval.
- Do not change Airtable schema without explicit approval.

## Protected Flows
Do not change without explicit approval:

- create-order flow
- quote-to-order flow
- standard order flow
- custom production order flow
- inventory movement assumptions

## Inventory Module
Current phase: Phase 10 - Read-Only Inventory Validation.

Inventory dashboard must remain read-only unless approved.

Airtable base: `app77CdzKEqLlhZ8d`

Main tables:

- Products: `tbl9DI5ogG6HkbsOo`
- Inventory by location: `tbl6HhpUq3cTba1RB`
- Inventory movements: `tblS074Z1pDNpEVWO`
- Order lines: `tbliWBlXR7HdaZms5`
- Orders: `tblJYbxBXWUkAoI7m`

Inventory status:

- `quantity < 0` => `negative` / מלאי שלילי
- `quantity === 0` => `out` / אזל
- `quantity <= 3` => `low` / מלאי נמוך
- otherwise => `ok` / תקין

## Coding Preferences
- Keep Airtable mappings centralized.
- Prefer typed mappers and service functions.
- Avoid new API routes unless clearly necessary.
- Avoid hardcoded validation counts.
- Do not duplicate business logic across pages.

## Review Checklist
Before reporting done:

- Confirm `npm run build` passes.
- Confirm no unintended Airtable writes.
- Confirm no protected flow was changed.
- Report changed files.
- Report risks or assumptions.

If `AGENT.md` approaches 200 lines, move details to `docs/*.md` and reference them here.
