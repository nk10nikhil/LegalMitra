from datetime import datetime
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, TypeAdapter

try:
    from sentence_transformers import SentenceTransformer, util  # type: ignore
except Exception:
    SentenceTransformer = None
    util = None

try:
    from transformers import pipeline  # type: ignore
except Exception:
    pipeline = None

app = FastAPI(title="LegalMitra AI Service", version="0.1.0")
BASE_DIR = Path(__file__).resolve().parent
FAQ_PATH = BASE_DIR / "data" / "faqs.json"


class FAQItem(BaseModel):
    id: str
    question_en: str
    question_hi: str
    answer_en: str
    answer_hi: str
    keywords: list[str] = []


class AskResponse(BaseModel):
    answer: str
    confidence: float
    language: str
    source_id: str | None = None
    disclaimer: str


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    language: str = "en"


def _load_faqs() -> list[FAQItem]:
    if not FAQ_PATH.exists():
        return []
    raw = FAQ_PATH.read_text(encoding="utf-8")
    parsed = json.loads(raw)
    return TypeAdapter(list[FAQItem]).validate_python(parsed)


def _language_key(language: str) -> str:
    normalized = language.strip().lower()
    return "hi" if normalized.startswith("hi") else "en"


FAQS = _load_faqs()

GENERATOR = None
if pipeline is not None:
    try:
        GENERATOR = pipeline("text2text-generation", model="google/flan-t5-small")
    except Exception:
        GENERATOR = None

EMBED_MODEL = None
FAQ_EMBEDDINGS = None
if SentenceTransformer is not None and FAQS:
    try:
        EMBED_MODEL = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        FAQ_EMBEDDINGS = EMBED_MODEL.encode(
            [f"{item.question_en} {item.question_hi} {' '.join(item.keywords)}" for item in FAQS],
            convert_to_tensor=True,
        )
    except Exception:
        EMBED_MODEL = None
        FAQ_EMBEDDINGS = None


def _keyword_score(question: str, item: FAQItem) -> float:
    question_lower = question.lower()
    score = 0.0
    for keyword in item.keywords:
        if keyword.lower() in question_lower:
            score += 1.0
    if item.question_en.lower() in question_lower or item.question_hi.lower() in question_lower:
        score += 2.0
    return score


def _retrieve_best(question: str) -> tuple[FAQItem | None, float]:
    if not FAQS:
        return None, 0.0

    if EMBED_MODEL is not None and FAQ_EMBEDDINGS is not None and util is not None:
        try:
            query_embedding = EMBED_MODEL.encode(question, convert_to_tensor=True)
            similarities = util.cos_sim(query_embedding, FAQ_EMBEDDINGS)[0]
            best_idx = int(similarities.argmax().item())
            best_score = float(similarities[best_idx].item())
            return FAQS[best_idx], max(0.0, min(1.0, (best_score + 1) / 2))
        except Exception:
            pass

    scored = [(item, _keyword_score(question, item)) for item in FAQS]
    best_item, raw_score = max(scored, key=lambda x: x[1])
    confidence = max(0.1, min(0.95, raw_score / 5.0))
    return best_item, confidence


def _retrieve_top(question: str, top_k: int = 3) -> list[FAQItem]:
    if not FAQS:
        return []

    if EMBED_MODEL is not None and FAQ_EMBEDDINGS is not None and util is not None:
        try:
            query_embedding = EMBED_MODEL.encode(question, convert_to_tensor=True)
            similarities = util.cos_sim(query_embedding, FAQ_EMBEDDINGS)[0]
            top_indices = similarities.argsort(descending=True)[:top_k].tolist()
            return [FAQS[int(index)] for index in top_indices]
        except Exception:
            pass

    scored = sorted(((item, _keyword_score(question, item)) for item in FAQS), key=lambda x: x[1], reverse=True)
    return [item for item, _ in scored[:top_k]]


def _generate_answer_with_context(question: str, language: str, contexts: list[FAQItem]) -> str | None:
    if GENERATOR is None or not contexts:
        return None

    snippets = []
    for item in contexts:
        if language == "hi":
            snippets.append(f"Q: {item.question_hi}\nA: {item.answer_hi}")
        else:
            snippets.append(f"Q: {item.question_en}\nA: {item.answer_en}")

    prompt = (
        "Answer the legal question using only the context. Keep it concise and practical.\n\n"
        f"Question: {question}\n\n"
        f"Context:\n{'\n\n'.join(snippets)}"
    )

    try:
        generated = GENERATOR(prompt, max_new_tokens=160, do_sample=False)
        text = generated[0].get("generated_text", "").strip()
        return text or None
    except Exception:
        return None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai",
        "phase": "phase-2-qa",
        "faq_count": len(FAQS),
        "embedding_model_enabled": EMBED_MODEL is not None,
        "generator_enabled": GENERATOR is not None,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/ai/ask")
def ask_ai(payload: AskRequest) -> AskResponse:
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    match, confidence = _retrieve_best(question)
    lang = _language_key(payload.language)

    if match is None:
        fallback = (
            "I do not have enough legal context yet. Please provide more facts and consult a qualified lawyer."
            if lang == "en"
            else "मेरे पास अभी पर्याप्त कानूनी संदर्भ नहीं है। कृपया अधिक तथ्य दें और योग्य वकील से सलाह लें।"
        )
        return AskResponse(
            answer=fallback,
            confidence=0.1,
            language=lang,
            source_id=None,
            disclaimer="AI output is informational and not a substitute for legal advice.",
        )

    contexts = _retrieve_top(question, top_k=3)
    generated_answer = _generate_answer_with_context(question, lang, contexts)
    answer = generated_answer or (match.answer_hi if lang == "hi" else match.answer_en)
    return AskResponse(
        answer=answer,
        confidence=round(confidence, 3),
        language=lang,
        source_id=match.id,
        disclaimer="AI output is informational and not a substitute for legal advice.",
    )
