/*
 * AROUN — Cinematic scroll experience (Stage 02)
 * GSAP + ScrollTrigger + Lenis, with a native fallback.
 * Libraries are pinned in index.html and loaded from CDN.
 */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)");

const waitForLibraries = (timeout = 3600) => new Promise((resolve) => {
  const started = performance.now();
  const check = () => {
    if (window.gsap && window.ScrollTrigger) {
      resolve(true);
      return;
    }
    if (performance.now() - started >= timeout) {
      resolve(false);
      return;
    }
    window.setTimeout(check, 45);
  };
  check();
});

function initNativeFallback() {
  document.body.classList.add("scroll-fallback");
  document.querySelectorAll("[data-reveal-stage]").forEach((element) => {
    element.classList.add("is-visible");
  });

  // Mobile/native mode retains touch scrolling for the horizontal service rail.
  const track = document.querySelector("#servicesTrack");
  track?.classList.add("services-track--native");

  return { destroy() {} };
}

export async function initCinematicScroll() {
  const librariesReady = await waitForLibraries();
  if (!librariesReady || reducedMotion.matches) return initNativeFallback();

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;

  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add("has-cinematic-scroll");

  let lenis = null;
  let lenisTicker = null;

  if (typeof Lenis === "function") {
    try {
      lenis = new Lenis({
        duration: 1.05,
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.86,
        touchMultiplier: 1.0,
        anchors: true,
        autoResize: true
      });

      lenis.on("scroll", ScrollTrigger.update);
      lenisTicker = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(lenisTicker);
      gsap.ticker.lagSmoothing(0);
    } catch (error) {
      console.warn("AROUN: Lenis could not initialize; using native scrolling.", error);
      lenis = null;
    }
  }

  const root = document.documentElement;
  const triggers = [];
  const context = gsap.context(() => {
    /* Keep content readable if a particular animation cannot run. */
    gsap.utils.toArray("[data-reveal-stage]").forEach((element) => {
      gsap.fromTo(element,
        { autoAlpha: 0, y: 26 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true
          }
        }
      );
    });

    /* Atmosphere crossfade through warm ivory, sand, and rose. */
    const scenes = [
      { selector: "#services", a: "rgba(232, 207, 179, .62)", b: "rgba(217, 167, 154, .22)" },
      { selector: "#treatment", a: "rgba(245, 228, 213, .72)", b: "rgba(216, 185, 151, .22)" },
      { selector: "#comparison", a: "rgba(230, 205, 192, .42)", b: "rgba(201, 169, 124, .22)" }
    ];

    scenes.forEach((scene) => {
      const element = document.querySelector(scene.selector);
      if (!element) return;

      const tween = gsap.to(root, {
        "--ambient-a": scene.a,
        "--ambient-b": scene.b,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top 85%",
          end: "bottom 15%",
          scrub: 0.7
        }
      });

      triggers.push(tween.scrollTrigger);
    });

    /* Hero is held briefly, then its copy and editorial image drift out of frame. */
    if (window.matchMedia("(min-width: 1000px)").matches && !coarsePointer.matches) {
      const hero = document.querySelector("#top");
      const heroCopy = document.querySelector(".hero__copy");
      const heroVisual = document.querySelector(".hero__visual");

      if (hero && heroCopy && heroVisual) {
        const heroTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * 0.62)}`,
            pin: true,
            scrub: 0.75,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });

        // Keep the first screen readable even if a browser restores scroll position
        // or ScrollTrigger refreshes before remote fonts/images finish loading.
        // The hero still drifts subtly while scrolling, but never fades into a white wash.
        gsap.set([heroCopy, heroVisual], { clearProps: "opacity,visibility,transform" });
        heroTimeline
          .to(heroCopy, { y: -28, ease: "none" }, 0)
          .to(heroVisual, { y: 22, scale: 1.025, ease: "none" }, 0);

        triggers.push(heroTimeline.scrollTrigger);
      }
    }

    /* Desktop horizontal services rail, pinned while vertical scroll moves it left. */
    const servicesStage = document.querySelector("#servicesStage");
    const servicesViewport = document.querySelector("#servicesViewport");
    const servicesTrack = document.querySelector("#servicesTrack");
    const servicesProgress = document.querySelector("#servicesProgressBar");

    const setupHorizontalServices = () => {
      if (!servicesStage || !servicesViewport || !servicesTrack) return;

      // Remove prior GSAP transforms before calculating the new travel distance.
      gsap.set(servicesTrack, { clearProps: "transform" });
      const distance = Math.max(0, servicesTrack.scrollWidth - servicesViewport.clientWidth);

      if (distance < 10) return;

      const horizontalTween = gsap.to(servicesTrack, {
        x: () => Math.max(0, servicesTrack.scrollWidth - servicesViewport.clientWidth),
        ease: "none",
        scrollTrigger: {
          trigger: servicesStage,
          start: "top top",
          end: () => `+=${Math.max(servicesTrack.scrollWidth - servicesViewport.clientWidth, window.innerHeight * 0.85)}`,
          pin: servicesStage,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (servicesProgress) gsap.set(servicesProgress, { scaleX: self.progress });
          }
        }
      });

      triggers.push(horizontalTween.scrollTrigger);
    };

    if (window.matchMedia("(min-width: 861px)").matches) {
      setupHorizontalServices();
    } else {
      servicesTrack?.classList.add("services-track--native");
    }

    /* Distinct editorial transition on service hover. */
    document.querySelectorAll("[data-service-card]").forEach((card) => {
      const tones = {
        skin: ["rgba(239, 215, 194, .7)", "rgba(217, 167, 154, .24)"],
        laser: ["rgba(220, 218, 198, .62)", "rgba(201, 169, 124, .23)"],
        injectables: ["rgba(238, 211, 205, .68)", "rgba(217, 167, 154, .29)"],
        regeneration: ["rgba(228, 211, 196, .66)", "rgba(193, 158, 137, .22)"],
        lifting: ["rgba(236, 218, 189, .66)", "rgba(201, 169, 124, .24)"],
        hair: ["rgba(225, 213, 199, .68)", "rgba(188, 153, 127, .23)"]
      };

      const applyTone = () => {
        const tone = tones[card.dataset.serviceTone];
        if (!tone) return;
        gsap.to(root, {
          "--ambient-a": tone[0],
          "--ambient-b": tone[1],
          duration: 0.55,
          overwrite: "auto"
        });
      };

      const resetTone = () => {
        gsap.to(root, {
          "--ambient-a": "rgba(238, 217, 195, .56)",
          "--ambient-b": "rgba(217, 167, 154, .18)",
          duration: 0.7,
          overwrite: "auto"
        });
      };

      card.addEventListener("pointerenter", applyTone);
      card.addEventListener("pointerleave", resetTone);
      card.addEventListener("focusin", applyTone);
      card.addEventListener("focusout", resetTone);
    });


  });

  // Refresh after images/fonts/layout settle; no remote image is required to render.
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  window.setTimeout(() => ScrollTrigger.refresh(), 450);

  return {
    lenis,
    destroy() {
      context.revert();
      triggers.forEach((trigger) => trigger?.kill?.());
      if (lenisTicker) gsap.ticker.remove(lenisTicker);
      lenis?.destroy?.();
    }
  };
}
