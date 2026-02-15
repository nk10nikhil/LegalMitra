# LegalMitra Phase 16 — Smart Hearing Reminders

## Scope Delivered

- Added hearing reminder API endpoint
- Added reminders section on notifications page
- Uses upcoming scheduled hearings window (default 7 days)

## API Endpoint

- `GET /notifications/reminders?days=7`
  - Protected route
  - Returns upcoming scheduled hearings for user's tracked cases

## Frontend

- `/dashboard/notifications` now includes:
  - Upcoming Hearing Reminders panel
  - Case/court/date visibility for upcoming hearings

## Notes

- Reminder view action is audit-logged (`notification.reminders.view`).
