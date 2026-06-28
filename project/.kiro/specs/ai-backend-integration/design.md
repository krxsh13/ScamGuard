# Design Document

## Overview

ScamGuard will evolve from a frontend-only pattern-matching application into a full-stack AI-powered cybersecurity platform. The system architecture follows a three-tier design: a React frontend for user interaction, a Node.js/Express backend API for business logic and orchestration, and a Python FastAPI microservice for AI model inference. The platform integrates real-time threat intelligence APIs, implements user authentication with JWT, stores data in MongoDB, and uses a pre-trained DistilBERT model fine-tuned on phishing datasets for scam detection.

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ React Web App│  │Browser Ext   │  │Mobile App    │          │
│  │  (Vite)      │  │  (Future)    │  │  (Future)    │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
└─────────┼──────────────────────────────────────────────────────┘
          │ HTTPS/REST
┌─────────▼──────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                │
└─────────┬──────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│                    Backend API Layer (Node.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │ Scan Service │  │ Report Svc   │          │
│  │  (JWT)       │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                  │
│  ┌──────▼─────────────────▼──────────────────▼───────┐          │
│  │         API Router & Middleware Layer             │          │
│  │  (Rate Limiting, Validation, CORS, Security)      │          │
│  └────────────────────────┬──────────────────────────┘          │
└───────────────────────────┼─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│  AI Service    │  │ Threat Intel   │  │  Database   │
│  (FastAPI)     │  │  APIs          │  │  (MongoDB)  │
│                │  │                │  │             │
│ ┌────────────┐ │  │ ┌────────────┐ │  │ ┌─────────┐ │
│ │DistilBERT  │ │  │ │Google Safe │ │  │ │Users    │ │
│ │Model       │ │  │ │Browsing    │ │  │ │Scans    │ │
│ └────────────┘ │  │ └────────────┘ │  │ │Reports  │ │
│ ┌────────────┐ │  │ ┌────────────┐ │  │ │Analytics│ │
│ │OCR Engine  │ │  │ │VirusTotal  │ │  │ └─────────┘ │
│ │(Tesseract) │ │  │ └────────────┘ │  └─────────────┘
│ └────────────┘ │  │ ┌────────────┐ │
│ ┌────────────┐ │  │ │PhishTank   │ │
│ │LLM Assistant│ │  │ └────────────┘ │
│ │(Optional)  │ │  └────────────────┘
│ └────────────┘ │
└────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.3+ with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Axios for API communication
- React Query for state management and caching
- Chart.js for analytics visualization

**Backend API (Node.js):**
- Node.js 20+ with Express.js
- TypeScript for type safety
- JWT for authentication
- Bcrypt for password hashing
- Express-validator for input validation
- Helmet for security headers
- Express-rate-limit for rate limiting
- Mongoose for MongoDB ODM

**AI Service (Python):**
- Python 3.10+
- FastAPI for REST API
- Transformers library (Hugging Face)
- DistilBERT model fine-tuned on phishing datasets
- Tesseract OCR for image text extraction
- Pillow for image processing
- Uvicorn as ASGI server

**Database:**
- MongoDB 6+ for flexible document storage
- Redis for session management and caching

**DevOps:**
- Docker & Docker Compose for containerization
- GitHub Actions for CI/CD
- Nginx as reverse proxy
- PM2 for Node.js process management

**External Services:**
- Google Safe Browsing API
- VirusTotal API
- PhishTank API

## Components and Interfaces

### Frontend Components

#### 1. Authentication Components
- **LoginForm**: User login with email/password
- **RegisterForm**: New user registration
- **ProtectedRoute**: Route wrapper requiring authentication
- **AuthContext**: Global authentication state management

#### 2. Scam Detection Components
- **ScamCheckerV2**: Enhanced version with backend integration
  - Text input area
  - Image upload capability
  - Real-time analysis status
  - Detailed results display with AI confidence scores
- **ResultsDisplay**: Shows risk score, confidence, detected patterns, threat intel results
- **HistoryList**: Displays user's previous scans

#### 3. Community Features
- **ReportForm**: Submit scam reports (phone, email, URL)
- **ReportSearch**: Search reported scams
- **ReportDetails**: View aggregated report information

#### 4. Dashboard Components
- **UserDashboard**: Personal analytics and scan history
- **AdminDashboard**: Platform statistics and report moderation
- **AnalyticsCharts**: Visualizations for trends and insights

#### 5. AI Assistant
- **ChatInterface**: Conversational UI for asking questions
- **MessageBubble**: Individual chat messages
- **SuggestionChips**: Quick action buttons

### Backend API Endpoints

#### Authentication Endpoints
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Authenticate user
POST   /api/auth/logout            - Invalidate session
GET    /api/auth/me                - Get current user info
POST   /api/auth/refresh           - Refresh JWT token
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password with token
```

#### Scam Detection Endpoints
```
POST   /api/scan/text              - Analyze text content
POST   /api/scan/url               - Analyze URL
POST   /api/scan/image             - Analyze uploaded image
GET    /api/scan/history           - Get user's scan history
GET    /api/scan/:id               - Get specific scan details
DELETE /api/scan/:id               - Delete scan from history
```

#### Community Reporting Endpoints
```
POST   /api/reports                - Submit new scam report
GET    /api/reports/search         - Search reports by phone/email/URL
GET    /api/reports/:id            - Get report details
PUT    /api/reports/:id/verify     - Admin: verify report
DELETE /api/reports/:id            - Admin: delete report
GET    /api/reports/stats          - Get reporting statistics
```

#### Analytics Endpoints
```
GET    /api/analytics/user         - User's personal analytics
GET    /api/analytics/platform     - Admin: platform-wide analytics
GET    /api/analytics/trends       - Trending scam types
```

#### AI Assistant Endpoints
```
POST   /api/assistant/chat         - Send message to AI assistant
GET    /api/assistant/history      - Get conversation history
DELETE /api/assistant/history      - Clear conversation history
```

### AI Service Endpoints (FastAPI)

```
POST   /predict                    - Analyze text for scams
POST   /extract-text               - OCR from image
POST   /chat                       - AI assistant query
GET    /health                     - Health check
GET    /model-info                 - Model metadata
```

### External API Integration

#### Google Safe Browsing API
```typescript
interface SafeBrowsingRequest {
  url: string;
}

interface SafeBrowsingResponse {
  isMalicious: boolean;
  threatTypes: string[];
  platformTypes: string[];
}
```

#### VirusTotal API
```typescript
interface VirusTotalRequest {
  url: string;
}

interface VirusTotalResponse {
  positives: number;
  total: number;
  scanDate: string;
  permalink: string;
}
```

#### PhishTank API
```typescript
interface PhishTankRequest {
  url: string;
}

interface PhishTankResponse {
  inDatabase: boolean;
  verified: boolean;
  verifiedAt: string;
}
```

## Data Models

### User Model
```typescript
interface User {
  _id: ObjectId;
  email: string;              // Unique, validated
  passwordHash: string;       // Bcrypt hashed
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  preferences: {
    emailNotifications: boolean;
    theme: 'light' | 'dark';
  };
  stats: {
    totalScans: number;
    scamsDetected: number;
    quizzesTaken: number;
    averageQuizScore: number;
    securityAwarenessScore: number;
  };
}
```

### Scan Model
```typescript
interface Scan {
  _id: ObjectId;
  userId: ObjectId;           // Reference to User
  type: 'text' | 'url' | 'image';
  content: string;            // Original content or extracted text
  imageUrl?: string;          // S3/storage URL if image scan
  results: {
    riskScore: number;        // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;       // 0-100
    aiPrediction: {
      isScam: boolean;
      probability: number;
      detectedPatterns: string[];
      linguisticCues: {
        urgency: number;
        financialPressure: number;
        emotionalManipulation: number;
      };
    };
    threatIntel?: {
      googleSafeBrowsing: SafeBrowsingResponse;
      virusTotal: VirusTotalResponse;
      phishTank: PhishTankResponse;
    };
    urlAnalysis?: {
      domain: string;
      isShortened: boolean;
      hasSSL: boolean;
      domainAge: number;
      suspiciousPatterns: string[];
    };
  };
  createdAt: Date;
  processingTime: number;     // milliseconds
}
```

### Report Model
```typescript
interface Report {
  _id: ObjectId;
  userId: ObjectId;           // Reporter
  type: 'phone' | 'email' | 'url' | 'message';
  content: string;            // Phone number, email, URL, or message text
  scamType: string[];         // e.g., ['phishing', 'financial']
  description: string;
  evidence?: string[];        // URLs to uploaded evidence
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: ObjectId;      // Admin who verified
  verifiedAt?: Date;
  reportCount: number;        // Aggregated count for same content
  reporters: ObjectId[];      // List of users who reported
  createdAt: Date;
  updatedAt: Date;
}
```

### Quiz Result Model
```typescript
interface QuizResult {
  _id: ObjectId;
  userId: ObjectId;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
  }[];
  completedAt: Date;
  timeSpent: number;          // seconds
}
```

### Conversation Model (AI Assistant)
```typescript
interface Conversation {
  _id: ObjectId;
  userId: ObjectId;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### AI Detection Properties

**Property 1: Risk score bounds**
*For any* text input submitted for analysis, the returned risk score must be between 0 and 100 inclusive, and the confidence level must be between 0 and 100 inclusive.
**Validates: Requirements 1.2**

**Property 2: Scam pattern detection**
*For any* text containing known scam keywords (e.g., "urgent", "verify account", "lottery winner"), the AI Detection Engine must identify and return at least one linguistic cue in the response.
**Validates: Requirements 1.3**

**Property 3: Low confidence warning**
*For any* analysis result where the confidence level is below 70%, the response must include an uncertainty indicator and a suggestion for manual verification.
**Validates: Requirements 1.5**

### Authentication Properties

**Property 4: Password hashing**
*For any* valid user registration, the password stored in the database must be a bcrypt hash, not plaintext, and must be different from the original password.
**Validates: Requirements 2.1**

**Property 5: JWT token validity**
*For any* successful login, the issued JWT token must contain a valid expiration timestamp set to 24 hours from issuance and must include the user ID in the payload.
**Validates: Requirements 2.2**

**Property 6: Scan persistence**
*For any* authenticated user performing a scam check, a corresponding scan record must appear in the database with the user's ID, content, and results.
**Validates: Requirements 2.3**

**Property 7: Complete scan history**
*For any* user with N scans in the database, requesting their scan history must return exactly N scans, each containing a timestamp and risk score.
**Validates: Requirements 2.4**

**Property 8: Expired token rejection**
*For any* request to a protected endpoint with an expired JWT token, the system must return a 401 Unauthorized status and require re-authentication.
**Validates: Requirements 2.5**

### Threat Intelligence Properties

**Property 9: Multiple API queries**
*For any* URL submitted for analysis, the system must query at least two different Threat Intelligence APIs (Google Safe Browsing, VirusTotal, or PhishTank).
**Validates: Requirements 3.1**

**Property 10: Combined analysis**
*For any* URL analysis, the final result must include both threat intelligence data (if available) and AI-based analysis, regardless of external API results.
**Validates: Requirements 3.2, 3.4**

**Property 11: Threat source attribution**
*For any* URL flagged as malicious by threat intelligence APIs, the response must explicitly list which services (by name) reported it as malicious.
**Validates: Requirements 3.3**

**Property 12: API failure resilience**
*For any* URL analysis where one or more Threat Intelligence APIs fail or timeout, the system must still return an analysis result based on available data and AI prediction.
**Validates: Requirements 3.5**

### Community Reporting Properties

**Property 13: Report persistence**
*For any* valid community report submission (with type, content, and description), a corresponding report record must be created in the database.
**Validates: Requirements 4.1**

**Property 14: Report aggregation**
*For any* content (phone number, email, or URL) that receives multiple reports, the system must maintain a single aggregated record with an incremented report count rather than creating duplicate entries.
**Validates: Requirements 4.2**

**Property 15: Report search completeness**
*For any* search query matching a reported phone number or URL, the results must include the total report count and all associated scam types.
**Validates: Requirements 4.3**

**Property 16: Format validation**
*For any* report submission, the system must validate that phone numbers match E.164 format, emails match RFC 5322 format, and URLs are valid according to RFC 3986, rejecting invalid formats.
**Validates: Requirements 4.4**

**Property 17: Automatic high-risk flagging**
*For any* phone number or URL with more than 10 community reports, subsequent scans involving that content must automatically include a high-risk flag in the results.
**Validates: Requirements 4.5**

### Image Analysis Properties

**Property 18: File size validation**
*For any* image upload, files under 5MB with valid image MIME types (image/png, image/jpeg, image/jpg) must be accepted, while files exceeding 5MB or with invalid types must be rejected with an appropriate error message.
**Validates: Requirements 5.1**

**Property 19: OCR extraction pipeline**
*For any* successfully uploaded image, the system must attempt OCR text extraction and, if text is found, pass the extracted content to the AI Detection Engine for analysis.
**Validates: Requirements 5.2, 5.3**

**Property 20: OCR failure handling**
*For any* image where OCR extraction fails or produces empty text, the system must return a user-friendly error message suggesting manual text entry rather than failing silently.
**Validates: Requirements 5.4**

**Property 21: Complete image analysis results**
*For any* successful image analysis, the response must include both the extracted text (or extraction status) and the scam analysis results.
**Validates: Requirements 5.5**

### Admin Dashboard Properties

**Property 22: Dashboard metrics accuracy**
*For any* admin dashboard view, the displayed total users, total scans, and total community reports must match the actual counts in the database.
**Validates: Requirements 6.2**

**Property 23: Report filtering**
*For any* admin report filter (by type, date range, or report count), the returned results must include only reports matching all specified criteria.
**Validates: Requirements 6.3**

**Property 24: Report status updates**
*For any* admin action marking a report as verified, the report's status field in the database must be updated to "verified", and the verifiedBy and verifiedAt fields must be populated.
**Validates: Requirements 6.4**

**Property 25: Analytics computation**
*For any* analytics request, the system must calculate trending scam types based on report frequency over the last 30 days and identify the top 10 most reported domains.
**Validates: Requirements 6.5**

### Security Properties

**Property 26: Rate limiting enforcement**
*For any* IP address making more than 100 requests to the API within a 15-minute window, the 101st request must be rejected with a 429 Too Many Requests status.
**Validates: Requirements 8.1**

**Property 27: Input sanitization**
*For any* user input containing HTML tags, SQL injection patterns, or script tags, the system must sanitize or reject the input before processing.
**Validates: Requirements 8.2**

**Property 28: Security headers presence**
*For any* HTTP response from the backend API, the headers must include Content-Security-Policy, X-Frame-Options, and Strict-Transport-Security.
**Validates: Requirements 8.3**

**Property 29: CSRF protection**
*For any* state-changing request (POST, PUT, DELETE) without a valid CSRF token, the system must reject the request with a 403 Forbidden status.
**Validates: Requirements 8.4**

**Property 30: Data encryption at rest**
*For any* sensitive user data (passwords, personal information) stored in the database, the data must be encrypted using AES-256 or equivalent encryption.
**Validates: Requirements 8.5**

### AI Assistant Properties

**Property 31: Query routing**
*For any* natural language question submitted to the AI assistant, the system must route the query to the AI assistant service and return a response.
**Validates: Requirements 9.1**

**Property 32: Contextual responses**
*For any* question about scam types, the AI assistant must include references to ScamGuard's education content and provide at least one concrete example.
**Validates: Requirements 9.2, 9.3**

**Property 33: Analysis suggestions**
*For any* user message containing suspicious content (URLs, phone numbers, or scam-like text), the AI assistant must offer to analyze it through the scam detection system.
**Validates: Requirements 9.4**

**Property 34: Context retention**
*For any* conversation session, the AI assistant must maintain context for up to 10 consecutive message exchanges, referencing previous messages when relevant.
**Validates: Requirements 9.5**

### Analytics Properties

**Property 35: Quiz result persistence**
*For any* completed quiz, the system must save a quiz result record containing the user ID, score, total questions, individual answers, and completion timestamp.
**Validates: Requirements 10.1**

**Property 36: Trend calculation**
*For any* user with multiple quiz results, the personal analytics must display score trends showing improvement or decline over time.
**Validates: Requirements 10.2**

**Property 37: Scan statistics aggregation**
*For any* user with multiple scans, the statistics must correctly count and categorize scans by detected scam type (phishing, financial, tech support, etc.).
**Validates: Requirements 10.3**

**Property 38: Security awareness score consistency**
*For any* two users with identical quiz scores and scan activity, the calculated Security Awareness Score must be the same.
**Validates: Requirements 10.4**

**Property 39: Achievement triggering**
*For any* user whose quiz score improves by 20% or more compared to their previous attempt, the system must award an achievement badge.
**Validates: Requirements 10.5**

## Error Handling

### Error Categories

1. **Validation Errors (400 Bad Request)**
   - Invalid input format
   - Missing required fields
   - Out-of-range values
   - Malformed requests

2. **Authentication Errors (401 Unauthorized)**
   - Invalid credentials
   - Expired tokens
   - Missing authentication

3. **Authorization Errors (403 Forbidden)**
   - Insufficient permissions
   - Invalid CSRF tokens
   - Role-based access denial

4. **Not Found Errors (404 Not Found)**
   - Resource doesn't exist
   - Invalid endpoints

5. **Rate Limiting Errors (429 Too Many Requests)**
   - Exceeded request quota
   - Temporary throttling

6. **Server Errors (500 Internal Server Error)**
   - Unexpected exceptions
   - Database connection failures
   - AI model errors

7. **Service Unavailable (503 Service Unavailable)**
   - External API failures
   - Maintenance mode
   - Overload conditions

### Error Response Format

All API errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: any;          // Additional context
    timestamp: string;      // ISO 8601 timestamp
    requestId: string;      // For tracking/debugging
  };
}
```

### Error Handling Strategies

1. **Graceful Degradation**: If external threat intelligence APIs fail, continue with AI-only analysis
2. **Retry Logic**: Implement exponential backoff for transient failures
3. **Circuit Breaker**: Temporarily disable failing external services
4. **Logging**: Log all errors with context for debugging
5. **User Feedback**: Provide actionable error messages to users
6. **Fallback Responses**: Return cached or default data when appropriate

## Testing Strategy

### Unit Testing

**Backend (Node.js/Express):**
- Test framework: Jest
- Coverage target: 80%+
- Focus areas:
  - Authentication middleware
  - Input validation functions
  - Database models and methods
  - API route handlers
  - Error handling logic

**AI Service (Python/FastAPI):**
- Test framework: Pytest
- Coverage target: 80%+
- Focus areas:
  - Model inference functions
  - OCR text extraction
  - Input preprocessing
  - Response formatting

**Frontend (React):**
- Test framework: Vitest + React Testing Library
- Coverage target: 70%+
- Focus areas:
  - Component rendering
  - User interactions
  - Form validation
  - State management
  - API integration

### Property-Based Testing

**Framework:** fast-check (JavaScript/TypeScript) for backend, Hypothesis (Python) for AI service

**Configuration:** Each property test must run a minimum of 100 iterations to ensure comprehensive coverage.

**Test Tagging:** Each property-based test must include a comment explicitly referencing the correctness property from this design document using the format:
```typescript
// Feature: ai-backend-integration, Property 1: Risk score bounds
```

**Key Property Tests:**

1. **Risk Score Validation** (Property 1)
   - Generate random text inputs
   - Verify risk scores are always 0-100
   - Verify confidence levels are always 0-100

2. **Password Hashing** (Property 4)
   - Generate random passwords
   - Verify stored hash differs from plaintext
   - Verify bcrypt format

3. **JWT Token Structure** (Property 5)
   - Generate random user credentials
   - Verify token contains user ID
   - Verify expiration is 24 hours

4. **Report Aggregation** (Property 14)
   - Generate multiple reports for same content
   - Verify single database record
   - Verify incremented count

5. **Input Sanitization** (Property 27)
   - Generate malicious input patterns
   - Verify sanitization or rejection
   - Verify no XSS vulnerabilities

6. **Rate Limiting** (Property 26)
   - Generate 101+ requests from same IP
   - Verify 101st request is rejected
   - Verify 429 status code

### Integration Testing

**Focus Areas:**
- Frontend ↔ Backend API communication
- Backend ↔ AI Service communication
- Backend ↔ Database operations
- Backend ↔ External Threat Intelligence APIs
- End-to-end user workflows

**Tools:**
- Supertest for API testing
- Playwright for E2E testing
- Docker Compose for test environment

**Key Integration Tests:**
1. Complete scam detection flow (text submission → AI analysis → result display)
2. User registration → login → authenticated scan → history retrieval
3. URL analysis with multiple threat intelligence APIs
4. Image upload → OCR → AI analysis
5. Community report submission → search → aggregation

### Performance Testing

**Tools:** Artillery, k6

**Benchmarks:**
- API response time: < 200ms (p95)
- AI inference time: < 2s (p95)
- Database queries: < 100ms (p95)
- Concurrent users: 1000+
- Requests per second: 500+

### Security Testing

**Tools:** OWASP ZAP, npm audit, Snyk

**Focus Areas:**
- SQL injection prevention
- XSS prevention
- CSRF protection
- Authentication bypass attempts
- Rate limiting effectiveness
- Dependency vulnerabilities

## Deployment Architecture

### Development Environment

```yaml
services:
  frontend:
    - Vite dev server
    - Hot module replacement
    - Port: 5173
  
  backend:
    - Node.js with nodemon
    - Port: 3000
  
  ai-service:
    - FastAPI with uvicorn --reload
    - Port: 8000
  
  mongodb:
    - MongoDB 6
    - Port: 27017
  
  redis:
    - Redis 7
    - Port: 6379
```

### Production Environment

```
┌─────────────────────────────────────────┐
│         CDN (Cloudflare/CloudFront)     │
│              Static Assets              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Load Balancer (Nginx)           │
│         SSL Termination                 │
└────────┬───────────────────┬────────────┘
         │                   │
┌────────▼────────┐  ┌───────▼────────────┐
│  Frontend       │  │  Backend API       │
│  (Vercel/       │  │  (AWS EC2/         │
│   Netlify)      │  │   Render)          │
│                 │  │  - Node.js Cluster │
│                 │  │  - PM2 Process Mgr │
└─────────────────┘  └───────┬────────────┘
                             │
                     ┌───────┼────────┐
                     │       │        │
              ┌──────▼──┐ ┌──▼─────┐ ┌▼────────────┐
              │AI Service│ │MongoDB │ │Redis Cluster│
              │(AWS ECS/ │ │Atlas   │ │             │
              │ Render)  │ │        │ │             │
              └──────────┘ └────────┘ └─────────────┘
```

### Environment Variables

**Backend (.env):**
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_EXPIRES_IN=24h
AI_SERVICE_URL=http://ai-service:8000
GOOGLE_SAFE_BROWSING_API_KEY=...
VIRUSTOTAL_API_KEY=...
PHISHTANK_API_KEY=...
CORS_ORIGIN=https://scamguard.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**AI Service (.env):**
```
PYTHON_ENV=production
PORT=8000
MODEL_PATH=/models/distilbert-scam-detector
OCR_LANGUAGE=eng
MAX_IMAGE_SIZE_MB=5
CACHE_PREDICTIONS=true
REDIS_URL=redis://...
```

**Frontend (.env):**
```
VITE_API_URL=https://api.scamguard.com
VITE_ENVIRONMENT=production
```

### CI/CD Pipeline

**GitHub Actions Workflow:**

1. **On Pull Request:**
   - Run linters (ESLint, Prettier, Black)
   - Run unit tests
   - Run property-based tests
   - Check code coverage
   - Run security scans

2. **On Merge to Main:**
   - Build Docker images
   - Tag with commit SHA
   - Push to container registry
   - Run integration tests
   - Deploy to staging environment
   - Run E2E tests on staging
   - Manual approval gate
   - Deploy to production
   - Run smoke tests

3. **Monitoring:**
   - Health check endpoints
   - Error rate monitoring
   - Performance metrics
   - Automated rollback on failures

### Monitoring and Observability

**Tools:**
- Application monitoring: New Relic / Datadog
- Log aggregation: ELK Stack / CloudWatch
- Error tracking: Sentry
- Uptime monitoring: Pingdom / UptimeRobot

**Key Metrics:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- AI model inference time
- Database query performance
- External API success rates
- User authentication success rate
- Scan completion rate
- Active users
- Scans per day

**Alerts:**
- Error rate > 1%
- API response time > 2s (p95)
- Database connection failures
- External API failures
- High memory/CPU usage
- Disk space < 20%

## Security Considerations

### Authentication & Authorization
- Passwords hashed with bcrypt (cost factor: 12)
- JWT tokens with short expiration (24h)
- Refresh token rotation
- Role-based access control (RBAC)
- Multi-factor authentication (future enhancement)

### Data Protection
- HTTPS/TLS 1.3 for all communications
- Encryption at rest (AES-256)
- Encryption in transit
- PII data minimization
- GDPR compliance considerations
- Data retention policies

### API Security
- Rate limiting per IP and per user
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (Content Security Policy)
- CSRF protection (tokens)
- CORS configuration
- API key rotation
- Request signing for external APIs

### Infrastructure Security
- Firewall rules (allow only necessary ports)
- VPC/private networks
- Secrets management (AWS Secrets Manager / HashiCorp Vault)
- Regular security updates
- Vulnerability scanning
- Penetration testing
- DDoS protection (Cloudflare)

### AI Model Security
- Model versioning and validation
- Input length limits
- Output sanitization
- Model poisoning prevention
- Adversarial input detection

## Scalability Considerations

### Horizontal Scaling
- Stateless backend API (scales with load balancer)
- AI service can run multiple instances
- MongoDB sharding for large datasets
- Redis cluster for session management

### Caching Strategy
- Redis for:
  - Session data
  - Frequently accessed scan results
  - Threat intelligence API responses (TTL: 1 hour)
  - User analytics (TTL: 5 minutes)
- CDN for static assets

### Database Optimization
- Indexes on frequently queried fields:
  - User.email
  - Scan.userId + Scan.createdAt
  - Report.content + Report.type
- Aggregation pipelines for analytics
- Read replicas for analytics queries
- Connection pooling

### Asynchronous Processing
- Message queue (RabbitMQ/AWS SQS) for:
  - Email notifications
  - Batch report processing
  - Analytics computation
  - Model retraining pipelines

### Performance Optimization
- Lazy loading for frontend components
- Pagination for large result sets
- Compression (gzip/brotli)
- Image optimization
- Database query optimization
- API response caching
- Model quantization for faster inference

## Future Enhancements

1. **Browser Extension**
   - Real-time website scanning
   - Phishing page detection
   - Warning overlays

2. **Mobile Applications**
   - iOS and Android apps
   - SMS scam detection
   - Call screening integration

3. **Advanced AI Features**
   - Multi-language support
   - Voice phishing detection
   - Deepfake detection
   - Behavioral analysis

4. **Enterprise Features**
   - Team accounts
   - Custom model training
   - API access for integration
   - White-label solutions

5. **Enhanced Threat Intelligence**
   - Real-time threat feeds
   - Blockchain analysis for crypto scams
   - Social media monitoring
   - Dark web monitoring

6. **Gamification**
   - Leaderboards
   - Challenges and missions
   - Rewards program
   - Community contributions

7. **Accessibility**
   - Screen reader optimization
   - Keyboard navigation
   - High contrast mode
   - Multiple language support
