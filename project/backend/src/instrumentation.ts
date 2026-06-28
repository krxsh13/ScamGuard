/**
 * OpenTelemetry Instrumentation
 * 
 * This file must be imported at the VERY TOP of server.ts before any other imports.
 * It initializes the OpenTelemetry SDK for distributed tracing.
 * 
 * Usage in server.ts:
 * import './instrumentation.js';
 * // ... rest of imports
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-proto';
import * as ResourceModule from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Validate environment
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const nodeEnv = process.env.NODE_ENV || 'development';

// Only initialize if endpoint is configured
if (otelEndpoint) {
  // Create OTLP exporter
  const exporter = new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
    headers: {
      'Content-Type': 'application/x-protobuf',
    },
  });

  // Create resource
  const resource = new (ResourceModule as any).Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'scamguard-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    environment: nodeEnv,
  });

  // Initialize SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter: exporter as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-mongodb': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span: any, request: any) => {
            // Add custom attributes to HTTP spans
            span.setAttribute('http.request.body.size', request.headers['content-length'] || 0);
          },
        },
      }),
    ],
  });

  // Start SDK
  sdk.start();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
  });
  process.on('SIGINT', async () => {
    await sdk.shutdown();
  });

  console.log('OpenTelemetry SDK initialized with OTLP endpoint:', otelEndpoint);
} else {
  console.info('OpenTelemetry not configured. Set OTEL_EXPORTER_OTLP_ENDPOINT to enable distributed tracing.');
}

// Export context for manual span creation
export { context, trace } from '@opentelemetry/api';
