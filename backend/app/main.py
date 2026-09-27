"""Incident Commander API — application entry point.

Sets up the FastAPI app, CORS middleware, health endpoint, and registers
all routers. Business logic lives in app/services/ and app/routers/.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.incidents import router as incidents_router

app = FastAPI(
    title="Incident Commander API",
    description=(
        "Backend pipeline for incident ingestion, agent findings, "
        "document context, and independent fix validation."
    ),
    version="1.0.0",
)

# CORS: local Vite URLs are allowed by default.
# Set CORS_ORIGINS in Vercel to the frontend's URL when it is deployed.
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
     ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"], summary="Health check")
def health_check() -> dict:
    """Return a simple liveness probe."""
    return {
        "status": "healthy",
        "service": "incident-commander-api",
        "message": "FastAPI backend is running.",
    }


app.include_router(incidents_router)
