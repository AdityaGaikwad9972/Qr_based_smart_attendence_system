from fastapi import FastAPI
from sqlalchemy import text

from app.database.connection import engine
from app.routers.auth import router as auth_router
from app.attendance.router import router as attendance_router

app = FastAPI(
    title="QR Based Smart Attendance System",
    version="1.0.0",
)


app.include_router(auth_router)
app.include_router(attendance_router)


@app.get("/")
def root():
    return {
        "message": "Smart Attendance API is running"
    }


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception:
        return {
            "status": "unhealthy",
            "database": "disconnected",
        }
