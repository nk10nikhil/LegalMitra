# LegalMitra Phase 7 — Virtual Hearing Scheduler

## Scope Delivered

- API endpoints for hearing scheduling and status updates
- Dashboard page for creating and managing hearings
- Hearing room URL generation for each schedule request
- Notification records for hearing scheduled/status updates
- Audit log entries for hearing lifecycle actions

## API Endpoints

- `POST /hearings`
  - Body: `caseId`, `scheduledAt`, optional `roomLabel`
  - Creates a scheduled hearing for a user-owned case
- `GET /hearings`
  - Optional query: `caseId`
  - Lists hearings for the authenticated user’s cases
- `POST /hearings/:id/status`
  - Body: `status` (`scheduled|completed|cancelled`), optional `recordingUrl`, `transcript`
  - Updates hearing status for user-owned case hearings

## Frontend

- New page: `/dashboard/hearings`
- Features:
  - Case picker + datetime scheduler
  - Optional custom room label
  - Hearings list with room link
  - Status actions: mark completed / cancel

## Notes

- Room URLs use `VIRTUAL_HEARING_BASE_URL` if provided, else default to `https://meet.jit.si`.
- Hearing actions are restricted to hearings linked to authenticated user-owned cases.
