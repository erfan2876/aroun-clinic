/* Keep one FAQ item open at a time while preserving native <details> semantics. */
export function initFAQ() {
  const items = Array.from(document.querySelectorAll(".faq-item"));
  const abort = new AbortController();
  const { signal } = abort;

  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item && other.open) other.open = false;
      });
    }, { signal });
  });

  return { destroy() { abort.abort(); } };
}
