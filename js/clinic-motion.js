/* AROUN — Process-line drawing, trust counters, doctor tilt and scene tones. */
export async function initClinicMotion() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const root = document.documentElement;
  const abort = new AbortController();
  const { signal } = abort;
  const cleanups = [];
  let gsap = window.gsap;
  let ScrollTrigger = window.ScrollTrigger;

  async function waitForGSAP(timeout = 2200) {
    const started = performance.now();
    while ((!window.gsap || !window.ScrollTrigger) && performance.now() - started < timeout) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    gsap = window.gsap;
    ScrollTrigger = window.ScrollTrigger;
    return Boolean(gsap && ScrollTrigger);
  }

  // Use optional local doctor portraits only when the files really exist.
  document.querySelectorAll("[data-doctor-card] .doctor-card__portrait[data-photo]").forEach((portrait) => {
    const src = portrait.dataset.photo;
    if (!src) return;
    const image = new Image();
    image.onload = () => {
      portrait.style.backgroundImage = `url("${src}")`;
      portrait.classList.add("is-photo");
    };
    image.onerror = () => portrait.classList.remove("is-photo");
    image.src = src;
  });

  const hasGSAP = !reducedMotion.matches && await waitForGSAP();

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* Process SVG path is drawn as the story enters the viewport. */
  const processPath = document.querySelector("#processPath");
  const processMap = document.querySelector("#processMap");

  if (processPath && processMap) {
    let length = 0;
    try { length = processPath.getTotalLength(); } catch { length = 0; }

    if (length > 0) {
      processPath.style.strokeDasharray = String(length);
      processPath.style.strokeDashoffset = String(length);

      if (hasGSAP) {
        const tween = gsap.fromTo(
          processPath,
          { strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: processMap,
              start: "top 78%",
              end: "bottom 42%",
              scrub: 0.7,
              invalidateOnRefresh: true
            }
          }
        );
        cleanups.push(() => tween.scrollTrigger?.kill());
      } else if ("IntersectionObserver" in window && !reducedMotion.matches) {
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            processPath.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)";
            processPath.style.strokeDashoffset = "0";
            observer.disconnect();
          }
        }, { threshold: 0.12 });
        observer.observe(processMap);
        cleanups.push(() => observer.disconnect());
      } else {
        processPath.style.strokeDashoffset = "0";
      }
    }
  }

  /* Counter formatting with Persian digits; values are illustrative until verified. */
  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  const numberFormat = new Intl.NumberFormat("fa-IR");
  const animatedCounters = new WeakSet();

  function animateCounter(element) {
    if (animatedCounters.has(element)) return;
    animatedCounters.add(element);
    const target = Number(element.dataset.counter);
    if (!Number.isFinite(target)) return;

    if (reducedMotion.matches) {
      element.textContent = numberFormat.format(target);
      return;
    }

    if (hasGSAP) {
      const proxy = { value: 0 };
      const tween = gsap.to(proxy, {
        value: target,
        duration: target >= 10000 ? 2.2 : 1.45,
        ease: "power3.out",
        onUpdate: () => {
          element.textContent = numberFormat.format(Math.round(proxy.value));
        }
      });
      cleanups.push(() => tween.kill());
    } else {
      const start = performance.now();
      const duration = 1600;
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        element.textContent = numberFormat.format(Math.round(target * eased));
        if (progress < 1 && !reducedMotion.matches) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  if (counters.length) {
    if ("IntersectionObserver" in window && !reducedMotion.matches) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.45 });
      counters.forEach((counter) => observer.observe(counter));
      cleanups.push(() => observer.disconnect());
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* Tilt on doctor cards; transform is reset cleanly on exit. */
  if (!coarsePointer.matches && !reducedMotion.matches) {
    document.querySelectorAll("[data-doctor-card]").forEach((card) => {
      const move = (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * -4.5}deg) rotateX(${y * 4.5}deg) translateY(-3px)`;
      };
      const reset = () => { card.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateY(0)"; };
      card.addEventListener("pointermove", move, { signal });
      card.addEventListener("pointerleave", reset, { signal });
      card.addEventListener("focusout", reset, { signal });
    });
  }

  /* Warm atmosphere shifts gently as different lower sections enter view. */
  const tones = [
    ["#process", "rgba(234, 214, 194, .42)", "rgba(217, 167, 154, .14)"],
    ["#team", "rgba(240, 222, 207, .43)", "rgba(201, 169, 124, .13)"],
    ["#stats", "rgba(225, 200, 171, .39)", "rgba(217, 167, 154, .13)"],
    ["#gallery", "rgba(245, 228, 213, .37)", "rgba(201, 169, 124, .13)"],
    ["#testimonials", "rgba(235, 213, 197, .44)", "rgba(217, 167, 154, .17)"],
    ["#faq", "rgba(248, 237, 225, .32)", "rgba(201, 169, 124, .1)"],
    ["#booking", "rgba(238, 217, 195, .49)", "rgba(217, 167, 154, .19)"]
  ];

  if (hasGSAP) {
    tones.forEach(([selector, a, b]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      const tween = gsap.to(root, {
        "--ambient-a": a,
        "--ambient-b": b,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
          end: "bottom 20%",
          scrub: 0.55
        }
      });
      cleanups.push(() => tween.scrollTrigger?.kill());
    });
  } else if ("IntersectionObserver" in window) {
    const elements = tones.map(([selector, a, b]) => ({ element: document.querySelector(selector), a, b })).filter((item) => item.element);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const match = elements.find((item) => item.element === entry.target);
        if (!match) return;
        root.style.setProperty("--ambient-a", match.a);
        root.style.setProperty("--ambient-b", match.b);
      });
    }, { threshold: 0.25 });
    elements.forEach((item) => observer.observe(item.element));
    cleanups.push(() => observer.disconnect());
  }

  if (hasGSAP) {
    ScrollTrigger.refresh();
  }

  return {
    destroy() {
      abort.abort();
      cleanups.forEach((cleanup) => {
        try { cleanup(); } catch (error) { console.warn("AROUN motion cleanup:", error); }
      });
    }
  };
}
