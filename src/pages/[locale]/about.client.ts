/**
 * Client-side companion script for About page scroll gauge and bonus modal.
 */

const bonusBtn = document.getElementById("bonus-btn");
if (bonusBtn) {
  const bonusModal = document.getElementById("bonus-modal");
  const bonusClose = document.getElementById("bonus-modal-close");
  const gaugeBar = document.getElementById("scroll-gauge-bar");
  const gaugeNumber = document.getElementById("scroll-gauge-number");
  const gaugeContainer = document.querySelector(".scroll-gauge-container");
  const nav = document.querySelector("[data-site-nav]");

  // Position gauge container inside the fixed site-nav if present
  if (nav && gaugeContainer && !nav.contains(gaugeContainer)) {
    nav.appendChild(gaugeContainer);
  }

  let progress = 0;
  let timer: number | null = null;
  let lastScrollY = window.scrollY;

  function updateGauge(value: number) {
    progress = Math.round(value);
    if (gaugeBar) {
      gaugeBar.style.width = `${progress}%`;
    }
    if (gaugeNumber) {
      gaugeNumber.textContent = `${progress}%`;
    }
  }

  function handleScroll() {
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const maxScroll = documentHeight - windowHeight;

    const isAtBottom = maxScroll <= 0 || windowHeight + scrollY >= documentHeight - 15;

    if (scrollY !== lastScrollY) {
      lastScrollY = scrollY;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (bonusBtn) {
        bonusBtn.style.display = "none";
      }
      const scrollPercent = maxScroll > 0 ? (scrollY / maxScroll) * 80 : 80;
      updateGauge(Math.max(0, Math.min(80, scrollPercent)));
    }

    if (isAtBottom) {
      if (!timer && progress < 100 && bonusModal && !bonusModal.classList.contains("open")) {
        if (progress < 80) {
          updateGauge(80);
        }
        timer = window.setInterval(() => {
          if (progress < 100) {
            updateGauge(Math.min(100, progress + 5));
            if (progress >= 100) {
              if (timer) {
                clearInterval(timer);
                timer = null;
              }
              if (bonusBtn) {
                bonusBtn.style.display = "inline-block";
                bonusBtn.style.animation = "fadeIn 0.5s ease forwards";
              }
            }
          }
        }, 500);
      }
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  bonusBtn.addEventListener("click", () => {
    if (bonusModal) {
      bonusModal.classList.add("open");
    }
  });

  bonusClose?.addEventListener("click", () => {
    if (bonusModal) {
      bonusModal.classList.remove("open");
    }
    if (bonusBtn) {
      bonusBtn.style.display = "none";
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    updateGauge(80);
    lastScrollY = window.scrollY;
    handleScroll();
  });
}
