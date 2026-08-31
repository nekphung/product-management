(function () {
  let activeResolver = null;

  const ensureModal = () => {
    let modal = document.querySelector("[data-admin-confirm]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "admin-confirm";
    modal.setAttribute("data-admin-confirm", "");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="admin-confirm__backdrop" data-confirm-cancel></div>
      <section class="admin-confirm__dialog" role="alertdialog" aria-modal="true" aria-labelledby="adminConfirmTitle" aria-describedby="adminConfirmMessage">
        <div class="admin-confirm__icon" aria-hidden="true">!</div>
        <div class="admin-confirm__content">
          <h2 id="adminConfirmTitle">Xác nhận thao tác</h2>
          <p id="adminConfirmMessage"></p>
        </div>
        <div class="admin-confirm__actions">
          <button class="admin-confirm__cancel" type="button" data-confirm-cancel>Hủy</button>
          <button class="admin-confirm__accept" type="button" data-confirm-accept>Xác nhận</button>
        </div>
      </section>`;
    document.body.appendChild(modal);

    const close = result => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("admin-confirm-open");
      const resolver = activeResolver;
      activeResolver = null;
      if (resolver) setTimeout(() => resolver(result), 160);
    };
    modal.querySelectorAll("[data-confirm-cancel]").forEach(item => item.addEventListener("click", () => close(false)));
    modal.querySelector("[data-confirm-accept]").addEventListener("click", () => close(true));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) close(false);
    });
    return modal;
  };

  window.adminConfirm = ({
    title = "Xác nhận xóa",
    message = "Bạn có chắc muốn thực hiện thao tác này?",
    confirmText = "Xóa",
    cancelText = "Hủy"
  } = {}) => new Promise(resolve => {
    if (activeResolver) activeResolver(false);
    const modal = ensureModal();
    activeResolver = resolve;
    modal.querySelector("#adminConfirmTitle").textContent = title;
    modal.querySelector("#adminConfirmMessage").textContent = message;
    modal.querySelector("[data-confirm-accept]").textContent = confirmText;
    modal.querySelector("[data-confirm-cancel]").textContent = cancelText;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("admin-confirm-open");
    setTimeout(() => modal.querySelector("[data-confirm-accept]").focus(), 30);
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form[data-confirm-submit]").forEach(form => {
      form.addEventListener("submit", async event => {
        if (form.dataset.confirmed === "true") return;
        event.preventDefault();
        const accepted = await window.adminConfirm({
          title: form.dataset.confirmTitle || "Xác nhận xóa",
          message: form.dataset.confirmMessage,
          confirmText: form.dataset.confirmText || "Xóa"
        });
        if (accepted) {
          form.dataset.confirmed = "true";
          form.submit();
        }
      });
    });
  });
})();
