const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");
const Order = require("../../models/order.model");
const inventoryHelper = require("../../helpers/inventory");
const Coupon = require("../../models/coupon.model");
const UserCoupon = require("../../models/user-coupon.model");
const couponHelper = require("../../helpers/coupons");
const shippingHelper = require("../../helpers/shipping");

const decorateCartWithCoupons = async (cart, user, selectedCouponIds, shippingMethod = shippingHelper.SHIPPING_METHODS[0]) => {
    cart.totalPrice = cart.products.reduce((sum, item) => sum + item.totalPrice, 0);
    const couponResult = await couponHelper.getApplicableCoupons(user ? user.id : null, cart.products.map(item => ({
        product_id: item.product_id,
        product_category_id: item.productInfo ? item.productInfo.product_category_id : "",
        price: item.productInfo ? item.productInfo.price : 0,
        discountPercentage: item.productInfo ? item.productInfo.discountPercentage : 0,
        quantity: item.quantity
    })), { shippingFee: shippingMethod.fee, selectedCouponIds });
    cart.discountAmount = couponResult.discount;
    cart.shippingFee = shippingMethod.fee;
    cart.finalPrice = Math.max(0, cart.totalPrice + shippingMethod.fee - couponResult.discount);
    return couponResult;
};

// [GET] /checkout/
module.exports.index = async (req, res) => {
    const cartId = req.cookies.cartId;
    
    const cart = await Cart.findOne({
        _id: cartId
    })

    if (!cart) return res.redirect("/cart");

    const selectedFromCart = String(req.query.products || "").split(",").map(item => item.trim()).filter(Boolean);
    if (selectedFromCart.length) {
        const selectedSet = new Set(selectedFromCart);
        cart.products = cart.products.filter(item => selectedSet.has(item.product_id));
    }

    if (cart.products.length > 0) {
        for (const item of cart.products) {
            const productId = item.product_id;

            const productInfo = await Product.findOne({
                _id: productId
            })

            productInfo.priceNew = productsHelper.priceNewProduct(productInfo);
            
            item.productInfo = productInfo;

            item.totalPrice = item.quantity * productInfo.priceNew;
        }
    }
    // console.log(cart);

    const couponResult = await decorateCartWithCoupons(cart, res.locals.user);

    res.render("client/pages/checkout/index", {
        pageTitle: "Đặt hàng",
        cart: cart,
        couponResult,
        shippingMethods: shippingHelper.SHIPPING_METHODS,
        selectedShippingMethod: shippingHelper.SHIPPING_METHODS[0],
        checkoutReturnUrl: req.originalUrl
    });
}

// [GET] /checkout/instant/:productId
module.exports.instant = async (req, res) => {
    const quantity = Number(req.query.quantity || 1);
    const product = await Product.findOne({
        _id: req.params.productId,
        deleted: false,
        status: "active"
    }).catch(() => null);

    if (!product) {
        req.flash("error", "Sản phẩm không còn khả dụng.");
        return res.redirect("/products");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > (Number(product.stock) || 0)) {
        req.flash("error", `${product.title} chỉ còn ${Math.max(Number(product.stock) || 0, 0)} sản phẩm trong kho.`);
        return res.redirect(`/products/detail/${product.slug}`);
    }

    product.priceNew = productsHelper.priceNewProduct(product);
    const item = {
        product_id: product.id,
        quantity,
        productInfo: product,
        totalPrice: quantity * Number(product.priceNew)
    };

    const checkoutCart = { products: [item] };
    const couponResult = await decorateCartWithCoupons(checkoutCart, res.locals.user);
    res.render("client/pages/checkout/index", {
        pageTitle: "Mua ngay",
        cart: checkoutCart,
        couponResult,
        shippingMethods: shippingHelper.SHIPPING_METHODS,
        selectedShippingMethod: shippingHelper.SHIPPING_METHODS[0],
        checkoutReturnUrl: req.originalUrl,
        checkoutMode: "instant"
    });
};

// [POST] /checkout/order
module.exports.order = async (req, res) => {
    const cartId = req.cookies.cartId;
    const isInstantCheckout = req.body.checkoutMode === "instant";
    const selectedProductIds = String(req.body.selectedProductIds || "")
        .split(",")
        .map(id => id.trim())
        .filter(Boolean);
    const userInfo = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod
    };

    const cart = isInstantCheckout ? null : await Cart.findOne({ _id: cartId });

    if ((!isInstantCheckout && !cart) || selectedProductIds.length === 0) {
        req.flash("error", "Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
    }

    const selectedIdSet = new Set(selectedProductIds);
    const selectedCartProducts = isInstantCheckout
        ? [{ product_id: String(req.body.instantProductId || ""), quantity: Number(req.body.instantQuantity) }]
        : cart.products.filter(product => selectedIdSet.has(product.product_id));
    if (selectedCartProducts.length === 0) {
        req.flash("error", "Các sản phẩm đã chọn không còn trong giỏ hàng.");
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
    }

    let products = [];

    for (const product of selectedCartProducts) {
        const quantity = Number(product.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) continue;
        const objectProduct = {
            product_id: product.product_id,
            product_category_id: "",
            price: 0,
            discountPercentage: 0,
            quantity
        }
        const productInfo = await Product.findOne({
            _id: product.product_id
        })

        if (!productInfo) continue;
        objectProduct.price = productInfo.price;
        objectProduct.discountPercentage = productInfo.discountPercentage;
        objectProduct.product_category_id = productInfo.product_category_id;
        
        products.push(objectProduct);
    }

    // console.log(products);

    if (products.length === 0) {
        req.flash("error", "Không thể đặt các sản phẩm đã chọn.");
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
    }

    const subtotal = products.reduce((sum, item) => sum + couponHelper.lineTotal(item), 0);
    const hasCouponSelection = Object.prototype.hasOwnProperty.call(req.body, "couponOrderId") || Object.prototype.hasOwnProperty.call(req.body, "couponShippingId");
    const requestedCouponIds = hasCouponSelection
        ? [req.body.couponOrderId, req.body.couponShippingId].map(item => String(item || "").trim()).filter(Boolean)
        : undefined;
    const shippingMethod = shippingHelper.getShippingMethod(req.body.shippingMethod);
    const couponResult = await couponHelper.getApplicableCoupons(res.locals.user ? res.locals.user.id : null, products, { shippingFee: shippingMethod.fee, selectedCouponIds: requestedCouponIds });
    const objectOrder = {
        cart_id: cartId,
        userInfo: userInfo,
        products: products,
        inventoryReserved: true,
        subtotal,
        shippingFee: shippingMethod.fee,
        shippingDiscount: couponResult.shippingDiscount,
        shippingMethod: { id: shippingMethod.id, name: shippingMethod.name, provider: shippingMethod.provider, eta: shippingMethod.eta },
        discountAmount: couponResult.discount,
        totalPrice: Math.max(0, subtotal + shippingMethod.fee - couponResult.discount),
        appliedCoupons: couponResult.applied.map(item => ({ coupon_id: String(item._id), code: item.code, title: item.title, discountAmount: item.discount }))
    }

    // Nếu người dùng đã đăng nhập, gán user_id và avatar vào đơn hàng
    if (res.locals.user) {
        objectOrder.user_id = res.locals.user.id; // ✅ Thêm user_id vào đơn hàng
        objectOrder.userInfo.avatar = res.locals.user.avatar; // ✅ Thêm avatar
    }

    const reservation = await inventoryHelper.reserveProducts(products);
    if (!reservation.ok) {
        const unavailableProduct = await Product.findById(reservation.productId).select("title stock").lean();
        const productName = unavailableProduct ? unavailableProduct.title : "Một sản phẩm";
        const availableStock = unavailableProduct ? Math.max(Number(unavailableProduct.stock) || 0, 0) : 0;
        req.flash("error", `${productName} không đủ hàng (hiện còn ${availableStock}). Vui lòng điều chỉnh giỏ hàng hoặc đăng ký chờ khi sản phẩm hết hàng.`);
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
    }

    const reservedCoupons = [];
    for (const applied of couponResult.applied) {
        const couponReserved = await Coupon.findOneAndUpdate({ _id: applied._id, status: "active", deleted: false }, { $inc: { usedCount: 1 } });
        const userReserved = couponReserved && await UserCoupon.findOneAndUpdate(
            { user_id: res.locals.user.id, coupon_id: String(applied._id), $or: [{ quantity: { $gt: 0 } }, { quantity: { $exists: false } }] },
            [{ $set: { quantity: { $subtract: [{ $ifNull: ["$quantity", 1] }, 1] }, usedCount: { $add: [{ $ifNull: ["$usedCount", 0] }, 1] }, lastUsedAt: new Date() } }],
            { updatePipeline: true }
        );
        if (!couponReserved || !userReserved) {
            if (couponReserved) await Coupon.updateOne({ _id: applied._id }, { $inc: { usedCount: -1 } });
            for (const item of reservedCoupons) {
                await Coupon.updateOne({ _id: item.couponId }, { $inc: { usedCount: -1 } });
                await UserCoupon.updateOne({ user_id: res.locals.user.id, coupon_id: item.couponId }, { $inc: { quantity: 1, usedCount: -1 }, $unset: { lastUsedAt: "" } });
            }
            await inventoryHelper.restoreProducts(reservation.reserved);
            req.flash("error", "Một voucher vừa hết lượt sử dụng. Vui lòng kiểm tra lại đơn hàng.");
            return res.redirect(isInstantCheckout ? `/checkout/instant/${products[0].product_id}?quantity=${products[0].quantity}` : "/checkout");
        }
        reservedCoupons.push({ couponId: String(applied._id) });
    }

    let order;
    try {
        order = new Order(objectOrder);
        await order.save();
    } catch (error) {
        await inventoryHelper.restoreProducts(reservation.reserved);
        for (const item of reservedCoupons) {
            await Coupon.updateOne({ _id: item.couponId }, { $inc: { usedCount: -1 } });
            await UserCoupon.updateOne({ user_id: res.locals.user.id, coupon_id: item.couponId }, { $inc: { quantity: 1, usedCount: -1 }, $unset: { lastUsedAt: "" } });
        }
        req.flash("error", "Không thể tạo đơn hàng. Tồn kho chưa bị thay đổi, vui lòng thử lại.");
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
    }

    if (reservedCoupons.length) {
        await UserCoupon.updateMany({ user_id: res.locals.user.id, coupon_id: { $in: reservedCoupons.map(item => item.couponId) } }, { $push: { orderIds: order.id } });
    }

    if (!isInstantCheckout) {
        await Cart.updateOne({ _id: cartId }, {
            $pull: { products: { product_id: { $in: products.map(product => product.product_id) } } }
        });
    }

    res.redirect(`/checkout/success/${order.id}`);
}

// [GET] /checkout/success/:orderId
module.exports.success = async (req, res) => {
    // console.log(req.params.orderId);
    const order = await Order.findOne({
        _id: req.params.orderId
    }).lean()

    if (!order) {
        return res.redirect("/products");
    }

    for (const product of order.products) {
        const productInfo = await Product.findOne({
            _id: product.product_id
        }).select("title thumbnail slug");

        product.productInfo = productInfo;

        product.priceNew = productsHelper.priceNewProduct(product);

        product.totalPrice = product.priceNew * product.quantity;
    }

    order.subtotal = order.subtotal || order.products.reduce((sum, item) => sum + item.totalPrice, 0);
    order.discountAmount = order.discountAmount || 0;
    order.totalPrice = Number.isFinite(order.totalPrice) && order.totalPrice > 0 ? order.totalPrice : Math.max(0, order.subtotal - order.discountAmount);
    
    res.render("client/pages/checkout/success", {
        pageTitle: "Đặt hàng thành công",
        order: order
    });
}
