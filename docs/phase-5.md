# LegalMitra Phase 5 — Judgment Summarization

## Scope Delivered

- AI endpoint implemented: `POST /summarize`
- Backend endpoint implemented: `POST /documents/summarize`
- Frontend page implemented: `/dashboard/summarize`
- Optional persistence of summary into `documents` table as `type = judgment_summary`

## AI Endpoint Contract

### `POST /summarize`

Multipart form-data:

- `file` (PDF)

Response:

```json
{
  "summary": "Concise judgment summary...",
  "char_count": 8450,
  "model": "facebook/bart-large-cnn"
}
```

Notes:

- Uses `PyPDF2` for extraction.
- Uses BART summarization model when available.
- Falls back to extractive truncation summary when ML model unavailable.

## Backend Endpoint Contract

### `POST /documents/summarize`

Multipart form-data fields:

- `file` (required, PDF)
- `title` (optional)
- `caseId` (optional UUID)
- `saveResult` (optional boolean, defaults true)

Response:

```json
{
  "summary": "...",
  "charCount": 8450,
  "model": "facebook/bart-large-cnn",
  "saved": true,
  "document": {
    "id": "uuid",
    "title": "Judgment Summary - sample.pdf",
    "type": "judgment_summary",
    "createdAt": "2026-02-15T00:00:00.000Z"
  }
}
```

## Local Test Flow

1. Start AI service.
2. Start API + web.
3. Open `/dashboard/summarize`.
4. Upload a PDF judgment.
5. Verify summary display.
6. Verify saved summary appears in `/dashboard/documents` when `saveResult=true`.
