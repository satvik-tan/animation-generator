# API Documentation

## Base URL
`http://localhost:8000` (development)

## Authentication
All endpoints except `/health` require Clerk JWT authentication via `Authorization: Bearer <token>` header.

---

## Endpoints

### 1. Create Animation Job
**POST** `/jobs`

Create a new animation generation job.

**Request Body:**
```json
{
  "prompt": "Create a circle that transforms into a square"
}
```

**Response:** `201 Created`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "result_url": null,
  "error_message": null
}
```

---

### 2. Get Job Status
**GET** `/jobs/{job_id}`

Get details about a specific job.

**Query Parameters:**
- `refresh_url` (boolean, optional): Set to `true` to regenerate pre-signed URL if expired

**Examples:**
```bash
# Normal request
GET /jobs/550e8400-e29b-41d4-a716-446655440000

# Force URL refresh
GET /jobs/550e8400-e29b-41d4-a716-446655440000?refresh_url=true
```

**Response:** `200 OK`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result_url": "https://satvik-manimation.s3.amazonaws.com/animations/user123/video.mp4?...",
  "error_message": null
}
```

**Status Values:**
- `queued` - Job waiting in queue
- `processing` - Video being generated
- `completed` - Video ready, `result_url` available
- `failed` - Generation failed, check `error_message`

---

### 3. Regenerate Video URL
**POST** `/jobs/{job_id}/regenerate-url`

Generate a fresh pre-signed URL for a completed job's video. Use this when the URL has expired (after 1 hour).

**Response:** `200 OK`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result_url": "https://satvik-manimation.s3.amazonaws.com/animations/user123/video.mp4?...",
  "error_message": null
}
```

**Error Responses:**
- `400 Bad Request` - Job not completed yet
- `404 Not Found` - Job doesn't exist
- `403 Forbidden` - Not your job

---

### 4. List User Jobs
**GET** `/jobs`

Get all jobs for the authenticated user, sorted by creation date (newest first).

**Response:** `200 OK`
```json
[
  {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "result_url": "https://...",
    "error_message": null
  },
  {
    "job_id": "661f9511-f3ac-52e5-b827-557766551111",
    "status": "processing",
    "result_url": null,
    "error_message": null
  }
]
```

---

### 5. Health Check
**GET** `/jobs/health`

Check if the API is running. No authentication required.

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

---

## Pre-Signed URL Lifecycle

### How It Works:

1. **Job Completion**: 
   - Worker uploads video to S3 at: `animations/{user_id}/{uuid}.mp4`
   - Generates initial pre-signed URL (1 hour expiry)
   - Stores both S3 key and URL in database

2. **URL Expiration**:
   - Pre-signed URLs expire after **1 hour**
   - S3 object remains permanently stored
   - Only the temporary access URL expires

3. **URL Regeneration** (Two Options):

   **Option A: Explicit Regeneration**
   ```bash
   POST /jobs/{job_id}/regenerate-url
   ```
   
   **Option B: Auto-refresh on GET**
   ```bash
   GET /jobs/{job_id}?refresh_url=true
   ```

### Frontend Integration Example:

```typescript
// Fetch job with auto-refresh
async function getJobWithFreshUrl(jobId: string) {
  const response = await fetch(
    `/jobs/${jobId}?refresh_url=true`,
    {
      headers: {
        'Authorization': `Bearer ${clerkToken}`
      }
    }
  );
  return response.json();
}

// Or explicit regeneration when URL fails
async function regenerateUrl(jobId: string) {
  const response = await fetch(
    `/jobs/${jobId}/regenerate-url`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkToken}`
      }
    }
  );
  return response.json();
}

// Recommended: Try video, regenerate if 403
async function playVideo(jobId: string, oldUrl: string) {
  try {
    await fetch(oldUrl, { method: 'HEAD' });
    return oldUrl; // Still valid
  } catch {
    // URL expired, regenerate
    const job = await regenerateUrl(jobId);
    return job.result_url;
  }
}
```

---

## Error Responses

All error responses follow this format:
```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (invalid input, job not ready)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (not your resource)
- `404` - Not Found (job doesn't exist)
- `500` - Internal Server Error (S3 failure, etc.)

---

## Rate Limits

Currently no rate limits. Consider implementing for production:
- Job creation: 10 per minute per user
- URL regeneration: 60 per minute per user

---

## Development Testing

```bash
# Create job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-dev-token" \
  -d '{"prompt": "Create a rotating cube"}'

# Get job status
curl http://localhost:8000/jobs/{job_id} \
  -H "Authorization: Bearer fake-dev-token"

# Regenerate URL
curl -X POST http://localhost:8000/jobs/{job_id}/regenerate-url \
  -H "Authorization: Bearer fake-dev-token"
```
