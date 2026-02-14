# LegalMitra — Phase 1 (Foundation & Case Tracking)

LegalMitra is an AI-powered digital justice platform for India. This repository contains a production-oriented Phase 1 monorepo implementation with:

- Next.js 14 frontend (Supabase email/password auth + dashboard)
- NestJS backend (JWT verification via Supabase `getUser()`, Prisma, case tracking APIs)
- FastAPI AI service (placeholder health + ask endpoint)
- Turborepo workspace and deployment scaffolding for Vercel + Railway

## Monorepo Structure

```text
legalmitra/
├── apps/
│   ├── web/      # Next.js frontend
│   ├── api/      # NestJS backend
│   └── ai/       # FastAPI AI service
├── packages/
│   ├── ui/       # Shared UI primitives
│   ├── config/   # Shared lint config (base)
│   ├── types/    # Shared TypeScript types
│   └── auth/     # Shared Supabase helpers
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
├── docs/
└── README.md
```

## Phase 1 Features

- Supabase email/password authentication in frontend
- Protected dashboard routes
- Profile bootstrap/sync (`profiles` upsert on first protected request)
- Case tracking via eCourts integration utility (`axios + cheerio`)
- Endpoints:
  - `POST /cases/track`
  - `GET /cases`
  - `GET /cases/:id`
  - `POST /cases/:id/refresh`
  - `GET /profiles/me`
  - `GET /health`
- Security baseline:
  - Supabase JWT validation on protected API routes
  - `helmet` + strict CORS
  - DTO input validation (`class-validator`) + form validation (`zod`)
  - Redis-based rate limiting guard
  - Supabase RLS SQL policies in `infra/scripts/supabase_phase1.sql`

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- Supabase project (India data region recommended)
- Upstash Redis (optional but recommended for rate limiting)

## Environment Setup

Copy env templates:

```bash
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/ai/.env.example apps/ai/.env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/ai/.env.example apps/ai/.env
```

Set required values:

- Frontend (`apps/web/.env.local`)
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- API (`apps/api/.env`)
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CORS_ORIGIN`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (optional)
- AI (`apps/ai/.env`)
  - `PORT`

### Supabase Auth settings (important)

In Supabase Dashboard:

1. `Authentication -> Providers -> Email`
  - Enable Email provider
  - For quick local testing, disable **Confirm email** (so sign-up logs in instantly)
2. `Authentication -> URL Configuration`
  - Site URL: `http://localhost:3000`
  - Add redirect URL: `http://localhost:3000/dashboard`
3. If you keep **Confirm email** enabled, configure SMTP or check Supabase Auth logs + spam folder.

## Database Setup (Supabase)

1. Run SQL from `infra/scripts/supabase_phase1.sql` in Supabase SQL editor.
2. Set `DATABASE_URL` from Supabase project settings.
3. Generate Prisma client:

```bash
pnpm install
pnpm --filter api prisma:generate
```

## Local Development

Run all services:

```bash
pnpm dev
```

Or run individually:

```bash
pnpm --filter web dev
pnpm --filter api dev
cd apps/ai && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

## Deployment

### Frontend (Vercel)

- Root: repository root
- Build command: `pnpm --filter web build`
- Output: Next.js default
- Env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### API (Railway)

- Service root: repository root
- Start command: `pnpm --filter api start`
- Health check path: `/health`
- Env vars: API `.env` values

### AI (Railway)

- Service root: `apps/ai` (or root with custom command)
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## API Quick Test

Use a valid Supabase access token:

```bash
curl -X POST http://localhost:4000/cases/track \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"caseNumber":"ABC/123/2024","courtCode":"DLHC01"}'
```

## Phase 1 Demo Checklist

- [ ] User can sign up with email + password
- [ ] User opens `/dashboard/profile` and profile is auto-created
- [ ] User tracks a case from `/dashboard/track`
- [ ] User views list in `/dashboard/cases`
- [ ] User views detail and refreshes case data
- [ ] API `/health` returns status
- [ ] AI `/health` returns status

## Live Links and Demo Video

Add after deployment:

- Frontend URL: `TBD`
- API URL: `TBD`
- AI URL: `TBD`
- Demo video URL: `TBD`

## Notes

- Current eCourts parser includes graceful fallback when source data is unavailable.
- Phase 2 will implement RAG-based multilingual AI legal Q&A.
