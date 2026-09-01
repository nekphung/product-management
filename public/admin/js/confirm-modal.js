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
        <button class="admin-confirm__close" type="button" data-confirm-cancel aria-label="Đóng">&times;</button>
        <div class="admin-confirm__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>
        </div>
        <div class="admin-confirm__content">
          <span class="admin-confirm__eyebrow">Hành động cần xác nhận</span>
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

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.confirmed === "true") return;

    const action = form.getAttribute("action") || "";
    const isDeleteForm = form.hasAttribute("data-confirm-submit")
      || /(?:\?|&)_method=DELETE(?:&|$)/i.test(action);
    if (!isDeleteForm) return;

    event.preventDefault();
    const accepted = await window.adminConfirm({
      title: form.dataset.confirmTitle || "Xác nhận xóa",
      message: form.dataset.confirmMessage || "Bạn có chắc muốn xóa dữ liệu này? Thao tác này không thể hoàn tác.",
      confirmText: form.dataset.confirmText || "Xóa",
      cancelText: form.dataset.cancelText || "Hủy"
    });
    if (accepted) {
      form.dataset.confirmed = "true";
      form.submit();
    }
  });
})();
