# S3 Configuration Guide

## Environment Variables Required

Add these to your `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1  # or your preferred region
AWS_S3_BUCKET=your-bucket-name
```

## S3 Bucket Setup

### 1. Create S3 Bucket (AWS Console)
- Go to S3 Console → Create Bucket
- Choose a unique bucket name (e.g., `animation-generator-videos`)
- **Block all public access** ✅ (keep bucket private)
- Enable versioning (optional but recommended)

### 2. Configure CORS (if serving videos in browser)
Add this CORS configuration to your bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 3. Create IAM User with S3 Permissions

Create an IAM policy with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

Attach this policy to a new IAM user and save the credentials.

## How It Works

### User-Specific Access
- Videos are stored at: `animations/{user_id}/{uuid}.mp4`
- Pre-signed URLs expire after 1 hour (configurable)
- Only users who receive the URL can access the video
- S3 bucket remains private (no public access)

### File Lifecycle
1. **Generation**: Manim generates video locally
2. **Upload**: Video uploaded to S3 with user-specific path
3. **Cleanup**: Local video file deleted immediately
4. **Access**: Pre-signed URL returned to user
5. **Expiration**: URL expires after 1 hour

### Adjusting URL Expiration Time

In `manim_runner.py`, modify the `upload_to_s3` function:

```python
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket_name, 'Key': object_name},
    ExpiresIn=3600  # Change this value (in seconds)
)
```

Examples:
- 1 hour: `3600`
- 24 hours: `86400`
- 7 days: `604800`

## Cost Optimization

### S3 Lifecycle Rules
Set up lifecycle rules to automatically delete old videos:

1. Go to S3 Console → Your Bucket → Management → Lifecycle rules
2. Create rule: Delete objects after 30 days
3. Apply to prefix: `animations/`

### Monitoring
- Enable CloudWatch metrics for your bucket
- Set up billing alerts for unexpected costs
- Typical costs: ~$0.023/GB/month for S3 storage

## Security Best Practices

1. ✅ **Never commit AWS credentials** to version control
2. ✅ **Use IAM roles** if running on EC2/ECS instead of access keys
3. ✅ **Keep bucket private** - use pre-signed URLs only
4. ✅ **Enable S3 bucket logging** for audit trails
5. ✅ **Use bucket encryption** (S3-managed keys or KMS)

## Testing

Test your S3 setup with:

```python
# In Python console
from app.workers.manim_runner import upload_to_s3
from pathlib import Path

# Upload a test file
url = upload_to_s3(
    Path("test.txt"),
    "your-bucket-name",
    "test/test.txt"
)
print(f"Pre-signed URL: {url}")
```
