const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");
const Order = require("../../models/order.model");

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

// [POST] /checkout/order
module.exports.order = async (req, res) => {
    const cartId = req.cookies.cartId;
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

    const cart = await Cart.findOne({
        _id: cartId
    })

    if (!cart || selectedProductIds.length === 0) {
        req.flash("error", "Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
        return res.redirect("/cart");
    }

    const selectedIdSet = new Set(selectedProductIds);
    const selectedCartProducts = cart.products.filter(product => selectedIdSet.has(product.product_id));
    if (selectedCartProducts.length === 0) {
        req.flash("error", "Các sản phẩm đã chọn không còn trong giỏ hàng.");
        return res.redirect("/cart");
    }

    let products = [];

    for (const product of selectedCartProducts) {
        const objectProduct = {
            product_id: product.product_id,
            price: 0,
            discountPercentage: 0,
            quantity: product.quantity
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
        return res.redirect("/cart");
    }

    const objectOrder = {
        cart_id: cartId,
        userInfo: userInfo,
        products: products
    }

    // Nếu người dùng đã đăng nhập, gán user_id và avatar vào đơn hàng
    if (res.locals.user) {
        objectOrder.user_id = res.locals.user.id; // ✅ Thêm user_id vào đơn hàng
        objectOrder.userInfo.avatar = res.locals.user.avatar; // ✅ Thêm avatar
    }

    const order = new Order(objectOrder);
    await order.save();

    await Cart.updateOne({ _id: cartId }, {
        $pull: { products: { product_id: { $in: products.map(product => product.product_id) } } }
    });

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
