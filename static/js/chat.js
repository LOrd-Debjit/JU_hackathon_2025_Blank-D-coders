/* =========================
   Kolkata Tourism — Chat UI
   (screenshot-style theme) + fixed header art
   ========================= */

/* ------- DOM refs (unchanged) ------- */
const chatContainer = document.getElementById("chat-container");
const chatBox       = document.getElementById("chatbox");
const userInput     = document.getElementById("user-input");
const sendBtn       = document.getElementById("send-btn");
const micBtn        = document.getElementById("mic-btn");
const langSelect    = document.getElementById("language");

/* ------- Paths (safe defaults) ------- */
const STATIC_PREFIX     = window.STATIC_URL_PREFIX || "/static";
const CHAT_SKETCH_SRC   = `${STATIC_PREFIX}/pictures/chat_skecth.png`;
const HEADER_ICON_SRC   = `${STATIC_PREFIX}/pictures/icon_ju.png`;
const HEADER_ART_PNG    = `${STATIC_PREFIX}/pictures/chat_header.png`;
const HEADER_ART_JPG    = `${STATIC_PREFIX}/pictures/chat_header.jpg`;

/* ------- Palette / tokens ------- */
const PALETTE = {
  bg:        "#F9FDFF",
  bgSoft:    "#F9FDFF",
  text:      "#0e0f0fff",
  textDim:   "#c0c6d4",
  border:    "rgba(25, 29, 40, 0.08)",
  bubbleBot:  "rgba(255,255,255,0.9)",
  bubbleUser: "rgba(255,142,0,0.16)",
  accent:      "#FF8A00",
  accentHover: "#ff9f2e",
  sidebarFrom: "#ffae42",
  sidebarTo:   "#ff7a00",
};

/* ------- Language map (unchanged) ------- */
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

/* ------- Voice state ------- */
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let currentStream = null;

/* -----------------------------------
   CSS injection (sidebar/header/hero)
   ----------------------------------- */
(function injectTheme() {
  const css = `
  :root { color-scheme: light; }

  /* Page & grids */
  .chat-body {
    background: ${PALETTE.bg};
    color: ${PALETTE.text};
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  }
  .container {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 100vh;
  }
  @media (max-width: 900px){
    .container { grid-template-columns: 1fr; }
    .sidebar { display: none; }
  }

  /* ORANGE SIDEBAR */
  .sidebar{
    background: linear-gradient(180deg, ${PALETTE.sidebarFrom}, ${PALETTE.sidebarTo});
    color:#2a1700;
    padding: 20px 16px;
  }
  .sidebar h2{
    display:flex;align-items:center;gap:8px;
    color:#fff; font-weight:700; letter-spacing:.2px; margin:0 0 8px;
  }
  .sidebar h3{ color:#fff; margin:16px 0 6px; }
  .sidebar p{ color:#ffe7c7; line-height:1.5; }
  .sidebar select{
    width:100%;
    background:#fff9;
    color:#18120a;
    border:0;
    border-radius:10px;
    padding:10px 12px;
    outline:none;
    font-weight:600;
  }
  .sidebar hr{ border:none; border-top:1px solid #ffffff55; margin:14px 0; }

  /* Chat pane container */
  .chatbox{
    position:relative;
    display:grid;
    grid-template-rows: auto 1fr auto;
    overflow:hidden;
    background:${PALETTE.bg};
  }

  /* TOP HEADER (fixed row) */
  .chat-header{
    height:60px;
    display:flex; align-items:center; gap:12px;
    padding:0 14px;
    background:${PALETTE.bgSoft};
    border-bottom:1px solid ${PALETTE.border};
    position: sticky; top: 0; z-index: 10;
  }
  .brand {
    display:flex; align-items:center; gap:10px;
    min-width:0;
  }
  .logo-box{
    display:grid; place-items:center;
    width:28px; height:28px;
    border-radius:8px;
    background:${PALETTE.accent};
    box-shadow: 0 2px 6px rgba(0,0,0,.12);
    overflow:hidden;
  }
  .logo-box img{ width:22px; height:22px; object-fit:contain; }

  .brand-name{
    display:flex; align-items:baseline; gap:4px;
    font-weight:700; letter-spacing:.2px;
    color:${PALETTE.text};
    white-space:nowrap;
  }
  .brand-name .ai{
    font-weight:900;
    color:${PALETTE.accent};
  }

  /* spacer pushes plane + art to the far right */
  .header-spacer{ flex:1 1 auto; }

  .plane{ margin-left:6px; }

  /* header art — bigger and pinned to top-right */
  .header-art {
    height:60px;             /* bigger */
    width:auto;
    margin-left:10px;         /* small gap from plane */
    align-self:flex-start;    /* nudges to top */
    object-fit:contain;
    border-radius:8px;
    display:block;
  }
  @media (max-width: 560px){
    .header-art { height:36px; }
  }

  /* HERO (bridge + Bengali heading) */
  .chat-hero{
    inset:0; width:100%;
    display:grid; place-items:center;
    padding:28px 18px;
  }
  .hero-inner{
    width:100%; max-width:1050px;
    background:#ffffff;
    border:1px solid ${PALETTE.border};
    border-radius:16px;
    overflow:hidden;
  }
  .hero-banner{
    position:relative;
    background:#f8fafc;
    min-height:360px;
    display:grid; place-items:center;
  }
  .hero-banner::after{
    content:"";
    position:absolute; inset:0;
    background: url("${CHAT_SKETCH_SRC}") center/contain no-repeat;
    opacity:.9;
  }
  .hero-bn-text{
    position:relative;
    z-index:1;
    font-size: clamp(42px, 8vw, 96px);
    color:#0c1a37;
    font-weight:900;
    letter-spacing:2px;
    text-shadow: 0 1px 0 #fff, 0 12px 24px #0001;
  }

  /* Messages area */
  #chat-container{
    padding:16px 14px 10px;
    overflow-y:auto;
  }

  .msg-row{ display:flex; margin:14px 0; }
  .msg-row.user{ justify-content:flex-end; }
  .msg-row.bot { justify-content:flex-start; }

  .sender{
    font-size:13px; color:${PALETTE.accent}; margin:6px 6px;
  }

  .bubble{
    max-width:min(760px,86%);
    padding:16px 18px; border-radius:18px;
    line-height:1.6; font-size:18px; letter-spacing:.2px;
    border:1px solid ${PALETTE.border};
    box-shadow:0 2px 10px rgba(0,0,0,.06);
    background:#fff;
  }
  .msg-row.user .bubble { background:${PALETTE.bubbleUser}; }
  .msg-row.bot  .bubble { background:${PALETTE.bubbleBot}; }

  /* Input row */
  .input-area{
    display:grid; grid-template-columns:1fr auto auto; gap:10px;
    align-items:center; padding:12px;
    background:${PALETTE.bgSoft}; border-top:1px solid ${PALETTE.border};
  }
  #user-input{
    background:#ffffff;
    color:${PALETTE.text};
    border:1px solid ${PALETTE.border};
    border-radius:14px; padding:14px 16px; outline:none; font-size:16px;
  }
  #user-input::placeholder{ color:${PALETTE.textDim}; }

  .icon-btn{
    width:52px; height:52px; display:inline-flex; align-items:center; justify-content:center;
    border-radius:16px; background:${PALETTE.accent}; border:none; cursor:pointer;
    transition:transform .08s ease, filter .12s ease, background .15s ease;
  }
  .icon-btn:hover{ background:${PALETTE.accentHover}; filter:brightness(1.03); }
  .icon-btn:active{ transform:scale(.97); }
  .icon-btn svg{ width:28px; height:28px; fill:#111; }

  .icon-btn.secondary{ background:transparent; border:1.5px solid ${PALETTE.accent}; }
  .icon-btn.secondary svg{ fill:${PALETTE.accent}; }

  .icon-btn.recording{ background:#ff3b30; border:1.5px solid #ff6b63; }

  /* Map preview (unchanged) */
  .map-container{ margin-top:10px; }
  .map-thumb{ width:100%; height:auto; border:1px solid ${PALETTE.border}; border-radius:10px; }

  /* Scrollbars */
  #chat-container::-webkit-scrollbar{ width:10px; }
  #chat-container::-webkit-scrollbar-thumb{ background:#0000001a; border-radius:10px; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ---------------------------
   TOP header + HERO injector
   --------------------------- */
function mountHeaderAndHero() {
  // Header
  const header = document.createElement("div");
  header.className = "chat-header";

  // try PNG then fallback to JPG for header art
  const artImg = document.createElement("img");
  artImg.className = "header-art";
  artImg.src = HEADER_ART_PNG;
  artImg.alt = "Kolkata header art";
  artImg.onerror = () => { artImg.onerror = null; artImg.src = HEADER_ART_JPG; };

  header.innerHTML = `
    <div class="brand">
      <span class="logo-box"><img src="${HEADER_ICON_SRC}" alt="logo"></span>
      <div class="brand-name">
        <span>BabuMosh</span><span class="ai">AI</span>
      </div>
    </div>
    <div class="header-spacer"></div>
  `;

  const plane = document.createElement("div");
  plane.className = "plane";
  plane.textContent = "✈️";

  // order: spacer -> plane -> art (art is the right-most)
  header.appendChild(plane);
  header.appendChild(artImg);

  // stick at the top of chatbox
  chatBox.insertBefore(header, chatBox.firstChild);

  // Hero (only if empty chat)
  if (!chatContainer.querySelector(".chat-hero")) {
    const hero = document.createElement("section");
    hero.className = "chat-hero";
    hero.innerHTML = `
      <div class="hero-inner">
        <div class="hero-banner">
          <div class="hero-bn-text">কলকাতা</div>
        </div>
      </div>
    `;
    chatContainer.prepend(hero);
  }
}

// Hide hero after the first message lands
function hideHeroIfAny() {
  const hero = chatContainer.querySelector(".chat-hero");
  if (hero) hero.style.display = "none";
}

/* -------------------------------
   SVG icons (send plane / mic / stop)
   ------------------------------- */
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
   Helper: sanitize markdown noise
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
   Render a message bubble (unchanged)
   ------------------------------------ */
function appendMessage(sender, text, mapData = null) {
  hideHeroIfAny(); // remove hero once conversation starts

  const row = document.createElement("div");
  row.className = `msg-row ${sender === "user" ? "user" : "bot"}`;

  const label = document.createElement("div");
  label.className = "sender";
  label.textContent = sender === "user" ? "You" : "AI Guide";

  const bubble = document.createElement("div");
  bubble.className = `bubble`;
  bubble.textContent = cleanText(text);

  // Inline Map preview (kept intact)
  if (mapData && mapData.lat && mapData.lon) {
    const mapContainer = document.createElement("div");
    mapContainer.className = "map-container";

    const mapThumb = document.createElement("img");
    mapThumb.className = "map-thumb";
    mapThumb.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${mapData.lat},${mapData.lon}&zoom=15&size=600x300&markers=${mapData.lat},${mapData.lon},red-pushpin`;
    mapThumb.alt = mapData.label || "Location map";
    mapThumb.style.cursor = "pointer";

    const mapLabel = document.createElement("p");
    mapLabel.textContent = `📍 ${mapData.label || "View on map"}`;
    mapLabel.style.fontSize = "0.9rem";
    mapLabel.style.color = "#6c7684";
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

  row.appendChild(bubble);

  if (sender === "bot") {
    chatContainer.appendChild(label);
    label.style.marginLeft = "6px";
  } else {
    const youLabel = label.cloneNode(true);
    youLabel.style.textAlign = "right";
    youLabel.style.marginRight = "6px";
    chatContainer.appendChild(youLabel);
  }

  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------
   Text chat (same)
   ------------------- */
async function sendText(message) {
  appendMessage("user", message);

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, language: langSelect.value }),
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
   Buttons & input wiring
   ------------------------- */
function setupButtons() {
  if (sendBtn) {
    sendBtn.classList.add("icon-btn");
    sendBtn.innerHTML = planeSVG;
    sendBtn.title = "Send"; sendBtn.ariaLabel = "Send";
  }
  if (micBtn) {
    micBtn.classList.add("icon-btn", "secondary");
    micBtn.innerHTML = micSVG;
    micBtn.title = "Speak"; micBtn.ariaLabel = "Speak";
  }

  sendBtn?.addEventListener("click", async () => {
    const message = (userInput.value || "").trim();
    if (!message) return;
    userInput.value = "";
    await sendText(message);
  });

  userInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}

/* --------------------------
   Prefill from ?q= or data
   -------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  setupButtons();
  mountHeaderAndHero();

  const qFromUrl = new URLSearchParams(window.location.search).get("q") || "";
  const prefill  = (chatBox?.dataset?.prefill || qFromUrl || "").trim();
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
        const ext      = usingOgg ? "ogg" : "webm";
        const blob     = new Blob(audioChunks, { type: blobType });

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
          await audio.play().catch(console.error);
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
