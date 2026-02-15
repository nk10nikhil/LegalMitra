# LegalMitra Demo Script (10–12 min)

## 1) Problem Statement (1 min)

- India legal workflows are fragmented across tracking, drafting, hearings, and dispute resolution.
- LegalMitra unifies these into one AI-assisted workflow.

## 2) User Journey (6–7 min)

1. Sign in and open dashboard.
2. Track a case via `Track Case`.
3. Ask legal question in `Ask Legal AI`.
4. Generate a legal document from `Documents`.
5. Open hearing room and show transcript/evidence flow.
6. Open ODR room, send messages, show prediction context, generate settlement draft.

## 3) Admin/Operational View (2 min)

- Show notifications, audit trail, and reports pages.
- Show integration jobs (eCourts, DigiLocker, FIR, land records) in dashboard integrations page.

## 4) Architecture & Safety (1–2 min)

- Web: Next.js; API: NestJS + Prisma; AI: FastAPI.
- Auth via Supabase JWT and RLS.
- Audit logging and role-aware access controls.

## 5) Close (30 sec)

- Current scope is production-oriented with remaining external dependencies around live government credentials and launch distribution.
- Invite pilot users and legal professionals for feedback.
