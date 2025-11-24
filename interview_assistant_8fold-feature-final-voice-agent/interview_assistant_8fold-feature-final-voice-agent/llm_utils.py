import os
from langchain_google_genai import ChatGoogleGenerativeAI
from google.generativeai.types.safety_types import HarmBlockThreshold, HarmCategory
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_llm(temperature=0.7):
    """
    Returns a Gemini 2.0 instance.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("FATAL: GOOGLE_API_KEY is not set.")

    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-lite", 
        google_api_key=api_key,
        temperature=temperature,
        max_retries=5,
        request_timeout=60,
    )

def get_feedback_llm():
    """
    Specific instance for JSON feedback. 
    INCLUDES SAFETY SETTINGS TO PREVENT EMPTY RESPONSES.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    
    # Disable safety filters so it doesn't block the feedback generation
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
    
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-lite", 
        google_api_key=api_key,
        temperature=0.1,    
        max_retries=10,     
        request_timeout=90,
        safety_settings=safety_settings, # <--- ADDED THIS
        generation_config={"response_mime_type": "application/json"}
    )