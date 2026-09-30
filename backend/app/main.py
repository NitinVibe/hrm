from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from sqlalchemy import text

from app.db.session import engine
from app.core.redis import get_redis

# Core routers
from app.api.v1.auth import router as auth_router
from app.api.v1.employees import router as employees_router
from app.api.v1.departments import router as departments_router
from app.api.v1.designations import router as designations_router
from app.api.v1.shifts import router as shifts_router
from app.api.v1.branches import router as branches_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.leaves import router as leaves_router
from app.api.v1.leave_types import router as leave_types_router
from app.api.v1.holidays import router as holidays_router

# Enterprise modules
from app.api.v1.payroll import router as payroll_router
from app.api.v1.performance import router as performance_router
from app.api.v1.recruitment import router as recruitment_router
from app.api.v1.documents import router as documents_router
from app.api.v1.announcements import router as announcements_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.search import router as search_router

app = FastAPI(
    title="HRM Enterprise SaaS API",
    description="Full-featured Enterprise Human Resource Management API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "HRM Enterprise System API is running",
        "version": "2.0.0",
        "status": "operational",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        value = result.scalar()
    return {"database": "connected", "test": value}

@app.get("/health/redis")
def redis_health():
    client = get_redis()
    client.set("hrm_test", "working")
    value = client.get("hrm_test")
    return {"redis": "connected", "test": value}

# Register all API v1 routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(employees_router, prefix="/api/v1")
app.include_router(departments_router, prefix="/api/v1")
app.include_router(designations_router, prefix="/api/v1")
app.include_router(shifts_router, prefix="/api/v1")
app.include_router(branches_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(leaves_router, prefix="/api/v1")
app.include_router(leave_types_router, prefix="/api/v1")
app.include_router(holidays_router, prefix="/api/v1")
app.include_router(payroll_router, prefix="/api/v1")
app.include_router(performance_router, prefix="/api/v1")
app.include_router(recruitment_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(announcements_router, prefix="/api/v1")
app.include_router(audit_logs_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")