(function () {
  const cfg = window.APP_CONFIG || {};
  const chatPage = cfg.chatPage || "/chat";
  const planPage = cfg.planPage || "/plan";

  // Floating chat FAB
  const fab = document.getElementById("chat-fab");
  if (fab) fab.addEventListener("click", () => (window.location.href = chatPage));

  // Card "Chat" → open chat with a seeded prompt
  document.querySelectorAll(".chat-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const poi = btn.dataset.poi || "this place";
      const q = encodeURIComponent(
        `Tell me about ${poi}. Best time to visit, timings/tickets if any, how to reach, crowd level, and food nearby.`
      );
      window.location.href = `${chatPage}?q=${q}`;
    });
  });

  // Card "Compare" (on index) → go to plan page and prefill first field
  document.querySelectorAll(".compare-single-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const place = btn.dataset.place || "";
      const url = new URL(planPage, window.location.origin);
      url.searchParams.set("a", place);
      window.location.href = url.toString();
    });
  });

  // CTA Buttons
  document.getElementById("cta-planner")?.addEventListener("click", (e) => {
    // already an <a href>, no-op; kept for parity if you want to intercept
  });
  document.getElementById("cta-food")?.addEventListener("click", (e) => {
    // keep as link to food.html; override here if you make a Flask route later
  });
  document.getElementById("cta-experiences")?.addEventListener("click", (e) => {
    // keep as link to experiences.html
  });

  // If we are on /plan and have ?a=, prefill compare input
  if (location.pathname.endsWith("/plan")) {
    const params = new URLSearchParams(location.search);
    const a = params.get("a");
    if (a && document.getElementById("placeA")) {
      document.getElementById("placeA").value = a;
      document.getElementById("placeB")?.focus();
      const anchor = document.getElementById("placeA");
      if (anchor) window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
    }
  }
})();
