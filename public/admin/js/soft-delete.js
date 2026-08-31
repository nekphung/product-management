const softDeleteButtons = document.querySelectorAll("[button-delete]");
const softDeleteForm = document.querySelector("#form-delete-item");

if (softDeleteButtons.length > 0 && softDeleteForm) {
  const path = softDeleteForm.dataset.path;
  const label = softDeleteForm.dataset.deleteLabel || "bản ghi";

  softDeleteButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const accepted = await window.adminConfirm({
        title: `Xóa ${label}`,
        message: `Bạn có chắc muốn xóa ${label} này? Dữ liệu sẽ được chuyển sang trạng thái đã xóa.`,
        confirmText: "Xóa"
      });
      if (!accepted) return;
      softDeleteForm.action = `${path}/${button.dataset.id}?_method=DELETE`;
      softDeleteForm.submit();
    });
  });
}
