# LegalMitra Phase 2 — AI Legal Q&A

## Scope Delivered

- AI endpoint implemented in FastAPI: `POST /ai/ask`
- NestJS proxy endpoint implemented: `POST /ai/ask` (protected with Supabase JWT)
- Conversation history endpoint implemented: `GET /ai/history` (protected)
- Dashboard chat page added: `/dashboard/ask`
- Hindi/English support via `language` field (`en`/`hi`)
- Confidence score, source identifier, and legal disclaimer returned with each answer

## Services and Flow

1. Frontend sends user question to NestJS `POST /ai/ask`.
2. NestJS validates payload and forwards request to FastAPI service.
3. FastAPI retrieves best FAQ match via embedding similarity (if model available) or keyword fallback.
4. FastAPI optionally generates an answer using retrieved context (if transformers model is available).
5. FastAPI returns language-specific answer + confidence + disclaimer.
6. NestJS stores per-user in-memory history for the current process.

## Dataset

- Seed FAQ dataset: `apps/ai/data/faqs.json`
- Includes bilingual legal Q&A entries for common India legal workflows.

## API Contract

### Request

```json
{
  "question": "जमानत कैसे मिलती है?",
  "language": "hi"
}
```

### Response

```json
{
  "answer": "अग्रिम जमानत ...",
  "confidence": 0.74,
  "language": "hi",
  "source_id": "faq_003",
  "disclaimer": "AI output is informational and not a substitute for legal advice."
}
```

## Environment

Set in `apps/api/.env`:

- `AI_SERVICE_URL=http://localhost:8000`

Optional in AI service:

- Install `requirements-ml.txt` for transformer generation + embedding retrieval.

## Run Checklist

- Start AI service: `cd apps/ai && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
- Start API: `pnpm --filter api dev`
- Start web: `pnpm --filter web dev`
- Test from dashboard: `/dashboard/ask`

## Important Disclaimer

- AI output is informational only and is not a substitute for professional legal advice.
