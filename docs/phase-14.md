# LegalMitra Phase 14 — Filterable Case Timeline + Export

## Scope Delivered

- Timeline API now supports query filters
- Case detail timeline UI supports filter controls
- Timeline export to JSON from UI

## API Endpoint

- `GET /cases/:id/timeline`
- Optional query params:
  - `type` (`case_created | hearing | note | document | audit`)
  - `from` (ISO datetime)
  - `to` (ISO datetime)

## Frontend

- Updated `/dashboard/cases/[id]` timeline section with:
  - Type filter dropdown
  - From/To datetime filters
  - Download JSON button for current filtered events

## Notes

- Timeline audit events include filter metadata.
- Export uses browser-generated JSON file download.
