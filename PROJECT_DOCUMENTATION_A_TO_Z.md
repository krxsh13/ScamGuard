# ScamGuard - Complete Project Documentation (A to Z)

## 1) Executive Overview

ScamGuard is a multi-part platform focused on scam awareness and detection. It currently consists of:

- A React + TypeScript frontend (`src`) that provides:
  - a rule-based "Scam Checker"
  - educational scam content
  - an interactive quiz
- A Node.js + Express + TypeScript backend (`backend`) with:
  - JWT-based authentication endpoints
  - security middleware and logging
  - MongoDB models for scans, reports, conversations, and quiz results
- A Python FastAPI AI service (`ai-service`) with:
  - DistilBERT-based text classification
  - Tesseract OCR text extraction from images

The repository is structured like a monorepo with three runtime contexts under `project`.

---

## 2) Repository Topology

Primary workspace root:

- `project/`

Main top-level folders and files:

- `src/` - frontend application source
- `backend/` - Node/Express API service
- `ai-service/` - Python AI + OCR service
- `.kiro/specs/ai-backend-integration/` - requirements/design/tasks docs
- `README.md` - frontend-oriented quick start
- `package.json` - frontend dependencies/scripts
- `vite.config.ts` - frontend bundler config
- `tailwind.config.js` - frontend utility CSS config
- `eslint.config.js` - frontend lint rules
- `.env.example` - frontend env template (future API vars)
- Additional root-level TSX files exist (for example `ScamChecker.tsx`) that appear duplicated relative to `src/components/*`.

---

## 3) Technology Stack

## Frontend

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React icons

## Backend

- Node.js (ESM)
- Express
- TypeScript
- Mongoose (MongoDB)
- Redis client
- JWT (`jsonwebtoken`)
- bcrypt password hashing
- zod env validation
- Helmet, CORS, Express rate limit
- Winston logging

## AI Service

- Python 3.10+
- FastAPI
- Transformers + PyTorch
- DistilBERT model loading via Hugging Face APIs
- pytesseract + Pillow for OCR
- pydantic/pydantic-settings for schema + config

---

## 4) Frontend Deep Dive

Frontend source lives in `src`.

## 4.1 Entry and App Shell

- `src/main.tsx`
  - Uses `StrictMode`.
  - Wraps app in `ErrorBoundary`.
  - Uses `BrowserRouter`.
- `src/App.tsx`
  - Route-based navigation.
  - Section-to-route mapping:
    - `home` -> `/`
    - `checker` -> `/checker`
    - `learn` -> `/learn`
    - `quiz` -> `/quiz`
  - Shared layout:
    - `Header` on top
    - route content in `main`
    - `Footer` at bottom

## 4.2 Components

- `src/components/Header.tsx`
  - Desktop nav with active-state highlighting.
  - Mobile menu icon is present, but no expanded mobile menu behavior yet.
- `src/components/Hero.tsx`
  - Marketing-style landing content and CTA buttons.
  - Hardcoded stats (for example "5.8M+ scam attempts daily").
- `src/components/ScamChecker.tsx`
  - Local, synchronous rule-based analysis (no backend/API call currently).
  - Detects patterns from hardcoded keyword categories:
    - Financial scams
    - Tech support scams
    - Phishing attempts
    - Social engineering
  - Additional checks:
    - urgency words
    - grammar red flags
    - URL extraction with suspicious-domain heuristics
    - insecure HTTP link detection
  - Computes:
    - total risk score
    - risk level (`low`/`medium`/`high`)
    - urgency score
    - financial pressure flag
    - optional URL analysis and grammar issues
  - Simulates analysis latency (`setTimeout`-based wait).
  - Produces prescriptive tips based on risk level.
- `src/components/Education.tsx`
  - Educational cards for scam categories:
    - phone scams
    - SMS phishing
    - email phishing
    - malicious links
  - Expanded details include examples, red flags, and protection guidance.
- `src/components/Quiz.tsx`
  - 5-question multiple-choice anti-scam quiz.
  - Tracks question progress and selected answers.
  - End screen shows score, explanation per question, and restart option.
- `src/components/Footer.tsx`
  - Emergency contacts and quick resources (static).
- `src/components/ErrorBoundary.tsx`
  - Catches render/runtime errors in React tree.
  - Displays fallback UI and page-refresh button.

## 4.3 Routing

- `src/pages/NotFound.tsx` for unmatched routes (`*` route in `App.tsx`).

## 4.4 Styling

- `src/index.css` only contains Tailwind directives (`@tailwind base/components/utilities`).
- Styling is utility-first with Tailwind classes directly in TSX.

## 4.5 Frontend Build/Lint/Type System

- `vite.config.ts`
  - React plugin enabled.
  - Aliases:
    - `@` -> `src`
    - `@components` -> `src/components`
  - Excludes `lucide-react` from `optimizeDeps`.
- `eslint.config.js`
  - Flat config style.
  - TypeScript recommended rules + React hooks rules.
  - React refresh rule warns for non-component exports.
- `tsconfig.app.json`
  - Strict TypeScript mode.
  - Bundler module resolution.
  - No emit.
  - Path aliases align with Vite aliases.
- `tsconfig.node.json`
  - Node-side TS settings for Vite config typing.

---

## 5) Backend Deep Dive

Backend source lives in `backend/src`.

## 5.1 Startup and App Composition

- `backend/src/server.ts`
  - Connects MongoDB.
  - Connects Redis.
  - Creates Express app and starts listening on `env.PORT`.
  - Handles graceful shutdown on `SIGTERM` / `SIGINT`.
- `backend/src/app.ts`
  - Configures:
    - JSON and URL-encoded parsers (10mb limit)
    - request ID middleware
    - CORS
    - Helmet headers
    - rate limiter
    - input sanitizer
    - request logger
  - Health endpoint:
    - `GET /health` returns service status + uptime.
  - Active route mounting:
    - `/api/auth`
  - Placeholder/commented route groups:
    - scan, reports, analytics, assistant.
  - 404 and error handlers are registered last.

## 5.2 Authentication Flow

Files:

- `backend/src/routes/auth.routes.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/utils/jwt.ts`
- `backend/src/utils/password.ts`

Exposed auth routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout` (protected)
- `GET /api/auth/me` (protected)

Behavior highlights:

- Password hashing with bcrypt (salt rounds = 12).
- JWT payload includes:
  - `userId`
  - `email`
  - `role`
- Register:
  - validates required fields
  - validates email format + min password length 8
  - creates email verification token
  - returns access + refresh tokens
- Login:
  - validates credentials
  - updates `lastLogin`
  - returns tokens + user profile subset
- Refresh:
  - verifies token and reissues tokens.
  - Important implementation note: refresh token signing currently uses `JWT_SECRET` (same as access token), not `JWT_REFRESH_SECRET`.
- Forgot/reset password:
  - reset token generated and expiry set to 1 hour.
  - TODO remains for sending real email.
  - development mode can return reset token in response.
- Auth middleware:
  - expects `Authorization: Bearer <token>`.
  - injects `req.user`.
  - has `requireAdmin` role gate helper.

## 5.3 Security Middleware

File: `backend/src/middleware/security.ts`

Implemented protections:

- CORS using configured origin.
- Helmet with CSP and HSTS.
- Rate limiting with custom JSON error payload.
- Request IDs (`X-Request-ID` response header).
- Request logging (method/path/status/duration/ip/requestId).
- Input sanitization for body/query:
  - strips script tags
  - strips `javascript:` fragments
  - strips inline event handlers like `on...=`

## 5.4 Error Handling

File: `backend/src/middleware/errorHandler.ts`

Standardized JSON error responses with:

- error `code`
- `message`
- optional `details`
- `timestamp`
- `requestId`

Handled error classes include:

- custom `AppError`
- Mongoose validation/cast errors
- JWT invalid/expired errors
- default internal server fallback
- dedicated 404 handler (`notFoundHandler`)

## 5.5 Backend Data Model Layer

Models live in `backend/src/models`.

### `User`

Core fields:

- identity: `email`, `firstName`, `lastName`, `role`
- auth/account: `passwordHash`, `isVerified`, verification/reset tokens
- preference object:
  - email notifications
  - theme
- stats object:
  - total scans
  - scams detected
  - quizzes taken
  - average quiz score
  - security awareness score

Indexes:

- index on `email`

### `Scan`

Represents analysis history for user content.

Core fields:

- `userId`
- `type`: text/url/image
- `content`
- optional `imageUrl`
- nested `results`:
  - risk score/level/confidence
  - `aiPrediction`
  - optional `threatIntel` (Google Safe Browsing, VirusTotal, PhishTank structures)
  - optional URL analysis metadata
- `processingTime`

Indexes:

- `{ userId: 1, createdAt: -1 }`
- `{ results.riskLevel: 1, createdAt: -1 }`

### `Report`

Crowd/incident reporting schema.

Core fields:

- `userId`
- `type`: phone/email/url/message
- `content`
- `scamType[]`
- `description`
- optional `evidence[]`
- moderation:
  - `status` (pending/verified/rejected)
  - `verifiedBy`
  - `verifiedAt`
- aggregation:
  - `reportCount`
  - `reporters[]`

Indexes:

- `{ content: 1, type: 1 }`
- `{ status: 1, createdAt: -1 }`
- `{ reportCount: -1 }`
- `{ scamType: 1, createdAt: -1 }`

### `Conversation`

Assistant/chat history.

Core fields:

- `userId`
- `messages[]`:
  - role (`user`/`assistant`)
  - content
  - timestamp

Index:

- `{ userId: 1, updatedAt: -1 }`

### `QuizResult`

Quiz attempt storage.

Core fields:

- `userId`
- `quizId`
- `score`
- `totalQuestions`
- per-question answer records
- `completedAt`
- `timeSpent`

Indexes:

- `{ userId: 1, completedAt: -1 }`
- `{ quizId: 1, completedAt: -1 }`

## 5.6 Backend Infrastructure Config

Files:

- `backend/src/config/env.ts`
- `backend/src/config/database.ts`
- `backend/src/config/redis.ts`
- `backend/src/config/logger.ts`

Details:

- Environment variables are validated with Zod at startup.
- DB connector switches to test URI if `NODE_ENV=test`.
- Redis connector is singleton-style with lifecycle methods.
- Winston logger writes:
  - console
  - `logs/error.log`
  - `logs/combined.log`
  - exception/rejection files

---

## 6) AI Service Deep Dive

AI service source lives in `ai-service/app`.

## 6.1 FastAPI Endpoints and Lifecycle

File: `ai-service/app/main.py`

Endpoints:

- `GET /`
  - service metadata and endpoint list
- `GET /health`
  - includes model_loaded + ocr_available flags
- `POST /predict`
  - request body: text
  - response: risk/classification metadata
- `POST /extract-text`
  - multipart image upload
  - OCR extraction response

Lifecycle:

- Uses FastAPI `lifespan` hook.
- Attempts model load at startup.
- Continues serving even if model load fails (health reports false).

Validation and resilience:

- MIME type validation for OCR endpoint (`image/png`, `image/jpeg`, `image/jpg`).
- File size validation via config (`MAX_IMAGE_SIZE_MB`, default 5MB).
- 503 responses when model/OCR is unavailable.

## 6.2 ML Pipeline

File: `ai-service/app/ml_model.py`

Major stages:

1. model/tokenizer load from `MODEL_PATH`
2. text preprocessing:
   - whitespace normalization
   - trim
   - hard truncation at 5000 chars before tokenizer
3. linguistic cue extraction (urgency/financial/emotional keyword sets)
4. tokenization (`max_length=512`, truncation + padding)
5. forward pass through sequence classifier
6. softmax probability extraction
7. risk score calculation:
   - up to 70 points from scam probability
   - up to 30 points from linguistic cues
8. risk level mapping:
   - `<30` low
   - `<70` medium
   - else high
9. pattern labeling (for example "Urgency tactics detected")
10. optional low-confidence warning if confidence < 70%

Returned fields include:

- `risk_score` (0-100)
- `risk_level`
- `confidence` (%)
- `is_scam` (bool)
- `detected_patterns[]`
- `linguistic_cues`
- `low_confidence_warning` (nullable)
- `processing_time_ms`

## 6.3 OCR Pipeline

File: `ai-service/app/ocr.py`

- On initialization, checks if Tesseract is installed and available.
- OCR extraction:
  - takes PIL image
  - runs `pytesseract.image_to_string`
  - trims output
  - returns extracted text

## 6.4 AI Service Schemas and Config

- `ai-service/app/models.py` defines strict request/response models.
- `PredictRequest` enforces non-empty text (min length, whitespace check).
- `LinguisticCues` scores constrained to [0, 1].
- `ai-service/app/config.py` settings include:
  - environment
  - port
  - model path
  - OCR language
  - max image size
  - CORS origins parser

---

## 7) Configuration and Environment Variables

## Frontend env (`.env.example`)

Currently placeholders only:

- `VITE_API_URL`
- `VITE_API_KEY`

## Backend env (`backend/.env.example`)

- Server: `NODE_ENV`, `PORT`
- DB: `MONGODB_URI`, `MONGODB_TEST_URI`
- Redis: `REDIS_URL`, `REDIS_PASSWORD`
- JWT:
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `JWT_REFRESH_SECRET`
  - `JWT_REFRESH_EXPIRES_IN`
- AI integration: `AI_SERVICE_URL`
- External threat APIs:
  - `GOOGLE_SAFE_BROWSING_API_KEY`
  - `VIRUSTOTAL_API_KEY`
  - `PHISHTANK_API_KEY`
- Security: `CORS_ORIGIN`, rate-limit settings
- Logging: `LOG_LEVEL`

## AI service env (`ai-service/.env.example`)

- `PYTHON_ENV`
- `PORT`
- `MODEL_PATH`
- `OCR_LANGUAGE`
- `MAX_IMAGE_SIZE_MB`
- `CACHE_PREDICTIONS`
- `CORS_ORIGINS`

---

## 8) Scripts and Runbooks

## Frontend (`project/package.json`)

- `npm run dev` - local development
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - lint
- `npm run lint:fix` - lint autofix
- `npm run type-check` - TypeScript check

## Backend (`project/backend/package.json`)

- `npm run dev` - tsx watch
- `npm run build` - TypeScript compile
- `npm start` - run built server
- `npm test` - vitest run mode
- `npm run test:watch` - vitest watch

## AI service

- Run:
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Test:
  - `pytest`

---

## 9) Testing Coverage and Gaps

## Backend tests

Detected test files:

- `config/env.test.ts`
- `controllers/auth.controller.test.ts`
- `models/*.test.ts` (conversation, quiz result, report, scan)
- `utils/jwt.test.ts`
- `utils/jwt-expiration.test.ts`
- `utils/password.test.ts`
- setup: `src/test/setup.ts`

`vitest.config.ts`:

- Node environment
- setup file configured
- V8 coverage with text/json/html reporters

## AI tests

Detected files:

- `tests/test_endpoints.py`
- `tests/test_preprocessing.py`
- `tests/test_properties.py`

Highlights:

- Endpoint health/root behavior checks.
- Preprocess/tokenization tests.
- Property-based tests with Hypothesis:
  - score bounds
  - cue detection
  - low-confidence warning behavior
  - file size/MIME validation
  - OCR-to-predict pipeline checks

## Frontend tests

- No frontend unit/e2e tests detected in current codebase.

---

## 10) Data Flow and Integration Status

Current state from source:

- Frontend `ScamChecker` currently analyzes text locally via hardcoded heuristics.
- Backend has auth API implemented and operational route mounting.
- AI service has functioning `/predict` and `/extract-text`.
- Backend includes `AI_SERVICE_URL` configuration but active scan route integration is not mounted in `app.ts` yet (scan/report/analytics/assistant routes are commented placeholders).

Practical implication:

- The platform is architected for full-stack + AI integration, but user-facing scam detection in the frontend is currently independent of backend/AI runtime.

---

## 11) Security Posture Snapshot

Positive controls:

- Helmet and CSP on backend.
- Rate limiting with structured responses.
- Request IDs and request logging.
- Input sanitization pass.
- Password hashing with bcrypt.
- JWT-protected route middleware.
- Environment validation at startup.

Important caveats:

- Refresh token utility currently signs with `JWT_SECRET` instead of `JWT_REFRESH_SECRET`.
- Frontend detection logic is transparent heuristic code and can be reverse engineered easily.
- Placeholder TODO for password reset email delivery remains unresolved.

---

## 12) Known Inconsistencies / Technical Debt

- Duplicate/legacy-looking root-level component files exist alongside active `src/components/*`.
- Backend README says some endpoints are "Coming Soon" while auth routes are already implemented.
- Frontend marketing text says "enhanced AI", but actual checker currently runs local rule logic rather than remote model inference.
- AI service uses `distilbert-base-uncased` model path by default; unless finetuned assets are supplied, classification quality may not be scam-domain optimized.

---

## 13) Complete Source File Inventory (Primary Code Areas)

## Frontend (`src`)

- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/vite-env.d.ts`
- `src/components/Header.tsx`
- `src/components/Hero.tsx`
- `src/components/ScamChecker.tsx`
- `src/components/Education.tsx`
- `src/components/Quiz.tsx`
- `src/components/Footer.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/pages/NotFound.tsx`

## Backend (`backend/src`)

- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/config/database.ts`
- `backend/src/config/redis.ts`
- `backend/src/config/logger.ts`
- `backend/src/middleware/security.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/models/User.ts`
- `backend/src/models/Scan.ts`
- `backend/src/models/Report.ts`
- `backend/src/models/Conversation.ts`
- `backend/src/models/QuizResult.ts`
- `backend/src/models/index.ts`
- `backend/src/utils/password.ts`
- `backend/src/utils/jwt.ts`
- `backend/src/test/setup.ts`
- Tests:
  - `backend/src/config/env.test.ts`
  - `backend/src/controllers/auth.controller.test.ts`
  - `backend/src/models/Conversation.test.ts`
  - `backend/src/models/QuizResult.test.ts`
  - `backend/src/models/Report.test.ts`
  - `backend/src/models/Scan.test.ts`
  - `backend/src/utils/jwt.test.ts`
  - `backend/src/utils/jwt-expiration.test.ts`
  - `backend/src/utils/password.test.ts`

## AI service (`ai-service`)

- `ai-service/app/main.py`
- `ai-service/app/config.py`
- `ai-service/app/models.py`
- `ai-service/app/ml_model.py`
- `ai-service/app/ocr.py`
- `ai-service/app/__init__.py`
- `ai-service/tests/test_endpoints.py`
- `ai-service/tests/test_preprocessing.py`
- `ai-service/tests/test_properties.py`
- `ai-service/requirements.txt`
- `ai-service/requirements-dev.txt`
- `ai-service/pytest.ini`
- `ai-service/.env.example`
- `ai-service/README.md`
- `ai-service/setup.sh`
- `ai-service/setup.bat`

---

## 14) Getting the Whole System Running (Reference Sequence)

1. Start AI service:
   - install Python deps
   - ensure Tesseract installed
   - run uvicorn on port 8000
2. Start backend:
   - set `backend/.env`
   - ensure MongoDB and Redis are running
   - run `npm run dev` in `backend`
3. Start frontend:
   - run `npm run dev` at root `project`
4. Access frontend via Vite URL (default 5173).

Note: frontend scam checker currently does not require backend to produce local heuristic output.

---

## 15) Priority Improvement Backlog (Recommended)

1. Integrate frontend checker with backend scan endpoints and AI service prediction.
2. Implement backend scan/report/analytics routes now referenced by models.
3. Fix refresh-token secret usage split (`JWT_REFRESH_SECRET` path).
4. Add frontend tests (unit + e2e).
5. Remove or archive duplicate root-level TSX files to avoid drift.
6. Implement password-reset email transport and token lifecycle hardening.
7. Add deployment infrastructure (Docker + CI + environment profiles).
8. Introduce observability (metrics + tracing + alerting baselines).

---

## 16) Final Notes

This document reflects the implementation state visible in the current repository snapshot and is intended as a full technical reference for developers, reviewers, and maintainers.

If you want, this file can be extended into:

- API contract tables (request/response JSON examples per endpoint)
- sequence diagrams (frontend -> backend -> AI)
- threat model and STRIDE walkthrough
- production architecture and deployment playbook

