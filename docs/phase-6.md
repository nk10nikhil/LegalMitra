# LegalMitra Phase 6 — Case Outcome Prediction

## Scope Delivered

- AI endpoint implemented: `POST /predict`
- Backend proxy endpoint implemented: `POST /ai/predict`
- Lawyer-facing prediction card added to case detail page
- Training scaffold added (`apps/ai/train_predictor.py`)
- Sample dataset added (`apps/ai/data/case_outcomes_sample.csv`)

## API Contract

### `POST /predict` (AI)

Request:

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

Response:

```json
{
  "success_probability": 0.67,
  "similar_cases": 1234,
  "model": "xgboost-trained-model",
  "disclaimer": "For research and educational use only. Not legal advice or a guaranteed outcome."
}
```

## Training

- Install optional ML deps from `requirements-ml.txt`
- Run:

```bash
cd apps/ai
python train_predictor.py
```

- This writes model file to `apps/ai/models/case_outcome_model.pkl`
- If model file is missing, AI service automatically uses heuristic fallback.

## Frontend Integration

- Lawyer users on `/dashboard/cases/[id]` can click **Generate Prediction**
- UI shows: "Based on N similar cases, success probability is X%"
- Mandatory disclaimer is displayed.
