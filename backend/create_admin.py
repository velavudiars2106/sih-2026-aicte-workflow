from getpass import getpass

from app.database import Base, engine, SessionLocal
from app import model
from app.auth import hash_password


Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    print("Create AICTE Official Account")

    full_name = input("Official name: ").strip()
    email = input("Official email: ").strip().lower()

    password = getpass("Password (minimum 12 characters): ")
    confirm_password = getpass("Confirm password: ")

    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters.")

    if password != confirm_password:
        raise ValueError("Passwords do not match.")

    existing = db.query(model.User).filter(
        model.User.email == email
    ).first()

    if existing:
        raise ValueError("An account with this email already exists.")

    official = model.User(
        full_name=full_name,
        email=email,
        hashed_password=hash_password(password),
        role="official",
        institution_name=None,
        is_active=True,
        is_verified=True,
    )

    db.add(official)
    db.commit()

    print("\nAICTE official account created successfully.")

except Exception as error:
    db.rollback()
    print(f"\nError: {error}")

finally:
    db.close()