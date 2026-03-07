# ScamGuard Backend API

Backend API server for the ScamGuard cybersecurity platform.

## Features

- **Express.js** server with TypeScript
- **MongoDB** database with Mongoose ODM
- **Redis** for caching and session management
- **Winston** logging
- **JWT** authentication
- **Security middleware** (Helmet, CORS, rate limiting)
- **Input sanitization** and validation
- **Property-based testing** with fast-check

## Prerequisites

- Node.js 20+
- MongoDB 6+
- Redis 7+

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (min 32 characters)
- `AI_SERVICE_URL` - URL to the AI service

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Building

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Scam Detection (Coming Soon)
- `POST /api/scan/text` - Analyze text content
- `POST /api/scan/url` - Analyze URL
- `POST /api/scan/image` - Analyze image with OCR

## Security Features

- Rate limiting (100 requests per 15 minutes per IP)
- Helmet security headers
- CORS protection
- Input sanitization
- JWT authentication
- Request logging
- Error handling

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.ts       # Environment validation
│   │   ├── database.ts  # MongoDB connection
│   │   ├── redis.ts     # Redis connection
│   │   └── logger.ts    # Winston logger
│   ├── middleware/      # Express middleware
│   │   ├── security.ts  # Security middleware
│   │   └── errorHandler.ts # Error handling
│   ├── test/           # Test utilities
│   │   └── setup.ts    # Test setup
│   ├── app.ts          # Express app
│   └── server.ts       # Server entry point
├── logs/               # Log files
├── .env                # Environment variables
├── .env.example        # Environment template
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## License

MIT
