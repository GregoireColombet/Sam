/**
 * Companion client script for Album & Single carousels and modal platform links.
 */

// Modal Management
const modal = document.getElementById("album-overlay-modal");
const backdrop = modal?.querySelector(".album-modal-backdrop");
const closeBtn = modal?.querySelector(".album-modal-close-btn");
const modalImg = document.getElementById("modal-album-img") as HTMLImageElement | null;
const modalTitle = document.getElementById("modal-album-title-text");
const linksGrid = document.getElementById("modal-platform-links-grid");
const noLinksMsg = document.getElementById("modal-no-links-msg");
const modalDate = document.getElementById("modal-album-date-text");

export function openModal(title: string, image: string, links: any[], date: string) {
  if (!modal) return;

  if (modalImg) {
    modalImg.src = image;
    modalImg.alt = title;
  }
  if (modalTitle) {
    modalTitle.textContent = `Title: ${title}`;
  }
  if (modalDate) {
    const year = date ? date.split("-")[0] : "";
    modalDate.textContent = year ? `Release date: ${year}` : "";
  }

  if (linksGrid) {
    linksGrid.innerHTML = "";
    if (links && links.length > 0) {
      if (noLinksMsg) noLinksMsg.style.display = "none";
      linksGrid.style.display = "grid";

      links.forEach((link: any) => {
        const btn = document.createElement("a");
        btn.className = "platform-btn";
        btn.href = link.url;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";

        btn.innerHTML = `
          ${link.logo?.url ? `<img src="${link.logo.url}" alt="${link.name}" class="platform-icon" />` : ""}
          <span class="platform-name">${link.name}</span>
        `;
        linksGrid.appendChild(btn);
      });
    } else {
      linksGrid.style.display = "none";
      if (noLinksMsg) noLinksMsg.style.display = "block";
    }
  }

  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

export function closeModal() {
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("show");
  document.body.style.overflow = "";
}

closeBtn?.addEventListener("click", closeModal);
backdrop?.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal?.classList.contains("show")) {
    closeModal();
  }
});

// Carousel Controller Class
export class CarouselController {
  wrapper: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
  prevBtn: HTMLElement | null;
  nextBtn: HTMLElement | null;
  originalCards: HTMLElement[];
  totalOriginal: number;
  cloneBuffer: number = 0;
  allCards: HTMLElement[] = [];
  currentIndex: number = 0;
  isTransitioning: boolean = false;
  gap: number = 24;
  slideWidth: number = 0;
  isMobile: boolean = false;

  // Touch support
  touchStartX: number = 0;
  touchEndX: number = 0;

  constructor(wrapper: HTMLElement) {
    this.wrapper = wrapper;
    this.viewport = wrapper.querySelector(".album-carousel-viewport") as HTMLElement;
    this.track = wrapper.querySelector("[data-carousel-track]") as HTMLElement;
    this.prevBtn = wrapper.querySelector("[data-carousel-prev]");
    this.nextBtn = wrapper.querySelector("[data-carousel-next]");

    this.originalCards = Array.from(this.track?.querySelectorAll(".album-card") || []) as HTMLElement[];
    this.totalOriginal = this.originalCards.length;

    if (this.totalOriginal === 0) return;

    if (this.totalOriginal === 1) {
      if (this.prevBtn) this.prevBtn.style.display = "none";
      if (this.nextBtn) this.nextBtn.style.display = "none";
      if (this.track) this.track.style.justifyContent = "center";
      this.attachCardClick(this.originalCards[0]);
      return;
    }

    // Build clone buffer
    this.cloneBuffer = Math.max(4, this.totalOriginal);
    this.setupClones();
    this.currentIndex = this.cloneBuffer;

    this.updateDimensions();
    this.applyTransform(false);
    this.updateVisibility(false);

    this.bindEvents();
  }

  setupClones() {
    const headClones: HTMLElement[] = [];
    for (let i = 0; i < this.cloneBuffer; i++) {
      const itemIndex = (this.totalOriginal - ((this.cloneBuffer - i) % this.totalOriginal)) % this.totalOriginal;
      const clone = this.originalCards[itemIndex].cloneNode(true) as HTMLElement;
      clone.classList.add("carousel-clone");
      headClones.push(clone);
    }

    const tailClones: HTMLElement[] = [];
    for (let i = 0; i < this.cloneBuffer; i++) {
      const itemIndex = i % this.totalOriginal;
      const clone = this.originalCards[itemIndex].cloneNode(true) as HTMLElement;
      clone.classList.add("carousel-clone");
      tailClones.push(clone);
    }

    this.track.innerHTML = "";
    headClones.forEach((c) => this.track.appendChild(c));
    this.originalCards.forEach((c) => this.track.appendChild(c));
    tailClones.forEach((c) => this.track.appendChild(c));

    this.allCards = Array.from(this.track.querySelectorAll(".album-card")) as HTMLElement[];
    this.allCards.forEach((card) => this.attachCardClick(card));
  }

  attachCardClick(card: HTMLElement) {
    card.addEventListener("click", () => {
      const title = card.getAttribute("data-title") || "";
      const image = card.getAttribute("data-image") || "";
      const date = card.getAttribute("data-date") || "";
      let links: any[] = [];
      try {
        links = JSON.parse(card.getAttribute("data-links") || "[]");
      } catch (e) {
        console.error(e);
      }
      openModal(title, image, links, date);
    });
  }

  updateVisibility(isMoving: boolean = false, targetIndex: number = this.currentIndex) {
    const visibleCount = this.isMobile ? 1 : 2;
    const buffer = isMoving ? 1 : 0;
    const minIdx = targetIndex - buffer;
    const maxIdx = targetIndex + visibleCount - 1 + buffer;

    this.allCards.forEach((card, idx) => {
      if (idx >= minIdx && idx <= maxIdx) {
        card.classList.add("is-visible");
      } else {
        card.classList.remove("is-visible");
      }
    });
  }

  updateDimensions() {
    if (!this.viewport) return;
    const computedStyle = window.getComputedStyle(this.viewport);
    const padLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const padRight = parseFloat(computedStyle.paddingRight) || 0;
    const usableWidth = this.viewport.clientWidth - padLeft - padRight;
    this.isMobile = window.innerWidth <= 768;

    this.gap = this.isMobile ? padRight + 12 : padRight + 14;

    if (this.isMobile) {
      this.slideWidth = usableWidth;
    } else {
      this.slideWidth = (usableWidth - this.gap) / 2;
    }

    this.allCards.forEach((card) => {
      card.style.width = `${this.slideWidth}px`;
      card.style.marginRight = `${this.gap}px`;
    });

    this.updateVisibility(false);
  }

  getOffsetForIndex(index: number): number {
    return -index * (this.slideWidth + this.gap);
  }

  applyTransform(animated: boolean) {
    if (animated) {
      this.track.style.transition = "transform 320ms cubic-bezier(0.25, 1, 0.5, 1)";
    } else {
      this.track.style.transition = "none";
    }
    const offset = this.getOffsetForIndex(this.currentIndex);
    this.track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  next() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.currentIndex++;
    this.updateVisibility(true, this.currentIndex);
    this.applyTransform(true);
  }

  prev() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.currentIndex--;
    this.updateVisibility(true, this.currentIndex);
    this.applyTransform(true);
  }

  handleTransitionEnd() {
    this.isTransitioning = false;

    if (this.currentIndex >= this.cloneBuffer + this.totalOriginal) {
      this.currentIndex -= this.totalOriginal;
      this.applyTransform(false);
    } else if (this.currentIndex < this.cloneBuffer) {
      this.currentIndex += this.totalOriginal;
      this.applyTransform(false);
    }

    this.updateVisibility(false, this.currentIndex);
  }

  bindEvents() {
    this.prevBtn?.addEventListener("click", () => this.prev());
    this.nextBtn?.addEventListener("click", () => this.next());

    this.track.addEventListener("transitionend", (e) => {
      if (e.target === this.track) {
        this.handleTransitionEnd();
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      this.updateDimensions();
      this.applyTransform(false);
    });
    resizeObserver.observe(this.viewport);

    this.wrapper.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.next();
      }
    });

    this.viewport.addEventListener(
      "touchstart",
      (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    this.viewport.addEventListener(
      "touchend",
      (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        const diff = this.touchStartX - this.touchEndX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) {
            this.next();
          } else {
            this.prev();
          }
        }
      },
      { passive: true }
    );
  }
}

// Auto-initialize on page load
const carouselWrappers = document.querySelectorAll(".album-carousel-wrapper");
carouselWrappers.forEach((wrapper) => {
  new CarouselController(wrapper as HTMLElement);
});
