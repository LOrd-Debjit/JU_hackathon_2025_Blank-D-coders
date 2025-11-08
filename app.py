import os
import requests
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain

# ---------------------- Optional maps blueprint ---------------------- #
try:
    from src.maps_api import maps_bp
except Exception:
    maps_bp = None

# ---------------------- Setup ---------------------- #
load_dotenv()
app = Flask(__name__)
CORS(app)

if maps_bp:
    app.register_blueprint(maps_bp)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ✅ Sarvam header format
SARVAM_HEADERS = {
    "api-subscription-key": SARVAM_API_KEY,
    "Content-Type": "application/json",
}

LANGUAGE_CODES = {
    "English": "en-IN",
    "Bengali": "bn-IN",
    "Hindi": "hi-IN",
    "Tamil": "ta-IN",
    "Telugu": "te-IN",
    "Malayalam": "ml-IN",
    "Marathi": "mr-IN",
    "Gujarati": "gu-IN",
    "Kannada": "kn-IN",
    "Punjabi": "pa-IN",
}

USE_COMBINED_STT_TRANSLATE = True  # unified STT+Translate

# ---------------------- Translation ---------------------- #
def translate_text(text, source_lang="auto", target_lang="en-IN"):
    """Auto-detect + safe translation with truncation and fallback."""
    try:
        text = (text or "").strip()
        if not text:
            return text, "en-IN"

        if source_lang == "auto":
            detect_payload = {"input": text[:800]}
            detect_res = requests.post(
                "https://api.sarvam.ai/detect-language",
                headers=SARVAM_HEADERS,
                json=detect_payload,
                timeout=10,
            )
            if detect_res.status_code == 200:
                detected = detect_res.json()
                source_lang = detected.get("language_code", "en-IN")
                print(f"🌐 Detected language: {source_lang}")
            else:
                print("⚠️ Language detection failed. Defaulting to en-IN.")
                source_lang = "en-IN"

        if source_lang == target_lang:
            return text, source_lang

        if len(text) > 2000:
            print(f"⚠️ Text too long ({len(text)} chars). Truncating to 2000.")
            text = text[:2000]

        payload = {
            "input": text,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "mode": "formal",
            "model": "sarvam-translate:v1",
            "numerals_format": "native",
            "enable_preprocessing": False,
        }

        res = requests.post(
            "https://api.sarvam.ai/translate",
            headers=SARVAM_HEADERS,
            json=payload,
            timeout=15,
        )
        if res.status_code != 200:
            print("❌ Translation API error:", res.text)
            return text, source_lang

        out = res.json()
        return out.get("output", text), source_lang

    except Exception as e:
        print("Translation Error:", e)
        return text, "en-IN"


# ---------------------- TTS / STT ---------------------- #
def text_to_speech(text, target_lang="en-IN", speaker="anushka"):
    """
    Text → speech via Sarvam TTS.
    Returns (BytesIO, mimetype) or (None, None) on failure.
    """
    try:
        payload = {
            "text": text,
            "target_language_code": target_lang,
            "speaker": speaker,
            "pitch": 0,
            "pace": 1,
            "loudness": 1,
            "speech_sample_rate": 22050,
            "enable_preprocessing": True,
            "model": "bulbul:v2",
            # Prefer MP3 for broad browser support
            "format": "mp3",
            "audio_format": "mp3",
        }
        res = requests.post(
            "https://api.sarvam.ai/text-to-speech",
            headers=SARVAM_HEADERS,
            json=payload,
            timeout=30,
        )
        if res.status_code != 200 or not res.content:
            print("❌ TTS API error:", res.status_code, res.text[:200])
            return None, None

        mime = (res.headers.get("Content-Type") or "").lower()
        if not mime or "octet-stream" in mime:
            mime = "audio/mpeg"     # Sarvam often returns raw MP3 bytes
        if "audio/wave" in mime:
            mime = "audio/wav"

        b = BytesIO(res.content)
        b.seek(0)
        return b, mime
    except Exception as e:
        print("TTS Error:", e)
        return None, None


def speech_to_text_translate(file_storage, content_type="audio/webm"):
    """Unified Speech-to-Text + Translate (Sarvam) directly from uploaded FileStorage."""
    try:
        headers = {"api-subscription-key": SARVAM_API_KEY}
        # Read bytes now so requests can stream them safely
        raw = file_storage.read()
        files = {"file": (file_storage.filename or "mic_input.webm", BytesIO(raw), content_type)}
        data = {"model": "saaras:v2.5"}
        res = requests.post(
            "https://api.sarvam.ai/speech-to-text-translate",
            headers=headers,
            files=files,
            data=data,
            timeout=60,
        )
        if res.status_code != 200:
            print("❌ STT-Translate error:", res.status_code, res.text[:200])
            return "", "en-IN"
        out = res.json()
        return out.get("transcript", ""), out.get("language_code", "en-IN")
    except Exception as e:
        print("STT-Translate Error:", e)
        return "", "en-IN"


# ---------------------- Gemini ---------------------- #
def get_llm():
    try:
        print("🔹 Using Gemini 2.5 Flash...")
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.5,
            google_api_key=GEMINI_API_KEY,
        )
    except Exception as e:
        print("⚠️ Falling back to Gemini Pro:", e)
        return ChatGoogleGenerativeAI(
            model="gemini-pro", temperature=0.5, google_api_key=GEMINI_API_KEY
        )

system_prompt = (
    "You are BabuMoshai, a warm, friendly, and street-smart tourism guide from Kolkata. "
    "Speak politely and naturally, the way a real local guide would. "
    "By default, keep your answers short, simple, and helpful (3–6 sentences max). "
    "Only give long or detailed explanations if the user specifically asks for more detail, history, full guide, itinerary, or comparison.\n\n"
    "When responding:\n"
    "- Keep the tone conversational, humble, and friendly.\n"
    "- Explain things in easy everyday language.\n"
    "- Avoid emojis and avoid *, ** or Markdown formatting unless necessary.\n"
    "- Do not use exaggerated poetic descriptions.\n\n"
    "If the user asks to compare two places, provide a short, clear, structured comparison with:\n"
    "1) Quick Overview\n"
    "2) Experience or What You See There\n"
    "3) Best Time to Visit\n"
    "4) Cost (if any)\n"
    "5) Who will enjoy it more\n"
    "End the comparison with a simple, helpful recommendation.\n\n"
    "Your goal is to make the visitor feel comfortable and guided — like you're walking with them through Kolkata."
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}")
])

llm = get_llm()
tourism_chain = LLMChain(llm=llm, prompt=prompt)

# ---------------------- Compare Helpers ---------------------- #
def is_compare_query(text: str) -> bool:
    t = (text or "").lower()
    return ("compare " in t) or (" vs " in t) or (" versus " in t)

def enrich_compare_prompt(text: str) -> str:
    return (
        text.strip()
        + "\n\nPlease provide a structured, side-by-side comparison table (if possible),"
          " followed by a concise recommendation tailored to different traveler preferences"
          " (e.g., history lovers, families, quick photo stop, evening walk)."
    )

def geocode_place(user_text: str):
    try:
        if not maps_bp:
            return None
        geo_url = url_for("maps_api.geocode", _external=True)
        r = requests.get(geo_url, params={"q": user_text}, timeout=8)
        if r.status_code == 200:
            j = r.json()
            return {"label": j.get("label"), "lat": j.get("lat"), "lon": j.get("lon")}
    except Exception as e:
        print("🌐 Geocode error/skip:", e)
    return None

# ---------------------- Routes ---------------------- #
@app.route("/")
def index():
    return render_template("index.html", languages=LANGUAGE_CODES.keys())

app.add_url_rule("/", endpoint="home", view_func=index)

@app.route("/plan")
def plan():
    return render_template("plan.html", languages=LANGUAGE_CODES.keys())

@app.route("/compare")
def compare_redirect():
    a = (request.args.get("a") or "").strip()
    b = (request.args.get("b") or "").strip()
    if not a or not b:
        return redirect(url_for("plan"))
    q = f"Compare {a} and {b}"
    return redirect(url_for("chat_page", q=q))

@app.route("/destinations")
def destinations():
    return render_template("destinations.html")

@app.route("/chat", methods=["GET"])
def chat_page():
    return render_template("chat.html", languages=LANGUAGE_CODES.keys())

app.add_url_rule("/chat", endpoint="chat", view_func=chat_page)

@app.route("/chat", methods=["POST"])
def chat_api():
    data = request.get_json() or {}
    user_message = data.get("message", "")
    user_lang = data.get("language", "English")
    src_code = LANGUAGE_CODES.get(user_lang, "en-IN")

    translated_input, detected_lang = translate_text(user_message, src_code, "en-IN")

    if is_compare_query(translated_input):
        translated_input = enrich_compare_prompt(translated_input)

    map_data = geocode_place(user_message)

    try:
        response = tourism_chain.invoke({"input": translated_input, "context": ""})
        llm_response = response.get("text", "") if isinstance(response, dict) else str(response)
    except Exception as e:
        print("🚨 Gemini Error:", e)
        llm_response = "I'm having trouble connecting to Gemini right now."

    translated_output, _ = translate_text(llm_response, "en-IN", src_code)

    return jsonify({
        "response": translated_output,
        "detected_language": detected_lang,
        "map_data": map_data
    })

@app.route("/speech", methods=["POST"])
def speech():
    """Mic → STT+Translate → Gemini → Translate back → TTS (with proper MIME)"""
    print("🎙️ Mic input received")
    audio_data = request.files.get("audio")
    lang_label = request.form.get("language", "English")

    if not audio_data:
        return jsonify({"error": "No audio file received"}), 400

    ui_lang_code = LANGUAGE_CODES.get(lang_label, "en-IN")
    content_type = getattr(audio_data, "mimetype", None) or "audio/webm"

    # STT + translate
    transcript, detected_lang = speech_to_text_translate(audio_data, content_type)

    # LLM (enrich if compare)
    try:
        prompt_in = enrich_compare_prompt(transcript) if is_compare_query(transcript) else transcript
        response = tourism_chain.invoke({"input": prompt_in, "context": ""})
        llm_response = response.get("text", "") if isinstance(response, dict) else str(response)
    except Exception as e:
        print("🚨 Gemini Error:", e)
        llm_response = "I'm having trouble connecting to Gemini right now."

    # Translate to detected speech language
    final_text, _ = translate_text(llm_response, "en-IN", detected_lang)

    # TTS with correct MIME
    tts_audio, tts_mime = text_to_speech(final_text, target_lang=detected_lang)
    if tts_audio:
        try:
            tts_audio.seek(0)
        except Exception:
            pass

        resp = send_file(
            tts_audio,
            mimetype=tts_mime or "audio/mpeg",
            as_attachment=False,
            download_name="reply." + ("mp3" if (tts_mime or "").endswith("mpeg") else "wav"),
            max_age=0,
            conditional=False,
            etag=False,
        )
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Detected-Language"] = detected_lang
        return resp

    # Fallback to text if TTS fails
    return jsonify({"response": final_text, "detected_language": detected_lang})

# ---------------------- Run ---------------------- #
if __name__ == "__main__":
    print("🚀 BabuMoshai(Kolkata Tourism) running with Compare+Maps…")
    print(f"🔑 Sarvam Key Loaded: {str(SARVAM_API_KEY)[:6]}****" if SARVAM_API_KEY else "🔑 Sarvam Key Missing!")
    app.run(debug=True)
