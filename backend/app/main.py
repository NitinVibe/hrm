from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from sqlalchemy import text

from app.db.session import engine
from app.core.redis import get_redis
from app.api.v1.auth import router as auth_router
from app.api.v1.departments import router as departments_router
from app.api.v1.designations import router as designations_router

from app.api.v1.employees import router as employees_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.leaves import router as leaves_router
from app.api.v1.shifts import router as shifts_router



app = FastAPI(
    title="HRM System API",
    description="Human Resource Management System API",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def root():
    return {
        "message": "HRM System API is running",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        value = result.scalar()

    return {
        "database": "connected",
        "test": value,
    }
@app.get("/health/redis")
def redis_health():
    client = get_redis()

    client.set("hrm_test", "working")

    value = client.get("hrm_test")

    return {
        "redis": "connected",
        "test": value,
    }

app.include_router(
    auth_router,
    prefix="/api/v1",
)
app.include_router(
    employees_router,
    prefix="/api/v1",
)
app.include_router(departments_router, prefix="/api/v1")
app.include_router(designations_router, prefix="/api/v1")
app.include_router(attendance_router,prefix="/api/v1",)
app.include_router(leaves_router,prefix="/api/v1",)
app.include_router(shifts_router,prefix="/api/v1",)