/* AROUN — Accessible three-step consultation request preview.
   This module does not submit or store personal data on a server. */
export function initBookingForm() {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const form = $("#bookingForm");
  if (!form) return { destroy() {} };

  const steps = $$("[data-booking-step]", form);
  const serviceButtons = $$("[data-booking-service]", form);
  const serviceValue = $("#bookingServiceValue");
  const stepLabel = $("#bookingStepLabel");
  const progressBar = $("#bookingProgressBar");
  const nextButton = $("#bookingNext");
  const backButton = $("#bookingBack");
  const submitButton = $("#bookingSubmit");
  const formMessage = $("#bookingMessage");
  const serviceError = $("#bookingServiceError");
  const successPanel = $("#bookingSuccess");
  const bookingSummary = $("#bookingSummary");
  const resetButton = $("#bookingReset");
  const dateInput = $("#bookingDate");
  const timeInput = $("#bookingTime");
  const nameInput = $("#bookingName");
  const phoneInput = $("#bookingPhone");
  const emailInput = $("#bookingEmail");
  const consentInput = $("#bookingConsent");

  const abort = new AbortController();
  const { signal } = abort;
  let currentStep = 1;
  let selectedService = "";

  const persianDateFormat = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long"
  });

  function toLatinDigits(value) {
    return String(value)
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  }

  function normalizePhone(value) {
    let number = toLatinDigits(value).replace(/[\s().-]/g, "");
    if (number.startsWith("+98")) number = `0${number.slice(3)}`;
    if (number.startsWith("0098")) number = `0${number.slice(4)}`;
    return number;
  }

  function setError(name, message) {
    const field = form.elements.namedItem(name);
    const error = $(`[data-field-error="${name}"]`, form);

    if (field && "setAttribute" in field) {
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
    if (error) error.textContent = message || "";
  }

  function clearStepErrors(stepNumber) {
    const step = steps.find((item) => Number(item.dataset.bookingStep) === stepNumber);
    if (!step) return;

    $$("[data-field-error]", step).forEach((error) => {
      error.textContent = "";
    });

    $$('[aria-invalid="true"]', step).forEach((field) => {
      field.removeAttribute("aria-invalid");
    });

    if (formMessage) formMessage.textContent = "";
    if (stepNumber === 1 && serviceError) serviceError.textContent = "";
  }

  function renderStep(stepNumber, { focus = true } = {}) {
    currentStep = Math.max(1, Math.min(3, stepNumber));

    steps.forEach((step) => {
      const active = Number(step.dataset.bookingStep) === currentStep;
      step.hidden = !active;
      step.setAttribute("aria-hidden", String(!active));
    });

    if (stepLabel) stepLabel.textContent = `مرحلهٔ ${currentStep} از ۳`;
    if (progressBar) progressBar.style.width = `${(currentStep / 3) * 100}%`;
    if (backButton) backButton.hidden = currentStep === 1;
    if (nextButton) nextButton.hidden = currentStep === 3;
    if (submitButton) submitButton.hidden = currentStep !== 3;

    clearStepErrors(currentStep);

    if (focus) {
      const focusSelectors = {
        1: ".booking-service-choice",
        2: "#bookingDate",
        3: "#bookingName"
      };
      const focusTarget = form.querySelector(focusSelectors[currentStep]);
      focusTarget?.focus?.({ preventScroll: true });
    }
  }

  function validateStepOne() {
    if (selectedService) return true;
    if (serviceError) serviceError.textContent = "لطفاً موضوع مشاوره را انتخاب کنید.";
    serviceButtons[0]?.focus();
    return false;
  }

  function validateStepTwo() {
    let valid = true;
    const dateValue = dateInput?.value || "";
    const timeValue = timeInput?.value || "";

    if (!dateValue) {
      setError("date", "یک تاریخ پیشنهادی انتخاب کنید.");
      valid = false;
    } else {
      const date = new Date(`${dateValue}T12:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(date.getTime()) || date < today) {
        setError("date", "تاریخ باید امروز یا روزی در آینده باشد.");
        valid = false;
      } else if (date.getDay() === 5) {
        setError("date", "کلینیک جمعه‌ها تعطیل است؛ روز دیگری انتخاب کنید.");
        valid = false;
      } else {
        setError("date", "");
      }
    }

    if (!timeValue) {
      setError("time", "بازهٔ زمانی را انتخاب کنید.");
      valid = false;
    } else {
      const date = dateValue ? new Date(`${dateValue}T12:00:00`) : null;
      const thursday = date && !Number.isNaN(date.getTime()) && date.getDay() === 4;
      if (thursday && timeValue !== "09:00 تا 12:00") {
        setError("time", "پنجشنبه پذیرش تا ساعت ۱۴ است؛ بازهٔ ۹ تا ۱۲ را انتخاب کنید.");
        valid = false;
      } else {
        setError("time", "");
      }
    }

    if (!valid) {
      const firstInvalid = steps[1]?.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
    }

    return valid;
  }

  function validateStepThree() {
    let valid = true;
    const name = (nameInput?.value || "").trim();
    const phone = normalizePhone(phoneInput?.value || "");
    const email = (emailInput?.value || "").trim();

    if (name.length < 2) {
      setError("fullName", "نام و نام خانوادگی را وارد کنید.");
      valid = false;
    } else {
      setError("fullName", "");
    }

    if (!/^09\d{9}$/.test(phone)) {
      setError("phone", "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم داشته باشد.");
      valid = false;
    } else {
      setError("phone", "");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("email", "قالب ایمیل را بررسی کنید.");
      valid = false;
    } else {
      setError("email", "");
    }

    if (!consentInput?.checked) {
      const error = $('[data-field-error="consent"]', form);
      if (error) error.textContent = "برای ادامه، نمایشی بودن فرم را تأیید کنید.";
      consentInput?.setAttribute("aria-invalid", "true");
      valid = false;
    } else {
      const error = $('[data-field-error="consent"]', form);
      if (error) error.textContent = "";
      consentInput?.removeAttribute("aria-invalid");
    }

    if (!valid) {
      const firstInvalid = steps[2]?.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
    }

    return valid;
  }

  function validateCurrentStep() {
    if (currentStep === 1) return validateStepOne();
    if (currentStep === 2) return validateStepTwo();
    return validateStepThree();
  }

  function showSummary() {
    const date = new Date(`${dateInput.value}T12:00:00`);
    const dateText = persianDateFormat.format(date);
    const name = (nameInput.value || "").trim();
    const email = (emailInput.value || "").trim();
    const phone = normalizePhone(phoneInput.value || "");

    const summaryLines = [
      `نام: ${name}`,
      `موضوع مشاوره: ${selectedService}`,
      `تاریخ پیشنهادی: ${dateText}`,
      `بازهٔ زمانی: ${timeInput.value}`,
      `موبایل: ${phone}`
    ];

    if (email) summaryLines.push(`ایمیل: ${email}`);
    if (bookingSummary) bookingSummary.textContent = summaryLines.join(" · ");

    form.hidden = true;
    if (successPanel) successPanel.hidden = false;
    successPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearAllErrors() {
    $$('[data-field-error]', form).forEach((element) => { element.textContent = ""; });
    $$('[aria-invalid="true"]', form).forEach((field) => field.removeAttribute("aria-invalid"));
    if (serviceError) serviceError.textContent = "";
    if (formMessage) formMessage.textContent = "";
  }

  serviceButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selectedService = button.dataset.bookingService || "";
      if (serviceValue) serviceValue.value = selectedService;

      serviceButtons.forEach((choice) => {
        const selected = choice === button;
        choice.setAttribute("aria-pressed", String(selected));
        choice.classList.toggle("is-selected", selected);
      });

      if (serviceError) serviceError.textContent = "";
      if (formMessage) formMessage.textContent = "";
    }, { signal });
  });

  nextButton?.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    renderStep(currentStep + 1);
  }, { signal });

  backButton?.addEventListener("click", () => {
    renderStep(currentStep - 1);
  }, { signal });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (currentStep !== 3 || !validateCurrentStep()) return;
    showSummary();
  }, { signal });

  resetButton?.addEventListener("click", () => {
    form.reset();
    selectedService = "";
    if (serviceValue) serviceValue.value = "";
    serviceButtons.forEach((button) => {
      button.setAttribute("aria-pressed", "false");
      button.classList.remove("is-selected");
    });
    if (successPanel) successPanel.hidden = true;
    form.hidden = false;
    clearAllErrors();
    renderStep(1, { focus: false });
    form.querySelector("h3")?.focus?.({ preventScroll: true });
  }, { signal });

  // Use local calendar date (not UTC) for the minimum selectable date.
  if (dateInput) {
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
    dateInput.min = localDate;
  }

  renderStep(1, { focus: false });

  return {
    destroy() {
      abort.abort();
    }
  };
}
