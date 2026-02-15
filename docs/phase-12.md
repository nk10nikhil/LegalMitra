# LegalMitra Phase 12 — Lawyer Case Notes

## Scope Delivered

- Case notes API integrated into existing case module
- Lawyer-only note authoring endpoint
- Case owner/lawyer note listing support
- Case detail page notes panel with add/list UX

## API Endpoints

- `GET /cases/:id/notes`
  - Returns notes for:
    - case owner (all notes for that case)
    - lawyer (their own notes for that case)
- `POST /cases/:id/notes`
  - Lawyer-only endpoint to add a note
  - Body: `{ note: string }`

## Frontend

- Updated page: `/dashboard/cases/[id]`
- Added **Case Notes** section:
  - Lawyers can add notes
  - Users can view available notes

## Notes

- Note writes and reads create audit events.
- Non-lawyer users cannot create notes.
