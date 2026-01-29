from fastapi import Depends, HTTPException, Request
import os

def verify_clerk_jwt(request: Request):
    """
    Verify Clerk JWT token.
    For development: Use x-user-id header as a simple bypass.
    For production: Implement proper Clerk JWT verification.
    """
    # Development bypass: Check if we're in dev mode
    if os.getenv("DEV_MODE", "false").lower() == "true":
        # In dev mode, accept x-user-id header or default to test user
        user_id = request.headers.get("x-user-id", "dev-user-123")
        return user_id
    
    # Production: Require x-user-id header (replace with real Clerk JWT later)
    user_id = request.headers.get("x-user-id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized - Missing x-user-id header")

    return user_id
