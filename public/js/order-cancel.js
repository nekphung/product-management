document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-cancel-order-form]");
  if (!form) return;

  const reasons = form.querySelectorAll('input[name="cancelReason"]');
  const otherField = form.querySelector("[data-cancel-other-field]");
  const otherInput = form.querySelector('textarea[name="otherReason"]');

  const updateOtherField = () => {
    const selected = form.querySelector('input[name="cancelReason"]:checked');
    const showOther = selected && selected.value === "other";

    otherField.hidden = !showOther;
    otherInput.required = Boolean(showOther);
    if (!showOther) otherInput.value = "";
  };

  reasons.forEach(reason => reason.addEventListener("change", updateOtherField));
  updateOtherField();

  form.addEventListener("submit", event => {
    const selected = form.querySelector('input[name="cancelReason"]:checked');
    if (!selected || (selected.value === "other" && !otherInput.value.trim())) {
      event.preventDefault();
      if (selected && selected.value === "other") otherInput.focus();
    }
  });
});
