from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="LegalMitra AI Service", version="0.1.0")


class AskRequest(BaseModel):
    question: str
    language: str = "en"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai",
        "phase": "phase-1-placeholder",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/ai/ask")
def ask_ai(payload: AskRequest):
    return {
        "answer": "AI legal Q&A will be enabled in Phase 2.",
        "confidence": 0.0,
        "language": payload.language,
    }
