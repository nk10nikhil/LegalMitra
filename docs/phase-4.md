# LegalMitra Phase 4 — Semantic Case Law Search

## Scope Delivered

- AI embedding endpoint implemented: `POST /embed`
- API semantic search endpoint implemented: `GET /case-laws/search`
- `case_laws` table with `vector(384)` embedding column added in SQL script
- Case-law dashboard UI added at `/dashboard/case-laws`
- Filters supported: query, court, year range, result limit

## API Contract

### `POST /embed` (AI Service)

Request:

```json
{
  "text": "anticipatory bail in economic offences"
}
```

Response:

```json
{
  "embedding": [0.012, -0.03, ...],
  "dimension": 384,
  "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
}
```

### `GET /case-laws/search`

Query params:

- `q` (required)
- `court` (optional)
- `yearFrom` (optional)
- `yearTo` (optional)
- `limit` (optional, default 20)

Response:

```json
[
  {
    "id": "uuid",
    "title": "Sample Bail Principles Judgment",
    "court": "Bombay High Court",
    "judgmentDate": "2022-11-09T00:00:00.000Z",
    "summary": "Court reiterates bail principles...",
    "fullText": "Full judgment sample text..."
  }
]
```

## Database Setup

Run these scripts in Supabase SQL editor:

1. `infra/scripts/supabase_phase1.sql` (now includes `vector` + `case_laws`)
2. `infra/scripts/seed_case_laws_phase4.sql` (sample rows)

## Notes

- Search gracefully returns empty results if AI embedding service or DB vector query fails.
- AI embedding endpoint uses sentence-transformers when available; otherwise hash-based fallback embeddings keep the flow functional.
