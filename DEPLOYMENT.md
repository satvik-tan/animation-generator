# Deployment Guide

## ✅ S3 Setup Complete

Your S3 integration is fully configured and tested with bucket: `satvik-manimation`

## 🚀 What's Ready

### Backend
- ✅ Database schema with SQLAlchemy models
- ✅ Redis job queue system
- ✅ Worker process for background job execution
- ✅ S3 integration with pre-signed URLs
- ✅ Manim animation generation pipeline
- ✅ FastAPI REST API with CORS

### Docker Setup
- ✅ Dockerfile with Manim dependencies (FFmpeg, LaTeX)
- ✅ Startup script runs both API server and worker
- ✅ Redis service configured

## 📋 Quick Start

### 1. Local Development

```bash
# Ensure .env file is configured
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Start services
docker-compose up --build

# API will be available at: http://localhost:8000
# Redis at: localhost:6379
```

### 2. Test the System

```bash
# Create a job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a circle that transforms into a square"}'

# Check job status (replace {job_id} with actual ID)
curl http://localhost:8000/jobs/{job_id}

# When completed, result_url will contain the S3 pre-signed URL
```

## 🔧 Environment Variables Required

```bash
# Database (managed Postgres)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-east-1
AWS_S3_BUCKET=satvik-manimation

# LLM
GEMINI_API_KEY=your_key

# Auth (optional for now)
CLERK_JWT_KEY=your_key

# Frontend
FRONTEND_URL=http://localhost:5173
```

## 🚢 Deploying to EC2/ECS

### Option 1: EC2 Instance

1. **Launch EC2 instance** (Ubuntu 22.04 recommended)
2. **Install Docker & Docker Compose**
3. **Create IAM role** with S3 permissions and attach to instance
4. **Clone repository** and set up `.env`
5. **Remove access keys from `.env`** (use IAM role instead)
6. **Run**: `docker-compose up -d`

### Option 2: ECS (Fargate/EC2)

1. **Push image to ECR**:
```bash
docker build -t animation-generator ./backend
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-1.amazonaws.com
docker tag animation-generator:latest {account}.dkr.ecr.us-east-1.amazonaws.com/animation-generator:latest
docker push {account}.dkr.ecr.us-east-1.amazonaws.com/animation-generator:latest
```

2. **Create ECS task definition**:
   - Container: Your ECR image
   - Environment variables from `.env`
   - Task role: IAM role with S3 permissions
   - Port mapping: 8000

3. **Create ECS service**:
   - Launch type: Fargate or EC2
   - Desired tasks: 1 (or more)
   - Load balancer: Optional (ALB for production)

4. **Set up Redis**:
   - Option A: Amazon ElastiCache
   - Option B: Redis container in ECS
   - Update `REDIS_HOST` env var

## 🔐 Security Best Practices

### For Production

1. **Use IAM Roles** (not access keys) on EC2/ECS
2. **Rotate secrets** stored in `.env`
3. **Use AWS Secrets Manager** for sensitive data
4. **Enable VPC** for database and Redis
5. **Set up CloudWatch** for logging
6. **Configure ALB** with HTTPS

### IAM Role for EC2/ECS

Create role with this policy:
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
            "Resource": "arn:aws:s3:::satvik-manimation/*"
        }
    ]
}
```

## 📊 Monitoring

- **Application logs**: `docker-compose logs -f api`
- **Worker logs**: Check worker output in container logs
- **S3 usage**: AWS Console → S3 → Metrics
- **Database**: Check connection pool and query performance

## 🐛 Troubleshooting

### Worker not processing jobs
```bash
# Check if worker is running
docker-compose exec api ps aux | grep worker

# Check Redis connection
docker-compose exec redis redis-cli ping

# Check job queue
docker-compose exec redis redis-cli llen job_queue
```

### S3 upload failures
```bash
# Test S3 connection
docker-compose exec api python -c "
import boto3, os
from dotenv import load_dotenv
load_dotenv()
s3 = boto3.client('s3')
s3.head_bucket(Bucket=os.getenv('AWS_S3_BUCKET'))
print('✅ S3 OK')
"
```

### Database connection issues
```bash
# Test database connection
docker-compose exec api python -c "
from app.db.session import engine
engine.connect()
print('✅ Database OK')
"
```

## 🎯 Next Steps

1. ✅ S3 configured and tested
2. ⏳ Connect to managed Postgres
3. ⏳ Deploy to EC2/ECS
4. ⏳ Set up IAM role (remove access keys)
5. ⏳ Frontend integration
6. ⏳ Production monitoring setup
