/* AROUN — Treatment conversation helper
 * This is an educational conversation starter, not a diagnosis or prescription.
 */
export function initTreatmentAdvisor() {
  const root = document.querySelector("#treatmentTool");
  if (!root) return { destroy() {} };

  const skinGroup = root.querySelector("#skinChoices");
  const concernGroup = root.querySelector("#concernChoices");
  const result = root.querySelector("#treatmentResult");
  const resultTitle = root.querySelector("#treatmentResultTitle");
  const resultText = root.querySelector("#treatmentResultText");

  const skinLabels = {
    dry: "خشک یا کم‌آب",
    oily: "چرب",
    combination: "مختلط",
    sensitive: "حساس یا واکنش‌پذیر"
  };

  const concerns = {
    hydration: {
      title: "ارزیابی رطوبت و سد دفاعی پوست",
      text: "در گفت‌وگوی اولیه، وضعیت کم‌آبی، عادت‌های مراقبتی و تحمل‌پذیری پوست بررسی می‌شود تا دربارهٔ گزینه‌های مناسب صحبت کنیم."
    },
    texture: {
      title: "بررسی بافت پوست و ظاهر منافذ",
      text: "در جلسهٔ مشاوره می‌توان دربارهٔ بافت پوست، الگوی چربی، سابقهٔ محصولات مصرفی و گزینه‌های مراقبتی متناسب گفت‌وگو کرد."
    },
    tone: {
      title: "ارزیابی ناهماهنگی رنگ و لک‌ها",
      text: "پزشک می‌تواند سابقهٔ تغییر رنگ، حساسیت به نور، داروهای مصرفی و نیاز به بررسی دقیق‌تر را ارزیابی کند."
    },
    lines: {
      title: "گفت‌وگو دربارهٔ خطوط ظریف و کیفیت پوست",
      text: "در این گفت‌وگو، نگرانی‌های شما، وضعیت پوست و انتظارات واقع‌بینانه بررسی می‌شود؛ مناسب‌بودن هر روش فقط پس از ارزیابی پزشکی مشخص خواهد شد."
    },
    hair: {
      title: "ارزیابی پوست سر و الگوی ریزش مو",
      text: "سابقهٔ تغییرات مو، شرایط پوست سر، وضعیت سلامت و نیاز به بررسی علت ریزش می‌تواند موضوع آغازین مشاوره باشد."
    }
  };

  let selectedSkin = "dry";
  let selectedConcern = "hydration";
  let animationTimer = 0;

  function setSelection(group, attribute, value) {
    if (!group) return;

    group.querySelectorAll(`[${attribute}]`).forEach((button) => {
      const selected = button.getAttribute(attribute) === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateRecommendation() {
    const concern = concerns[selectedConcern] || concerns.hydration;
    const skinName = skinLabels[selectedSkin] || skinLabels.dry;

    if (result) {
      result.classList.remove("is-updating");
      // Allow CSS transition to restart on every selection.
      void result.offsetWidth;
      result.classList.add("is-updating");
    }

    if (resultTitle) resultTitle.textContent = concern.title;
    if (resultText) {
      resultText.textContent = `با توجه به توصیف «${skinName}»، می‌توان در مشاوره دربارهٔ ${concern.title.replace(/^بررسی |^ارزیابی |^گفت‌وگو دربارهٔ /, "")} صحبت کرد. ${concern.text} این نتیجه صرفاً راهنمای گفت‌وگو است.`;
    }

    window.clearTimeout(animationTimer);
    animationTimer = window.setTimeout(() => {
      result?.classList.remove("is-updating");
    }, 420);
  }

  skinGroup?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-skin]");
    if (!button) return;

    selectedSkin = button.dataset.skin;
    setSelection(skinGroup, "data-skin", selectedSkin);
    updateRecommendation();
  });

  concernGroup?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-concern]");
    if (!button) return;

    selectedConcern = button.dataset.concern;
    setSelection(concernGroup, "data-concern", selectedConcern);
    updateRecommendation();
  });

  updateRecommendation();

  return {
    destroy() {
      window.clearTimeout(animationTimer);
    }
  };
}
