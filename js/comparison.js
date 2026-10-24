/* AROUN — Before / after comparison control
 * The initial layers are abstract placeholders, not clinical results.
 */
export function initComparisonSlider() {
  const visual = document.querySelector("#comparisonVisual");
  const range = document.querySelector("#comparisonRange");
  if (!visual || !range) return { destroy() {} };

  const update = () => {
    const value = Math.max(8, Math.min(92, Number(range.value) || 50));
    visual.style.setProperty("--compare-split", `${value}%`);
    range.setAttribute("aria-valuetext", `مرز مقایسه روی ${value} درصد است`);
  };

  range.addEventListener("input", update, { passive: true });
  update();

  // Optional local photographs activate over the abstract gradient placeholders.
  const optionalImages = [
    [visual.querySelector(".comparison-layer--before"), "assets/images/before-after-before.jpg"],
    [visual.querySelector(".comparison-layer--after"), "assets/images/before-after-after.jpg"]
  ];
  optionalImages.forEach(([layer, path]) => {
    if (!layer) return;
    const probe = new Image();
    probe.onload = () => {
      layer.classList.add("has-photo");
      const note = layer.querySelector(".comparison-layer__note");
      if (note) note.hidden = true;
    };
    probe.onerror = () => {
      layer.classList.remove("has-photo");
      const note = layer.querySelector(".comparison-layer__note");
      if (note) note.hidden = false;
    };
    probe.src = path;
  });

  return {
    destroy() {
      range.removeEventListener("input", update);
    }
  };
}
