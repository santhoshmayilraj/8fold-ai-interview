from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # Relationship
    interviews = relationship("Interview", back_populates="owner")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    job_description = Column(Text)
    transcript = Column(Text)       # Full conversation text
    feedback_json = Column(JSON)    # The structured analysis
    status = Column(String, default="IN_PROGRESS") # Added status
    overall_score = Column(Integer, nullable=True) # Added overall_score
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="interviews")
