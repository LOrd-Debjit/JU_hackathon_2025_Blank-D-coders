import requests
from helper import get_env
from logger import get_logger

logger = get_logger(__name__)

SARVAM_URL = "https://api.sarvam.ai/translate"
SARVAM_API_KEY = get_env("SARVAM_API_KEY")

HEADERS = {
    "Authorization": f"Bearer {SARVAM_API_KEY}",
    "Content-Type": "application/json"
}

def translate_text(text, src_lang, tgt_lang="en-IN"):
    """Translate text via Sarvam API."""
    payload = {
        "input": text,
        "source_language_code": src_lang,
        "target_language_code": tgt_lang,
        "mode": "formal",
        "model": "sarvam-translate:v1",
        "numerals_format": "native",
        "speaker_gender": "Male",
        "enable_preprocessing": False
    }
    try:
        res = requests.post(SARVAM_URL, headers=HEADERS, json=payload)
        return res.json().get("output", text)
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return text
