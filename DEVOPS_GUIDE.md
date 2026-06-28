# DevOps and Deployment Guide

This guide covers the complete DevOps setup for ScamGuard, including Docker containerization, local development with Docker Compose, CI/CD pipelines with GitHub Actions, and production deployment strategies.

## Table of Contents

1. [Docker Setup](#docker-setup)
2. [Docker Compose](#docker-compose)
3. [GitHub Actions CI/CD](#github-actions-cicd)
4. [Security Scanning](#security-scanning)
5. [Environment Configuration](#environment-configuration)
6. [Pre-commit Hooks](#pre-commit-hooks)
7. [Deployment Strategies](#deployment-strategies)
8. [Troubleshooting](#troubleshooting)

---

## Docker Setup

### Overview

Each service has a multi-stage Dockerfile for production and a `Dockerfile.dev` for development with hot reload.

**Services:**
- **Frontend**: Vite React app served by Nginx with SPA routing
- **Backend**: Node.js/Express API with TypeScript
- **AI Service**: Python FastAPI with Tesseract OCR

### Building Docker Images

#### Frontend

**Production Build:**
```bash
# From project root
docker build -t scamguard-frontend:latest .
```

**Development Build:**
```bash
docker build -f Dockerfile.dev -t scamguard-frontend:dev .
```

**Run Frontend:**
```bash
# Production
docker run -p 3000:80 scamguard-frontend:latest

# Development with volume mount for hot reload
docker run -v $(pwd):/app -p 3000:5173 scamguard-frontend:dev
```

#### Backend

**Production Build:**
```bash
cd backend
docker build -t scamguard-backend:latest .
```

**Development Build:**
```bash
cd backend
docker build -f Dockerfile.dev -t scamguard-backend:dev .
```

**Run Backend:**
```bash
# Production
docker run \
  -e MONGODB_URI=mongodb://mongo:27017/scamguard \
  -e REDIS_URL=redis://redis:6379 \
  -e JWT_SECRET=your-secret \
  -p 4000:4000 \
  scamguard-backend:latest

# Development with volume mount
docker run \
  -v $(pwd)/src:/app/src \
  -e NODE_ENV=development \
  -p 4000:4000 \
  scamguard-backend:dev
```

#### AI Service

**Production Build:**
```bash
cd ai-service
docker build -t scamguard-ai:latest .
```

**Run AI Service:**
```bash
docker run \
  -e ENVIRONMENT=production \
  -p 8000:8000 \
  scamguard-ai:latest
```

### Dockerfile Architecture

#### Frontend Dockerfile (Multi-stage)

```
Stage 1: Builder
- Alpine Node image
- npm ci
- npm run build

Stage 2: Runtime
- Alpine Nginx image
- Custom nginx.conf (SPA routing, security headers)
- dist/ from builder
- Healthcheck: /health endpoint
- Serve on port 80
```

#### Backend Dockerfile (Multi-stage)

```
Stage 1: Builder
- Alpine Node image
- npm ci (all dependencies)
- npm run build

Stage 2: Runtime
- Alpine Node image
- Production dependencies only
- Non-root user: nodejs
- Healthcheck: /health endpoint
- Serve on port 4000
```

#### AI Service Dockerfile

```
Base: Python 3.11 slim
- System deps: tesseract-ocr, curl
- pip install -r requirements.txt
- CPU-only PyTorch (via PIP_EXTRA_INDEX_URL)
- Non-root user: appuser
- Healthcheck: /health endpoint
- Serve on port 8000
```

### Best Practices

✅ **Multi-stage builds** for smaller final images
✅ **Alpine Linux** for minimal base images
✅ **Non-root users** for security
✅ **Healthchecks** for container orchestration
✅ **Proper logging** to stdout/stderr
✅ **Layer caching** for faster rebuilds

---

## Docker Compose

### Overview

Docker Compose orchestrates all services locally with three profiles:
- **docker-compose.yml**: Base configuration
- **docker-compose.override.yml**: Development overrides (auto-loaded)
- **docker-compose.prod.yml**: Production overrides (explicit)

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| frontend | scamguard-frontend | 3000:80 | Vite + Nginx |
| backend | scamguard-backend | 4000:4000 | Node.js/Express |
| ai-service | scamguard-ai | 8000:8000 | Python/FastAPI |
| mongo | mongo:7-alpine | 27017:27017 | Database |
| redis | redis:7-alpine | 6379:6379 | Cache/Session |

### Quick Start - Development

**Start all services:**
```bash
docker-compose up
```

**Services available at:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- AI Service: http://localhost:8000
- MongoDB: localhost:27017
- Redis: localhost:6379

**Stop services:**
```bash
docker-compose down
```

**Remove volumes (reset database):**
```bash
docker-compose down -v
```

### Development Features (docker-compose.override.yml)

- **Volume mounts** for hot reload on code changes
- **Source code mounted** instead of COPY
- **npm run dev** and `npm run build:watch` for live development
- **Lower ports** (3000 instead of 80) for easier local access
- **Debug environment variables** (LOG_LEVEL=debug)
- **Exposed ports** for all services

**Example:**
```yaml
backend:
  volumes:
    - ./backend/src:/app/src  # Mount source for hot reload
    - /app/node_modules       # Don't overwrite node_modules
  environment:
    - NODE_ENV=development
    - LOG_LEVEL=debug
  command: npm run dev
```

### Production Deployment (docker-compose.prod.yml)

**Start production stack:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Production features:**
- Services only exposed to localhost (127.0.0.1)
- Use reverse proxy (Nginx, Traefik) for public access
- Authentication on MongoDB and Redis (environment variables)
- Volume bindings to persistent storage locations
- Higher connection pool sizes
- Logging to file with rotation

### Environment Variables

**Override ports:**
```bash
FRONTEND_PORT=8080 BACKEND_PORT=5000 AI_SERVICE_PORT=9000 docker-compose up
```

**Environment file:**
```bash
# Create .env file
echo "FRONTEND_PORT=8080" >> .env
echo "BACKEND_PORT=5000" >> .env

docker-compose up
```

### Networking

Services communicate via service names:
- Backend → Database: `mongodb://mongo:27017/scamguard`
- Backend → Redis: `redis://redis:6379`
- Frontend → Backend: `http://backend:4000`
- Backend → AI Service: `http://ai-service:8000`

**Network name:** `scamguard-network` (bridge)

### Debugging

**View service logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f mongo
```

**Execute command in service:**
```bash
docker-compose exec backend npm run test
docker-compose exec mongo mongosh scamguard
```

**Inspect service:**
```bash
docker-compose ps  # Show all services and status
docker inspect scamguard-backend  # Detailed inspection
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps
```

Services become "healthy" when:
- Frontend: Nginx responds on `:80/health`
- Backend: HTTP 200 on `http://localhost:4000/health`
- AI Service: HTTP 200 on `http://localhost:8000/health`
- MongoDB: Ping response on port 27017
- Redis: PING response on port 6379

---

## GitHub Actions CI/CD

### Overview

Two workflows automate testing, security scanning, and deployment:

1. **ci.yml**: Runs on every push/PR
2. **security.yml**: Runs weekly + on demand

### CI Workflow (ci.yml)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs (parallel execution):**

#### 1. lint-frontend
```bash
npm run lint       # ESLint on frontend code
npm run type-check # TypeScript type checking
```

#### 2. test-frontend (Unit)
```bash
npm run test -- --run      # Vitest unit tests
npm run test:coverage      # Generate coverage report
# Upload to Codecov
```

#### 3. test-frontend-e2e (E2E)
```bash
npm run build                    # Build for E2E testing
npx playwright install --with-deps
npm run e2e                     # Playwright tests
# Artifact: playwright-report/
```

#### 4. lint-backend
```bash
cd backend
npm run lint       # ESLint
npm run type-check # TypeScript
```

#### 5. test-backend (Integration)
```bash
# Services: MongoDB, Redis (in containers)
cd backend
npm test -- --run        # Integration tests
npm test:coverage        # Coverage report
# Upload to Codecov
```

#### 6. test-ai
```bash
cd ai-service
pip install -r requirements-dev.txt
pytest -v --tb=short                    # Run tests with output
pytest --cov=app --cov-report=xml tests/ # Coverage
# Upload to Codecov
```

#### 7. docker-build
```bash
# Builds all 3 Docker images (doesn't push)
docker build ./                  # Frontend
docker build ./backend          # Backend
docker build ./ai-service       # AI Service
# Caches layers in GitHub Container Registry
```

#### 8. deploy
```bash
# Only runs on: main branch + push event (no PRs)
# Placeholder for deployment configuration
# Examples: Railway, Render, AWS
```

### Dependency Graph

```
lint-frontend ─┐
test-frontend ─┤
test-frontend-e2e ─┤
lint-backend ─┤
test-backend ─├── docker-build ── deploy
test-ai ─┘
```

### Codecov Integration

Coverage reports automatically uploaded:
- Frontend: `coverage/coverage-final.json`
- Backend: `coverage/coverage-final.json`
- AI Service: `coverage.xml`

View coverage at: `app.codecov.io/gh/your-org/scamguard`

### GitHub Artifacts

Artifacts retained for 30 days:
- `playwright-report/`: E2E test results with screenshots

Download from GitHub Actions run page.

### Workflow Status Badge

Add to README.md:
```markdown
[![CI/CD Pipeline](https://github.com/your-org/scamguard/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/scamguard/actions/workflows/ci.yml)
```

---

## Security Scanning

### Overview

Security workflow (security.yml) runs weekly and on-demand:

**Scans:**
- npm audit (Frontend + Backend)
- pip-audit (AI Service)
- Snyk scanning
- Dependency update checks

### Vulnerabilities

**npm audit:**
```bash
npm audit --audit-level=moderate  # Fail on moderate/high/critical
```

**pip-audit:**
```bash
pip-audit --requirements requirements.txt
```

**Results:**
- Artifacts uploaded: `npm-audit-*.json`, `pip-audit-results.json`
- If vulnerabilities found: GitHub Issue created with details
- Issue labeled: `security`, `dependencies`, `auto-generated`

### Snyk Integration

**Setup:**
1. Create [Snyk account](https://snyk.io)
2. Get API token from account settings
3. Add to GitHub Secrets:
   ```
   SNYK_TOKEN=<your-token>
   ```

**Scanning:**
```bash
snyk test --severity-threshold=high --json
```

### Dependency Update Checks

Weekly check for outdated packages:
```bash
npm outdated                # Frontend
cd backend && npm outdated  # Backend
pip list --outdated        # AI Service
```

Creates GitHub Issue if updates available.

### Best Practices

✅ Set `audit-level=moderate` (or higher)
✅ Review and fix vulnerabilities promptly
✅ Pin critical dependencies to specific versions
✅ Use GitHub Secrets for sensitive API keys
✅ Enable branch protection rules requiring passing checks

---

## Environment Configuration

### Setup

1. **Copy example files:**
   ```bash
   cp backend/.env.development.example backend/.env.development
   cp ai-service/.env.development.example ai-service/.env.development
   ```

2. **Update with local values:**
   - JWT_SECRET: Generate random string (use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - MONGODB_URI: Keep `mongodb://localhost:27017/scamguard` for local
   - REDIS_URL: Keep `redis://localhost:6379` for local

3. **For Docker:**
   ```bash
   # Create .env in project root for Docker Compose
   echo "FRONTEND_PORT=3000" > .env
   echo "BACKEND_PORT=4000" >> .env
   ```

### CI/CD Environment Variables

**Set GitHub Secrets:**
1. Go to Settings → Secrets and variables → Actions
2. Add secrets:
   - `CODECOV_TOKEN` (from codecov.io)
   - `SNYK_TOKEN` (from snyk.io)
   - Deployment credentials (Railway API key, etc.)

**Access in workflow:**
```yaml
env:
  CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

### Production Secrets

**Never commit `.env.production`**

**Options:**
1. **Container orchestration** (Kubernetes):
   ```bash
   kubectl create secret generic app-secrets --from-file=.env.production
   ```

2. **Cloud provider** (AWS, Azure, GCP):
   - Use Secrets Manager or Parameter Store
   - Pass at runtime

3. **Docker secrets** (Docker Swarm):
   ```bash
   docker secret create jwt-secret /path/to/secret
   ```

4. **CI/CD platform** (Railway, Render):
   - Use platform's environment variable UI
   - Automatically injected at deployment

---

## Pre-commit Hooks

### Setup

Pre-commit hooks automatically run linters before each commit.

**Installation:**
```bash
npm install -D husky lint-staged
npx husky install
```

### Configuration

**.lintstagedrc.json:**
```json
{
  "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit"],
  "*.{js,jsx}": ["eslint --fix"],
  "*.py": ["black --check", "mypy"]
}
```

**.husky/pre-commit:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."
npx lint-staged

if [ $? -ne 0 ]; then
  echo "❌ Pre-commit checks failed. Commit aborted."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
```

### What Happens on Commit

1. **Staged files detected**
2. **ESLint runs** on TypeScript files
   - Fixes auto-fixable issues
   - Reports errors
3. **TypeScript type check** (tsc)
   - No errors allowed
4. **Python files**: black + mypy
5. **Commit fails if:**
   - ESLint errors not auto-fixable
   - TypeScript compilation errors
   - Python linting errors

### Skip Pre-commit Hooks

**Use with caution:**
```bash
git commit --no-verify
```

### Bypass Husky on CI/CD

GitHub Actions automatically skips husky by not setting git config.

---

## Deployment Strategies

### Option 1: Railway

**Setup:**
1. Create [Railway](https://railway.app) account
2. Connect GitHub repository
3. Add services:
   - Frontend: Build command: `npm run build`
   - Backend: Build: `npm run build`, Start: `node dist/server.js`
   - AI Service: Python service from Dockerfile

**Environment variables:** Set in Railway dashboard

**Domains:** Railway provides automatic domains

### Option 2: Render

**Setup:**
1. Create [Render](https://render.com) account
2. Create Web Services:
   - Frontend: Static site with build: `npm run build`, dir: `dist`
   - Backend: Node service with build: `npm run build`
   - AI Service: Native Python service

**Deployment:** Auto-deploy on push to main

### Option 3: AWS (ECS + ECR)

**Setup:**
```bash
# Create ECR repositories
aws ecr create-repository --repository-name scamguard-frontend
aws ecr create-repository --repository-name scamguard-backend
aws ecr create-repository --repository-name scamguard-ai

# Build and push images
docker build -t scamguard-frontend:latest .
aws ecr get-login-password | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

docker tag scamguard-frontend:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/scamguard-frontend:latest
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/scamguard-frontend:latest
```

### Option 4: Docker Swarm (Self-hosted)

**Deploy stack:**
```bash
docker stack deploy -c docker-compose.prod.yml scamguard
```

**Verify:**
```bash
docker stack ls
docker stack services scamguard
```

### Option 5: Kubernetes (Self-hosted / Managed)

**Create namespace:**
```bash
kubectl create namespace scamguard
```

**Deploy using Helm or raw manifests:**
```bash
# Example with kustomize
kubectl kustomize ./k8s/overlays/production | kubectl apply -f -
```

### SSL/TLS Certificates

**Let's Encrypt with Nginx:**
```bash
docker run --rm -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone -d scamguard.com
```

**Update nginx.conf:**
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ... rest of config
}
```

---

## Troubleshooting

### Docker Issues

**Image build fails:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild with no cache
docker build --no-cache -t scamguard-frontend:latest .
```

**Container won't start:**
```bash
docker logs <container-id>
docker inspect <container-id>
```

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Docker Compose Issues

**Services can't communicate:**
- Check service names match in URLs
- Verify network name: `docker network ls`
- Test connectivity: `docker exec <container> curl http://<service>:<port>`

**Volume mount not updating:**
```bash
docker-compose down
docker volume prune
docker-compose up
```

**Health check failing:**
```bash
docker-compose logs mongo
docker exec scamguard-mongo mongosh scamguard
```

### CI/CD Issues

**Workflow fails with permissions error:**
- Check GitHub Secrets are set
- Verify workflow permissions: Settings → Actions → General

**Tests fail locally but pass in CI:**
- Clear node_modules: `rm -rf node_modules && npm ci`
- Check Node version matches: `node --version`
- Run exact CI command: `npm ci && npm run test -- --run`

**Codecov not receiving coverage:**
- Upload artifact path correct: `./coverage/coverage-final.json`
- Check Codecov token valid: `Settings → Secrets → CODECOV_TOKEN`

### Security Scanning

**npm audit warnings but passing:**
- These are informational, doesn't block deployment
- To fail on warnings: `npm audit --audit-level=moderate`

**Pip-audit fails on transitive dependency:**
- Add to `pip-audit-exceptions.json` or skip:
  ```bash
  pip-audit --skip-editable --desc
  ```

### Deployment Issues

**Service can't reach database:**
- Verify MONGODB_URI is correct
- For cloud databases, whitelist IP
- Check network security groups (AWS, Azure)

**Application crashes on deploy:**
- Check logs: `docker logs <container>`
- Verify all env vars set: `env | grep MONGODB`
- Run locally with same config: `docker-compose -f docker-compose.prod.yml up`

---

## Monitoring & Observability

### Health Checks

All services expose health endpoints:
- Frontend: `GET /health` → returns "healthy"
- Backend: `GET /health` → returns `{ status: "ok" }`
- AI Service: `GET /health` → returns `{ status: "healthy" }`

**Monitor:**
```bash
watch -n 5 'curl -s http://localhost:3000/health && echo && curl -s http://localhost:4000/health && echo && curl -s http://localhost:8000/health'
```

### Logging

**Backend logs:**
```bash
docker logs scamguard-backend -f
```

**AI Service logs:**
```bash
docker logs scamguard-ai -f
```

**Rotate logs:**
```bash
docker-compose.yml includes log rotation:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Metrics

**Docker resource usage:**
```bash
docker stats
```

**Connection pool monitoring:**
- Backend logs: "Connection pool size: X"
- Redis: `REDIS_INFO clients`

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [GitHub Actions](https://github.com/features/actions)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [AWS ECS](https://docs.aws.amazon.com/ecs/)
- [Kubernetes](https://kubernetes.io/docs/)
