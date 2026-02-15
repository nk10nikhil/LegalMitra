# LegalMitra Phase 13 — Case Timeline

## Scope Delivered

- Case timeline API endpoint under case module
- Unified timeline events from case metadata, hearings, notes, documents, and key audit actions
- Timeline section added to case detail page

## API Endpoint

- `GET /cases/:id/timeline`
  - Protected route
  - Case owner access
  - Returns reverse-chronological timeline events with:
    - `id`
    - `type`
    - `title`
    - `description`
    - `occurredAt`

## Frontend

- Updated `/dashboard/cases/[id]` with **Case Timeline** section
- Displays latest events first
- Shows loading and empty states

## Notes

- Timeline view action is audit-logged (`case.timeline.view`).
- Event feed includes hearing, note, document, and case tracking/refresh context.
