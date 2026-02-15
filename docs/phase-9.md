# LegalMitra Phase 9 — Audit Trail Center

## Scope Delivered

- Audit trail API for authenticated users
- Action/resource filtering support
- Sort and limit controls in query
- Dashboard audit trail page for user activity visibility

## API Endpoint

- `GET /audit-logs`
  - Query params:
    - `action` (optional text filter)
    - `resource` (optional text filter)
    - `sort` (`asc` or `desc`, default `desc`)
    - `limit` (1 to 200, default 50)

## Frontend

- New page: `/dashboard/audit`
- Features:
  - Action and resource filters
  - Newest/oldest sorting
  - Audit event cards showing action, resource, metadata preview, timestamp

## Notes

- Audit entries are generated throughout platform actions (cases, AI, documents, hearings, notifications).
- This phase provides transparent user-level access to those logs.
