import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import Settings
from app.core.security import verify_password
from app.models.user import User

settings = Settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)

candidates = [
    "admin123", "Admin@123", "Admin123", "password", "password123", "Password@123",
    "Password123", "12345678", "123456", "secret", "hrm123", "hrm_dev_password",
    "nitin", "nitin123", "Nitin@123", "Test@123", "Employee@123", "emp123"
]

with SessionLocal() as db:
    users = db.query(User).all()
    for u in users:
        matched = []
        for c in candidates:
            try:
                if verify_password(c, u.password_hash):
                    matched.append(c)
            except Exception:
                pass
        print(f"User {u.email} ({u.id}): matched {matched}")
