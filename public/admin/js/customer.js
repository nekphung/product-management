const customerSort = document.querySelector("[data-customer-sort]");
if (customerSort) {
  customerSort.addEventListener("change", event => {
    const url = new URL(window.location.href);
    url.searchParams.set("sort", event.target.value);
    url.searchParams.delete("page");
    window.location.href = url.href;
  });
}

const buttonChangeStatus = document.querySelectorAll("[button-change-status]");
if (buttonChangeStatus.length > 0) {
  const formChangeStatus = document.querySelector("#form-change-status");
  const path = formChangeStatus.dataset.path;

  buttonChangeStatus.forEach(button => {
    button.addEventListener("click", () => {
      const statusChange = button.dataset.status === "active" ? "inactive" : "active";
      formChangeStatus.action = `${path}/${statusChange}/${button.dataset.id}?_method=PATCH`;
      formChangeStatus.submit();
    });
  });
}

const buttonDelete = document.querySelectorAll("[button-delete]");
if (buttonDelete.length > 0) {
  const formDeleteItem = document.querySelector("#form-delete-item");
  const path = formDeleteItem.dataset.path;

  buttonDelete.forEach(button => {
    button.addEventListener("click", async () => {
      const accepted = await window.adminConfirm({
        title: "Xóa khách hàng",
        message: "Bạn có chắc muốn xóa khách hàng này? Thao tác sẽ ẩn khách hàng khỏi hệ thống.",
        confirmText: "Xóa khách hàng"
      });
      if (!accepted) return;
      formDeleteItem.action = `${path}/${button.dataset.id}?_method=DELETE`;
      formDeleteItem.submit();
    });
  });
}
