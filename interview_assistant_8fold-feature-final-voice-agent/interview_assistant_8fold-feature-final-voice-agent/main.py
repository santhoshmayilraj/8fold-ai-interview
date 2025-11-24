from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, status
from pydantic import BaseModel
from dotenv import load_dotenv
from interview_agent import InterviewAgent
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import io
from pypdf import PdfReader
import uuid
import logging
from sqlalchemy.orm import Session
from typing import Optional
import json

# --- New Imports for Auth & DB ---
from database import engine, get_db, Base
from models import User, Interview
from auth import get_password_hash, verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

# Load environment variables
load_dotenv()

# Initialize Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Create Tables on Startup ---
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Agent Instance ---
agent = InterviewAgent()

# --- Pydantic Models ---
class UserResponse(BaseModel):
    session_id: str
    response: str

class EndInterviewRequest(BaseModel):
    session_id: str

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# --- AUTH ENDPOINTS ---

@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-login after register
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- INTERVIEW ENDPOINTS ---

@app.post("/start_interview")
async def start_interview(
    job_description: str = Form(...), 
    resume: UploadFile = File(...),
    current_user: User = Depends(get_current_user), # <--- PROTECTED
    db: Session = Depends(get_db)
):
    session_id = str(uuid.uuid4())
    
    # 1. Parse Resume PDF
    try:
        resume_content = await resume.read()
        pdf_stream = io.BytesIO(resume_content)
        reader = PdfReader(pdf_stream)
        resume_text = ""
        for page in reader.pages:
            resume_text += page.extract_text() or ""
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid PDF: {str(e)}")

    # 2. Start Agent
    try:
        welcome_message = agent.start_interview(job_description, resume_text, session_id)
        
        # 3. Create Interview Record in DB
        new_interview = Interview(
            id=session_id,
            user_id=current_user.id,
            job_description=job_description,
            status="IN_PROGRESS",
            feedback_json={} # Empty initially
        )
        db.add(new_interview)
        db.commit()
        
        return {
            "session_id": session_id,
            "message": welcome_message
        }
    except Exception as e:
        logger.error(f"Error starting interview: {e}")
        raise HTTPException(status_code=500, detail="Failed to start interview agent.")

@app.post("/interview")
def interview(payload: UserResponse):
    """Standard non-streaming interaction."""
    try:
        ai_message = agent.interact(payload.response, payload.session_id)
        return {"message": ai_message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stream_interview")
async def stream_interview(payload: UserResponse):
    """Streaming interaction for real-time text effect."""
    async def text_stream():
        async for chunk in agent.stream_interact(payload.response, payload.session_id):
            if chunk:
                yield chunk

    return StreamingResponse(text_stream(), media_type="text/plain")

@app.post("/end_interview")
def end_interview(payload: EndInterviewRequest, db: Session = Depends(get_db)):
    try:
        # Agent returns path to PDF and the raw JSON data
        pdf_path, feedback_data = agent.end_interview(payload.session_id)
        
        # Update DB with results
        interview_record = db.query(Interview).filter(Interview.id == payload.session_id).first()
        if interview_record:
            interview_record.status = "COMPLETED"
            # Ensure feedback_data is a dict before saving
            if isinstance(feedback_data, str):
                try:
                    feedback_data = json.loads(feedback_data)
                except:
                    feedback_data = {"raw": feedback_data}
            
            interview_record.feedback_json = feedback_data
            db.commit()
        
        if pdf_path:
            return FileResponse(
                path=pdf_path, 
                media_type='application/pdf', 
                filename=f"feedback_report_{payload.session_id}.pdf"
            )
        else:
            return JSONResponse(content={"feedback": feedback_data, "warning": "PDF generation failed"})
            
    except Exception as e:
        logger.error(f"End Interview Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics")
def get_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Aggregates interview data for the dashboard.
    """
    interviews = db.query(Interview).filter(Interview.user_id == current_user.id).all()
    
    history = []
    total_score = 0
    count = 0
    
    for i in interviews:
        if i.feedback_json:
            data = i.feedback_json
            score = 0
            # Try to extract score from nested JSON structure
            if isinstance(data, dict):
                summary = data.get("overall_summary", {})
                if isinstance(summary, dict):
                    # Try soft_skill_score or hard_skill_score
                    s_score = summary.get("soft_skill_score", 0)
                    try:
                        score = int(str(s_score).split('/')[0])
                    except:
                        score = 0
            
            history.append({
                "date": i.created_at.strftime("%b %d"),
                "score": score,
                "role": "Interview Session"
            })
            total_score += score
            count += 1
            
    return {
        "history": history,
        "average_score": round(total_score / count, 1) if count > 0 else 0,
        "total_sessions": count
    }

@app.post("/reset")
def reset():
    return {"message": "Session reset."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)