const orderStatusControls = document.querySelectorAll("[data-order-status]");
const orderStatusForm = document.querySelector("#form-order-status");

if (orderStatusControls.length > 0 && orderStatusForm) {
  orderStatusControls.forEach(control => {
    control.addEventListener("change", () => {
      const path = orderStatusForm.dataset.path;
      orderStatusForm.action = `${path}/${control.value}/${control.dataset.id}?_method=PATCH`;
      orderStatusForm.submit();
    });
  });
}

const orderDeleteButtons = document.querySelectorAll("[data-order-delete]");
const orderDeleteForm = document.querySelector("#form-order-delete");

if (orderDeleteButtons.length > 0 && orderDeleteForm) {
  orderDeleteButtons.forEach(button => {
    button.addEventListener("click", () => {
      if (!confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) return;
      orderDeleteForm.action = `${orderDeleteForm.dataset.path}/${button.dataset.id}?_method=DELETE`;
      orderDeleteForm.submit();
    });
  });
}

const orderSort = document.querySelector("[data-order-sort]");
if (orderSort) {
  orderSort.addEventListener("change", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("sort", orderSort.value);
    url.searchParams.delete("page");
    window.location.href = url.href;
  });
}
