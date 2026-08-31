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


// Nút tăng/giảm được xử lý tập trung trong /js/script.js.

// Chọn riêng các sản phẩm cần thanh toán.
const cartSelectionInputs = [...document.querySelectorAll("[data-cart-select]")];
const cartSelectAll = document.querySelector("[data-cart-select-all]");
const cartCheckoutButton = document.querySelector("[data-cart-checkout]");

if (cartSelectionInputs.length > 0 && cartSelectAll && cartCheckoutButton) {
    const formatMoney = value => `${Number(value).toLocaleString("vi-VN")}đ`;
    const selectedIdsInput = document.querySelector("[data-selected-product-ids]");
    const selectedCountElements = document.querySelectorAll("[data-cart-selected-count], [data-modal-selected-count]");
    const totalElements = document.querySelectorAll("[data-cart-subtotal], [data-cart-total], [data-modal-total], [data-modal-submit-total]");
    const headerCount = document.querySelector("[data-cart-header-count]");

    const updateSelection = () => {
        const selectedInputs = cartSelectionInputs.filter(input => input.checked);
        const selectedTotal = selectedInputs.reduce((total, input) => {
            const item = input.closest("[data-cart-item]");
            const quantity = Number(item.querySelector("input[name='quantity']").value) || 0;
            return total + (Number(item.dataset.unitPrice) || 0) * quantity;
        }, 0);

        cartSelectAll.checked = selectedInputs.length === cartSelectionInputs.length;
        cartSelectAll.indeterminate = selectedInputs.length > 0 && selectedInputs.length < cartSelectionInputs.length;
        selectedIdsInput.value = selectedInputs.map(input => input.value).join(",");
        selectedCountElements.forEach(element => element.textContent = `${selectedInputs.length} mặt hàng đã chọn`);
        totalElements.forEach(element => element.textContent = formatMoney(selectedTotal));
        if (headerCount) headerCount.textContent = `${selectedInputs.length} sản phẩm đã chọn`;

        cartCheckoutButton.disabled = selectedInputs.length === 0;
        cartCheckoutButton.classList.toggle("is-disabled", selectedInputs.length === 0);
        cartCheckoutButton.title = selectedInputs.length === 0 ? "Vui lòng chọn ít nhất một sản phẩm" : "";
    };

    cartSelectAll.addEventListener("change", () => {
        cartSelectionInputs.forEach(input => input.checked = cartSelectAll.checked);
        updateSelection();
    });
    cartSelectionInputs.forEach(input => input.addEventListener("change", updateSelection));
    updateSelection();
}
