from app.db.session import engine
from sqlalchemy import text
from app.core.security import verify_password, hash_password

with engine.connect() as c:
    h = c.execute(text("SELECT password_hash FROM users WHERE email='nitin@gmail.com'")).scalar()
    print("Current hash:", h)
    for pw in ["Admin@123", "password123", "123456", "admin123", "nitin@123", "nitin", "password", "hrm@123"]:
        if verify_password(pw, h):
            print(f"MATCH FOUND: '{pw}'")
            break
    else:
        print("No standard password matched. Setting password to 'password123'...")
        new_hash = hash_password("password123")
        c.execute(text("UPDATE users SET password_hash=:h WHERE email='nitin@gmail.com'"), {"h": new_hash})
        c.commit()
        print("Password updated to 'password123'")
