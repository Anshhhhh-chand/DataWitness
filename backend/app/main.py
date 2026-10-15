"""FastAPI application entrypoint."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.demo import router as demo_router
from app.api.health import router as health_router
from app.api.investigations import router as investigations_router
from app.api.reports import router as reports_router
from app.api.uploads import router as uploads_router
from app.config import get_settings


def create_app() -> FastAPI:
    get_settings()
    app = FastAPI(title="DataWitness", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(uploads_router, prefix="/api")
    app.include_router(investigations_router, prefix="/api")
    app.include_router(reports_router, prefix="/api")
    app.include_router(demo_router, prefix="/api")

    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
    return app


app = create_app()
