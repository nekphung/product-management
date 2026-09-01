const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");
const Order = require("../../models/order.model");
const inventoryHelper = require("../../helpers/inventory");

// [GET] /checkout/
module.exports.index = async (req, res) => {
    const cartId = req.cookies.cartId;
    
    const cart = await Cart.findOne({
        _id: cartId
    })

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

    cart.totalPrice = cart.products.reduce((sum, item) => sum + item.totalPrice, 0);

    res.render("client/pages/checkout/index", {
        pageTitle: "Đặt hàng",
        cart: cart
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

    res.render("client/pages/checkout/index", {
        pageTitle: "Mua ngay",
        cart: { products: [item], totalPrice: item.totalPrice },
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
        
        products.push(objectProduct);
    }

    // console.log(products);

    if (products.length === 0) {
        req.flash("error", "Không thể đặt các sản phẩm đã chọn.");
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
    }

    const objectOrder = {
        cart_id: cartId,
        userInfo: userInfo,
        products: products,
        inventoryReserved: true
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

    let order;
    try {
        order = new Order(objectOrder);
        await order.save();
    } catch (error) {
        await inventoryHelper.restoreProducts(reservation.reserved);
        req.flash("error", "Không thể tạo đơn hàng. Tồn kho chưa bị thay đổi, vui lòng thử lại.");
        return res.redirect(isInstantCheckout ? "/products" : "/cart");
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

    order.totalPrice = order.products.reduce((sum, item) => sum + item.totalPrice, 0);
    
    res.render("client/pages/checkout/success", {
        pageTitle: "Đặt hàng thành công",
        order: order
    });
}
