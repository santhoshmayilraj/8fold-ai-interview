from database import engine, Base
from models import User, Interview

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Tables dropped.")

print("Recreating tables...")
Base.metadata.create_all(bind=engine)
print("Tables recreated successfully.")
