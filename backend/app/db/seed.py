from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.role import Role


DEFAULT_ROLES = [
    {
        "name": "SUPER_ADMIN",
        "description": "System-wide administrator",
    },
    {
        "name": "ORG_ADMIN",
        "description": "Organization administrator",
    },
    {
        "name": "HR",
        "description": "Human resources administrator",
    },
    {
        "name": "MANAGER",
        "description": "Department or team manager",
    },
    {
        "name": "EMPLOYEE",
        "description": "Regular employee",
    },
]


def seed_roles():
    db = SessionLocal()

    try:
        for role_data in DEFAULT_ROLES:
            existing_role = db.scalar(
                select(Role).where(
                    Role.name == role_data["name"]
                )
            )

            if not existing_role:
                db.add(Role(**role_data))

        db.commit()

        print("Default roles seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()