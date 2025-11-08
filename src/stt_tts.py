import requests
from io import BytesIO
from helper import get_env
from logger import get_logger

logger = get_logger(__name__)

SARVAM_KEY = get_env("SARVAM_API_KEY")
HEADERS = {"Authorization": f"Bearer {SARVAM_KEY}"}

def text_to_speech(text, lang="en-IN", speaker="anushka"):
    payload = {
        "text": text,
        "target_language_code": lang,
        "speaker": speaker,
        "model": "bulbul:v2",
        "pitch": 0,
        "pace": 1,
        "loudness": 1,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True
    }
    try:
        res = requests.post("https://api.sarvam.ai/text-to-speech", headers={**HEADERS, "Content-Type": "application/json"}, json=payload)
        return BytesIO(res.content)
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        return None

def speech_to_text(audio_file, lang="en-IN"):
    files = {"file": (audio_file.filename, audio_file.stream, "audio/wav")}
    data = {"language_code": lang, "model": "saarika:v2.5"}
    try:
        res = requests.post("https://api.sarvam.ai/speech-to-text", headers=HEADERS, files=files, data=data)
        return res.json().get("text", "")
    except Exception as e:
        logger.error(f"STT Error: {e}")
        return ""

def speech_to_text_translate(audio_file):
    files = {"file": (audio_file.filename, audio_file.stream, "audio/wav")}
    data = {"model": "saaras:v2.5"}
    try:
        res = requests.post("https://api.sarvam.ai/speech-to-text-translate", headers=HEADERS, files=files, data=data)
        out = res.json()
        return out.get("transcript", ""), out.get("language_code", "en-IN")
    except Exception as e:
        logger.error(f"STT-Translate Error: {e}")
        return "", "en-IN"
