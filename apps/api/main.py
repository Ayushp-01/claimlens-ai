import os
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.routers import (
    auth,
    claims,
    patient,
    investigator,
    analytics,
    notifications,
    audit,
    documents,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Seed demo data if DEMO_MODE enabled and tables are empty
    if settings.DEMO_MODE:
        db = SessionLocal()
        try:
            from app.seeds.synthetic_data import seed_synthetic_data
            seed_synthetic_data(db)
        except Exception as e:
            print(f"Warning: Could not seed synthetic demo data on startup: {e}")
        finally:
            db.close()

    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Explainable, Audit-Ready Health Insurance Fraud Detection & Adjudication API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "https://claimlens-ai-one.vercel.app",
    "https://claimlens-ai.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(claims.router, prefix="/api")
app.include_router(patient.router, prefix="/api")
app.include_router(investigator.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(documents.router, prefix="/api")

# Include API Routers at root (handles calls without /api)
app.include_router(auth.router)
app.include_router(claims.router)
app.include_router(patient.router)
app.include_router(investigator.router)
app.include_router(analytics.router)
app.include_router(notifications.router)

# Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Request payload validation error"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )


@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check and runtime status."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
