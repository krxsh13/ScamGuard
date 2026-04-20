# SECTION 6 - Testing Implementation Guide

## Overview
Comprehensive testing suite for ScamGuard including unit tests, E2E tests, integration tests, and API tests.

## Frontend Testing

### 6.1 Frontend Unit Tests

**Setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom msw @playwright/test
```

**Files Created:**
- `vitest.config.ts` - Vitest configuration with jsdom environment
- `src/test/setup.ts` - Test setup with MSW server and localStorage mock
- `src/test/mocks/server.ts` - MSW request handlers for all API endpoints
- `src/context/__tests__/AuthContext.test.tsx` - Auth context tests
- `src/api/__tests__/scans.test.ts` - Scans API tests
- `src/components/__tests__/ScamChecker.test.tsx` - ScamChecker component tests

**Running Tests:**
```bash
npm run test              # Run all tests once
npm run test:ui          # Run with interactive UI
npm run test:coverage    # Generate coverage report
```

**Test Coverage:**
- **AuthContext**: Login, logout, token storage, silent refresh, error handling
- **Scans API**: Submit scan, poll results, retry logic, error handling
- **ScamChecker Component**: Form submission, loading state, result display, error handling, timeout/retry, accessibility

**MSW Handlers:**
All API calls are mocked with MSW (Mock Service Worker):
- `POST /api/auth/login` - Returns mock tokens
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/scans` - Returns 202 with jobId
- `GET /api/scans/:jobId` - Returns scan result
- `GET /api/scans` - Paginated list
- `POST /api/reports` - Report submission
- `GET /api/reports` - Report list
- `GET /api/analytics/user` - Analytics data

---

### 6.2 Frontend E2E Tests with Playwright

**Configuration:**
- `playwright.config.ts` - Configured for localhost:5173 with Chrome, Firefox, Safari
- Runs against actual dev server (not mocked)
- Tests real browser behavior and user flows

**Files Created:**
- `e2e/auth.spec.ts` - Authentication flows
- `e2e/scam-checker.spec.ts` - Scam checker functionality

**Test Scenarios:**

**Auth Flow (`e2e/auth.spec.ts`):**
- ✅ User registration with email/password
- ✅ User login
- ✅ User logout
- ✅ Session persistence on reload
- ✅ Invalid credentials error handling
- ✅ Form validation errors

**Scam Checker (`e2e/scam-checker.spec.ts`):**
- ✅ Home page loads with CTA
- ✅ CTA navigation to checker
- ✅ Text submission and analysis
- ✅ Loading state display
- ✅ Result display with confidence/cues
- ✅ Timeout and retry
- ✅ Error handling
- ✅ Quiz navigation
- ✅ Keyboard accessibility (Tab navigation)
- ✅ Mobile menu (responsive design)

**Running E2E Tests:**
```bash
# Start dev server first (or playwright does it automatically)
npm run dev

# In another terminal:
npm run e2e                # Run all E2E tests
npm run e2e:ui            # Run with interactive UI
npm run e2e:debug         # Debug mode with step-by-step
```

**E2E Test Structure:**
- Each test includes `beforeEach` login (mock auth)
- Tests run on real browser against real UI
- Includes mobile viewport testing (375x667)
- Accessibility testing with keyboard navigation

---

## Backend Testing

### 6.3 Backend Integration Tests

**Setup:**
Already configured in backend/package.json with vitest and supertest.

**Installation:**
```bash
cd backend
npm install -D mongodb-memory-server  # For in-memory MongoDB
npm test                               # Run tests
```

**Files Created:**
- `backend/src/routes/__tests__/scan.routes.test.ts` - Scan API tests
- `backend/src/routes/__tests__/report.routes.test.ts` - Report API tests

**Test Coverage:**

**Scan Routes (`scan.routes.test.ts`):**
- ✅ `POST /api/scans` - Creates scan job, returns 202 with jobId
- ✅ `GET /api/scans/:jobId` - Returns scan result
- ✅ `GET /api/scans` - Paginated list, user-specific
- ✅ `DELETE /api/scans/:jobId` - Delete scan
- ✅ Authentication checks (401 without token)
- ✅ Authorization checks (403 for other user's scans)
- ✅ Pagination support
- ✅ Data isolation between users

**Report Routes (`report.routes.test.ts`):**
- ✅ `POST /api/reports` - Submit report
- ✅ `GET /api/reports` - List reports with pagination
- ✅ `GET /api/reports/:id` - Get specific report
- ✅ `PATCH /api/reports/:id` - Update report
- ✅ `DELETE /api/reports/:id` - Delete report
- ✅ `GET /api/reports/category/:category` - Filter by category
- ✅ Deduplication on identical submissions
- ✅ Authentication and authorization
- ✅ Input validation

**Running Backend Tests:**
```bash
cd backend
npm test                    # Run all tests once
npm run test:watch        # Run in watch mode
npm test -- --coverage    # With coverage report
```

**Test Database:**
- Uses `mongodb-memory-server` for isolated test database
- No connection to real MongoDB
- Fast and clean test isolation
- Each test clears collections

---

## AI Service Testing

### 6.4 AI Service Tests (Expanded)

**Setup:**
Tests use FastAPI TestClient (no external server needed).

**Files Expanded:**
- `ai-service/tests/test_endpoints.py` - Comprehensive endpoint tests

**Test Coverage:**

**Health & Root Endpoints:**
- ✅ `/health` endpoint structure and content
- ✅ `/` root endpoint with available endpoints list
- ✅ Model loading status
- ✅ OCR availability

**URL Analysis (`/analyze-url`):**
- ✅ Valid URL returns 200
- ✅ Benign sites return lower confidence
- ✅ Suspicious sites return higher confidence
- ✅ Invalid URL returns 400
- ✅ Response includes model_version

**Text Prediction (`/predict`):**
- ✅ Valid text returns 200
- ✅ Response structure (confidence, linguistic_cues, model_version)
- ✅ **Caching**: Same input returns cached result
- ✅ Different inputs return different results
- ✅ Missing/empty text returns 400
- ✅ Linguistic cues included

**OCR Text Extraction (`/extract-text`):**
- ✅ Valid image file returns 200
- ✅ `preprocessing_applied: true` in response
- ✅ Returns extracted text
- ✅ Invalid file types return 400
- ✅ Missing file returns 400
- ✅ Response includes model_version

**Model Version Consistency:**
- ✅ `/health` includes version
- ✅ `/predict` includes model_version
- ✅ `/analyze-url` includes model_version
- ✅ `/extract-text` includes model_version
- ✅ All endpoints return consistent version format

**Running AI Tests:**
```bash
cd ai-service
pytest -v tests/test_endpoints.py           # Run all tests
pytest -v tests/test_endpoints.py::TestAnalyzeUrlEndpoint  # Run specific test class
pytest -v --tb=short                       # With shorter tracebacks
```

---

## Test Execution Pipeline

### Local Testing Workflow:
```bash
# 1. Frontend unit tests
npm run test              # ~5 seconds
npm run test:coverage     # With coverage report

# 2. Frontend E2E tests (optional, takes longer)
npm run e2e               # ~2-3 minutes

# 3. Backend integration tests
cd backend && npm test    # ~10 seconds

# 4. AI service tests
cd ai-service && pytest   # ~5 seconds
```

### CI/CD Integration:
Each test suite can be run independently:
```bash
# In GitHub Actions or similar
npm run test             # Frontend unit tests
npm run e2e              # E2E tests (if configured)
cd backend && npm test   # Backend tests
cd ai-service && pytest  # AI service tests
```

---

## Test Data & Mocking

### Frontend Mocking (MSW):
All API calls are intercepted and mocked:
```typescript
// Example: MSW handler for login
http.post(`${API_URL}/api/auth/login`, async () => {
  return HttpResponse.json({
    data: {
      user: { id: '1', email: 'test@example.com' },
      accessToken: 'mock_access_token',
    },
  });
});
```

### Backend Test Database:
```typescript
// Uses in-memory MongoDB
const mongoServer = await MongoMemoryServer.create();
await mongoose.connect(mongoServer.getUri());
```

### AI Service Test Fixtures:
```python
@pytest.fixture
def client():
    return TestClient(app)
```

---

## Troubleshooting

### Frontend Tests:

**Issue:** Tests hang or timeout
- **Solution**: Check `src/test/setup.ts` - MSW server should be running
- **Solution**: Ensure `beforeAll` and `afterAll` hooks are called

**Issue:** Component not updating in tests
- **Solution**: Use `waitFor()` for async operations
- **Solution**: Ensure event handlers are properly mocked

**Issue:** localStorage is not persisted
- **Solution**: Check test setup mocks localStorage properly
- **Solution**: Clear localStorage in `beforeEach`

### Backend Tests:

**Issue:** MongoDB connection refused
- **Solution**: Install `mongodb-memory-server`
- **Solution**: Check MongoDB is installed globally for test runner

**Issue:** Tests failing due to index conflicts
- **Solution**: Ensure `beforeEach` clears collections
- **Solution**: Use unique test data

### E2E Tests:

**Issue:** Playwright can't find dev server
- **Solution**: Ensure dev server is running on localhost:5173
- **Solution**: Check `playwright.config.ts` webServer config

**Issue:** Tests fail on CI but pass locally
- **Solution**: Add `waitForSelector` timeouts
- **Solution**: Add explicit waits before assertions

---

## Coverage Targets

| Suite | Target | Current |
|-------|--------|---------|
| Frontend Unit | 80% | (Run: `npm run test:coverage`) |
| Backend Integration | 75% | (Run: `npm test -- --coverage`) |
| AI Service | 70% | (Run: `pytest --cov`) |
| E2E Critical Paths | 100% | (Core user flows) |

---

## Best Practices

✅ **Do:**
- Mock all external API calls
- Test both success and failure paths
- Use descriptive test names
- Clean up resources in afterEach
- Test accessibility and keyboard navigation
- Run tests before committing

❌ **Don't:**
- Make real API calls in unit tests
- Create test data in production database
- Hard-code timeouts (use proper waits)
- Skip error handling tests
- Test implementation details instead of behavior

---

## Next Steps

1. ✅ Install dependencies (done)
2. ✅ Create test files (done)
3. 📝 Run tests locally and verify they pass
4. 📝 Add to CI/CD pipeline (GitHub Actions, etc.)
5. 📝 Generate coverage reports
6. 📝 Monitor and improve coverage over time

---

## Commands Summary

```bash
# Frontend
npm run test              # Unit tests
npm run test:ui          # Test UI
npm run test:coverage    # Coverage report
npm run e2e              # E2E tests
npm run e2e:ui          # E2E UI
npm run e2e:debug       # E2E debug

# Backend
npm test                 # In backend/ folder
npm run test:watch      # Watch mode

# AI Service
pytest -v tests/test_endpoints.py
pytest --cov            # With coverage

# All
npm run build            # Build before deploy
npm run lint             # Check linting
npm run type-check       # TypeScript check
```
