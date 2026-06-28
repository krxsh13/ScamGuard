import { Router } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../config/logger.js';

// ==================== Metrics Definitions ====================

/**
 * HTTP Requests Total
 * Labels: method, route, status_code
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

/**
 * HTTP Request Duration in Seconds
 * Labels: method, route
 */
export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // seconds
});

/**
 * Scan Processing Duration in Seconds
 * Labels: scan_type, status
 * Record this in the BullMQ worker
 */
export const scanProcessingDurationSeconds = new Histogram({
  name: 'scan_processing_duration_seconds',
  help: 'Scan processing duration in seconds',
  labelNames: ['scan_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120], // seconds
});

/**
 * Scan Queue Depth
 * Current number of jobs waiting in the scan queue
 * Updated every 30 seconds
 */
export const scanQueueDepthGauge = new Gauge({
  name: 'scan_queue_depth',
  help: 'Number of jobs waiting in scan queue',
});

/**
 * AI Service Call Duration in Seconds
 * Labels: endpoint, status
 */
export const aiServiceCallDurationSeconds = new Histogram({
  name: 'ai_service_call_duration_seconds',
  help: 'AI service call latency in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.5, 1, 2, 3, 5, 10], // seconds
});

/**
 * Active Users Total
 * Count of users with lastLogin within past 24 hours
 * Updated every 5 minutes
 */
export const activeUsersGauge = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users (logged in within past 24h)',
});

/**
 * Error Rate
 * Counter for application errors
 */
export const errorCounter = new Counter({
  name: 'application_errors_total',
  help: 'Total application errors',
  labelNames: ['error_type', 'service'],
});

/**
 * Database Connection Pool Saturation
 * Gauge for MongoDB connection pool usage percentage
 */
export const dbConnectionPoolSaturationGauge = new Gauge({
  name: 'db_connection_pool_saturation_percent',
  help: 'Database connection pool saturation percentage',
  labelNames: ['database'],
});

/**
 * Failed Login Attempts Counter
 * Track failed login attempts by IP address
 */
export const failedLoginAttemptsCounter = new Counter({
  name: 'failed_login_attempts_total',
  help: 'Total failed login attempts',
  labelNames: ['ip_address'],
});

// ==================== Middleware ====================

/**
 * IP Allowlist for /metrics endpoint
 * Add internal network IPs here
 */
const METRICS_ALLOWLIST = process.env.METRICS_ALLOWLIST
  ? process.env.METRICS_ALLOWLIST.split(',').map((ip) => ip.trim())
  : ['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1'];

/**
 * Middleware to allow only internal network access to /metrics
 */
export const metricsAuthMiddleware = (req: any, res: any, next: any) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // Check if IP is in allowlist
  if (!METRICS_ALLOWLIST.includes(clientIp)) {
    logger.warn('Unauthorized metrics access attempt', {
      ip: clientIp,
      endpoint: '/metrics',
    });
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};

/**
 * Middleware to track HTTP request metrics
 * Must be added early in the middleware chain
 */
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = process.hrtime.bigint();
  const route = req.route?.path || req.path || 'unknown';
  const method = req.method.toUpperCase();

  // Store original send function
  const originalSend = res.send;

  // Override send function to capture response status
  res.send = function (data: any) {
    // Record metrics
    const endTime = process.hrtime.bigint();
    const durationSeconds = Number(endTime - startTime) / 1e9; // Convert to seconds

    const statusCode = res.statusCode || 500;

    // Record metrics
    httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    httpRequestDurationSeconds.labels(method, route).observe(durationSeconds);

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

// ==================== Metrics Endpoints ====================

/**
 * Create metrics router with /metrics endpoint
 */
export const createMetricsRouter = () => {
  const router = Router();

  /**
   * GET /metrics - Prometheus metrics endpoint
   * Returns metrics in Prometheus text format
   */
  router.get('/metrics', metricsAuthMiddleware, async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  /**
   * GET /health - Health check endpoint (for container orchestration)
   * Returns JSON status
   */
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

// ==================== Utility Functions ====================

/**
 * Record AI service call duration
 * Usage: recordAiServiceCall('analyze-url', 'success', 1.234)
 */
export const recordAiServiceCall = (
  endpoint: string,
  status: 'success' | 'error' | 'timeout',
  durationSeconds: number
) => {
  aiServiceCallDurationSeconds.labels(endpoint, status).observe(durationSeconds);
};

/**
 * Record scan processing duration
 * Usage: recordScanProcessing('text', 'success', 5.678)
 */
export const recordScanProcessing = (
  scanType: 'text' | 'url' | 'image',
  status: 'success' | 'error' | 'timeout',
  durationSeconds: number
) => {
  scanProcessingDurationSeconds.labels(scanType, status).observe(durationSeconds);
};

/**
 * Update scan queue depth
 * Usage: updateScanQueueDepth(15)
 */
export const updateScanQueueDepth = (depth: number) => {
  scanQueueDepthGauge.set(depth);
};

/**
 * Update active users gauge
 * Usage: updateActiveUsers(342)
 */
export const updateActiveUsers = (count: number) => {
  activeUsersGauge.set(count);
};

/**
 * Update database connection pool saturation
 * Usage: updateDbConnectionPool('mongodb', 65)
 */
export const updateDbConnectionPool = (database: string, saturationPercent: number) => {
  dbConnectionPoolSaturationGauge.labels(database).set(saturationPercent);
};

/**
 * Record failed login attempt
 * Usage: recordFailedLoginAttempt('192.168.1.1')
 */
export const recordFailedLoginAttempt = (ipAddress: string) => {
  failedLoginAttemptsCounter.labels(ipAddress).inc();
};

/**
 * Record application error
 * Usage: recordError('database_connection', 'database')
 */
export const recordError = (errorType: string, service: string = 'backend') => {
  errorCounter.labels(errorType, service).inc();
};
