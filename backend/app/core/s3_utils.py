"""
S3 utility functions for managing video storage and access.
"""
import os
import boto3
from typing import Optional


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> Optional[str]:
    """
    Generate a pre-signed URL for an S3 object.
    
    Args:
        s3_key: The S3 object key (e.g., "animations/user123/video.mp4")
        expiration: URL expiration time in seconds (default: 3600 = 1 hour)
    
    Returns:
        Pre-signed URL string or None if generation fails
    """
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION")
        )
        
        bucket_name = os.getenv("AWS_S3_BUCKET")
        if not bucket_name:
            raise Exception("AWS_S3_BUCKET environment variable not set")
        
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': s3_key},
            ExpiresIn=expiration
        )
        
        return url
    
    except Exception as e:
        print(f"Error generating pre-signed URL: {e}")
        return None
