import os
import sys
import traceback

# Ensure backend package is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import Settings
from app.core.security import hash_password
from app.models.user import User

def main():
    print('--- inspect_user script start ---')
    try:
        settings = Settings()
        print('Database URL:', settings.database_url)
        engine = create_engine(settings.database_url, echo=False)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        NEW_PASSWORD = "admin123"
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == "nitin@gmail.com").first()
            if user:
                print(f"User ID: {user.id}")
                print(f"Is active: {user.is_active}")
                print(f"Current password hash: {user.password_hash}")
                # Update password hash
                user.password_hash = hash_password(NEW_PASSWORD)
                db.commit()
                db.refresh(user)
                print("Password reset to known value.")
                print(f"New password hash: {user.password_hash}")
            else:
                print("User not found")
    except Exception as e:
        print('Exception occurred:')
        traceback.print_exc()
    print('--- inspect_user script end ---')

if __name__ == '__main__':
    main()
