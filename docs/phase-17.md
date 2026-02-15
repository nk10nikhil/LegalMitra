# LegalMitra Phase 17 — Personal Reports & Export

## Scope Delivered

- Added personal report endpoint with consolidated user activity snapshot
- Added report UI page with summary cards
- Added JSON export for report payload

## API Endpoint

- `GET /reports/me`
  - Returns:
    - `generatedAt`, `role`
    - totals (cases/documents/notifications/hearings/notes)
    - recent lists for key entities

## Frontend

- New page: `/dashboard/reports`
- Includes report generation view + `Download JSON` action
- Dashboard nav includes `My Reports`

## Notes

- Report view is audit-logged (`report.export.view`).
