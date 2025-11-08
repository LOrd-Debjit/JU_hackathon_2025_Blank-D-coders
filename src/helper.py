import os
import requests
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_google_genai import ChatGoogleGenerativeAI
from logger import get_logger

load_dotenv()
logger = get_logger(__name__)

def get_env(key: str, default: str = None):
    """Load environment variable with fallback."""
    value = os.getenv(key, default)
    if not value:
        logger.warning(f"⚠️ Environment variable '{key}' not found.")
    return value

def get_gemini_llm():
    """Return initialized Gemini LLM."""
    api_key = get_env("GEMINI_API_KEY")
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5, google_api_key=api_key)

def get_pinecone_index(index_name: str):
    """Return Pinecone index object."""
    api_key = get_env("PINECONE_API_KEY")
    pc = Pinecone(api_key=api_key)
    return pc.Index(index_name)

def http_post(url, headers, payload):
    """Generic POST helper."""
    try:
        res = requests.post(url, headers=headers, json=payload)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        logger.error(f"POST request failed: {e}")
        return {}
