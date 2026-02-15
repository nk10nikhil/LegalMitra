# LegalMitra Phase 11 — Admin User Management

## Scope Delivered

- Admin user listing API with filters
- Admin user update API for role and verification state
- Admin dashboard user management page
- Admin metrics page shortcut to user management

## API Endpoints

- `GET /admin/users`
  - Query params:
    - `q` (optional search across full name/email/phone)
    - `role` (`citizen|lawyer|judge|admin`, optional)
    - `verified` (`true|false`, optional)
    - `limit` (1 to 200, default 100)
- `PATCH /admin/users/:id`
  - Body: `{ role?: Role, verified?: boolean }`
  - Requires at least one field

## Frontend

- New page: `/dashboard/admin/users`
- Features:
  - Search/filter users
  - Update role per user
  - Update verification status per user
  - Save changes per user row

## Notes

- Admin access enforcement is done server-side.
- Admin cannot remove their own admin role.
- User update triggers notification + audit event.
