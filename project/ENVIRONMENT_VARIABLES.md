# Environment Variables Documentation

This document describes all environment variables used across the ScamGuard application. Each service has its own environment configuration based on the deployment environment.

## Environment Profiles

The application supports three deployment profiles:
- **development**: Local development with hot reload and verbose logging
- **staging**: Pre-production testing environment
- **production**: Production deployment with security hardening and performance optimization

## Backend Environment Variables

Backend environment files are located in `backend/` and named:
- `.env.development` (local development)
- `.env.staging` (staging environment)
- `.env.production` (production environment)

### Core Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | string | ✓ | - | Node environment: `development`, `staging`, or `production` |
| `LOG_LEVEL` | string | | `info` | Logging level: `debug`, `info`, `warn`, `error` |

### API Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `API_PORT` | number | | 4000 | Port where backend API listens |
| `API_HOST` | string | | localhost | Host address to bind to (use `0.0.0.0` in containers) |
| `CORS_ORIGIN` | string | ✓ | - | Frontend origin allowed for CORS (e.g., `http://localhost:5173`) |

### Database (MongoDB)

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `MONGODB_URI` | string | ✓ | - | MongoDB connection string. Format: `mongodb://host:port/database` or `mongodb+srv://user:pass@cluster.mongodb.net/database` |
| `MONGODB_MAX_POOL_SIZE` | number | | 10 | Maximum connection pool size for MongoDB |

**Example URIs:**
- Local: `mongodb://localhost:27017/scamguard`
- Docker: `mongodb://mongo:27017/scamguard`
- Atlas: `mongodb+srv://user:password@cluster.mongodb.net/scamguard`

### Redis Cache

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `REDIS_URL` | string | ✓ | - | Redis connection URL. Format: `redis://[user:password@]host:port[/database]` |
| `REDIS_PASSWORD` | string | | - | Redis password (included in URL if using password) |

**Example URLs:**
- Local: `redis://localhost:6379`
- Docker: `redis://redis:6379`
- Cloud: `redis://user:password@redis-host.com:6379`

### Authentication & JWT

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `JWT_SECRET` | string | ✓ | - | Secret key for signing JWT tokens. Use strong random string (min 32 chars) |
| `JWT_EXPIRATION` | string | | `24h` | JWT access token expiration (e.g., `24h`, `7d`, `30m`) |
| `JWT_REFRESH_SECRET` | string | ✓ | - | Secret key for refresh tokens. Different from JWT_SECRET |
| `JWT_REFRESH_EXPIRATION` | string | | `7d` | Refresh token expiration (longer than JWT_EXPIRATION) |
| `SESSION_SECRET` | string | ✓ | - | Secret for session encryption. Use strong random string (min 32 chars) |

### Email Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `SMTP_HOST` | string | | - | SMTP server hostname (e.g., `smtp.sendgrid.net`) |
| `SMTP_PORT` | number | | 587 | SMTP server port (typically 587 for TLS, 465 for SSL) |
| `SMTP_USER` | string | | - | SMTP username or API key |
| `SMTP_PASS` | string | | - | SMTP password or API token |
| `SMTP_FROM` | string | | - | Sender email address |

**Supported Providers:**
- SendGrid: `smtp.sendgrid.net:587`, User: `apikey`, Password: SendGrid API key
- Gmail: `smtp.gmail.com:587`, User: email, Password: app-specific password
- Mailgun: `smtp.mailgun.org:587`, User: `postmaster@<domain>`, Password: Mailgun password

### AI Service Integration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `AI_SERVICE_URL` | string | ✓ | - | URL where AI service is running (e.g., `http://localhost:8000` or `http://ai-service:8000`) |
| `AI_SERVICE_TIMEOUT` | number | | 30000 | Timeout in milliseconds for AI service requests |

### Rate Limiting

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | number | | 900000 | Rate limit window in milliseconds (15 min = 900000 ms) |
| `RATE_LIMIT_MAX_REQUESTS` | number | | 100 | Maximum requests allowed per window per IP |

**Examples:**
- Development: 100 requests per 15 minutes
- Staging: 200 requests per 15 minutes
- Production: 500 requests per 15 minutes

### Feature Flags

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `FEATURE_EMAIL_VERIFICATION` | boolean | | false | Enable email verification on signup |
| `FEATURE_TWO_FACTOR_AUTH` | boolean | | false | Enable two-factor authentication (2FA) |

### Monitoring & Error Tracking

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `SENTRY_DSN` | string | | - | Sentry DSN for error tracking (format: `https://key@id.ingest.sentry.io/project`) |

### Security

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ENCRYPTION_KEY` | string | | - | Key for encrypting sensitive data at rest |

---

## AI Service Environment Variables

AI service environment files are located in `ai-service/` and named:
- `.env.development` (local development)
- `.env.production` (production environment)

### Service Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ENVIRONMENT` | string | ✓ | - | Environment: `development` or `production` |
| `LOG_LEVEL` | string | | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `SERVICE_PORT` | number | | 8000 | Port where AI service listens |
| `SERVICE_HOST` | string | | `0.0.0.0` | Host address to bind to |

### Model Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `MODEL_PATH` | string | ✓ | - | Path to ML models directory (e.g., `./models/` or `/app/models/`) |
| `CACHE_ENABLED` | boolean | | true | Enable caching of model predictions |
| `CACHE_TTL` | number | | 3600 | Cache time-to-live in seconds |

### OCR Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `TESSERACT_PATH` | string | | `/usr/bin/tesseract` | Path to Tesseract OCR binary |

### PyTorch Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `PYTORCH_ENABLE_MPS_FALLBACK` | number | | 1 | Enable fallback for PyTorch operations |

### API Endpoints

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ENABLE_HEALTH_CHECK` | boolean | | true | Enable `/health` endpoint |
| `ENABLE_ANALYTICS` | boolean | | true | Enable analytics endpoints |

### Performance & Limits

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `MAX_REQUEST_SIZE` | number | | 20971520 | Maximum request body size in bytes (20MB default) |
| `REQUEST_TIMEOUT` | number | | 30 | Request timeout in seconds |

### Monitoring

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `SENTRY_DSN` | string | | - | Sentry DSN for error tracking |

---

## Frontend Environment Variables

Frontend environment variables are compiled at build time and prefixed with `VITE_`.

### Build Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `VITE_API_URL` | string | ✓ | - | Backend API base URL (e.g., `http://localhost:4000` or `https://api.scamguard.com`) |

---

## Docker Compose Environment Variables

When using Docker Compose, you can override port mappings and other services settings:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FRONTEND_PORT` | number | 3000 | Frontend port mapping |
| `BACKEND_PORT` | number | 4000 | Backend port mapping |
| `AI_SERVICE_PORT` | number | 8000 | AI service port mapping |
| `MONGO_PORT` | number | 27017 | MongoDB port mapping |
| `REDIS_PORT` | number | 6379 | Redis port mapping |

**Example:**
```bash
FRONTEND_PORT=8080 BACKEND_PORT=5000 docker-compose up
```

---

## Setting Up Environment Variables

### For Local Development

1. Copy the example files:
   ```bash
   cp backend/.env.development.example backend/.env.development
   cp ai-service/.env.development.example ai-service/.env.development
   ```

2. Update values in the copied files with your local configuration

3. For frontend, add to `.env.local`:
   ```
   VITE_API_URL=http://localhost:4000
   ```

### For Staging

1. Copy staging examples:
   ```bash
   cp backend/.env.staging.example backend/.env.staging
   cp ai-service/.env.production.example ai-service/.env.production
   ```

2. Update with staging secrets and credentials

3. Set `NODE_ENV=staging` when deploying

### For Production

1. **Never commit actual `.env.production` files to version control**

2. Use environment variable management:
   - Railway: Environment variables in dashboard
   - AWS: Systems Manager Parameter Store or Secrets Manager
   - Render: Environment variables in service settings
   - Docker: Pass via `--env` flags or `.env` files loaded at runtime

3. For Docker, mount a secrets file:
   ```bash
   docker run --env-file .env.production <image>
   ```

---

## Best Practices

### Security

- ✅ **Never commit actual secrets** to version control
- ✅ **Use `.example` files** to document required variables
- ✅ **Rotate secrets regularly**, especially JWT keys in production
- ✅ **Use strong random strings** for all secret variables (min 32 chars)
- ✅ **Use environment variables** for all sensitive data
- ✅ **Enable HTTPS in production** (set CORS_ORIGIN to https://)

### Development

- ✅ Copy example files to local `.env` files
- ✅ Keep `.env` files in `.gitignore`
- ✅ Document all new environment variables in this file
- ✅ Use descriptive variable names (avoid abbreviations)

### Monitoring

- ✅ Set up Sentry in staging and production
- ✅ Use different LOG_LEVEL for each environment
- ✅ Monitor rate limiting metrics in production

---

## Validation & Startup Checks

The backend performs validation on startup:
- ✅ All required variables are set
- ✅ `NODE_ENV` is one of: `development`, `staging`, `production`
- ✅ `MONGODB_URI` is a valid connection string
- ✅ `REDIS_URL` is accessible
- ✅ `AI_SERVICE_URL` is reachable (on startup)

If validation fails, the application will exit with an error message.

---

## Environment Variable Resolution

### Backend (dotenv-flow)

The backend uses `dotenv-flow` to load environment variables in this order (later values override earlier ones):

1. `.env` (default, not committed)
2. `.env.local` (local overrides, not committed)
3. `.env.${NODE_ENV}` (e.g., `.env.development`)
4. `.env.${NODE_ENV}.local` (environment-specific local overrides, not committed)
5. `process.env` (OS environment variables, highest priority)

This allows for flexible configuration:
- Base settings in `.env`
- Environment-specific in `.env.development`
- Local machine overrides in `.env.local`
- CI/CD or Docker can override with OS environment variables

### Frontend (Vite)

Frontend environment variables are loaded from `.env` files during build:
- `.env` (loaded in all environments)
- `.env.local` (local development, not committed)
- `.env.${MODE}` (e.g., `.env.production`)
- `.env.${MODE}.local` (environment-specific local)

Variables must be prefixed with `VITE_` to be accessible in the browser.

---

## Troubleshooting

**"Cannot connect to MongoDB"**
- Check `MONGODB_URI` is correct and server is running
- For Docker, ensure service is named correctly in `docker-compose.yml`
- For Atlas, whitelist your IP in MongoDB Atlas dashboard

**"Redis connection refused"**
- Verify `REDIS_URL` is correct
- Check if Redis service is running (`redis-cli ping`)
- For Docker, use service name: `redis://redis:6379`

**"AI Service timeout"**
- Increase `AI_SERVICE_TIMEOUT` if processing is slow
- Check if AI service is running and accessible
- Verify `AI_SERVICE_URL` is correct

**"CORS errors in browser"**
- Set `CORS_ORIGIN` to match your frontend URL
- Include protocol (http:// or https://) and port if applicable

**"Authentication failures"**
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Check if tokens are being sent in Authorization header
- Ensure `JWT_EXPIRATION` is reasonable (not too short)

---

## Additional Resources

- [Node.js Environment Variables](https://nodejs.org/en/knowledge/cli/how-to-use-dotenv/)
- [dotenv-flow Documentation](https://www.npmjs.com/package/dotenv-flow)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-modes.html)
- [MongoDB Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)
- [Redis Connection Format](https://redis.io/docs/reference/protocol-spec/)
