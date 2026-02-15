# LegalMitra Phase 3 — Document Generator

## Scope Delivered

- Backend document generation endpoint: `POST /documents/generate`
- Backend list endpoint: `GET /documents`
- Backend detail endpoint: `GET /documents/:id`
- Dashboard UI: `/dashboard/documents`
- Template-driven form generation with Zod validation for 5 legal document types
- PDF generation via `pdfkit`
- Supabase Storage upload with signed URL response
- Document metadata persisted in `documents` table

## Templates Implemented

1. Rent Agreement
2. Legal Notice (Cheque Bounce)
3. Affidavit (Name Change)
4. Consumer Complaint
5. Leave and License

## API Contract

### `POST /documents/generate`

Request:

```json
{
  "type": "rent_agreement",
  "title": "Rent Agreement - Flat 301",
  "caseId": null,
  "formData": {
    "landlordName": "Ramesh Sharma",
    "tenantName": "Priya Verma",
    "propertyAddress": "Flat No 301, Andheri East, Mumbai",
    "monthlyRent": "25000",
    "securityDeposit": "50000",
    "durationMonths": "11",
    "agreementDate": "2026-02-15"
  }
}
```

Response (example):

```json
{
  "id": "uuid",
  "type": "rent_agreement",
  "title": "Rent Agreement - Flat 301",
  "fileUrl": "supabase://legal-documents/<path>.pdf",
  "downloadUrl": "https://...signed-url...",
  "createdAt": "2026-02-15T00:00:00.000Z"
}
```

## Environment Notes

Set in `apps/api/.env`:

- `SUPABASE_STORAGE_BUCKET=legal-documents`
- `DOCUMENT_SIGNED_URL_TTL_SECONDS=604800`

## Local Flow

1. Open `/dashboard/documents`
2. Pick template
3. Fill fields and submit
4. Preview generated PDF
5. Download from signed URL
6. Confirm document appears in list
