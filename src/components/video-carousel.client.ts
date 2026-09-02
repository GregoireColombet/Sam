/**
 * Client-side companion script for VideoCarousel lightbox and carousel controls.
 */

const lightbox = document.getElementById("video-lightbox");
const overlay = document.getElementById("lightbox-overlay");
const closeBtn = document.getElementById("lightbox-close");
const prevBtn = document.getElementById("lightbox-prev");
const nextBtn = document.getElementById("lightbox-next");
const container = document.getElementById("iframe-container");
const videoCards = document.querySelectorAll(".video-card");

let currentIndex = -1;

function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i) !== null ||
    (url.includes("/uploads/") && !url.includes("youtube") && !url.includes("vimeo") && !url.includes("bilibili"))
  );
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  if (url.includes("youtube.com/watch") || url.includes("youtu.be") || url.includes("youtube.com/embed")) {
    let videoId = "";
    if (url.includes("youtube.com/watch")) {
      const match = url.match(/[?&]v=([^&#]+)/);
      videoId = match ? match[1] : "";
    } else if (url.includes("youtu.be")) {
      const parts = url.split("/");
      videoId = parts[parts.length - 1];
    } else if (url.includes("youtube.com/embed")) {
      const parts = url.split("/");
      videoId = parts[parts.length - 1].split("?")[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null;
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    const videoId = match ? match[1] : "";
    return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : null;
  }

  // Bilibili
  if (url.includes("bilibili.com")) {
    const match = url.match(/video\/(BV[a-zA-Z0-9]+)/);
    const bvId = match ? match[1] : "";
    return bvId ? `https://player.bilibili.com/player.html?bvid=${bvId}&autoplay=1&high_quality=1` : null;
  }

  return url;
}

export function openLightbox(url: string, title: string) {
  if (!container || !lightbox) return;

  if (isDirectVideoUrl(url)) {
    container.innerHTML = `
      <video 
        src="${url}" 
        controls 
        autoplay 
        style="width: 100%; height: 100%; display: block; background: #000;"
      ></video>
    `;
  } else {
    const embedUrl = getEmbedUrl(url);
    if (!embedUrl) return;
    container.innerHTML = `
      <iframe 
        src="${embedUrl}" 
        title="${title}" 
        style="width: 100%; height: 100%; display: block; border: 0;"
        scrolling="no" 
        border="0" 
        frameborder="no" 
        framespacing="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen="true">
      </iframe>
    `;
  }

  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

export function closeLightbox() {
  if (!lightbox || !container) return;
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  container.innerHTML = "";
  document.body.style.overflow = "";
  currentIndex = -1;
}

function showVideoAtIndex(index: number) {
  if (index < 0 || index >= videoCards.length) return;
  currentIndex = index;
  const card = videoCards[index];
  const url = card.getAttribute("data-video-url") || "";
  const title = card.getAttribute("data-video-title") || "";

  openLightbox(url, title);
}

videoCards.forEach((card, index) => {
  card.addEventListener("click", () => {
    currentIndex = index;
    const url = card.getAttribute("data-video-url") || "";
    const title = card.getAttribute("data-video-title") || "";
    openLightbox(url, title);
  });
});

if (videoCards.length <= 1) {
  if (prevBtn) prevBtn.style.display = "none";
  if (nextBtn) nextBtn.style.display = "none";
}

prevBtn?.addEventListener("click", () => {
  let nextIdx = currentIndex - 1;
  if (nextIdx < 0) nextIdx = videoCards.length - 1;
  showVideoAtIndex(nextIdx);
});

nextBtn?.addEventListener("click", () => {
  let nextIdx = currentIndex + 1;
  if (nextIdx >= videoCards.length) nextIdx = 0;
  showVideoAtIndex(nextIdx);
});

closeBtn?.addEventListener("click", closeLightbox);
overlay?.addEventListener("click", closeLightbox);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// Carousel arrow navigation
const carouselPrevBtn = document.querySelector("[data-carousel-prev]");
const carouselNextBtn = document.querySelector("[data-carousel-next]");
const videoStrip = document.querySelector(".video-strip");
if (videoStrip && carouselPrevBtn && carouselNextBtn) {
  carouselPrevBtn.addEventListener("click", () => {
    videoStrip.scrollBy({ left: -320, behavior: "smooth" });
  });
  carouselNextBtn.addEventListener("click", () => {
    videoStrip.scrollBy({ left: 320, behavior: "smooth" });
  });
}
