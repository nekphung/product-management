const voucherPicker = document.querySelector("[data-voucher-picker]");

if (voucherPicker) {
    const formatMoney = value => `${Number(value).toLocaleString("vi-VN")}đ`;
    const subtotal = Number(voucherPicker.dataset.subtotal) || 0;
    const shippingFee = Number(voucherPicker.dataset.shippingFee) || 0;
    const orderDiscountLine = document.querySelector("[data-checkout-order-discount]");
    const orderDiscountValue = orderDiscountLine ? orderDiscountLine.querySelector("strong") : null;
    const shippingDiscountLine = document.querySelector("[data-checkout-shipping-discount]");
    const shippingDiscountValue = shippingDiscountLine ? shippingDiscountLine.querySelector("strong") : null;
    const totalValue = document.querySelector("[data-checkout-total]");
    const shippingValue = document.querySelector("[data-checkout-shipping]");
    const shippingInputs = [...document.querySelectorAll("[data-shipping-fee]")];

    const updateVoucherTotal = () => {
        const activeShipping = shippingInputs.find(input => input.checked);
        const currentShippingFee = activeShipping ? Number(activeShipping.dataset.shippingFee) || 0 : shippingFee;
        const shippingOptions = voucherPicker.querySelectorAll("[data-coupon-type='shipping']");
        shippingOptions.forEach(option => {
            const type = option.dataset.discountType;
            const value = Number(option.dataset.discountValue) || 0;
            const maximum = Number(option.dataset.maxDiscount) || 0;
            let amount = type === "percentage" ? Math.round(currentShippingFee * value / 100) : value;
            if (maximum > 0) amount = Math.min(amount, maximum);
            amount = Math.min(currentShippingFee, Math.max(0, amount));
            option.dataset.discount = amount;
            const input = option.querySelector("input");
            const serverEligible = option.dataset.serverEligible === "true";
            if (input) input.disabled = !serverEligible || currentShippingFee <= 0;
            option.classList.toggle("is-disabled", !serverEligible || currentShippingFee <= 0);
            const hint = option.querySelector("small");
            if (hint && !option.classList.contains("is-disabled")) hint.textContent = `Giảm ${formatMoney(amount)} phí giao hàng`;
        });
        const selectedShippingCoupon = voucherPicker.querySelector("input[name='couponShippingId']:checked");
        if (selectedShippingCoupon && selectedShippingCoupon.disabled) {
            const noShippingCoupon = voucherPicker.querySelector("input[name='couponShippingId'][value='']");
            if (noShippingCoupon) noShippingCoupon.checked = true;
        }
        const checked = [...voucherPicker.querySelectorAll("input[type='radio']:checked")];
        const discounts = checked.reduce((result, input) => {
            const option = input.closest("[data-coupon-option]");
            if (!option) return result;
            const amount = Number(option.dataset.discount) || 0;
            if (option.dataset.couponType === "shipping") result.shipping += amount;
            else result.order += amount;
            return result;
        }, { order: 0, shipping: 0 });
        const discount = discounts.order + discounts.shipping;
        if (orderDiscountLine) orderDiscountLine.hidden = discounts.order <= 0;
        if (orderDiscountValue) orderDiscountValue.textContent = `-${formatMoney(discounts.order)}`;
        if (shippingDiscountLine) shippingDiscountLine.hidden = discounts.shipping <= 0;
        if (shippingDiscountValue) shippingDiscountValue.textContent = `-${formatMoney(discounts.shipping)}`;
        if (shippingValue) shippingValue.textContent = formatMoney(currentShippingFee);
        if (totalValue) totalValue.textContent = formatMoney(Math.max(0, subtotal + currentShippingFee - discount));
    };

    voucherPicker.addEventListener("change", updateVoucherTotal);
    shippingInputs.forEach(input => input.addEventListener("change", updateVoucherTotal));
    updateVoucherTotal();
}
