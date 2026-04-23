# ScamGuard Backend API

Production-grade Express.js backend API for the ScamGuard cybersecurity platform. Provides scam detection, user management, analytics, and security features with comprehensive observability.

## Features

### Core
- **Express.js** server with TypeScript for type safety
- **MongoDB** with Mongoose for data persistence
- **Redis** for caching, session management, and job queues
- **BullMQ** for distributed job processing
- **Node-Cron** for scheduled tasks (data retention cleanup)

### Authentication & Security
- **JWT** authentication with access and refresh tokens
- **Bcrypt** password hashing
- **Helmet** security headers
- **CORS** protection with configurable origins
- **Rate limiting** (100-500 req/15min per IP depending on endpoint)
- **Input sanitization** and validation with Zod schemas
- **Email verification** and password reset flows

### Observability & Monitoring
- **Winston** structured logging (JSON in production)
- **Prometheus** metrics (`/metrics` endpoint)
- **Sentry** error tracking and performance monitoring
- **OpenTelemetry** distributed tracing with auto-instrumentation
- **Request ID** tracking for debugging

### Data Compliance
- **GDPR Article 17** Right to Erasure (`DELETE /api/user/data`)
- **Data retention policy** with configurable retention days
- **Image data deletion** after processing (no base64 storage)
- **Analytics anonymization** (no userId in aggregations)

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Configuration

### Required Environment Variables

```bash
# Server
NODE_ENV=development          # development|production|test
PORT=3000                    # Server port

# Database
MONGODB_URI=                 # MongoDB connection string
MONGODB_TEST_URI=            # MongoDB test database (optional)

# Cache
REDIS_URL=                   # Redis connection URL
REDIS_PASSWORD=              # Redis password (if required)

# Authentication
JWT_SECRET=                  # Min 32 characters
JWT_REFRESH_SECRET=          # Min 32 characters

# AI Service
AI_SERVICE_URL=              # URL to AI service (http://localhost:8000)

# Email
RESEND_API_KEY=              # Email service API key
RESEND_FROM_EMAIL=           # Sender email address
APP_BASE_URL=                # Frontend URL for email links

# Security
CORS_ORIGIN=                 # Frontend URL
RATE_LIMIT_WINDOW_MS=        # Rate limit window (ms)
RATE_LIMIT_MAX_REQUESTS=     # Max requests per window

# Observability
SENTRY_DSN=                  # Optional: Sentry error tracking
OTEL_EXPORTER_OTLP_ENDPOINT= # Optional: OpenTelemetry collector
METRICS_ALLOWLIST=           # IPs allowed to access /metrics

# Compliance
DATA_RETENTION_DAYS=90       # Delete scans/conversations older than this
```

See [.env.example](.env.example) for development defaults.

## Development

### Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000` with hot reload.

### Available Commands

```bash
npm run build              # Compile TypeScript to JavaScript
npm run start              # Run production build
npm run start:prod         # Same as start (for Docker)
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript compiler check
npm test                   # Run tests once
npm run test:watch        # Run tests in watch mode
```

### Code Quality

```bash
# Type check the codebase
npm run type-check

# Lint and fix issues
npm run lint
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Health Check

```http
GET /health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-04-20T10:30:00.000Z",
  "uptime": 12345.678
}
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/verify-email` | Verify email address |
| POST | `/api/auth/resend-verification` | Resend verification email |

### Scan Endpoints

| Method | Endpoint | Authentication | Description |
|--------|----------|-----------------|-------------|
| POST | `/api/scans` | Required | Submit new scan (text/url/image) |
| GET | `/api/scans` | Required | List user's scans |
| GET | `/api/scans/:scanId` | Required | Get scan results |

### Analytics Endpoints

| Method | Endpoint | Authentication | Description |
|--------|----------|-----------------|-------------|
| GET | `/api/analytics/summary` | No | Platform statistics (cached) |
| GET | `/api/analytics/user` | Required | User's statistics |
| GET | `/api/analytics/trends` | No | 30-day scan trends |

### User Endpoints

| Method | Endpoint | Authentication | Description |
|--------|----------|-----------------|-------------|
| GET | `/api/user/profile` | Required | Get user profile |
| DELETE | `/api/user/data` | Required | Delete all personal data (GDPR) |

### Observability Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics` | Prometheus metrics (IP allowlist) |

## Database Schema

### User
```typescript
{
  email: string;           // Unique
  passwordHash: string;    // Bcrypt
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isDeleted: boolean;      // Soft delete for GDPR compliance
  createdAt: Date;
  updatedAt: Date;
  // ... additional fields
}
```

**Indexes:**
- `{ email: 1 }` - Email lookups
- `{ isVerified: 1, createdAt: -1 }` - Admin queries
- TTL indexes on email/password expiry fields

### Scan
```typescript
{
  userId: ObjectId;        // Ref to User
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;       // Never stores base64
  status: 'queued' | 'processing' | 'completed' | 'failed';
  results: {
    riskScore: number;     // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    aiPrediction: {...};
    threatIntel: {...};
  };
  createdAt: Date;         // Used for retention policy
  // ... additional fields
}
```

## Testing

### Unit Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

Tests use **Vitest** with **Supertest** for HTTP integration testing.

## Performance

### Caching Strategy
- Redis for:
  - Session data (TTL: 24 hours)
  - Analytics summaries (TTL: 5 minutes)
  - Scan results (TTL: 24 hours)

### Database Optimization
- Compound indexes for admin queries
- TTL indexes for automatic token cleanup
- Scan status index for queue queries

### Rate Limiting
- Global: 100 req/15min (default)
- Auth endpoints: 5 req/15min per IP
- Metrics: IP-allowlist only

## Monitoring

### Health Checks
```bash
curl http://localhost:3000/health
```

### Metrics
```bash
# Access metrics (from allowed IP)
curl http://localhost:3000/metrics
```

Available metrics:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `scan_processing_duration_seconds` - Scan processing time
- `ai_service_call_duration_seconds` - AI service latency
- And more (see [OBSERVABILITY.md](../OBSERVABILITY.md))

### Logs
```bash
# Development (colorized)
npm run dev

# Production (JSON structured)
# Logs written to logs/ directory
tail -f logs/combined.log
```

## Deployment

### Docker

```bash
# Build image
docker build -t scamguard-backend .

# Run container
docker run -p 4000:3000 \
  -e MONGODB_URI="..." \
  -e REDIS_URL="..." \
  -e JWT_SECRET="..." \
  scamguard-backend
```

### Environment

**Staging:**
```bash
NODE_ENV=staging
```

**Production:**
```bash
NODE_ENV=production
LOG_LEVEL=warn
DATA_RETENTION_DAYS=90
```

## Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` in `.env`

### Redis Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` in `.env`

### JWT Token Invalid
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Tokens expire after `JWT_EXPIRES_IN` (default 24h)
- Use `/auth/refresh-token` to get new access token

### Rate Limit Exceeded
- Check rate limit settings in `.env`
- Use exponential backoff for retries

## Security Considerations

1. **Never commit** `.env` with real secrets
2. **Use strong** JWT secrets (min 32 characters)
3. **Enable** HTTPS in production
4. **Rotate** secrets regularly
5. **Monitor** failed login attempts (alert at > 20/min)
6. **Keep** dependencies updated (`npm audit`)

## Contributing

1. Create a feature branch
2. Follow TypeScript best practices
3. Add tests for new features
4. Run `npm run lint` and `npm run type-check`
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Create a GitHub issue
- Check [OBSERVABILITY.md](../OBSERVABILITY.md) for debugging
- See [docs/alerting-runbook.md](../docs/alerting-runbook.md) for operational issues
