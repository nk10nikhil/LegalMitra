# LegalMitra — Master Build Status (Final Prompt Alignment)

## Current Build Summary

This repository implements the full-stack LegalMitra architecture in a Turborepo monorepo:

- `apps/web`: Next.js 14 + TypeScript + Tailwind + shared UI
- `apps/api`: NestJS + Prisma + Socket.io + BullMQ + Swagger
- `apps/ai`: FastAPI + legal AI endpoints (`/ask`, `/embed`, `/summarize`, `/predict`)
- `infra`: Dockerfiles, compose stack, Nginx reverse proxy
- `.github/workflows`: CI and deploy workflows

## Acceptance Criteria Mapping

- ✅ Sign up and profile bootstrap with Supabase auth + JWT validation
- ✅ Track real court cases (`/cases/track`, `/cases`, `/cases/:id`, refresh)
- ✅ AI legal Q&A with multilingual support and disclaimer
- ✅ Legal document generation and document listing/download links
- ✅ Semantic case-law search with embedding flow and pgvector schema
- ✅ Judgment summarization flow
- ✅ Outcome prediction with disclaimer
- ✅ Lawyer dashboard, notes, timeline, reminders, reporting
- ✅ Real-time notifications (Socket.io + notifications center)
- ✅ Video hearing room flow with LiveKit token support and client connect lifecycle
- ✅ ODR module with persistent room/message storage
- ✅ OpenAPI docs (`/api-docs`) and monorepo CI/deploy workflows

## Current Truth (Audit)

- Full audit report: `docs/phase-audit-2026-02-15.md`
- Platform is **substantially complete but not 100% master-prompt complete**.
- Notable partial areas remain in phase scope: full production-grade in-app virtual courtroom UX + audio-to-transcript pipeline depth (beyond webhook/manual ingestion + segment analytics), live government-portal credential integration depth after eCourts/DigiLocker/FIR/land-record scaffolds, and final public launch execution.

Launch-prep docs now available:

- `docs/launch-public-urls.md`
- `docs/launch-checklist.md`
- `docs/launch-demo-script.md`

## Important Operational Notes

- Prisma schema includes ODR models (`odr_rooms`, `odr_messages`).
- Committed migration SQL is available at:
  - `apps/api/prisma/migrations/202602150001_odr_persistence/migration.sql`
- Supabase SQL bootstrap script now includes ODR tables and RLS policies:
  - `infra/scripts/supabase_phase1.sql`

## Deployment Notes

If direct DB connectivity is unavailable from local dev environments:

1. Apply `infra/scripts/supabase_phase1.sql` in Supabase SQL Editor, or
2. Apply the migration SQL manually in Supabase SQL Editor.

Then run:

```bash
pnpm --filter api prisma:generate
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm build
```

## Remaining External/Platform Dependencies

The following are environment/platform concerns rather than code blockers:

- Public production URLs depend on configured Vercel/Railway projects and secrets.
- LiveKit multi-participant calls require valid LiveKit server credentials and network reachability.
- Government connectors currently include eCourts sync plus DigiLocker/FIR/land-record-style queued connector scaffolds with persistent request status; additional live connectivity needs source-specific credentials/agreements.
