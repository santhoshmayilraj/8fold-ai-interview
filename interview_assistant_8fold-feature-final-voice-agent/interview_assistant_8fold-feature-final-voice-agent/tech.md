# Alex AI Assistant - Intelligent Interview Practice Platform

## Overview

Alex AI Assistant is a comprehensive, AI-powered application designed to simulate professional technical interviews. By leveraging advanced Large Language Models (LLMs) and real-time voice processing, the platform provides candidates with an adaptive, realistic interview experience. The system evaluates responses in real-time, adjusts difficulty dynamically, and generates detailed feedback reports to help users improve their interview skills.

## Key Features

- **Adaptive Interview Logic**: The AI agent utilizes a graph-based state machine (LangGraph) to analyze candidate responses and adjust the interview difficulty (Easy, Medium, Hard) dynamically.
- **Voice-First Interaction**: Features a hands-free mode using browser-based Speech-to-Text and Text-to-Speech technologies, allowing for natural, conversational practice.
- **Real-Time Streaming**: Implements streaming API endpoints to ensure low-latency responses, mimicking the flow of a real conversation.
- **Automated Feedback Generation**: Produces professional PDF reports upon session completion, detailing strengths, weaknesses, and question-by-question analysis.
- **Analytics Dashboard**: Visualizes user progress, tracking metrics such as average scores, improvement rates, and session history over time.
- **Secure Authentication**: Includes a robust user management system with JWT-based registration and login functionality.

## Technology Stack

### Backend

- **Framework**: FastAPI (Python)
- **AI Orchestration**: LangChain, LangGraph
- **LLM Provider**: Google Gemini Pro
- **Database**: SQLAlchemy (SQLite/PostgreSQL)
- **PDF Generation**: FPDF2
- **Authentication**: OAuth2 with JWT (Passlib, Python-JOSE)

### Frontend

- **Framework**: React.js
- **Routing**: React Router
- **Visualization**: Recharts
- **Styling**: CSS3 with Responsive Design
- **Audio**: Web Speech API (SpeechRecognition, SpeechSynthesis)

## Installation and Setup

### Prerequisites

- Python 3.9+
- Node.js 16+
- Google Gemini API Key

### Backend Setup

1.  Navigate to the project root directory.
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure environment variables:
    Create a `.env` file and add your API keys:
    ```
    GOOGLE_API_KEY=your_api_key_here
    SECRET_KEY=your_secret_key_here
    DATABASE_URL=sqlite:///./test.db
    ```
5.  Start the backend server:
    ```bash
    uvicorn main:app --reload
    ```

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install Node dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```

## Usage Guide

1.  **Registration**: Create a new account using the secure signup form.
2.  **Dashboard**: View your historical performance and analytics upon logging in.
3.  **New Session**: Click "Start New Practice Session". Upload your resume (PDF) and paste the job description you wish to practice for.
4.  **Interview Mode**: Choose between "Chat Mode" (text-based) or "Voice Mode" (hands-free).
5.  **Interaction**: Answer the AI's questions. In Voice Mode, the system automatically detects silence to detect the end of your turn.
6.  **Feedback**: End the session to download a comprehensive PDF report of your performance.

## Project Structure

- `main.py`: Entry point for the FastAPI backend application.
- `interview_agent.py`: Core logic for the AI interviewer using LangGraph.
- `pdf_generator.py`: Utility for generating feedback PDFs.
- `models.py`: Database schema definitions.
- `auth.py`: Authentication utilities.
- `frontend/`: React application source code.
  - `src/InterviewPage.js`: Main interview interface logic.
  - `src/DashboardPage.js`: User analytics dashboard.
  - `src/LoginPage.js`: Authentication interface.
