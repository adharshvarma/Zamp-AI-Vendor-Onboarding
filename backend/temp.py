from app.core.database import SessionLocal
from app.models import User

db = SessionLocal()

# Replace with your registered email address
user = db.query(User).filter(User.email == "adharsh.vendor@zamp.com").first()

if user:
    user.role = "admin"
    db.commit()
    print(f"Success! User {user.email} is now an admin.")
else:
    print("User not found.")

db.close()