// Show Alert 
const showAlert = document.querySelector("[show-alert]");
if (showAlert) {
    const time = parseInt(showAlert.getAttribute("data-time"));
    const closeAlert = showAlert.querySelector("[close-alert]");

    setTimeout(() => {
        showAlert.classList.add("alert-hidden");
    }, time);

    closeAlert.addEventListener("click", () => {
        showAlert.classList.add("alert-hidden");
    })
}

// End Show Alert 

// Button Go Back 
const buttonGoBack = document.querySelectorAll("[button-go-back]");
if (buttonGoBack.length > 0) {
    buttonGoBack.forEach(button => {
        button.addEventListener("click", () => {
            history.back();
        })
    })
}

// End Button Go Back 

document.addEventListener("DOMContentLoaded", () => {
  const avatarInput = document.querySelector("#avatarInput");
  const croppedAvatarFile = document.querySelector("#croppedAvatarFile");
  const imageToCrop = document.querySelector("#imageToCrop");
  const avatarPreview = document.querySelector("[upload-image-preview]");
  const cropModalEl = document.getElementById("cropImageModal");

  if (!avatarInput || !cropModalEl) return;

  let cropper = null;

  // 1. Khi chọn file -> Mở Modal (dùng jQuery hoặc Vanilla Bootstrap)
  avatarInput.addEventListener("change", function (e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = function (event) {
        imageToCrop.src = event.target.result;

        // Bật Modal theo chuẩn Bootstrap 4 & 5
        if (window.jQuery) {
          $(cropModalEl).modal("show");
        } else if (typeof bootstrap !== "undefined") {
          const modal = new bootstrap.Modal(cropModalEl);
          modal.show();
        }
      };
      reader.readAsDataURL(files[0]);
    }
  });

  // 2. Khi Modal vừa hiện ra hoàn tất -> Khởi tạo Cropper
  const handleModalShown = () => {
    if (cropper) {
      cropper.destroy();
    }
    cropper = new Cropper(imageToCrop, {
      aspectRatio: 1, // Tỉ lệ khung hình vuông (Avatar)
      viewMode: 1,
      autoCropArea: 0.8,
      dragMode: "move",
    });
  };

  // 3. Khi đóng Modal -> Dọn dẹp bộ nhớ Cropper
  const handleModalHidden = () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    avatarInput.value = ""; // Reset input chọn file gốc
  };

  // Lắng nghe sự kiện hiển thị/ẩn Modal (Hỗ trợ cả jQuery lẫn Vanilla JS)
  if (window.jQuery) {
    $(cropModalEl).on("shown.bs.modal", handleModalShown);
    $(cropModalEl).on("hidden.bs.modal", handleModalHidden);
  } else {
    cropModalEl.addEventListener("shown.bs.modal", handleModalShown);
    cropModalEl.addEventListener("hidden.bs.modal", handleModalHidden);
  }

  // 4. Khi nhấn nút "Áp dụng & Lưu"
  const cropAndSaveBtn = document.getElementById("cropAndSaveBtn");
  if (cropAndSaveBtn) {
    cropAndSaveBtn.addEventListener("click", () => {
      if (!cropper) return;

      // Cắt ảnh thành canvas kích thước 300x300
      const canvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;

        // Hiển thị ảnh vừa crop lên ảnh đại diện xem trước
        avatarPreview.src = URL.createObjectURL(blob);

        // Đưa File đã crop vào input#croppedAvatarFile để upload khi submit Form
        const croppedFile = new File([blob], "avatar-cropped.png", {
          type: "image/png",
        });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(croppedFile);
        croppedAvatarFile.files = dataTransfer.files;

        // Đóng Modal
        if (window.jQuery) {
          $(cropModalEl).modal("hide");
        } else if (typeof bootstrap !== "undefined") {
          const modal = bootstrap.Modal.getInstance(cropModalEl);
          if (modal) modal.hide();
        }
      }, "image/png");
    });
  }
});

const quantityBoxes = document.querySelectorAll(".cart-quantity-box");

if (quantityBoxes.length > 0) {
  quantityBoxes.forEach((box) => {
    const btnMinus = box.querySelector(".btn-minus");
    const btnPlus = box.querySelector(".btn-plus");
    const inputQuantity = box.querySelector(".cart-quantity-input");

    if (btnMinus && btnPlus && inputQuantity) {
      const maxStock = parseInt(inputQuantity.getAttribute("max")) || Infinity;

      btnMinus.addEventListener("click", () => {
        let currentVal = parseInt(inputQuantity.value) || 1;
        if (currentVal > 1) {
          inputQuantity.value = currentVal - 1;
          inputQuantity.dispatchEvent(new Event("change"));
        }
      });

      btnPlus.addEventListener("click", () => {
        let currentVal = parseInt(inputQuantity.value) || 1;
        if (currentVal < maxStock) {
          inputQuantity.value = currentVal + 1;
          inputQuantity.dispatchEvent(new Event("change"));
        }
      });
    }
  });
}