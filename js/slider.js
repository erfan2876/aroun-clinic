/* AROUN — Three-dimensional testimonial slider. */
export function initTestimonialSlider() {
  const track = document.querySelector("#testimonialTrack");
  const slider = document.querySelector("#testimonialSlider");
  const prevButton = document.querySelector("#testimonialPrev");
  const nextButton = document.querySelector("#testimonialNext");
  const pagination = document.querySelector("#testimonialPagination");

  if (!track || !slider) return { destroy() {} };

  const cards = Array.from(track.querySelectorAll("[data-testimonial]"));
  const dots = pagination ? Array.from(pagination.querySelectorAll("button")) : [];
  if (!cards.length) return { destroy() {} };

  const abort = new AbortController();
  const { signal } = abort;
  let activeIndex = 0;

  function mod(value, total) {
    return ((value % total) + total) % total;
  }

  function render() {
    const total = cards.length;

    cards.forEach((card, index) => {
      const offset = mod(index - activeIndex, total);
      const previous = offset === total - 1;
      const next = offset === 1;
      const active = index === activeIndex;

      card.classList.toggle("is-active", active);
      card.classList.toggle("is-prev", previous);
      card.classList.toggle("is-next", next);
      card.classList.toggle("is-hidden", !active && !previous && !next);
      card.setAttribute("aria-hidden", String(!active));
      card.inert = !active;
      card.style.zIndex = active ? "3" : (previous || next ? "2" : "1");
    });

    dots.forEach((dot, index) => {
      if (index === activeIndex) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function goTo(index) {
    activeIndex = mod(index, cards.length);
    render();
  }

  prevButton?.addEventListener("click", () => goTo(activeIndex - 1), { signal });
  nextButton?.addEventListener("click", () => goTo(activeIndex + 1), { signal });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => goTo(index), { signal });
  });

  slider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
  }, { signal });

  render();

  return {
    next: () => goTo(activeIndex + 1),
    previous: () => goTo(activeIndex - 1),
    destroy() {
      abort.abort();
    }
  };
}
