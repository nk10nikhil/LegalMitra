# LegalMitra — India's AI-Powered Digital Justice Platform

> Master prompt alignment and acceptance mapping: see `docs/master-build-status.md`.
>
> Accessibility baseline checklist: see `docs/accessibility-baseline.md`.
>
> Launch artifacts: `docs/launch-public-urls.md`, `docs/launch-checklist.md`, `docs/launch-demo-script.md`.

LegalMitra is an AI-powered digital justice platform for India. This repository contains a production-oriented Phase 1 monorepo implementation with:

- Next.js 14 frontend (Supabase email/mobile password auth + forgot-password + magic-link fallback)
- NestJS backend (JWT verification via Supabase `getUser()`, Prisma, case tracking APIs)
- FastAPI AI service (multilingual legal Q&A endpoint)
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

## Launch Docs

- Public URL registry: `docs/launch-public-urls.md`
- Release checklist: `docs/launch-checklist.md`
- Demo walkthrough: `docs/launch-demo-script.md`

## Phase 1 Features

- Supabase authentication in frontend (email/mobile password login, forgot-password by email, magic-link fallback)
- Rich registration fields: name, DOB, phone, optional email, Aadhaar, role
- Role-based dashboard routes (`/dashboard/citizen|lawyer|judge|admin`)
- Protected dashboard routes
- Profile bootstrap/sync (`profiles` upsert on first protected request)
- Case tracking via eCourts integration utility (`axios + cheerio`)
- Endpoints:
  - `POST /cases/track`
  - `GET /cases`
  - `GET /cases/:id`
  - `POST /cases/:id/refresh`
  - `GET /profiles/me`
  - `PUT /profiles/me`
  - `GET /health`
- Security baseline:
  - Supabase JWT validation on protected API routes
  - `helmet` + strict CORS
  - DTO input validation (`class-validator`) + form validation (`zod`)
  - Redis-based rate limiting guard
  - Supabase RLS SQL policies in `infra/scripts/supabase_phase1.sql`

## Phase 2 Features

- AI Legal Q&A endpoint with confidence score and disclaimer (`POST /ai/ask`)
- AI chat history endpoint (`GET /ai/history`) for authenticated users
- Hindi/English question support (`language: en | hi`)
- Frontend chat page at `/dashboard/ask`
- NestJS proxy integration to AI service via `AI_SERVICE_URL`
- Optional context-grounded generation when ML dependencies are installed in AI service

## Phase 3 Features

- Legal document generation endpoint (`POST /documents/generate`)
- Document listing endpoint (`GET /documents`) and detail endpoint (`GET /documents/:id`)
- 5 templates supported:
  - Rent Agreement
  - Legal Notice (Cheque Bounce)
  - Affidavit (Name Change)
  - Consumer Complaint
  - Leave and License
- Dashboard document generator + my documents page at `/dashboard/documents`
- PDF generation on backend (`pdfkit`) with Supabase Storage upload and signed URL delivery

## Phase 4 Features

- AI embedding endpoint (`POST /embed`) in AI service
- Semantic case-law search endpoint (`GET /case-laws/search`) in API
- `pgvector`-backed `case_laws` table + vector index in SQL script
- Dashboard search page with filters at `/dashboard/case-laws`

## Phase 5 Features

- AI PDF summarization endpoint (`POST /summarize`)
- Backend proxy endpoint (`POST /documents/summarize`) with optional persistence
- Judgment summarization dashboard page at `/dashboard/summarize`
- Saved summaries are stored in `documents` as `type: judgment_summary`

## Phase 6 Features

- AI prediction endpoint (`POST /predict`)
- Backend proxy endpoint (`POST /ai/predict`)
- Lawyer case detail integration for outcome probability
- Training scaffold with sample dataset (`apps/ai/train_predictor.py`)
- Prominent prediction disclaimer in API and UI

## Phase 7 Features

- Virtual hearing scheduler endpoints (`POST /hearings`, `GET /hearings`)
- Hearing status update endpoint (`POST /hearings/:id/status`)
- Hearing room URL generation with configurable base URL
- Notification records for hearing lifecycle events
- Dashboard hearing scheduler page at `/dashboard/hearings`

## Phase 8 Features

- Notifications center API (`GET /notifications`)
- Mark single notification read (`POST /notifications/:id/read`)
- Mark all notifications read (`POST /notifications/read-all`)
- Dashboard notifications page at `/dashboard/notifications`

## Phase 9 Features

- Audit trail API (`GET /audit-logs`)
- Filter by action/resource and sort by created time
- Dashboard audit trail page at `/dashboard/audit`

## Phase 10 Features

- Admin metrics endpoint (`GET /admin/metrics`)
- Admin-role enforcement for analytics access
- Live admin dashboard cards for platform totals
- Role distribution and recent audit event preview on `/dashboard/admin`

## Phase 11 Features

- Admin user listing endpoint (`GET /admin/users`) with filters
- Admin user update endpoint (`PATCH /admin/users/:id`) for role/verification
- Admin user management page at `/dashboard/admin/users`
- Admin dashboard shortcut to user management

## Phase 12 Features

- Case notes endpoints (`GET /cases/:id/notes`, `POST /cases/:id/notes`)
- Lawyer-only case note creation with validation
- Case detail page notes section on `/dashboard/cases/[id]`
- Audit logging for note list/add actions

## Phase 13 Features

- Case timeline endpoint (`GET /cases/:id/timeline`)
- Timeline aggregation across hearings, notes, documents, and key case audit events
- Case detail timeline section on `/dashboard/cases/[id]`
- Audit logging for timeline view action

## Phase 14 Features

- Timeline filters on API (`type`, `from`, `to`) for `GET /cases/:id/timeline`
- Case detail timeline UI filters (type/date range)
- Timeline JSON export from `/dashboard/cases/[id]`

## Phase 15 Features

- Data-driven role dashboards for citizen/lawyer/judge
- Live cards for case/hearing/notification/activity summaries
- Role-specific operational snapshots on dashboard home pages

## Phase 16 Features

- Hearing reminders API (`GET /notifications/reminders`)
- Reminder panel integrated into `/dashboard/notifications`
- Upcoming hearing visibility with configurable day window

## Phase 17 Features

- Personal reporting endpoint (`GET /reports/me`)
- New reports page at `/dashboard/reports`
- JSON export for user report snapshots

## Phase 18 Features

- Final integration closure for remaining roadmap phases
- Consolidated docs + validation for full stack delivery

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
  - `AI_SERVICE_URL` (default `http://localhost:8000`)
  - `SUPABASE_STORAGE_BUCKET` (default `legal-documents`)
  - `DOCUMENT_SIGNED_URL_TTL_SECONDS` (default `604800`)
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
- Add password reset redirect URL: `http://localhost:3000/`

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

- [ ] User can sign up with full profile details (name, DOB, phone, optional email, Aadhaar, role)
- [ ] User can sign in using email or mobile + password
- [ ] User can trigger forgot-password email link
- [ ] User opens `/dashboard/profile` and profile is auto-created
- [ ] User tracks a case from `/dashboard/track`
- [ ] User views list in `/dashboard/cases`
- [ ] User views detail and refreshes case data
- [ ] API `/health` returns status
- [ ] AI `/health` returns status

## Phase 2 Demo Checklist

- [ ] User opens `/dashboard/ask`
- [ ] User asks legal question in English and receives answer with confidence
- [ ] User asks legal question in Hindi and receives Hindi answer
- [ ] Response includes AI disclaimer

## Phase 3 Demo Checklist

- [ ] User opens `/dashboard/documents`
- [ ] User selects one of 5 document templates
- [ ] User submits form and PDF is generated
- [ ] User previews and downloads generated PDF
- [ ] User sees generated document in “My Documents” list

## Phase 4 Demo Checklist

- [ ] Run SQL updates including `vector` extension and `case_laws` table
- [ ] Seed sample case laws using `infra/scripts/seed_case_laws_phase4.sql`
- [ ] User opens `/dashboard/case-laws`
- [ ] User searches natural-language query and receives ranked results
- [ ] User applies court/year filters and views full text

## Phase 5 Demo Checklist

- [ ] User uploads a judgment PDF on `/dashboard/summarize`
- [ ] User receives concise summary with model metadata
- [ ] User can choose to save summary in My Documents

## Phase 6 Demo Checklist

- [ ] Lawyer opens `/dashboard/cases/[id]`
- [ ] Clicks **Generate Prediction**
- [ ] Sees “Based on N similar cases, success probability is X%”
- [ ] Sees disclaimer: research/educational use only

## Phase 7 Demo Checklist

- [ ] User opens `/dashboard/hearings`
- [ ] User schedules a hearing for an existing case
- [ ] User sees generated hearing room link
- [ ] User marks hearing as completed or cancelled
- [ ] Hearing appears in list with updated status

## Phase 8 Demo Checklist

- [ ] User opens `/dashboard/notifications`
- [ ] User sees hearing-related notification entries
- [ ] User marks one notification as read
- [ ] User uses “Mark All Read” and unread count updates

## Phase 9 Demo Checklist

- [ ] User opens `/dashboard/audit`
- [ ] User sees recent activity entries from prior actions
- [ ] User filters by action/resource and gets narrowed results
- [ ] User switches sort between newest/oldest

## Phase 10 Demo Checklist

- [ ] Admin opens `/dashboard/admin`
- [ ] Admin sees totals for users/cases/documents/hearings/notifications/audit logs
- [ ] Admin sees role-wise user breakdown
- [ ] Admin sees recent audit actions list

## Phase 11 Demo Checklist

- [ ] Admin opens `/dashboard/admin/users`
- [ ] Admin filters users by search/role/verified
- [ ] Admin updates a user role or verification status
- [ ] User update succeeds and reflects in refreshed list

## Phase 12 Demo Checklist

- [ ] Lawyer opens `/dashboard/cases/[id]`
- [ ] Lawyer adds a case note in Case Notes section
- [ ] Note appears in case notes list
- [ ] Non-lawyer user cannot create notes

## Phase 13 Demo Checklist

- [ ] User opens `/dashboard/cases/[id]`
- [ ] User sees timeline events in reverse chronological order
- [ ] Timeline includes note/hearing/document/case activity where available

## Phase 14 Demo Checklist

- [ ] User applies timeline type filter and sees narrowed events
- [ ] User applies from/to date filters and sees narrowed events
- [ ] User clicks Download JSON and receives filtered timeline export file

## Phase 15 Demo Checklist

- [ ] Citizen dashboard shows case/hearing/notification summaries
- [ ] Lawyer dashboard shows activity and workload summaries
- [ ] Judge dashboard shows hearing and notification summaries

## Phase 16 Demo Checklist

- [ ] User opens `/dashboard/notifications`
- [ ] User sees upcoming hearing reminders panel
- [ ] Reminder list reflects hearings in selected reminder window

## Phase 17 Demo Checklist

- [ ] User opens `/dashboard/reports`
- [ ] User sees generated report summary cards
- [ ] User downloads report JSON successfully

## Phase 18 Demo Checklist

- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w build` passes
- [ ] All phase docs from 1–18 are present in `/docs`

## Live Links and Demo Video

Add after deployment:

- Frontend URL: `TBD`
- API URL: `TBD`
- AI URL: `TBD`
- Demo video URL: `TBD`

## Notes

- Current eCourts parser includes graceful fallback when source data is unavailable.
- Phase 2 will implement RAG-based multilingual AI legal Q&A.
