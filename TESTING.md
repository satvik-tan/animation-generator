# API Testing with cURL

## Test Commands (Development Mode)

### 1. Health Check (No Auth Required)
```bash
curl http://localhost:8000/jobs/health
```

### 2. Create Animation Job
```bash
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a blue circle that transforms into a red square"}'
```

### 3. Get Job Status
```bash
# Replace {job_id} with the actual UUID from create response
curl http://localhost:8000/jobs/{job_id}
```

### 4. List All Jobs for User
```bash
curl http://localhost:8000/jobs
```

### 5. Regenerate Video URL (for expired URLs)
```bash
# Replace {job_id} with the actual UUID
curl -X POST http://localhost:8000/jobs/{job_id}/regenerate-url
```

### 6. Get Job with Fresh URL
```bash
# Replace {job_id} with the actual UUID
curl "http://localhost:8000/jobs/{job_id}?refresh_url=true"
```

---

## With Custom User ID (Optional)

If you want to test with a specific user ID:

```bash
# Create job as specific user
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-abc-123" \
  -d '{"prompt": "Create a rotating cube"}'

# Get jobs for that user
curl -H "x-user-id: user-abc-123" http://localhost:8000/jobs
```

---

## Complete Test Flow

```bash
# 1. Create a job
JOB_RESPONSE=$(curl -s -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a pulsing heart shape"}')

echo "Created job: $JOB_RESPONSE"

# 2. Extract job_id (requires jq)
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job_id')
echo "Job ID: $JOB_ID"

# 3. Poll for completion (check every 5 seconds)
while true; do
  STATUS=$(curl -s http://localhost:8000/jobs/$JOB_ID | jq -r '.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  
  sleep 5
done

# 4. Get final result with video URL
curl -s http://localhost:8000/jobs/$JOB_ID | jq .
```

---

## API Documentation

Visit http://localhost:8000/docs for interactive Swagger UI (now works without auth in dev mode!)

---

## Production Mode

To disable dev mode and require proper authentication:

1. Remove or set `DEV_MODE=false` in `.env`
2. Restart container: `docker compose restart api`
3. All requests must include `x-user-id` header:
   ```bash
   curl -H "x-user-id: your-user-id" http://localhost:8000/jobs
   ```
