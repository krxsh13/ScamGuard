# Observability Guide

This guide covers the complete observability setup for ScamGuard, including structured logging, metrics collection, error tracking, and distributed tracing.

## Table of Contents

1. [Structured Logging](#structured-logging)
2. [Prometheus Metrics](#prometheus-metrics)
3. [Sentry Error Tracking](#sentry-error-tracking)
4. [OpenTelemetry Distributed Tracing](#opentelemetry-distributed-tracing)
5. [Monitoring Stack Setup](#monitoring-stack-setup)
6. [Dashboards & Alerting](#dashboards--alerting)
7. [Best Practices](#best-practices)

---

## Structured Logging

### Overview

All services use structured JSON logging with consistent fields for easier querying and correlation.

### Backend Logger

**Features**:
- JSON format in production for easy parsing
- Human-readable colorized output in development
- Automatic context injection (requestId, userId, service, environment, version)
- Log level management (debug, info, warn, error)
- File rotation with size limits (5MB, max 5 files)

### Logger Configuration

**File**: `backend/src/config/logger.ts`

**Fields in every log entry**:
- `timestamp`: ISO 8601 format
- `level`: Log level (debug, info, warn, error)
- `message`: Log message
- `service`: "scamguard-backend"
- `environment`: Deployment environment (development, staging, production)
- `version`: Application version from package.json
- `requestId`: HTTP request ID (if in request context)
- `userId`: Authenticated user ID (if available)

### Usage

```typescript
import { logger, getContextLogger } from './config/logger.js';

// Basic logging
logger.info('User logged in successfully');
logger.error('Database connection failed', { error: err });

// Contextual logging (with requestId and userId)
const contextLogger = getContextLogger('req-123-abc', 'user-456');
contextLogger.info('Scan submitted');
contextLogger.warn('Slow query detected');

// Child logger persists context across multiple log calls
const childLogger = logger.child({ requestId: 'req-789' });
childLogger.info('Request started');
childLogger.info('Request completed');
// Both logs will include requestId
```

### Log Levels

- `debug`: Detailed diagnostic information (development only)
- `info`: General informational messages
- `warn`: Warning messages for potentially problematic situations
- `error`: Error messages for failures

**Production settings**: LOG_LEVEL=warn (only warnings and errors)

### Log Output

**Development**:
```
2026-04-20 15:30:45 [info] [req=xyz-123, user=user-456, service=scamguard-backend]: User logged in successfully
```

**Production** (JSON):
```json
{
  "timestamp": "2026-04-20T15:30:45.123Z",
  "level": "info",
  "message": "User logged in successfully",
  "service": "scamguard-backend",
  "environment": "production",
  "version": "1.0.0",
  "requestId": "xyz-123",
  "userId": "user-456"
}
```

### Accessing Logs

**Docker**:
```bash
# View real-time logs
docker logs scamguard-backend -f

# Filter by pattern
docker logs scamguard-backend | grep "error"

# Last 100 lines
docker logs scamguard-backend --tail 100
```

**Kubernetes**:
```bash
# View pod logs
kubectl logs pod/scamguard-backend-xyz123 -f

# View deployment logs
kubectl logs deployment/scamguard-backend -f

# View logs from specific container
kubectl logs deployment/scamguard-backend -c backend
```

**File-based Logging**:
```bash
# Combined logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Search in logs
grep "database" logs/combined.log

# Parse JSON logs
cat logs/combined.log | jq '.[] | select(.level=="error")'
```

### Log Aggregation (ELK/CloudWatch)

For production, integrate with centralized logging:

**ELK Stack**:
```yaml
# Filebeat configuration
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/scamguard/combined.log

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

**CloudWatch**:
```bash
# Configure CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json
```

---

## Prometheus Metrics

### Overview

Prometheus metrics enable quantitative monitoring of application performance.

### Metrics Endpoints

**Backend**: `GET /metrics` (internal network only)
- Port: 4000
- Auth: IP allowlist (default: 127.0.0.1, localhost)
- Format: Prometheus text format

**AI Service**: `GET /metrics` (via prometheus-fastapi-instrumentator)
- Port: 8000
- Auto-instrumented HTTP request/response metrics

### Available Metrics

#### HTTP Request Metrics

**Counter**: `http_requests_total`
```
http_requests_total{method="GET",route="/api/scans",status_code="200"} 1234
http_requests_total{method="POST",route="/api/scans",status_code="202"} 567
http_requests_total{method="POST",route="/api/auth/login",status_code="401"} 12
```

**Histogram**: `http_request_duration_seconds`
```
http_request_duration_seconds_bucket{method="GET",route="/api/scans",le="0.1"} 1000
http_request_duration_seconds_bucket{method="GET",route="/api/scans",le="1"} 1200
http_request_duration_seconds_sum{method="GET",route="/api/scans"} 500
http_request_duration_seconds_count{method="GET",route="/api/scans"} 1234
```

#### Scan Processing Metrics

**Histogram**: `scan_processing_duration_seconds`
```
scan_processing_duration_seconds_bucket{scan_type="text",status="success",le="5"} 100
scan_processing_duration_seconds_bucket{scan_type="text",status="success",le="30"} 120
scan_processing_duration_seconds_sum{scan_type="text",status="success"} 1200
```

**Gauge**: `scan_queue_depth`
```
scan_queue_depth 15
```

#### AI Service Metrics

**Histogram**: `ai_service_call_duration_seconds`
```
ai_service_call_duration_seconds_bucket{endpoint="predict",status="success",le="1"} 50
ai_service_call_duration_seconds_bucket{endpoint="predict",status="success",le="3"} 95
ai_service_call_duration_seconds_bucket{endpoint="predict",status="timeout",le="5"} 5
```

#### User Metrics

**Gauge**: `active_users_total`
```
active_users_total 342
```

#### Database Metrics

**Gauge**: `db_connection_pool_saturation_percent{database="mongodb"}`
```
db_connection_pool_saturation_percent{database="mongodb"} 65
```

#### Error Metrics

**Counter**: `application_errors_total`
```
application_errors_total{error_type="database_connection",service="backend"} 5
application_errors_total{error_type="timeout",service="backend"} 2
application_errors_total{error_type="validation",service="backend"} 10
```

**Counter**: `failed_login_attempts_total`
```
failed_login_attempts_total{ip_address="192.168.1.1"} 3
failed_login_attempts_total{ip_address="10.0.0.5"} 25
```

### Querying Metrics

**Prometheus Query Examples**:

```promql
# Request rate (per second)
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Scan queue depth
scan_queue_depth

# Active users
active_users_total

# AI service P99 latency
histogram_quantile(0.99, rate(ai_service_call_duration_seconds_bucket[5m]))
```

### Custom Metrics

To add custom metrics in the backend:

```typescript
import {
  recordAiServiceCall,
  recordScanProcessing,
  updateScanQueueDepth,
  recordError,
} from './middleware/metrics.js';

// Record AI service call
const start = Date.now();
try {
  const result = await aiService.predict(text);
  recordAiServiceCall('predict', 'success', (Date.now() - start) / 1000);
} catch (err) {
  recordAiServiceCall('predict', 'error', (Date.now() - start) / 1000);
  recordError('ai_service_error', 'backend');
}

// Record scan processing
recordScanProcessing('text', 'success', 5.2);

// Update queue depth
const queueDepth = await scanQueue.count();
updateScanQueueDepth(queueDepth);
```

---

## Sentry Error Tracking

### Overview

Sentry captures, groups, and alerts on application errors in real-time.

### Setup

**Backend**: Initialized in `server.ts`
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions in production
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Frontend**: Initialized in `main.tsx`
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2, // 20% in production
  integrations: [
    new Sentry.Replay(),
    Sentry.replayIntegration(),
  ],
});
```

### Configuration

**Environment Variables**:
```bash
# Backend
SENTRY_DSN=https://key@id.ingest.sentry.io/project

# Frontend
VITE_SENTRY_DSN=https://key@id.ingest.sentry.io/project
```

### Usage

**Capturing Errors**:
```typescript
import * as Sentry from '@sentry/node';

try {
  // Some operation
} catch (error) {
  // Automatically captured, or explicitly:
  Sentry.captureException(error);
}

// Capture a message
Sentry.captureMessage('User action triggered', 'info');
```

**User Context**:
```typescript
// On login (backend)
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// On logout
Sentry.setUser(null);
```

**Custom Context**:
```typescript
// Add arbitrary context data
Sentry.setContext('scam_analysis', {
  scan_type: 'text',
  confidence: 0.95,
  linguistic_cues_found: 5,
});

// Add breadcrumbs for debugging
Sentry.captureMessage('API call initiated', 'debug');
```

### Sentry Dashboard

**Access**: https://sentry.io/organizations/your-org/

**Features**:
- Error grouping by type, stack trace
- Release tracking and deployment markers
- User context for debugging
- Performance monitoring
- Replays of user sessions (frontend)

### Error Alerts

Configure alerts in Sentry dashboard:
- Alert on new issue in production
- Alert on high error rate
- Alert on regression (same error in new release)

---

## OpenTelemetry Distributed Tracing

### Overview

OpenTelemetry provides end-to-end tracing across services for debugging complex request flows.

### Setup

**Backend**: Instrumentation initialized in `server.ts`

```typescript
// MUST be first import
import './instrumentation.js';
```

**Instrumentation File**: `backend/src/instrumentation.ts`
- Initializes OpenTelemetry SDK
- Configures OTLP exporter
- Auto-instruments HTTP, MongoDB, Redis

### Environment Variables

```bash
# Only required if using distributed tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
```

### How it Works

1. **Automatic Instrumentation** (via `@opentelemetry/auto-instrumentations-node`):
   - HTTP requests/responses
   - MongoDB queries
   - Redis operations
   - Express middleware

2. **Manual Span Creation** (optional):
```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('scamguard-backend');

const span = tracer.startSpan('process_scan', {
  attributes: {
    'scan.type': 'text',
    'scan.id': scanId,
  },
});

try {
  // Do work
} finally {
  span.end();
}
```

3. **Trace Propagation** (across services):
```typescript
import { trace } from '@opentelemetry/api';

const context = trace.getActiveSpan()?.context();
const traceId = context?.traceId;
const spanId = context?.spanId;

// Pass in headers to AI service
headers['traceparent'] = `00-${traceId}-${spanId}-01`;
```

### Viewing Traces

**Jaeger UI** (if using Jaeger):
- http://localhost:16686
- Service: scamguard-backend
- Operation: HTTP POST /api/scans
- See full request flow including MongoDB queries

**Datadog APM** (if using Datadog):
- Service Map shows service dependencies
- Flame graphs show request timeline
- Error tracking integrated

---

## Monitoring Stack Setup

### Docker Compose Stack

Add monitoring services to `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ["16686:16686", "4317:4317"]

volumes:
  prometheus_data:
  grafana_data:
```

**Prometheus Config** (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'

  - job_name: 'ai-service'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

---

## Dashboards & Alerting

### Grafana Dashboards

**Key Dashboards to Create**:

1. **Service Health Dashboard**
   - Request rate (req/sec)
   - Error rate (%)
   - P95/P99 latency
   - Active users
   - Queue depth

2. **Performance Dashboard**
   - Response times by endpoint
   - Database query performance
   - AI service latency
   - Cache hit rates

3. **System Dashboard**
   - CPU usage
   - Memory usage
   - Disk usage
   - Network I/O

### Alert Rules

**Example AlertManager rules**:

```yaml
groups:
  - name: scamguard
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate on {{ $labels.instance }}"

      - alert: SlowAIService
        expr: histogram_quantile(0.95, rate(ai_service_call_duration_seconds_bucket[5m])) > 3
        for: 5m
        annotations:
          summary: "AI service P95 latency > 3s"

      - alert: HighQueueDepth
        expr: scan_queue_depth > 50
        for: 5m
        annotations:
          summary: "Scan queue depth > 50"
```

---

## Best Practices

### Logging Best Practices

✅ **DO**:
- Use structured logging with consistent fields
- Include requestId for correlation
- Log at appropriate levels (not everything as ERROR)
- Include context for debugging
- Use descriptive error messages

❌ **DON'T**:
- Log sensitive data (passwords, tokens)
- Log at DEBUG level in production
- Create huge log messages (> 1KB)
- Log personally identifiable information (PII)
- Ignore errors silently

### Metrics Best Practices

✅ **DO**:
- Use consistent metric names and labels
- Include relevant dimensions (method, status_code)
- Set appropriate histogram buckets
- Update gauges regularly
- Test alerting rules

❌ **DON'T**:
- Create high-cardinality metrics (unbounded labels)
- Use metrics as distributed IDs
- Alert on too many metrics (alert fatigue)
- Ignore spike patterns

### Tracing Best Practices

✅ **DO**:
- Trace end-to-end user requests
- Propagate trace context across services
- Sample traces appropriately (not 100% in production)
- Use meaningful span names
- Add relevant attributes

❌ **DON'T**:
- Trace every internal function (too noisy)
- Store sensitive data in traces
- Create too many span events
- Ignore errors in tracing

### Error Handling Best Practices

✅ **DO**:
- Capture and report all exceptions
- Include user context for debugging
- Track error patterns
- Group similar errors
- Monitor error rate trends

❌ **DON'T**:
- Ignore errors silently
- Report PII in error messages
- Create alert fatigue with too many error types
- Assume errors will fix themselves

---

## Troubleshooting

### Metrics not appearing

1. Check `/metrics` endpoint is accessible
2. Verify METRICS_ALLOWLIST includes your IP
3. Check prometheus.yml configuration
4. Review Prometheus targets page: http://prometheus:9090/targets

### Sentry not capturing errors

1. Verify SENTRY_DSN is set correctly
2. Check Sentry project settings allow errors from your domain
3. Verify error is actually being thrown (not caught)
4. Review browser console for JavaScript errors

### Traces not showing up

1. Verify OTEL_EXPORTER_OTLP_ENDPOINT is correct
2. Check jaeger/otel-collector is running
3. Look for OTLP export errors in application logs
4. Verify trace sampling rate (might be 0)

### High memory usage in logging

1. Check log file rotation is working
2. Reduce log level in production
3. Implement log aggregation to reduce disk usage
4. Check for log spam in application code

---

## References

- [Winston Logger Docs](https://github.com/winstonjs/winston)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Sentry Docs](https://docs.sentry.io/)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Observability Best Practices](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)
