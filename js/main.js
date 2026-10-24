import { initCinematicScroll } from "./scroll.js";
import { initTreatmentAdvisor } from "./treatment.js";
import { initComparisonSlider } from "./comparison.js";
import { initClinicMotion } from "./clinic-motion.js";
import { initGallery } from "./gallery.js";
import { initTestimonialSlider } from "./slider.js";
import { initBookingForm } from "./booking.js";
import { initFAQ } from "./faq.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const digits = (value) => new Intl.NumberFormat("fa-IR").format(value);

/* ----------------------------------------------------------
   01. Reliable preloader: actual progress plus a firm timeout
   ---------------------------------------------------------- */
const preloader = $("#preloader");
const preloaderNumber = $("#preloaderNumber");
const preloaderBar = $("#preloaderBar");
let currentProgress = 0;
let targetProgress = 18;
let preloaderFrame = 0;
let preloaderStarted = performance.now();
let preloaderDone = false;
const MAX_WAIT = 4200;
const MIN_SHOW = 850;

function paintPreloader(value) {
  const safe = Math.max(0, Math.min(100, Math.floor(value)));
  if (preloaderNumber) preloaderNumber.textContent = digits(safe);
  if (preloaderBar) preloaderBar.style.width = `${safe}%`;
}

function finishPreloader() {
  if (preloaderDone) return;
  preloaderDone = true;
  currentProgress = 100;
  targetProgress = 100;
  if (preloaderFrame) cancelAnimationFrame(preloaderFrame);
  paintPreloader(100);

  // This class reveals the masked hero lines; it must be applied before the curtain disappears.
  document.body.classList.add("is-ready");

  const elapsed = performance.now() - preloaderStarted;
  const wait = Math.max(0, MIN_SHOW - elapsed);
  window.setTimeout(() => {
    if (!preloader) return;
    preloader.classList.add("is-hidden");
    window.setTimeout(() => preloader.remove(), reducedMotion.matches ? 0 : 900);
  }, wait);
}

function tickPreloader() {
  if (preloaderDone) return;
  currentProgress += (targetProgress - currentProgress) * 0.12;

  if (targetProgress >= 100 && Math.abs(targetProgress - currentProgress) < 0.55) {
    currentProgress = 100;
  }

  paintPreloader(currentProgress);

  if (currentProgress >= 100) {
    finishPreloader();
    return;
  }

  if (performance.now() - preloaderStarted >= MAX_WAIT) {
    currentProgress = 100;
    finishPreloader();
    return;
  }

  preloaderFrame = requestAnimationFrame(tickPreloader);
}

paintPreloader(0);
preloaderFrame = requestAnimationFrame(tickPreloader);

const preloaderFailsafe = window.setTimeout(() => {
  if (!preloaderDone) {
    targetProgress = 100;
  }
}, MAX_WAIT);

/* ----------------------------------------------------------
   02. Header glass state and progress line
   ---------------------------------------------------------- */
const header = $("#siteHeader");
const progressBar = $("#pageProgress span");
let scrollRequestPending = false;

function updateScrollDecor() {
  if (header) header.classList.toggle("is-scrolled", window.scrollY > 35);

  if (progressBar) {
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    progressBar.style.height = `${Math.min(100, (window.scrollY / maxScroll) * 100)}%`;
  }
  scrollRequestPending = false;
}

window.addEventListener("scroll", () => {
  if (scrollRequestPending) return;
  scrollRequestPending = true;
  requestAnimationFrame(updateScrollDecor);
}, { passive: true });
window.addEventListener("resize", updateScrollDecor, { passive: true });
updateScrollDecor();

/* ----------------------------------------------------------
   03. Full-screen menu
   ---------------------------------------------------------- */
const menuButton = $("#menuButton");
const fullMenu = $("#fullMenu");

function setMenuOpen(open) {
  if (!menuButton || !fullMenu) return;
  menuButton.classList.toggle("is-active", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
  fullMenu.classList.toggle("is-open", open);
  fullMenu.setAttribute("aria-hidden", String(!open));
  fullMenu.inert = !open;
  document.body.classList.toggle("is-menu-open", open);

  if (open) {
    window.setTimeout(() => $(".full-menu__link", fullMenu)?.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 180);
  } else {
    menuButton.focus({ preventScroll: true });
  }
}

menuButton?.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

$$(".full-menu__link", fullMenu || document).forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fullMenu?.classList.contains("is-open")) {
    setMenuOpen(false);
  }
});

/* ----------------------------------------------------------
   04. Pointer-following light
   ---------------------------------------------------------- */
if (window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
  }, { passive: true });
}

/* ----------------------------------------------------------
   05. Cursor labels and magnetic buttons
   ---------------------------------------------------------- */
const cursor = $("#cursorOrb");
const cursorText = $("#cursorText");
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (cursor && cursorText && finePointer && !reducedMotion.matches) {
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let targetX = cursorX;
  let targetY = cursorY;
  let cursorRaf = 0;

  function drawCursor() {
    cursorX += (targetX - cursorX) * 0.24;
    cursorY += (targetY - cursorY) * 0.24;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    if (Math.abs(targetX - cursorX) > 0.15 || Math.abs(targetY - cursorY) > 0.15) {
      cursorRaf = requestAnimationFrame(drawCursor);
    } else {
      cursorRaf = 0;
    }
  }

  document.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursor.classList.add("is-visible");
    if (!cursorRaf) cursorRaf = requestAnimationFrame(drawCursor);
  }, { passive: true });

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-cursor], a, button, .hero__image-arch");
    if (!target) return;
    cursorText.textContent = target.dataset.cursor || (target.closest(".hero__image-arch") ? "ببین" : "انتخاب");
    cursor.classList.add("is-labeled");
  });

  document.addEventListener("pointerout", (event) => {
    if (event.target.closest("[data-cursor], a, button, .hero__image-arch")) {
      cursor.classList.remove("is-labeled");
    }
  });

  window.addEventListener("blur", () => cursor.classList.remove("is-visible", "is-labeled"));
}

if (finePointer && !reducedMotion.matches) {
  $$(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      element.style.transform = `translate(${dx * 0.06}px, ${dy * 0.08}px)`;
    });
    element.addEventListener("pointerleave", () => {
      element.style.transform = "translate(0, 0)";
    });
  });
}

/* ----------------------------------------------------------
   06. Gentle pointer parallax on hero details
   ---------------------------------------------------------- */
if (finePointer && !reducedMotion.matches) {
  const hero = $("#top");
  const parallaxItems = $$("[data-parallax]");
  let pointerFrame = 0;
  let px = 0;
  let py = 0;

  hero?.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    px = (event.clientX - rect.left) / rect.width - 0.5;
    py = (event.clientY - rect.top) / rect.height - 0.5;
    if (pointerFrame) return;

    pointerFrame = requestAnimationFrame(() => {
      parallaxItems.forEach((item) => {
        const amount = Number(item.dataset.parallax || 0.04);
        item.style.translate = `${px * amount * 140}px ${py * amount * 140}px`;
      });
      pointerFrame = 0;
    });
  }, { passive: true });

  hero?.addEventListener("pointerleave", () => {
    parallaxItems.forEach((item) => { item.style.translate = "0 0"; });
  });
}

/* ----------------------------------------------------------
   07. Stage 02 modules
   ---------------------------------------------------------- */
let scrollController = null;
let treatmentController = null;
let comparisonController = null;
let clinicMotionController = null;
let galleryController = null;
let testimonialController = null;
let bookingController = null;
let faqController = null;

initCinematicScroll()
  .then((controller) => {
    scrollController = controller;
  })
  .catch((error) => {
    console.warn("AROUN: cinematic scroll fallback active.", error);
    document.body.classList.add("scroll-fallback");
    document.querySelectorAll("[data-reveal-stage]").forEach((element) => {
      element.classList.add("is-visible");
    });
  });

try {
  treatmentController = initTreatmentAdvisor();
} catch (error) {
  console.warn("AROUN: treatment advisor unavailable.", error);
}

try {
  comparisonController = initComparisonSlider();
} catch (error) {
  console.warn("AROUN: comparison slider unavailable.", error);
}

/* ----------------------------------------------------------
   08. Stage 03 modules: process, numbers, gallery, reviews, FAQ, booking
   ---------------------------------------------------------- */
initClinicMotion()
  .then((controller) => { clinicMotionController = controller; })
  .catch((error) => {
    console.warn("AROUN: motion enhancements unavailable; static layout retained.", error);
    document.querySelectorAll("[data-reveal-stage]").forEach((element) => {
      element.classList.add("is-visible");
    });
    const path = document.querySelector("#processPath");
    if (path) path.style.strokeDashoffset = "0";
    document.querySelectorAll("[data-counter]").forEach((element) => {
      element.textContent = new Intl.NumberFormat("fa-IR").format(Number(element.dataset.counter) || 0);
    });
  });

try { galleryController = initGallery(); }
catch (error) { console.warn("AROUN: gallery lightbox unavailable.", error); }

try { testimonialController = initTestimonialSlider(); }
catch (error) { console.warn("AROUN: testimonial slider unavailable.", error); }

try { bookingController = initBookingForm(); }
catch (error) { console.warn("AROUN: booking preview unavailable.", error); }

try { faqController = initFAQ(); }
catch (error) { console.warn("AROUN: FAQ enhancement unavailable.", error); }

/* ----------------------------------------------------------
   Hero uses editorial photography, so no decorative WebGL orb is loaded.
   Keep the preloader short and independent from a 3D module.
   ---------------------------------------------------------- */
window.setTimeout(() => {
  if (!preloaderDone) targetProgress = 100;
}, 360);

/* Optional local service photos: only reveal the photo layer once the image loads.
   If a file is missing, the sculptural CSS gradient remains visible. */
document.querySelectorAll(".service-card__visual[data-photo]").forEach((visual) => {
  const src = visual.dataset.photo;
  if (!src) return;
  const probe = new Image();
  probe.onload = () => visual.classList.add("has-photo");
  probe.onerror = () => {
    visual.classList.remove("has-photo");
    console.warn(`AROUN: service image not found: ${src}`);
  };
  probe.src = new URL(src, document.baseURI).href;
});

/* Optional image helper: if assets/images/hero.jpg exists, activate the photo layer. */
const heroImageLayer = $(".hero__image-placeholder");
if (heroImageLayer) {
  const probe = new Image();
  probe.onload = () => heroImageLayer.classList.add("has-photo");
  probe.onerror = () => heroImageLayer.classList.remove("has-photo");
  probe.src = "assets/images/hero.jpg";
}

window.addEventListener("pagehide", () => {
  cancelAnimationFrame(preloaderFrame);
  clearTimeout(preloaderFailsafe);
  scrollController?.destroy?.();
  treatmentController?.destroy?.();
  comparisonController?.destroy?.();
  clinicMotionController?.destroy?.();
  galleryController?.destroy?.();
  testimonialController?.destroy?.();
  bookingController?.destroy?.();
  faqController?.destroy?.();
}, { once: true });
