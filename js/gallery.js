/* AROUN — Masonry gallery + accessible native dialog lightbox. */
export function initGallery() {
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const dialog = document.querySelector("#galleryLightbox");
  const closeButton = document.querySelector("#galleryLightboxClose");
  const image = document.querySelector("#galleryLightboxImage");
  const placeholder = document.querySelector("#galleryLightboxPlaceholder");
  const caption = document.querySelector("#galleryLightboxCaption");
  const stage = document.querySelector("#galleryLightboxStage");
  const tiles = $$('[data-gallery-open]');
  const abort = new AbortController();
  const { signal } = abort;
  let priorFocus = null;
  let imageToken = 0;

  // Add photos when local assets exist; gradients stay visible on missing files.
  tiles.forEach((tile) => {
    const art = tile.querySelector(".gallery-tile__art");
    const src = tile.dataset.photo;
    if (!art || !src) return;

    const probe = new Image();
    probe.onload = () => {
      art.style.backgroundImage = `linear-gradient(180deg, rgba(48,37,28,.02), rgba(48,37,28,.43)), url("${src}")`;
      art.classList.add("is-photo");
    };
    probe.onerror = () => art.classList.remove("is-photo");
    probe.src = src;
  });

  function resetDialogImage() {
    imageToken += 1;
    if (image) {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
      image.alt = "";
      image.hidden = true;
    }
    if (placeholder) placeholder.hidden = false;
  }

  function openTile(tile) {
    if (!dialog || typeof dialog.showModal !== "function") return;

    priorFocus = tile;
    resetDialogImage();

    if (caption) caption.textContent = tile.dataset.galleryCaption || "فضای آرون";
    if (placeholder) placeholder.hidden = false;

    const src = tile.dataset.photo;
    const token = imageToken;

    if (src && image) {
      image.alt = tile.dataset.galleryCaption || "تصویر فضای کلینیک آرون";
      image.onload = () => {
        if (token !== imageToken) return;
        image.hidden = false;
        if (placeholder) placeholder.hidden = true;
      };
      image.onerror = () => {
        if (token !== imageToken) return;
        image.hidden = true;
        if (placeholder) placeholder.hidden = false;
      };
      image.src = src;
    }

    if (!dialog.open) dialog.showModal();
    document.body.classList.add("has-lightbox-open");
  }

  function closeDialog() {
    if (!dialog?.open) return;
    dialog.close();
  }

  tiles.forEach((tile) => {
    tile.addEventListener("click", () => openTile(tile), { signal });
  });

  closeButton?.addEventListener("click", closeDialog, { signal });

  dialog?.addEventListener("click", (event) => {
    // Native dialog has transparent space around its inner content.
    if (event.target === dialog) closeDialog();
  }, { signal });

  dialog?.addEventListener("close", () => {
    document.body.classList.remove("has-lightbox-open");
    resetDialogImage();
    priorFocus?.focus?.({ preventScroll: true });
  }, { signal });

  return {
    destroy() {
      abort.abort();
      if (dialog?.open) dialog.close();
      resetDialogImage();
    }
  };
}
