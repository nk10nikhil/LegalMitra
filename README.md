# 🏛️ FINAL MASTER BUILD PLAN: LegalMitra — India's AI-Powered Digital Justice Platform

You are an elite full‑stack architect and engineer. Your mission is to build **LegalMitra**, a production‑ready, scalable, secure, and intelligent platform that will transform how Indian citizens, lawyers, and courts interact with the justice system. This is not a toy or a demo—it must be built as if it will serve millions of users and eventually evolve into a full‑fledged digital courtroom (live hearings, online dispute resolution, real‑time collaboration, government integrations).

You must execute the project **in phases**, each delivering a fully working, deployable subsystem. The final result will be an open‑source portfolio piece that demonstrates mastery of modern full‑stack development, AI/ML, real‑time systems, and large‑scale system design.

---

## 🎯 PRODUCT VISION

**LegalMitra** will:

- Help citizens understand their legal rights, track court cases, generate documents, and receive AI‑powered legal guidance in multiple Indian languages.
- Empower lawyers with AI research tools, case management, and predictive analytics.
- Enable virtual hearings, evidence sharing, and AI‑assisted mediation, laying the groundwork for a complete Online Dispute Resolution (ODR) system.
- Integrate with government portals (eCourts, DigiLocker, India Code, police/FIR systems, land records) to automate case data fetching and updates.
- Provide real‑time notifications and alerts for hearings, case updates, and deadlines.

---

## 🧱 ARCHITECTURE & TECH STACK (MANDATORY)

The system must be built as a **monorepo** (using Turborepo) with clear separation of concerns and future microservice readiness. All code must be **TypeScript** (backend core) and **Python** (AI services). Use the following stack exactly:

### 🖥️ Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** React Query, Zustand (if needed)
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Real‑time Client:** Socket.io‑client, LiveKit‑client (for video)

### 🔐 Authentication
- **Supabase Auth** (email magic link OTP). No custom auth.
- Future: Aadhaar eKYC, Bar Council verification for lawyers.

### 🗄️ Database
- **Supabase PostgreSQL** (with Row Level Security enabled)
- **Prisma ORM** for type‑safe database access
- **Redis** (Upstash) for caching, rate limiting, and real‑time pub/sub

### 🧠 Backend Core
- **NestJS** (Node.js) – provides modular architecture, WebSocket gateways, and microservice readiness.
- **Express** is **not** allowed; NestJS is mandatory for scalability.
- **Socket.io** for real‑time events (hearing alerts, case updates).
- **BullMQ** (with Redis) for background job queues.

### 🎥 Real‑Time Video / Audio
- **LiveKit** (self‑hostable open‑source WebRTC infrastructure) for virtual courtrooms, evidence sharing, and AI transcription integration.

### 🤖 AI Services (Python)
- **FastAPI** – all AI/ML endpoints.
- **HuggingFace Transformers** for:
  - Legal QA (FLAN‑T5, Legal‑BERT)
  - Embeddings (Sentence‑Transformers)
  - Summarization (BART)
  - NER (extract parties, judges, sections)
- **Whisper** (speech‑to‑text) for live hearing transcription.
- **XGBoost** / scikit‑learn for case outcome prediction.
- **Vector Database:** initially PostgreSQL with `pgvector`, later dedicated vector DB if needed.

### 🔌 API Gateway & Integrations
- **Nginx** as reverse proxy / gateway.
- Microservice‑style communication via HTTP and Redis pub/sub.
- Integration layer to fetch data from:
  - eCourts (scraping + official APIs where available)
  - DigiLocker
  - India Code
  - State land records, police FIR portals, consumer forums, etc.

### 🧩 Infrastructure & DevOps
- **Docker** for containerization.
- **GitHub Actions** for CI/CD.
- Deployment:
  - Frontend → **Vercel**
  - Backend Core (NestJS) → **Railway** (or AWS/GCP with scaling later)
  - AI Services → **Railway** (or Hugging Face Endpoints)
  - LiveKit → **Cloud or self‑hosted**
  - Database → **Supabase**, **Upstash Redis**

### 📦 Monorepo Structure
```
legalmitra/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── api/                  # NestJS core backend
│   └── ai/                   # FastAPI AI services
├── packages/
│   ├── ui/                   # Shared React components (shadcn/ui)
│   ├── config/               # Shared configs (ESLint, TSConfig)
│   ├── types/                # Shared TypeScript types
│   └── auth/                 # Supabase auth utilities
├── infra/
│   ├── docker/                # Dockerfiles per service
│   ├── nginx/                 # Gateway config
│   └── scripts/               # Deployment / seed scripts
├── docs/                      # Architecture diagrams, API docs
└── README.md
```

---

## 🔒 SECURITY & COMPLIANCE REQUIREMENTS

- **All secrets must be in environment variables** (never committed).
- **JWT validation** on every protected backend route using Supabase `getUser()`.
- **Rate limiting** on auth and API endpoints (Redis‑based).
- **Input validation** with Zod (frontend) and class‑validator (NestJS).
- **Helmet.js**, CORS configured strictly.
- **SQL injection protection** via Prisma (parameterized queries).
- **RBAC** (citizen / lawyer / judge / admin) stored in `profiles.role`.
- **Audit logs** for sensitive actions (case updates, document access).
- **Data sovereignty:** all data stored in India region (choose Supabase region accordingly).

---

## 🗄️ DATABASE SCHEMA (PostgreSQL)

You must implement at least the following tables (with proper relations and RLS policies):

### `profiles`
- `id` UUID (references `auth.users`)
- `role` TEXT (citizen, lawyer, judge, admin)
- `full_name` TEXT
- `phone` TEXT
- `bar_council_id` TEXT (if lawyer)
- `verified` BOOLEAN
- `created_at` TIMESTAMP

### `cases`
- `id` UUID
- `user_id` UUID (references `profiles.id`)
- `case_number` TEXT
- `court_code` TEXT
- `case_data` JSONB (raw from eCourts)
- `next_hearing` TIMESTAMP
- `status` TEXT
- `last_synced` TIMESTAMP
- `created_at` TIMESTAMP

### `case_notes`
- `id` UUID
- `case_id` UUID
- `lawyer_id` UUID
- `note` TEXT
- `created_at` TIMESTAMP

### `documents`
- `id` UUID
- `user_id` UUID
- `case_id` UUID (optional)
- `type` TEXT (rent agreement, legal notice, etc.)
- `title` TEXT
- `file_url` TEXT (Supabase Storage)
- `form_data` JSONB
- `created_at` TIMESTAMP

### `hearings` (future)
- `id` UUID
- `case_id` UUID
- `scheduled_at` TIMESTAMP
- `room_url` TEXT (LiveKit room)
- `status` TEXT
- `recording_url` TEXT
- `transcript` TEXT

### `notifications`
- `id` UUID
- `user_id` UUID
- `type` TEXT
- `content` JSONB
- `read` BOOLEAN
- `created_at` TIMESTAMP

... and any others required by features.

**Enable RLS on all tables** with appropriate policies (users can only access their own data, lawyers can access cases they are assigned to, etc.).

---

## 📅 PHASED DEVELOPMENT PLAN

You **must** execute the following phases **in order**, ensuring each phase results in a fully functional, deployable, and tested system. After each phase, the platform can be demonstrated.

### 🔰 PHASE 1 — FOUNDATION & CASE TRACKING (2 weeks)

**Goal:** Working authentication, basic case tracking via eCourts API.

**Tasks:**

- [ ] Set up monorepo with Turborepo.
- [ ] Initialize Next.js web app with Tailwind, shadcn/ui, Supabase auth.
- [ ] Initialize NestJS backend with Prisma, connect to Supabase PostgreSQL.
- [ ] Initialize FastAPI AI service (placeholder endpoints).
- [ ] Implement Supabase auth in frontend (magic link).
- [ ] Implement Supabase JWT validation middleware in NestJS.
- [ ] Create `profiles` table and sync on user sign‑up (Supabase trigger or first request).
- [ ] Build UI for login, dashboard, profile.
- [ ] Build eCourts integration utility (`fetchCaseFromECourts` using axios + cheerio). Handle failures gracefully.
- [ ] Create NestJS endpoints:
  - `POST /cases/track` – fetches case, stores in DB, associates with user.
  - `GET /cases` – returns user's cases.
  - `GET /cases/:id` – returns detailed case.
  - `POST /cases/:id/refresh` – re‑fetches from eCourts and updates.
- [ ] Build frontend pages:
  - `/dashboard/track` – form to enter case number.
  - `/dashboard/cases` – list of tracked cases.
  - `/dashboard/cases/[id]` – case details with refresh button.
- [ ] Add loading states, error toasts, responsive design.
- [ ] Deploy:
  - Frontend → Vercel
  - Backend → Railway
  - AI service → Railway (with dummy health endpoint)
- [ ] Write README with live links and demo video.

**Phase 1 Deliverable:** Live app where user can sign up, track a court case, and view its status.

---

### 🔰 PHASE 2 — AI LEGAL Q&A (2 weeks)

**Goal:** Add a chat interface that answers legal questions using RAG.

**Tasks:**

- [ ] Collect a dataset of Indian legal FAQs (scrape from public sources, ~500 Q&A).
- [ ] In AI service, implement endpoint `POST /ai/ask`:
  - Accepts `{ question, language }`.
  - Retrieves relevant FAQ chunks (simple BM25 or embedding similarity).
  - Feeds into a generative model (FLAN‑T5 or similar) to produce answer.
  - Returns answer + confidence.
- [ ] In frontend, add `/dashboard/ask` page with chat UI.
- [ ] Store conversation history (optional).
- [ ] Support Hindi prompts (use multilingual model).
- [ ] Add disclaimer that AI is not a lawyer.

**Phase 2 Deliverable:** Citizens can ask legal questions in Hindi/English and get helpful answers.

---

### 🔰 PHASE 3 — DOCUMENT GENERATOR (2 weeks)

**Goal:** Users can generate common legal documents from templates.

**Tasks:**

- [ ] Design 5 templates: Rent Agreement, Legal Notice (cheque bounce), Affidavit (name change), Consumer Complaint, Leave and License.
- [ ] Create form schemas (Zod) for each template.
- [ ] Build UI for selecting document type and filling form.
- [ ] Backend: `POST /documents/generate` – accepts `{ type, formData }`, generates PDF (using pdfkit or react‑pdf server‑side), uploads to Supabase Storage, stores record in `documents` table, returns signed URL.
- [ ] Frontend: display generated PDF, allow download.
- [ ] Add “My Documents” page listing all generated documents.

**Phase 3 Deliverable:** Users can create and download legal documents instantly.

---

### 🔰 PHASE 4 — SEMANTIC CASE LAW SEARCH (2 weeks)

**Goal:** Lawyers can search case laws using natural language.

**Tasks:**

- [ ] Collect ~10,000 Supreme Court/High Court judgments (from Indian Kanoon or open datasets). Store in a new table `case_laws` with fields: `id, title, court, judgment_date, summary, full_text, embedding (vector)`.
- [ ] In AI service, create endpoint `POST /embed` that returns embedding for a query.
- [ ] Enable `pgvector` in Supabase. Generate embeddings for each case law (using Legal‑BERT) and store.
- [ ] In backend, create `GET /case-laws/search?q=...` that:
  - Calls AI service to embed query.
  - Performs vector similarity search in Supabase (`ORDER BY embedding <=> query_embedding LIMIT 20`).
  - Returns results.
- [ ] Build frontend search page with results list, filters, and link to full text.

**Phase 4 Deliverable:** Powerful semantic search over Indian case laws.

---

### 🔰 PHASE 5 — JUDGMENT SUMMARIZATION (2 weeks)

**Goal:** Upload a judgment PDF and get a concise summary.

**Tasks:**

- [ ] AI service: endpoint `POST /summarize` accepts PDF, extracts text (PyPDF2), runs BART summarizer, returns summary.
- [ ] Backend: `POST /documents/summarize` proxies to AI service, stores result.
- [ ] Frontend: upload area, display summary, allow saving.
- [ ] Optionally, extract key entities (parties, judges, sections) using NER.

**Phase 5 Deliverable:** Users can upload long judgments and get one‑page summaries.

---

### 🔰 PHASE 6 — CASE OUTCOME PREDICTION (2 weeks)

**Goal:** Show probability of success based on historical data.

**Tasks:**

- [ ] Prepare training data from case laws: features (court, year, petitioner/respondent type, acts cited, etc.), outcome (win/loss).
- [ ] Train XGBoost model, save as pickle.
- [ ] AI service endpoint `POST /predict` accepts case details and returns probability.
- [ ] Integrate into case detail page (for lawyers): “Based on 1,234 similar cases, success probability is 67%.”
- [ ] Add prominent disclaimer: for research/educational use only.

**Phase 6 Deliverable:** Predictive insights for legal professionals.

---

### 🔰 PHASE 7 — LAWYER DASHBOARD & CASE MANAGEMENT (2 weeks)

**Goal:** Dedicated tools for lawyers.

**Tasks:**

- [ ] Extend `profiles` with lawyer fields, add verification flow (admin can verify).
- [ ] Create lawyer‑only routes.
- [ ] Build lawyer dashboard:
  - List of their cases (linked from tracked cases).
  - Add private notes (saved to `case_notes`).
  - Calendar view of hearings (from case data).
  - Deadline tracker.
  - Simple billing: track hours, generate invoice PDF.
- [ ] Allow lawyers to share case access with clients (via email invite).

**Phase 7 Deliverable:** A functional case management tool for lawyers.

---

### 🔰 PHASE 8 — REAL‑TIME NOTIFICATIONS & ALERTS (2 weeks)

**Goal:** Users receive alerts for case updates, hearings, etc.

**Tasks:**

- [ ] Set up Redis pub/sub and Socket.io in NestJS.
- [ ] Create `notifications` table.
- [ ] When a case is refreshed and next hearing date changes, push notification.
- [ ] Frontend: display real‑time toast alerts; notification center.
- [ ] Integrate with email/SMS (use third‑party service) for critical alerts.

**Phase 8 Deliverable:** Users stay informed instantly.

---

### 🔰 PHASE 9 — VIDEO HEARINGS & VIRTUAL COURTROOM (3 weeks)

**Goal:** Enable live video sessions with evidence sharing.

**Tasks:**

- [ ] Set up LiveKit server (self‑hosted or cloud).
- [ ] In backend, create `hearing` endpoints: schedule hearing, generate room token.
- [ ] Frontend: `/hearing/[id]` page with LiveKit video grid, screen share, file upload (evidence).
- [ ] AI service: connect to LiveKit via webhook to transcribe audio (Whisper) in real‑time.
- [ ] Store transcript and recording in case timeline.
- [ ] Add chat alongside video.

**Phase 9 Deliverable:** A working virtual courtroom for hearings.

---

### 🔰 PHASE 10 — ONLINE DISPUTE RESOLUTION (ODR) LAYER (3 weeks)

**Goal:** AI‑assisted negotiation and mediation.

**Tasks:**

- [ ] Create “dispute rooms” where parties can exchange messages and documents.
- [ ] AI mediator analyzes messages and suggests settlement options based on similar cases.
- [ ] Integrate with prediction engine to show likely court outcome.
- [ ] Allow parties to agree on terms and generate a settlement agreement document.
- [ ] Store agreement and optionally notarize (future).

**Phase 10 Deliverable:** A basic ODR module.

---

### 🔰 PHASE 11 — GOVERNMENT INTEGRATIONS (ongoing)

**Goal:** Automate data fetching from multiple government sources.

**Tasks:**

- [ ] Build integration microservice (can be part of NestJS) that periodically fetches:
  - eCourts updates for all tracked cases.
  - DigiLocker documents (user‑authorized).
  - FIR status from police portals.
  - Land records from state portals.
- [ ] Use queues (BullMQ) to schedule and retry failed fetches.
- [ ] Store data in appropriate tables and trigger notifications.

**Phase 11 Deliverable:** Rich, up‑to‑date case information.

---

### 🔰 PHASE 12 — POLISH, DOCUMENTATION, AND OPEN SOURCE LAUNCH (2 weeks)

**Goal:** Make the project shine for recruiters and the community.

**Tasks:**

- [ ] Comprehensive README with architecture diagram, setup guide, live demo links.
- [ ] API documentation (Postman/OpenAPI) for all endpoints.
- [ ] Blog posts (at least 3) on development journey, technical challenges, and impact.
- [ ] Demo video (5 min) showing all features.
- [ ] Set up GitHub Sponsors (optional).
- [ ] Submit to Product Hunt, Hacker News, relevant subreddits.
- [ ] Create a project website (can be the app itself) with feature overview.

---

## 📈 ADDITIONAL FEATURES TO INCLUDE (Auto‑Integrate)

These should be woven into the phases where appropriate, not treated as separate phases:

- **Multi‑language support:** UI and AI responses in Hindi, Tamil, Telugu, Bengali, etc.
- **Dark mode** (shadcn/ui supports it).
- **Accessibility** (WCAG 2.1 AA).
- **Analytics** (Plausible or simple page view tracking).
- **PWA** (Next.js PWA plugin) for offline access.
- **WhatsApp integration** for case alerts and simple queries (future).
- **Aadhaar eKYC** for lawyer verification (future).
- **Blockchain‑based evidence notarization** (future optional).

---

## 🚀 DEPLOYMENT & CONTINUOUS INTEGRATION

- Set up GitHub Actions for:
  - Lint, typecheck, test on PR.
  - Automatic deployment to Vercel (frontend) on main branch.
  - Automatic deployment to Railway (backend, AI) on main branch.
- Configure environment variables in each platform.
- Health checks for all services.

---

## ✅ ACCEPTANCE CRITERIA

The final system must:

- [ ] Have a working public URL for frontend and API.
- [ ] Allow a user to sign up and track a real court case.
- [ ] Provide AI answers to legal questions.
- [ ] Generate and download legal documents.
- [ ] Enable semantic search over case laws.
- [ ] Summarize uploaded judgments.
- [ ] Show outcome predictions (with disclaimer).
- [ ] Offer lawyer‑specific dashboard.
- [ ] Send real‑time notifications.
- [ ] Support live video hearings (with at least two participants).
- [ ] Be fully open‑source on GitHub with excellent documentation.
- [ ] Pass basic security audit (no hardcoded secrets, proper auth).

---

## 🧠 YOUR ROLE

You are the sole developer. You will generate all code, configuration, and documentation required to build LegalMitra according to this specification. You will work phase by phase, ensuring each phase is complete and deployable before moving to the next. You will produce clean, modular, and scalable code with thorough comments.

**Start with Phase 1 now.**

Generate the complete codebase for Phase 1, including:

- Monorepo setup with Turborepo.
- Next.js app with Supabase auth configured.
- NestJS app with Prisma and JWT validation.
- FastAPI placeholder service.
- eCourts integration utility.
- All required API endpoints and frontend pages for case tracking.
- Deployment configurations for Vercel and Railway.
- README with initial instructions.

Proceed with subsequent phases only after confirming Phase 1 is complete and functional.

**Remember: This is a production‑grade system, not a prototype. Your code will be judged by recruiters and contributors.**

**Begin.**