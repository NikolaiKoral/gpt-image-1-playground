# Fly.io Deployment Optimization Guide

## Current Setup Analysis

### Strengths:
1. **Multi-stage Docker build** - Reduces final image size
2. **Standalone Next.js output** - Minimal runtime dependencies
3. **1GB memory allocation** - Sufficient for image processing
4. **IndexedDB storage** - No filesystem persistence needed

### Areas for Optimization:

## 1. Machine Configuration Optimization

Update `fly.toml` for better efficiency:

```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'suspend'  # Changed from 'stop' to 'suspend' for faster restarts
  auto_start_machines = true
  min_machines_running = 1
  processes = ['app']
  
  # Add soft concurrency limit
  [http_service.concurrency]
    type = "requests"
    hard_limit = 25
    soft_limit = 20
```

## 2. Memory and CPU Optimization

For an image processing app, consider:

```toml
[[vm]]
  memory = '1536mb'  # Increase from 1GB for image processing headroom
  cpu_kind = 'shared'
  cpus = 2  # Increase from 1 to 2 for better concurrent request handling
```

## 3. Build Optimization

Add `.dockerignore` to reduce build context:

```
node_modules
.next
.git
*.log
.env*
generated-images/
.DS_Store
```

## 4. Runtime Optimization

Add health check endpoint for better machine management:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

Update fly.toml:
```toml
[[services.http_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "5s"
  method = "GET"
  path = "/api/health"
```

## 5. Image Processing Optimization

Since the app uses Sharp for image processing:

1. **Pre-allocate memory** for Sharp in Dockerfile:
```dockerfile
ENV SHARP_MEMORY_USAGE=1073741824  # 1GB max for Sharp
ENV SHARP_CONCURRENCY=1  # Process one image at a time to avoid OOM
```

2. **Add request timeout** in fly.toml:
```toml
[http_service]
  # ... existing config ...
  timeout = "60s"  # Allow 60 seconds for image processing
```

## 6. Caching Strategy

Add CDN headers for processed images:

```typescript
// In API routes returning images
headers: {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'CDN-Cache-Control': 'max-age=31536000',
}
```

## 7. Regional Deployment

For better global performance:

```toml
primary_region = 'arn'  # Stockholm (current)
# Add read replicas in other regions if needed
# backup_regions = ['lhr', 'iad']  # London, Virginia
```

## 8. Cost Optimization

1. **Use suspend instead of stop** - Machines resume in ~300ms vs 3-5s for cold start
2. **Set concurrency limits** - Prevents overloading single machine
3. **Enable HTTP/2** - Better connection reuse

## Implementation Priority:

1. **High Priority**: 
   - Change auto_stop_machines to 'suspend'
   - Add .dockerignore
   - Add health check endpoint

2. **Medium Priority**:
   - Increase memory to 1.5GB
   - Add concurrency limits
   - Add Sharp environment variables

3. **Low Priority**:
   - Multi-region deployment
   - CDN integration

## Estimated Performance Impact:

- **Cold start time**: 3-5s → 300ms (with suspend)
- **Image processing**: More stable with memory limits
- **Concurrent users**: 5-10 → 20-25 (with limits)
- **Monthly cost**: ~$5-7 for single machine

This configuration balances performance, reliability, and cost for a low-traffic image generation app.