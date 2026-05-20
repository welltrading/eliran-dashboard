# Codex Skills — eliran_dashboard

## Manual QA Skill — בדיקה ידנית לפני commit

Use this whenever a phase was implemented and needs manual validation before commit.

### Required checks

1. Open the relevant page in the browser.

2. Verify the new feature appears in the correct location.

3. Verify the UI is RTL-safe and visually consistent with the existing dashboard.

4. Verify existing sections on the same page still load correctly.

5. If the phase is read-only:
   - Confirm no write action was triggered.
   - Confirm no Airtable record was created, updated, or deleted.

6. If the phase includes Airtable write actions:
   - Test one valid record.
   - Verify loading/disabled state prevents double-click.
   - Verify success state and router.refresh() behavior.
   - Verify directly in Airtable that only the intended table and fields changed.
   - Verify no unintended write to unrelated tables.

7. For financial/payment features:
   - Verify totals against source Airtable records.
   - Verify missing amount / zero amount behavior.
   - Verify duplicate prevention if relevant.
   - Verify no “paid” status is written unless the phase explicitly requires it.

8. Run:

npm run build

9. Run project-specific grep checks when relevant:

rg -n "tblndyBo0AqfNm3l3|התקנות" app lib

For read-only phases, also check that no new write operations were introduced:

rg -n "createRecord|updateRecord|deleteRecord|create_records|update_records|delete_records" app lib

Note:
If grep finds existing write operations from older approved phases, inspect git diff and confirm no new write operation was introduced by the current phase.

10. Run:

git status

### Required report format

Report back with:

- Page tested
- Feature tested
- Manual test result
- Airtable write verification, if relevant
- Existing sections verified
- Build result
- Grep result, if relevant
- Modified files
- Confirmation that no commit was made


---

## Git Finish Skill — build, commit, push

Use this only after manual QA passed and the user explicitly approves commit.

### Required checks before commit

1. Run:

git diff --stat
git status

2. Verify only expected files are modified.

3. Run:

npm run build

4. If build passes, stage only relevant files.

5. Commit with the phase message supplied by the user.

6. Push to main:

git push origin main

### Required report format

Report back with:

- Commit hash
- Commit message
- Build result
- Git status after push
- Confirmation that working tree is clean


---

## Project rules

- Do not commit without explicit user approval.
- Do not push without explicit user approval.
- Do not add Airtable fields unless explicitly approved.
- Do not use table "התקנות" / "tblndyBo0AqfNm3l3" unless explicitly approved.
- Prefer Plan Mode before phases that affect Airtable writes, payments, invoices, or the data model.
- For payment logic, never rely on UI only. Verify source Airtable records.
- For read-only phases, do not add server actions or Airtable write calls.
- For Airtable write phases, verify directly in Airtable that only the intended table changed.
