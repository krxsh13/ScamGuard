# Alert Runbook

This document defines alert thresholds, severity levels, and troubleshooting procedures for the ScamGuard monitoring system.

**Last Updated**: 2026-04-20  
**Supported Platforms**: Datadog, New Relic, Prometheus + AlertManager, or equivalent monitoring system

## Alert Severity Levels

| Level | Description | Response Time | Action |
|-------|-------------|----------------|--------|
| **Critical** | Service completely down or severe data loss risk | 5 minutes | Page on-call engineer immediately |
| **Warning** | Service degraded or error rate elevated | 15 minutes | Create incident ticket, notify team |
| **Info** | Informational alerts for capacity planning | 24 hours | Monitor and plan for remediation |

---

## Alert: AI Service P95 Latency > 3s

**Alert Type**: Performance  
**Severity**: Warning  
**Threshold**: P95 latency > 3 seconds  
**Duration**: Alert fires if threshold exceeded for 5 minutes  
**Alert Query**: `p95(ai_service_call_duration_seconds) > 3`

### Symptoms

- Slow response times on AI service endpoints
- Frontend sees timeout errors
- `/predict` endpoint responses taking > 3 seconds

### Troubleshooting Steps

1. **Check Service Health**
   ```bash
   curl -s http://ai-service:8000/health | jq .
   ```
   - Verify `model_loaded: true` and `ocr_available: true`
   - If false, restart the service

2. **Check Resource Utilization**
   ```bash
   # Docker
   docker stats scamguard-ai --no-stream

   # Kubernetes
   kubectl top pod scamguard-ai-xyz123
   ```
   - If CPU > 80% or Memory > 85%, scale up resources
   - Increase memory/CPU limits in deployment

3. **Check Model Performance**
   ```bash
   # Test model directly (SSH to AI service container)
   docker exec scamguard-ai python3 -c "
   from app.ml_model import ml_model
   import time
   
   ml_model.load()
   start = time.time()
   result = ml_model.predict('test text')
   elapsed = time.time() - start
   print(f'Model inference time: {elapsed:.2f}s')
   "
   ```
   - If model inference > 2s, rebuild or optimize model
   - Consider reducing model complexity or batch size

4. **Check Request Queue**
   ```bash
   # Check active requests
   curl -s http://ai-service:8000/metrics | grep request_duration_bucket
   ```
   - If queue is long, consider horizontal scaling

5. **Check Dependencies**
   - Verify PyTorch/CPU is working: `docker exec scamguard-ai python -c "import torch; print(torch.cuda.is_available())"`
   - Verify Tesseract availability: `docker exec scamguard-ai tesseract --version`

### Resolution

**Short-term**:
- Reduce AI_SERVICE_TIMEOUT on backend (allows faster failure/retry)
- Cache predictions in Redis for frequently analyzed text

**Long-term**:
- Profile model inference with `torch.profiler`
- Consider quantization or distillation for smaller model
- Implement request batching
- Add horizontal autoscaling based on response time

### Escalation

If issue persists > 15 minutes:
1. Check backend logs for AI service connection errors
2. Page on-call ML engineer
3. Temporary mitigation: Increase timeout and alert users to retry

---

## Alert: Backend Error Rate > 1% over 5 Minutes

**Alert Type**: Error Rate  
**Severity**: Warning  
**Threshold**: Error rate > 1% (errors / total_requests)  
**Duration**: 5 minutes  
**Alert Query**: `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01`

### Symptoms

- 500 errors in logs
- Failed API requests
- Slow backend response times
- Database connection errors

### Troubleshooting Steps

1. **Check Backend Logs**
   ```bash
   # Docker
   docker logs scamguard-backend -f --tail 100

   # Kubernetes
   kubectl logs -f deployment/scamguard-backend --tail 100
   ```
   - Look for patterns in errors (database, external API, etc.)

2. **Check Database Connectivity**
   ```bash
   # MongoDB
   docker exec scamguard-mongo mongosh scamguard --eval "db.adminCommand('ping')"

   # Or from backend pod
   kubectl exec -it deployment/scamguard-backend -- npm run test:db
   ```
   - If connection fails, check MongoDB service status

3. **Check Redis Connectivity**
   ```bash
   docker exec scamguard-redis redis-cli ping
   # Should return PONG
   ```
   - If fails, restart Redis

4. **Check Specific Error Type**
   ```bash
   # Query Sentry or logs for specific errors
   curl -s "http://prometheus:9090/api/v1/query?query=increase(http_requests_total{status_code='500'}[5m])" | jq .

   # Check error counter
   docker exec prometheus curl -s localhost:9090/metrics | grep application_errors_total
   ```

5. **Check Recent Deployments**
   ```bash
   # Check deployment history
   kubectl rollout history deployment/scamguard-backend

   # If error spike correlates with deployment, rollback
   kubectl rollout undo deployment/scamguard-backend
   ```

### Common Causes

- **Database**: Connection pool exhausted, slow queries, network issue
- **Memory leak**: Pod memory growing over time
- **Code bug**: New deployment with regression
- **External API**: AI service timeout, email service down
- **Rate limiting**: Too many requests from single source

### Resolution

**Immediate**:
- Scale backend deployment horizontally (add more pods)
- Restart backend service to clear potential memory leaks
- Check and clear connection pool: `db.adminCommand({connectionStatus: 1})`

**Investigation**:
- Review error logs for root cause
- Check Sentry for error grouping
- Compare error pattern before/after deployment
- Query database slow log: `db.setProfilingLevel(1)`

**Long-term**:
- Implement circuit breaker for external APIs
- Add connection pool monitoring
- Implement graceful degradation
- Add input validation to prevent bad requests

### Escalation

If error rate > 5% or persists > 10 minutes:
1. Page on-call backend engineer
2. Consider rollback if recent deployment
3. Notify users of possible service issues

---

## Alert: Scan Queue Depth > 50 Jobs

**Alert Type**: Queue Depth  
**Severity**: Warning  
**Threshold**: > 50 jobs waiting in queue  
**Duration**: 5 minutes  
**Alert Query**: `scan_queue_depth > 50`

### Symptoms

- Users report slow scan analysis
- Scans not completing
- Long wait times for results
- Possible job timeout

### Troubleshooting Steps

1. **Check Queue Status**
   ```bash
   # From backend pod
   kubectl exec -it deployment/scamguard-backend -- npm run test:queue-status

   # Or directly in MongoDB
   docker exec scamguard-mongo mongosh scamguard --eval "
   db.getCollection('scamguests').find({status: 'pending'}).count()
   "
   ```
   - Check pending jobs count
   - Check oldest pending job creation time

2. **Check Worker Health**
   ```bash
   # Check if scan workers are running
   kubectl get pods -l app=scamguard-backend | grep -E "worker|bull"

   # Check worker logs
   kubectl logs -f deployment/scamguard-worker --tail 50
   ```
   - If workers crashed, check logs for errors
   - Restart workers if necessary

3. **Check AI Service Availability**
   ```bash
   # Test connectivity to AI service
   curl -v http://ai-service:8000/health

   # Check AI service metrics
   curl -s http://ai-service:8000/metrics | head -20
   ```
   - If AI service is down, restart it
   - Check AI service error logs

4. **Check for Stuck Jobs**
   ```bash
   # MongoDB query for stuck jobs
   docker exec scamguard-mongo mongosh scamguard --eval "
   db.getCollection('scans').find({
     status: 'processing',
     updatedAt: { \$lt: new Date(Date.now() - 5*60*1000) }
   }).pretty()
   "
   ```
   - Find jobs in 'processing' state for > 5 minutes
   - Mark as failed and retry

5. **Check Backend Resources**
   ```bash
   # Check backend pod resource limits
   kubectl describe pod -l app=scamguard-backend | grep -A 5 "Limits\|Requests"

   # Check actual usage
   kubectl top pod -l app=scamguard-backend
   ```

### Common Causes

- AI service is slow/unavailable
- Backend worker crashed or stuck
- Worker concurrency too low
- Database slow query on scan lookup
- Redis connection issues

### Resolution

**Immediate**:
- Increase worker concurrency: `BULL_CONCURRENCY=10` (or higher)
- Scale backend deployment: `kubectl scale deployment/scamguard-backend --replicas=3`
- Restart stuck workers: `kubectl rollout restart deployment/scamguard-worker`

**Investigation**:
- Check AI service latency (P95 > 3s alert)
- Review backend worker logs for errors
- Check MongoDB slow query log
- Query Redis connection pool status

**Long-term**:
- Implement job retry logic with exponential backoff
- Add job timeout enforcement
- Implement dead letter queue for failed jobs
- Scale workers based on queue depth (autoscaling)

### Escalation

If queue depth > 100 or persists > 15 minutes:
1. Declare incident
2. Page on-call backend + DevOps engineers
3. Consider disabling new scan submissions temporarily
4. Notify users of potential delays

---

## Alert: MongoDB Connection Pool > 80% Saturation

**Alert Type**: Resource Saturation  
**Severity**: Warning  
**Threshold**: Connection pool saturation > 80%  
**Duration**: 3 minutes  
**Alert Query**: `db_connection_pool_saturation_percent{database="mongodb"} > 80`

### Symptoms

- Backend requests slow down
- "Connection pool exhausted" errors
- Timeout errors on database queries
- Thread pool rejection errors in logs

### Troubleshooting Steps

1. **Check Connection Pool Status**
   ```bash
   # From backend pod
   kubectl exec -it deployment/scamguard-backend -- node -e "
   const { mongoose } = require('mongoose');
   const stats = mongoose.connection.db.admin().command({connectionStatus: 1});
   console.log(stats);
   "
   ```
   - Check current connections vs max
   - Check idle connections

2. **Check Active Connections**
   ```bash
   # MongoDB
   docker exec scamguard-mongo mongosh scamguard --eval "
   db.currentOp(true)
   "
   ```
   - Look for long-running queries
   - Check number of active operations

3. **Check for Slow Queries**
   ```bash
   # Enable profiling if not already
   docker exec scamguard-mongo mongosh scamguard --eval "
   db.setProfilingLevel(1, {slowms: 1000})
   db.system.profile.find().sort({ts: -1}).limit(5).pretty()
   "
   ```
   - Look for queries > 1 second
   - Identify problematic queries

4. **Check Backend Load**
   ```bash
   # Check request rate
   curl -s http://prometheus:9090/api/v1/query?query=rate(http_requests_total[1m])

   # Check active connections
   kubectl exec -it deployment/scamguard-backend -- lsof -p $$ | wc -l
   ```

### Common Causes

- Slow queries holding connections too long
- Connection pool too small
- Sudden spike in traffic
- Database replication lag causing backlog
- Memory pressure on MongoDB

### Resolution

**Immediate**:
- Increase connection pool size: `MONGODB_MAX_POOL_SIZE=100` (default 50)
- Kill long-running queries:
  ```bash
  docker exec scamguard-mongo mongosh scamguard --eval "
  db.currentOp(true).inprog.forEach(op => {
    if (op.secs_running > 60) db.killOp(op.opid);
  })
  "
  ```
- Scale backend horizontally to distribute load

**Investigation**:
- Review slow query logs
- Check for N+1 query patterns
- Review recent code deployments
- Check MongoDB metrics (CPU, I/O, memory)

**Long-term**:
- Add database indexing for slow queries
- Implement query result caching
- Consider read replicas for read-heavy queries
- Implement connection pooling proxy (e.g., PgBouncer equivalent for MongoDB)

### Prevention

- Implement query timeouts
- Add connection pool monitoring
- Regular slow query analysis
- Load testing before deployments

---

## Alert: Failed Login Rate > 20/Minute from Single IP

**Alert Type**: Security  
**Severity**: Critical  
**Threshold**: > 20 failed logins per minute from single IP  
**Duration**: 1 minute  
**Alert Query**: `rate(failed_login_attempts_total[1m]) > 20`

### Symptoms

- Brute force attack in progress
- Multiple password attempts from same IP
- Failed authentication errors in logs
- Account lockout warnings

### Immediate Actions

1. **Identify Attack Source**
   ```bash
   # Query failed login metrics
   curl -s http://prometheus:9090/api/v1/query?query=failed_login_attempts_total | jq .

   # Check backend logs
   docker logs scamguard-backend | grep "failed.*login" | tail -20
   ```

2. **Block Attacker IP** (Immediate mitigation)
   ```bash
   # Add to firewall/WAF
   # Nginx example
   echo "deny <ATTACKER_IP>;" >> /etc/nginx/blocked_ips.conf
   nginx -s reload

   # Docker/Kubernetes
   kubectl create networkpolicy block-attacker \
     --deny --to-port=4000 \
     --from-pod-selector=<ATTACKER_IP>
   ```

3. **Check for Compromised Accounts**
   ```bash
   # Query for successful logins after failed attempts
   docker exec scamguard-mongo mongosh scamguard --eval "
   db.getCollection('users').find({
     lastLogin: { \$gte: new Date(Date.now() - 1*60*1000) }
   }).pretty()
   "
   ```

4. **Enable Account Lockout**
   - If not already enabled, activate temporary lockout after N failed attempts
   - Send security alert email to affected accounts

### Investigation

1. **Check Attack Duration**
   ```bash
   # Get attack timeline
   curl -s "http://prometheus:9090/api/v1/query_range?query=rate(failed_login_attempts_total[1m])&start=<TIME1>&end=<TIME2>&step=60s"
   ```

2. **Check Target Accounts**
   ```bash
   # Find accounts targeted
   docker exec scamguard-mongo mongosh scamguard --eval "
   db.getCollection('audit_log').find({
     event: 'login_failed',
     timestamp: { \$gte: new Date(Date.now() - 10*60*1000) }
   }).group({_id: '$user_email', count: { \$sum: 1 }})
   "
   ```

3. **Check for Lateral Movement**
   - Look for successful logins after failed attempts
   - Check API token creation after successful login
   - Review API access logs for unusual activity

### Response

**Short-term**:
- Block IP at firewall
- Lock affected user accounts temporarily
- Send security alerts to users
- Increase failed login monitoring

**Medium-term**:
- Require password reset for locked accounts
- Enable 2FA for affected users
- Review access logs for data exfiltration
- Check for credential compromise elsewhere

**Long-term**:
- Implement CAPTCHA after N failed attempts
- Implement geo-IP blocking for suspicious locations
- Add IP reputation checking
- Implement anomaly detection for login patterns

### Escalation

**This is a critical security event**:
1. Page on-call security engineer immediately
2. Notify infrastructure team
3. Prepare incident response statement
4. Document timeline and actions taken
5. Notify affected users of potential breach

### Post-Incident

- Conduct root cause analysis
- Review firewall logs for other attack indicators
- Update security policies if needed
- Plan security awareness training

---

## Alert: Disk Usage > 80% on Log Volume

**Alert Type**: Capacity  
**Severity**: Warning (Critical if > 95%)  
**Threshold**: > 80%  
**Duration**: 5 minutes  
**Alert Query**: `disk_usage_percent{volume="logs"} > 80`

### Symptoms

- Log writing failures
- Metrics collection interruptions
- Potential data loss
- Service degradation

### Troubleshooting Steps

1. **Check Disk Usage**
   ```bash
   # Docker/host
   df -h /var/log

   # Kubernetes persistent volume
   kubectl exec -it deployment/scamguard-backend -- df -h /var/log
   ```
   - Identify which partition is full
   - Check size of individual log files

2. **Identify Large Log Files**
   ```bash
   # Find largest logs
   du -sh /var/log/scamguard/* | sort -h | tail -10

   # Check log rotation
   ls -la /var/log/scamguard/
   ```

3. **Check Log Rotation Configuration**
   ```bash
   # Review Winston config in backend
   cat backend/src/config/logger.ts | grep -A 5 maxsize
   ```
   - Should be set to rotate at 5MB per file
   - Should limit to 5 old files

4. **Check Application Logging**
   ```bash
   # Check if any processes are logging excessively
   docker logs scamguard-backend | wc -l
   docker logs scamguard-ai | wc -l
   ```

### Common Causes

- Log rotation not working
- Verbose logging enabled in production
- Large error messages or stack traces
- Disk partition too small for application
- Log drain to external system failing

### Resolution

**Immediate**:
- Manually compress old logs:
  ```bash
  gzip /var/log/scamguard/combined.log.*
  ```
- Manually delete rotated logs > 30 days old:
  ```bash
  find /var/log/scamguard -name "*.log.*" -mtime +30 -delete
  ```
- Increase log retention threshold in config

**Investigation**:
- Check if log rotation is functioning
- Review LOG_LEVEL (should be 'info' or 'warn' in production)
- Check for any infinite loop logging

**Long-term**:
- Increase log volume size
- Implement centralized logging (ELK, CloudWatch)
- Increase log rotation frequency
- Reduce logging verbosity in production

### Prevention

- Monitor disk usage trend
- Set up disk alerts at 60% and 80%
- Implement external log aggregation
- Use log sampling for high-volume endpoints

---

## General Debugging Commands

### View Metrics
```bash
# Prometheus
curl -s http://prometheus:9090/metrics

# Backend
curl -s http://localhost:4000/metrics | head -30

# AI Service
curl -s http://localhost:8000/metrics | head -30
```

### Check Service Health
```bash
# Backend
curl -s http://localhost:4000/health | jq .

# AI Service
curl -s http://localhost:8000/health | jq .

# MongoDB
docker exec scamguard-mongo mongosh scamguard --eval "db.adminCommand('ping')"

# Redis
docker exec scamguard-redis redis-cli ping
```

### View Logs
```bash
# Backend
docker logs scamguard-backend -f

# AI Service
docker logs scamguard-ai -f

# All services
docker-compose logs -f
```

### Check Resource Usage
```bash
# Docker
docker stats

# Kubernetes
kubectl top nodes
kubectl top pods
```

---

## On-Call Escalation Policy

**Level 1** (Frontend/Support):
- User-facing issues
- Non-critical alerts
- Documentation updates
- Response time: 1 hour

**Level 2** (Backend Engineer):
- Application errors
- Performance issues
- Database problems
- Response time: 15 minutes

**Level 3** (DevOps/Infrastructure):
- Infrastructure failures
- Deployment issues
- Scaling problems
- Response time: 5 minutes

**Level 4** (Security/Incident Commander):
- Security incidents
- Data loss risks
- Critical system failures
- Response time: Immediate

---

## Monitoring Stack Setup

### Required Monitoring Components

1. **Prometheus** (Metrics collection)
   - Scrape endpoints at `/metrics`
   - 15 second scrape interval
   - 30 day retention

2. **AlertManager** (Alert routing)
   - Route alerts to appropriate channels
   - Group related alerts
   - Deduplication

3. **Grafana** (Visualization)
   - Dashboard for service health
   - Custom graphs for SLAs
   - Alert integration

4. **Sentry** (Error tracking)
   - Error grouping
   - Release tracking
   - User context

5. **ELK Stack / CloudWatch** (Centralized logging)
   - Aggregate logs from all services
   - Full-text search
   - Custom queries

### Alert Channels

- **Critical**: PagerDuty + Slack + Email
- **Warning**: Slack + Email
- **Info**: Slack channel (#monitoring)

---

## SLA Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Availability | 99.9% | Error rate > 1% |
| P95 Latency | < 1s | > 2s |
| P99 Latency | < 3s | > 5s |
| Queue Depth | < 10 jobs | > 50 jobs |
| Error Rate | < 0.1% | > 1% |

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Sentry Documentation](https://docs.sentry.io/)
- [OpenTelemetry Guide](https://opentelemetry.io/docs/)
- [Observability Best Practices](https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/)
