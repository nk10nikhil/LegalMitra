from datetime import datetime
import json
import math
from pathlib import Path
import hashlib
import pickle

from fastapi import FastAPI, File, HTTPException, UploadFile
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

try:
    from PyPDF2 import PdfReader  # type: ignore
except Exception:
    PdfReader = None

app = FastAPI(title="LegalMitra AI Service", version="0.1.0")
BASE_DIR = Path(__file__).resolve().parent
FAQ_PATH = BASE_DIR / "data" / "faqs.json"
PREDICT_MODEL_PATH = BASE_DIR / "models" / "case_outcome_model.pkl"


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


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class EmbedResponse(BaseModel):
    embedding: list[float]
    dimension: int
    model: str


class SummarizeResponse(BaseModel):
    summary: str
    char_count: int
    model: str


class PredictRequest(BaseModel):
    court: str = Field(min_length=2, max_length=120)
    year: int = Field(ge=1950, le=2100)
    petitioner_type: str = Field(min_length=2, max_length=80)
    respondent_type: str = Field(min_length=2, max_length=80)
    acts_cited_count: int = Field(ge=0, le=100)
    prior_hearings: int = Field(ge=0, le=500)


class PredictResponse(BaseModel):
    success_probability: float
    similar_cases: int
    model: str
    disclaimer: str


class TranscribeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50000)
    language: str = "en"


class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    model: str


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

FAQ_CORPUS = [
    f"{item.question_en} {item.question_hi} {' '.join(item.keywords)}".lower().split()
    for item in FAQS
]
DOC_FREQ: dict[str, int] = {}
for doc in FAQ_CORPUS:
    for token in set(doc):
        DOC_FREQ[token] = DOC_FREQ.get(token, 0) + 1

AVG_DOC_LEN = sum(len(doc) for doc in FAQ_CORPUS) / len(FAQ_CORPUS) if FAQ_CORPUS else 0.0

GENERATOR = None
if pipeline is not None:
    try:
        GENERATOR = pipeline("text2text-generation", model="google/flan-t5-small")
    except Exception:
        GENERATOR = None

SUMMARIZER = None
if pipeline is not None:
    try:
        SUMMARIZER = pipeline("summarization", model="facebook/bart-large-cnn")
    except Exception:
        SUMMARIZER = None

PREDICTOR = None
if PREDICT_MODEL_PATH.exists():
    try:
        with PREDICT_MODEL_PATH.open("rb") as model_file:
            PREDICTOR = pickle.load(model_file)
    except Exception:
        PREDICTOR = None

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


def _bm25_score(question: str, index: int, k1: float = 1.5, b: float = 0.75) -> float:
    if not FAQ_CORPUS or index >= len(FAQ_CORPUS):
        return 0.0

    doc = FAQ_CORPUS[index]
    if not doc:
        return 0.0

    tokens = question.lower().split()
    score = 0.0
    total_docs = len(FAQ_CORPUS)
    doc_len = len(doc)

    for token in tokens:
        freq = doc.count(token)
        if freq == 0:
            continue
        doc_freq = DOC_FREQ.get(token, 0)
        idf = math.log((total_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1)
        denom = freq + k1 * (1 - b + b * (doc_len / (AVG_DOC_LEN or 1)))
        score += idf * ((freq * (k1 + 1)) / denom)

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

    bm25_ranked = [(item, _bm25_score(question, idx)) for idx, item in enumerate(FAQS)]
    best_item, raw_score = max(bm25_ranked, key=lambda x: x[1])

    if raw_score <= 0:
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


def _hash_embedding(text: str, dimension: int = 384) -> list[float]:
    values: list[float] = []
    seed = text.strip().encode("utf-8")
    counter = 0

    while len(values) < dimension:
        digest = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        counter += 1
        for i in range(0, len(digest), 4):
            if len(values) >= dimension:
                break
            chunk = digest[i : i + 4]
            number = int.from_bytes(chunk, "big") / 0xFFFFFFFF
            values.append((number * 2.0) - 1.0)

    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


def _embed_text(text: str) -> tuple[list[float], str]:
    if EMBED_MODEL is not None:
        try:
            vector = EMBED_MODEL.encode(text, normalize_embeddings=True).tolist()
            return [float(item) for item in vector], "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        except Exception:
            pass

    return _hash_embedding(text), "fallback-hash-embedding-384"


def _extract_text_from_pdf(content: bytes) -> str:
    if PdfReader is None:
        raise HTTPException(status_code=503, detail="PyPDF2 is not installed in AI service")

    try:
        from io import BytesIO

        reader = PdfReader(BytesIO(content))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages).strip()
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Unable to parse PDF: {error}")


def _fallback_summary(text: str, max_chars: int = 1200) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_chars:
        return cleaned
    return f"{cleaned[:max_chars].rstrip()}..."


def _summarize_text(text: str) -> tuple[str, str]:
    if SUMMARIZER is None:
        return _fallback_summary(text), "fallback-extractive-summary"

    try:
        source = text[:12000]
        summary = SUMMARIZER(source, max_length=220, min_length=80, do_sample=False)[0][
            "summary_text"
        ].strip()
        if summary:
            return summary, "facebook/bart-large-cnn"
    except Exception:
        pass

    return _fallback_summary(text), "fallback-extractive-summary"


def _predict_heuristic(payload: PredictRequest) -> tuple[float, int, str]:
    score = 0.5

    if "supreme" in payload.court.lower():
        score += 0.06
    if "high" in payload.court.lower():
        score += 0.03
    if payload.acts_cited_count >= 3:
        score += 0.08
    if payload.prior_hearings >= 4:
        score += 0.06

    recency_factor = max(0, min(10, payload.year - 2014))
    score += recency_factor * 0.005

    if payload.petitioner_type.lower() == payload.respondent_type.lower():
        score -= 0.04

    score = max(0.05, min(0.95, score))
    similar_cases = 900 + (payload.acts_cited_count * 75) + (payload.prior_hearings * 20)
    return score, similar_cases, "heuristic-legal-outcome-v1"


def _predict_model(payload: PredictRequest) -> tuple[float, int, str] | None:
    if PREDICTOR is None:
        return None

    try:
        features = [
            payload.year,
            payload.acts_cited_count,
            payload.prior_hearings,
            len(payload.court),
            len(payload.petitioner_type),
            len(payload.respondent_type),
        ]

        probability = float(PREDICTOR.predict_proba([features])[0][1])
        probability = max(0.01, min(0.99, probability))
        similar_cases = 1200 + (payload.acts_cited_count * 100)
        return probability, similar_cases, "xgboost-trained-model"
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
        "predictor_loaded": PREDICTOR is not None,
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


@app.post("/embed")
def embed(payload: EmbedRequest) -> EmbedResponse:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    embedding, model_name = _embed_text(text)
    return EmbedResponse(
        embedding=embedding,
        dimension=len(embedding),
        model=model_name,
    )


@app.post("/summarize")
async def summarize(file: UploadFile = File(...)) -> SummarizeResponse:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty")

    extracted = _extract_text_from_pdf(content)
    if len(extracted) < 100:
        raise HTTPException(status_code=400, detail="PDF text is too short to summarize")

    summary, model_name = _summarize_text(extracted)
    return SummarizeResponse(
        summary=summary,
        char_count=len(extracted),
        model=model_name,
    )


@app.post("/predict")
def predict(payload: PredictRequest) -> PredictResponse:
    model_result = _predict_model(payload)
    if model_result is not None:
        probability, similar_cases, model_name = model_result
    else:
        probability, similar_cases, model_name = _predict_heuristic(payload)

    return PredictResponse(
        success_probability=round(probability, 3),
        similar_cases=similar_cases,
        model=model_name,
        disclaimer="For research and educational use only. Not legal advice or a guaranteed outcome.",
    )


@app.post("/transcribe")
def transcribe(payload: TranscribeRequest) -> TranscribeResponse:
    transcript = " ".join(payload.text.split())
    language = _language_key(payload.language)

    return TranscribeResponse(
        transcript=transcript,
        language=language,
        model="livekit-text-normalizer-v1",
    )
