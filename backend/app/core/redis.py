import redis
import os
from dotenv import load_dotenv

load_dotenv()

try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        decode_responses=True,
        socket_connect_timeout=5
    )
    # Test connection
    redis_client.ping()
    print("✅ Redis connected successfully")
except redis.ConnectionError as e:
    print(f"❌ Redis connection failed: {e}")
    redis_client = None
