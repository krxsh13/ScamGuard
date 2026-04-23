# ScamGuard

A comprehensive digital scam detection and education platform. ScamGuard helps users identify and protect themselves from online scams through intelligent analysis, threat intelligence, and interactive education.

## Features

### Core Platform
- **Scam Checker** - Analyze text, URLs, and images for potential scams
- **OCR & Image Analysis** - Extract and analyze text from screenshots
- **Threat Intelligence** - Integration with Google Safe Browsing, VirusTotal, PhishTank
- **Risk Scoring** - ML-powered risk assessment (0-100 scale)
- **Educational Hub** - Learn about different scam types and protection strategies
- **Interactive Quiz** - Test your knowledge with gamified learning

### Security & Compliance
- **End-to-End Encryption** - Secure data transmission
- **GDPR Compliant** - Right to Erasure (Article 17) implementation
- **User Authentication** - Secure JWT-based auth
- **Rate Limiting** - Protection against abuse
- **Data Retention Policy** - Automatic cleanup of old scans

### Observability
- **Structured Logging** - JSON logs for production
- **Prometheus Metrics** - System monitoring
- **Sentry Integration** - Error tracking and performance monitoring
- **OpenTelemetry** - Distributed tracing
- **Health Checks** - Platform status monitoring

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tooling
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Document database
- **Redis** - Caching & sessions
- **BullMQ** - Job queue
- **Node-Cron** - Scheduled tasks

### AI & ML
- **Python FastAPI** - ML service
- **PyTorch** - Deep learning
- **Tesseract** - OCR engine
- **scikit-learn** - ML utilities

## Project Structure

```
ScamGuard/
├── src/                    # Frontend (React)
│   ├── components/        # React components
│   ├── pages/             # Page components
│   └── main.tsx          # Entry point
├── backend/               # Backend API (Express/Node.js)
│   ├── src/
│   │   ├── config/       # Configuration
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database schemas
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── workers/      # Job queue workers
│   │   └── jobs/         # Scheduled tasks
│   ├── tests/            # Unit & integration tests
│   └── README.md         # Backend documentation
├── ai-service/           # AI/ML Service (Python)
│   ├── app/
│   │   ├── main.py      # API server
│   │   ├── ml_model.py  # ML model
│   │   ├── ocr.py       # OCR processing
│   │   └── models.py    # Request/response models
│   ├── tests/           # Tests
│   └── README.md        # AI service documentation
├── docs/                 # Documentation
│   ├── OBSERVABILITY.md  # Monitoring & alerting
│   ├── alerting-runbook.md # Operations guide
│   └── PROJECT_DOCUMENTATION_A_TO_Z.md # Comprehensive guide
├── package.json         # Frontend dependencies
└── README.md           # This file
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+ (for AI service)
- **MongoDB** 6.0+
- **Redis** 7.0+
- **npm** or **yarn**
- **Docker & Docker Compose** (optional, recommended for local dev)

### Quick Start (Docker Recommended)

```bash
# Clone and navigate to project
git clone <repository>
cd ScamGuard

# Start all services with Docker Compose
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# AI Service: http://localhost:8000
```

### Manual Setup

#### 1. Frontend

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

#### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Backend API runs on `http://localhost:3000`

See [backend/README.md](backend/README.md) for detailed setup.

#### 3. AI Service

```bash
cd ai-service

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Create environment file
cp .env.example .env.local

# Start service
python -m app.main
```

AI Service runs on `http://localhost:8000`

See [ai-service/README.md](ai-service/README.md) for detailed setup.

## Development

### Available Scripts

```bash
# Frontend
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run linter
npm test                 # Run tests
npm run test:coverage    # Generate coverage report

# Backend
cd backend
npm run dev              # Start development server
npm run build            # Compile TypeScript
npm run start            # Run compiled code
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript
npm test                 # Run tests

# AI Service
cd ai-service
python -m app.main      # Start service
python -m pytest        # Run tests
```

## API Documentation

### Base URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **AI Service**: http://localhost:8000

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh JWT

**Scans:**
- `POST /api/scans` - Submit scan (text/url/image)
- `GET /api/scans` - List user's scans
- `GET /api/scans/:id` - Get scan results

**Analytics:**
- `GET /api/analytics/summary` - Platform statistics
- `GET /api/analytics/trends` - 30-day trends
- `GET /api/analytics/user` - User statistics

**User:**
- `GET /api/user/profile` - Get user profile
- `DELETE /api/user/data` - Delete all data (GDPR)

See [backend/README.md](backend/README.md) for complete API reference.

## Database

### MongoDB Collections

- **users** - User accounts and authentication
- **scans** - Submitted scans and results
- **reports** - Verified scam reports
- **conversations** - Multi-turn chat history
- **quiz_results** - Quiz attempt results

### Redis Keys

- `session:*` - User session data
- `refreshToken:*` - Refresh token storage
- `analytics:*` - Cached analytics
- `scan:*` - Scan processing queue

## Configuration

### Environment Variables

Each service has its own `.env.example` file:

- **Frontend**: [.env.example](.env.example)
- **Backend**: [backend/.env.example](backend/.env.example)
- **AI Service**: [ai-service/.env.example](ai-service/.env.example)

Copy these to `.env.local` in each service directory and fill in values.

## Testing

### Frontend

```bash
npm test                 # Run tests
npm run test:coverage    # Generate coverage report
```

### Backend

```bash
cd backend
npm test                 # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### AI Service

```bash
cd ai-service
python -m pytest        # Run tests
python -m pytest --cov  # Coverage report
```

### End-to-End Tests

```bash
npm run test:e2e        # Run Playwright tests
```

## Deployment

### Docker

Each service has a Dockerfile:

```bash
# Build images
docker build -t scamguard-frontend .
docker build -t scamguard-backend backend/
docker build -t scamguard-ai-service ai-service/

# Run with Docker Compose
docker-compose up
```

### Environment

**Development:**
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

**Production:**
```bash
NODE_ENV=production
LOG_LEVEL=warn
DATA_RETENTION_DAYS=90
```

## Security

### Best Practices

1. **Secrets** - Never commit `.env` files
2. **HTTPS** - Enable in production
3. **Dependencies** - Keep updated (`npm audit`)
4. **Rate Limiting** - Enabled on sensitive endpoints
5. **CORS** - Configured for frontend domain
6. **JWT Secrets** - Use strong, unique secrets

### GDPR Compliance

- **Right to Erasure** - `DELETE /api/user/data`
- **Data Retention** - Configurable retention period
- **Analytics Privacy** - No personal data in aggregations
- **Image Privacy** - No raw image data stored

## Monitoring & Observability

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Frontend visual status
curl http://localhost:5173
```

### Metrics

```bash
# Prometheus metrics (requires IP allowlist)
curl http://localhost:3000/metrics
```

### Logs

```bash
# Backend logs
tail -f backend/logs/combined.log

# AI service logs
# Check console output
```

See [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) for detailed monitoring setup.

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process on port 3000
lsof -i :3000
kill -9 <PID>
```

**Database connection failed:**
```bash
# Check MongoDB is running
mongosh
```

**Redis connection failed:**
```bash
# Check Redis is running
redis-cli ping
```

**Python module not found:**
```bash
# Activate virtual environment
source ai-service/venv/bin/activate
pip install -r requirements-dev.txt
```

See [docs/alerting-runbook.md](docs/alerting-runbook.md) for more troubleshooting.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linter
4. Submit a pull request
5. Ensure CI/CD passes

### Code Standards

- TypeScript for all JavaScript code
- Use Prettier for formatting
- Use ESLint for linting
- Write tests for new features
- Update documentation

## License

Private

## Support

- 📧 Email: support@scamguard.com
- 📚 Documentation: [docs/](docs/)
- 🐛 Issues: GitHub Issues
- 📖 Guides: [PROJECT_DOCUMENTATION_A_TO_Z.md](PROJECT_DOCUMENTATION_A_TO_Z.md)

## Team

Built by the ScamGuard team to help protect users from online scams.

---

**Last Updated:** 2026-04-20  
**Version:** 1.0.0
