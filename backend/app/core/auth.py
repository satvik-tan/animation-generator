from fastapi import Depends, HTTPException, Request

def verify_clerk_jwt(request: Request):
    # TEMP: replace later with real Clerk verification
    user_id = request.headers.get("x-user-id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return user_id
