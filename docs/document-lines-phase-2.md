# Document Lines Phase 2

## Status

- Direct order creation in the app works through the document-lines model:
  `order -> document lines -> inventory movement`.
- The source of truth for order items is `שורות מסמך`.
- No legacy `שורות הזמנה` records are created by the direct order flow.
- Inventory movements are not created directly by the app; they are created by Airtable automation from document lines.

## Commit

- `0343b03 make document-lines write guard server configurable`

## Write Guard

- Temporary write enablement is controlled by:
  `DOCUMENT_LINES_WRITE_GUARD=disabled`
- Default behavior is blocked.
- The guard is server-only.
- Do not open write flows without an explicit environment value.

## Passed Retest

- Order: `213`
- Order record: `recMnvZt0tIaNGg7d`
- Document line: `reclC6WHLd4wdLVWd`
- Product: `receK8lvK87AbmiQP`
- Inventory movement: `recu6IFIidp9kP1Rs`
- Location: `מחסן`
- Hard key: `receK8lvK87AbmiQP|מחסן`

## Airtable Automation Fix

Automation: `שורות מסמך — יצירת תנועת מלאי סטנדרטית`

- `מוצר` = `Trigger record -> מוצר -> ID`
- `מיקום` = `Trigger record -> מיקום יציאה -> Name/value`

## Rules To Preserve

- Do not return to legacy `שורות הזמנה`.
- Do not use the old single product field on `הזמנות` as the source of truth.
- Do not use the old price field as the source of truth.
- Do not create inventory movements directly from the app.
- Keep exit location on the document line, not on the order.
- Do not use a non-unique key such as product name + location for stock lookup.
