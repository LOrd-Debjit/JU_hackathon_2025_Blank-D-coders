/* =========================
   Kolkata Tourism — Chat UI
   (dark purple + amber theme)
   ========================= */

// DOM refs
const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chatbox");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const langSelect = document.getElementById("language");

// Palette (tuned to the screenshot)
const PALETTE = {
  bg: "#0f0b2a",
  bgSoft: "#1a153d",
  bubbleBot: "rgba(255,255,255,0.08)",
  bubbleUser: "rgba(255,123,0,0.18)",
  text: "#EEE7FF",
  textDim: "#C9C2E8",
  accent: "#FF8A00",
  accentHover: "#ff9f2e",
  border: "rgba(255,255,255,0.12)",
  chip: "transparent",
  chipBorder: "#FF8A00",
  chipText: "#FF8A00",
};

// Language map (unchanged)
const LANGUAGE_CODES = {
  English: "en-IN",
  Bengali: "bn-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Malayalam: "ml-IN",
  Marathi: "mr-IN",
  Gujarati: "gu-IN",
  Kannada: "kn-IN",
  Punjabi: "pa-IN",
};

// Voice state
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let currentStream = null;

/* -----------------------------------
   Inject CSS styles for the new theme
   ----------------------------------- */
(function injectTheme() {
  const css = `
  /* Page & layout */
  .chat-body {
    background: ${PALETTE.bg};
    color: ${PALETTE.text};
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
  }
  .container {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 0;
    min-height: 100vh;
  }
  @media (max-width: 900px){
    .container { grid-template-columns: 1fr; }
    .sidebar { display: none; }
  }

  .sidebar {
    background: ${PALETTE.bgSoft};
    border-right: 1px solid ${PALETTE.border};
    padding: 20px;
  }
  .sidebar h2, .sidebar h3 { color: ${PALETTE.text}; margin: 0 0 8px; }
  .sidebar p { color: ${PALETTE.textDim}; line-height: 1.5; }
  .sidebar select {
    width: 100%;
    background: ${PALETTE.bg};
    color: ${PALETTE.text};
    border: 1px solid ${PALETTE.border};
    border-radius: 10px;
    padding: 10px 12px;
    outline: none;
  }
  .sidebar hr { border: none; border-top: 1px solid ${PALETTE.border}; margin: 14px 0; }

  .chatbox {
    position: relative;
    background: ${PALETTE.bg};
    display: grid;
    grid-template-rows: 1fr auto;
    overflow: hidden;
  }

  #chat-container {
    padding: 20px 16px 10px;
    overflow-y: auto;
  }

  /* Message rows */
  .msg-row { display: flex; margin: 14px 0; }
  .msg-row.user { justify-content: flex-end; }
  .msg-row.bot { justify-content: flex-start; }

  /* Sender label (like "AI Guide" / "You") */
  .sender {
    font-size: 14px;
    color: ${PALETTE.chipText};
    margin: 6px 0 6px 4px;
  }
  .msg-row.user .sender { text-align: right; margin-right: 4px; }

  /* Bubbles */
  .bubble {
    max-width: min(760px, 86%);
    padding: 16px 18px;
    border-radius: 18px;
    line-height: 1.6;
    font-size: 18px;
    letter-spacing: 0.2px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    border: 1px solid ${PALETTE.border};
  }
  .bot .bubble { background: ${PALETTE.bubbleBot}; color: ${PALETTE.text}; }
  .user .bubble { background: ${PALETTE.bubbleUser}; color: ${PALETTE.text}; }

  /* Input area */
  .input-area {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: center;
    padding: 12px;
    background: ${PALETTE.bgSoft};
    border-top: 1px solid ${PALETTE.border};
  }
  #user-input {
    background: #28224e;
    color: ${PALETTE.text};
    border: 1px solid ${PALETTE.border};
    border-radius: 14px;
    padding: 14px 16px;
    outline: none;
    font-size: 16px;
  }
  #user-input::placeholder { color: ${PALETTE.textDim}; }

  /* Icon buttons */
  .icon-btn {
    width: 52px; height: 52px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 16px;
    background: ${PALETTE.accent};
    border: none; cursor: pointer;
    transition: transform .08s ease, filter .12s ease, background .15s ease;
  }
  .icon-btn:hover { background: ${PALETTE.accentHover}; filter: brightness(1.03); }
  .icon-btn:active { transform: scale(.97); }
  .icon-btn svg { width: 28px; height: 28px; fill: #111; }

  .icon-btn.secondary {
    background: transparent; border: 1.5px solid ${PALETTE.accent};
  }
  .icon-btn.secondary svg { fill: ${PALETTE.accent}; }

  .icon-btn.recording {
    background: #ff3b30;
    border: 1.5px solid #ff6b63;
  }

  /* Map preview */
  .map-container { margin-top: 10px; }
  .map-thumb { width: 100%; height: auto; border: 1px solid ${PALETTE.border}; }

  /* Legacy compatibility for existing classes (no functional change) */
  .chat-message { color: ${PALETTE.text}; }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);
})();

/* ------------------------
   SVG icons (plane & mic)
   ------------------------ */
const planeSVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M2 21l21-9L2 3l5 8-5 10zm7-4.5l9.5-4.5L9 9.5l2 3.5-2 3.5z"/>
</svg>`;

const micSVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.92V22h2v-2.08A8.001 8.001 0 0020 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 007 7.92z"/>
</svg>`;

const stopSVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 6h12v12H6z"/>
</svg>`;

/* -------------------------------
   Helper: sanitize model markdown
   ------------------------------- */
function cleanText(text = "") {
  return (text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__|_/g, "")
    .replace(/`/g, "")
    .trim();
}

/* ------------------------------------
   Render a message as a styled bubble
   ------------------------------------ */
function appendMessage(sender, text, mapData = null) {
  const row = document.createElement("div");
  row.className = `msg-row ${sender === "user" ? "user" : "bot"}`;

  // Sender label (optional, small)
  const label = document.createElement("div");
  label.className = "sender";
  label.textContent = sender === "user" ? "You" : "AI Guide";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender === "user" ? "user" : "bot"}`;
  bubble.textContent = cleanText(text);

  // 🗺 Map preview (same as your original, kept intact)
  if (mapData && mapData.lat && mapData.lon) {
    const mapContainer = document.createElement("div");
    mapContainer.className = "map-container";

    const mapThumb = document.createElement("img");
    mapThumb.className = "map-thumb";
    mapThumb.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${mapData.lat},${mapData.lon}&zoom=15&size=600x300&markers=${mapData.lat},${mapData.lon},red-pushpin`;
    mapThumb.alt = mapData.label || "Location map";
    mapThumb.style.borderRadius = "10px";
    mapThumb.style.cursor = "pointer";

    const mapLabel = document.createElement("p");
    mapLabel.textContent = `📍 ${mapData.label || "View on map"}`;
    mapLabel.style.fontSize = "0.9rem";
    mapLabel.style.color = "#cfc9ec";
    mapLabel.style.margin = "6px 2px";

    const mapEmbed = document.createElement("iframe");
    mapEmbed.src = `https://www.openstreetmap.org/export/embed.html?bbox=${mapData.lon - 0.005},${mapData.lat - 0.005},${mapData.lon + 0.005},${mapData.lat + 0.005}&layer=mapnik&marker=${mapData.lat},${mapData.lon}`;
    mapEmbed.width = "100%";
    mapEmbed.height = "300";
    mapEmbed.style.border = "none";
    mapEmbed.style.display = "none";
    mapEmbed.style.borderRadius = "10px";

    mapThumb.addEventListener("click", () => {
      mapEmbed.style.display = mapEmbed.style.display === "none" ? "block" : "none";
    });

    mapContainer.appendChild(mapThumb);
    mapContainer.appendChild(mapLabel);
    mapContainer.appendChild(mapEmbed);
    bubble.appendChild(mapContainer);
  }

  // assemble
  row.appendChild(bubble);

  // Insert label above bot message (to match screenshot vibe)
  if (sender === "bot") {
    chatContainer.appendChild(label);
    label.style.marginLeft = "6px";
  } else {
    const youLabel = label.cloneNode(true);
    chatContainer.appendChild(youLabel);
    youLabel.style.textAlign = "right";
    youLabel.style.marginRight = "6px";
  }

  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------
   Text chat function
   ------------------- */
async function sendText(message) {
  appendMessage("user", message);

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      language: langSelect.value,
    }),
  });

  const data = await res.json();
  if (data.detected_language) {
    const newLang = Object.keys(LANGUAGE_CODES).find(
      (k) => LANGUAGE_CODES[k] === data.detected_language
    );
    if (newLang) langSelect.value = newLang;
  }

  appendMessage("bot", data.response, data.map_data);
}

/* -------------------------
   Input & button behaviors
   ------------------------- */
function setupButtons() {
  // Replace text buttons with icons + styles
  if (sendBtn) {
    sendBtn.classList.add("icon-btn");
    sendBtn.innerHTML = planeSVG;
    sendBtn.setAttribute("title", "Send");
    sendBtn.setAttribute("aria-label", "Send");
  }
  if (micBtn) {
    micBtn.classList.add("icon-btn", "secondary");
    micBtn.innerHTML = micSVG;
    micBtn.setAttribute("title", "Speak");
    micBtn.setAttribute("aria-label", "Speak");
  }

  // Send click
  sendBtn?.addEventListener("click", async () => {
    const message = (userInput.value || "").trim();
    if (!message) return;
    userInput.value = "";
    await sendText(message);
  });

  // Enter to send
  userInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}

/* --------------------------
   Prefill via ?q= parameter
   -------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  setupButtons();

  const prefill = (chatBox?.dataset?.prefill || "").trim();
  if (prefill) {
    userInput.value = prefill;
    sendBtn.click();
  }
});

/* ---------------
   Voice handling
   --------------- */
micBtn.addEventListener("click", async () => {
  if (!isRecording) {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "";

      mediaRecorder = preferredType
        ? new MediaRecorder(currentStream, { mimeType: preferredType })
        : new MediaRecorder(currentStream);

      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

      mediaRecorder.onstart = () => {
        isRecording = true;
        micBtn.classList.add("recording");
        micBtn.classList.remove("secondary");
        micBtn.innerHTML = stopSVG;
        appendMessage("user", "🎙 Listening...");
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.classList.add("secondary");
        micBtn.innerHTML = micSVG;

        const usingOgg = preferredType.includes("ogg");
        const blobType = usingOgg ? "audio/ogg" : "audio/webm";
        const ext = usingOgg ? "ogg" : "webm";
        const blob = new Blob(audioChunks, { type: blobType });

        const formData = new FormData();
        formData.append("audio", blob, `mic_input.${ext}`);
        formData.append("language", langSelect.value);

        appendMessage("user", "🎧 Processing your voice...");

        const res = await fetch("/speech", { method: "POST", body: formData });
        const contentType = res.headers.get("Content-Type");

        const detectedLang = res.headers.get("X-Detected-Language");
        if (detectedLang) {
          const newLang = Object.keys(LANGUAGE_CODES).find(
            (k) => LANGUAGE_CODES[k] === detectedLang
          );
          if (newLang) langSelect.value = newLang;
        }

        if (contentType && contentType.includes("audio")) {
          const audioBlob = await res.blob();
          const url = URL.createObjectURL(audioBlob);
          const audio = new Audio(url);
          await audio.play().catch((err) => console.error("Audio playback error:", err));
          appendMessage("bot", "🔊 Voice reply playing…");
        } else {
          const data = await res.json();
          if (data.response) appendMessage("bot", data.response, data.map_data);
        }

        if (currentStream) {
          currentStream.getTracks().forEach((t) => t.stop());
          currentStream = null;
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("🎤 Mic error:", err);
      alert("Please allow microphone access to use voice features.");
      micBtn.classList.remove("recording");
      micBtn.classList.add("secondary");
      micBtn.innerHTML = micSVG;
      isRecording = false;
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }
});
