// ================================
// 🌌 KAI – AI Travel Companion UI
// ================================

// Helper: Smooth fade transitions between pages
function smoothPageTransition(targetUrl) {
  document.body.classList.add("fade-out");
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 400);
}

// Attach to any navigation buttons
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.querySelector(".btn-start");
  const backBtn = document.querySelector("#back-btn");
  const orb = document.querySelector(".orb");

  // Animate glowing orb on landing
  if (orb) {
    orb.classList.add("orb-animate");
    setInterval(() => {
      orb.style.boxShadow = `0 0 ${50 + Math.random() * 50}px ${
        5 + Math.random() * 15
      }px rgba(162, 89, 255, 0.8)`;
      orb.style.transform = `scale(${1 + Math.random() * 0.05})`;
    }, 1200);
  }

  // Smooth transition for buttons
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      smoothPageTransition("/plan");
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      smoothPageTransition("/plan");
    });
  }

  // Animate cards on scroll
  const cards = document.querySelectorAll(".card");
  if (cards.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    cards.forEach((card) => {
      observer.observe(card);
    });
  }
});

// Add fade animations to page body
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("fade-in");
});
