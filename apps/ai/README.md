# AI Service (Phase 2)

FastAPI AI service for LegalMitra legal Q&A.

## Run locally

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Windows recommended (use Python 3.13)

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Optional semantic retrieval dependencies

Install these only if you want sentence-transformer based retrieval (otherwise keyword fallback is used):

```bash
python -m pip install -r requirements-ml.txt
```

## Endpoints

- `GET /health`
- `POST /ai/ask`
- `POST /embed`
- `POST /summarize`
- `POST /predict`

## `POST /ai/ask`

Request:

```json
{
  "question": "How can I check my case status?",
  "language": "en"
}
```

Response:

```json
{
  "answer": "You can check status on the eCourts portal...",
  "confidence": 0.78,
  "language": "en",
  "source_id": "faq_002",
  "disclaimer": "AI output is informational and not a substitute for legal advice."
}
```

Notes:

- Uses multilingual FAQ retrieval with optional sentence-transformer embeddings.
- Falls back to keyword ranking if embedding model is unavailable.

## `POST /summarize`

Multipart upload endpoint for PDF judgment summarization.

Form-data:

- `file`: PDF file

Response includes summary text, extracted char count, and model name.

## `POST /predict`

Request example:

```json
{
  "court": "Delhi High Court",
  "year": 2023,
  "petitioner_type": "individual",
  "respondent_type": "state",
  "acts_cited_count": 3,
  "prior_hearings": 2
}
```

Returns success probability, similar case count, model name, and disclaimer.

Training scaffold:

- Sample data: `data/case_outcomes_sample.csv`
- Training script: `train_predictor.py`
- Output model: `models/case_outcome_model.pkl`
