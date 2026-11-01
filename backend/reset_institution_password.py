from getpass import getpass

from app.database import SessionLocal
from app.model import User
from app.auth import hash_password

db = SessionLocal()

try:
    email = "user@example.com"

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        print("Institution account not found.")
    else:
        password = getpass("Enter new institution password: ")
        confirm = getpass("Confirm new password: ")

        if password != confirm:
            print("Passwords do not match.")
        elif len(password) < 12:
            print("Password must contain at least 12 characters.")
        else:
            user.hashed_password = hash_password(password)
            db.commit()
            print("Institution password reset successfully.")

except Exception as error:
    db.rollback()
    print(f"Error: {error}")

finally:
    db.close()