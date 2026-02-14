# LegalMitra Phase 1 Architecture

## Services

- `apps/web` (Next.js 14): Supabase magic link auth, dashboard, case tracking UI.
- `apps/api` (NestJS): JWT verification with Supabase `getUser()`, case tracking APIs, eCourts fetch utility.
- `apps/ai` (FastAPI): placeholder AI service (`/health`, `/ai/ask`).

## Security Baseline

- Auth: Supabase access tokens in `Authorization: Bearer <token>`.
- Validation: `class-validator` in API DTOs, `zod` in frontend forms.
- Rate limiting: Redis-backed guard on protected routes.
- HTTP hardening: Helmet + strict CORS in NestJS.
- Data access: RLS SQL policies in `infra/scripts/supabase_phase1.sql`.

## Primary Endpoints

- `POST /cases/track`
- `GET /cases`
- `GET /cases/:id`
- `POST /cases/:id/refresh`
- `GET /profiles/me`
- `GET /health`

## Future Extension Points

- BullMQ jobs for periodic case refresh.
- Socket.io for real-time notification dispatch.
- LiveKit hearing orchestration in `hearings` module.
