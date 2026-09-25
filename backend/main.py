"""Minimal Google (OAuth2 / OpenID Connect) login with FastAPI.

Flow:
1. GET /auth/google  -> redirect the browser to Google's consent screen.
2. Google redirects back to GET /auth/google/callback?code=...&state=...
3. We exchange the code for tokens, fetch the user profile, and return it.

Setup:
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
    cp .env.example .env          # then fill in your Google OAuth client
    .venv/bin/python main.py      # or: .venv/bin/uvicorn main:app --reload
    open http://localhost:8000
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlencode

try:
    import httpx
    from dotenv import load_dotenv
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import HTMLResponse, RedirectResponse
    from itsdangerous import BadSignature, URLSafeTimedSerializer
except ModuleNotFoundError as exc:  # usually the wrong Python, not a missing dep
    raise SystemExit(
        f"\nCannot import '{exc.name}' using {sys.executable}\n"
        f"This almost always means you are running the system Python instead of the\n"
        f"virtualenv. Run the app with the venv's interpreter directly:\n\n"
        f"    .venv/bin/python main.py\n\n"
        f"If that fails, install the dependencies into it:\n"
        f"    .venv/bin/pip install -r requirements.txt\n"
    ) from None

# Look for .env next to this file, not the current working directory, so the app
# boots the same way no matter which directory you run uvicorn from.
load_dotenv(Path(__file__).parent / ".env")


def require(name: str) -> str:
    """Read a required env var, failing with instructions instead of a bare KeyError."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"\n\nMissing environment variable: {name}\n"
            f"  1. cp .env.example .env\n"
            f"  2. open .env and paste your Google OAuth client id/secret into it\n"
            f"     (create one at https://console.cloud.google.com/apis/credentials)\n"
            f"  3. restart the server\n"
            f"To just browse the app without real Google creds, run:\n"
            f"  GOOGLE_CLIENT_ID=dummy GOOGLE_CLIENT_SECRET=dummy uvicorn main:app --reload\n"
        )
    return value


GOOGLE_CLIENT_ID = require("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = require("GOOGLE_CLIENT_SECRET")
# Must match exactly what you typed in the Google Cloud console.
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/google/callback")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPES = "openid email profile"

app = FastAPI(title="Google login example")
state_signer = URLSafeTimedSerializer("change-me-to-a-random-string", salt="oauth-state")
http = httpx.AsyncClient()


# ---------------------------------------------------------------- routes

@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return """
    <h1>FastAPI + Google login</h1>
    <p><a href="/auth/google">Sign in with Google</a></p>
    <p><a href="/me">Check the current session (via cookie)</a></p>
    """


@app.get("/auth/google")
async def google_login() -> RedirectResponse:
    state = state_signer.dumps("nonce")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    return RedirectResponse(f"{AUTH_URL}?{urlencode(params)}")


@app.get("/auth/google/callback")
async def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    if error:
        raise HTTPException(status_code=400, detail=f"Google returned an error: {error}")

    # Protect against CSRF: the state we sent must come back unchanged and unexpired.
    try:
        state_signer.loads(state, max_age=600)
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    token_resp = await http.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )
    token_resp.raise_for_status()
    tokens = token_resp.json()

    profile_resp = await http.get(
        USERINFO_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    profile_resp.raise_for_status()
    user = profile_resp.json()

    # In a real app: create/find the user in your DB and set a session cookie.
    response = RedirectResponse("/profile")
    response.set_cookie(
        "access_token",
        tokens["access_token"],
        httponly=True,
        samesite="lax",
        secure=False,  # set True when serving over HTTPS
    )
    return response


@app.get("/profile")
async def profile(access_token: str = "") -> dict:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not signed in")
    resp = await http.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token expired, sign in again")
    return resp.json()


if __name__ == "__main__":
    import uvicorn

    # Lets `python main.py` actually serve, instead of exiting after defining routes.
    uvicorn.run(app, host="127.0.0.1", port=8000)
