import os
import sys
import traceback

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.core.config import Settings
from app.core.security import verify_password
from app.models.user import User
from app.models.role import Role
from app.models.employee import Employee
from app.models.organization import Organization

def main():
    settings = Settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        users = db.query(User).all()
        print(f"Total users in DB: {len(users)}")
        for u in users:
            role = db.query(Role).filter(Role.id == u.role_id).first()
            emp = db.query(Employee).filter(Employee.user_id == u.id).first()
            org = db.query(Organization).filter(Organization.id == u.organization_id).first()
            print(f"User: id={u.id}, email={u.email}, is_active={u.is_active}, role={role.name if role else 'None'}, org={org.name if org else 'None'}, emp_code={emp.employee_code if emp else 'None'}")
            print(f"  Password hash: {u.password_hash}")

if __name__ == '__main__':
    main()
