// Cap nhat so luong san pham trong gio hang 
const inputQuantity = document.querySelectorAll("input[name='quantity']");
if (inputQuantity.length > 0) {
    inputQuantity.forEach(input => {
        input.addEventListener("change", (e) => {
            const productId = input.getAttribute("item-id");
            const quantity = parseInt(input.value);

            if (quantity > 0) {
                window.location.href = `/cart/update/${productId}/${quantity}`;
            }
        })
    })
}
// Het Cap nhat so luong san pham trong gio hang 


// Xử lý nút tăng / giảm số lượng trong giỏ hàng
const quantityBoxes = document.querySelectorAll(".cart-quantity-box");

if (quantityBoxes.length > 0) {
  quantityBoxes.forEach((box) => {
    const btnMinus = box.querySelector(".btn-minus");
    const btnPlus = box.querySelector(".btn-plus");
    const inputQuantity = box.querySelector(".cart-quantity-input");

    if (btnMinus && btnPlus && inputQuantity) {
      btnMinus.addEventListener("click", () => {
        let currentVal = parseInt(inputQuantity.value) || 1;
        if (currentVal > 1) {
          inputQuantity.value = currentVal - 1;
          inputQuantity.dispatchEvent(new Event("change"));
        }
      });

      btnPlus.addEventListener("click", () => {
        let currentVal = parseInt(inputQuantity.value) || 1;
        inputQuantity.value = currentVal + 1;
        inputQuantity.dispatchEvent(new Event("change"));
      });
    }
  });
}