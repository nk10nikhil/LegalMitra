# LegalMitra Launch Checklist

## Product Readiness

- [ ] Acceptance walkthrough completed for sign-up → case tracking → AI ask → docs → hearings → ODR.
- [ ] Priority defects triaged and release blockers closed.
- [ ] Legal disclaimer and terms text reviewed.

## Platform & Security

- [ ] Production env vars set for `apps/web`, `apps/api`, and `apps/ai`.
- [ ] Supabase RLS policies verified in production project.
- [ ] Redis/BullMQ connectivity verified.
- [ ] LiveKit credentials validated.
- [ ] Rate limits and CORS checked for production domains.

## Observability

- [ ] API logs and error alerts enabled.
- [ ] AI service logs and exception alerts enabled.
- [ ] Basic uptime checks configured for web/API/AI.

## Go-To-Market Artifacts

- [ ] Public URLs recorded in `docs/launch-public-urls.md`.
- [ ] Demo script finalized (`docs/launch-demo-script.md`).
- [ ] Product announcement draft ready.
- [ ] Short launch FAQ prepared.

## Launch Day

- [ ] Smoke test production URLs.
- [ ] Publish announcement posts.
- [ ] Monitor errors and latency for first 2 hours.
- [ ] Capture first-day feedback/issues.
