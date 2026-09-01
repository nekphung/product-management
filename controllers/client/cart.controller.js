const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");

// [GET] /
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

    res.render("client/pages/cart/index", {
        pageTitle: "Giỏ hàng",
        cart: cart
    });
}

// [POST] /add/:productId
module.exports.addPost = async (req, res) => {
    const cartId = req.cookies.cartId;
    const productId = req.params.productId;
    const quantity = Number(req.body.quantity);

    const product = await Product.findOne({
        _id: productId,
        deleted: false,
        status: "active"
    }).select("stock title").lean().catch(() => null);

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
        req.flash("error", "Sản phẩm hoặc số lượng không hợp lệ.");
        return res.redirect(req.get("Referrer") || "/products");
    }

    const cart = await Cart.findOne({
        _id: cartId
    });

    const existProductInCart = cart.products.find(item => item.product_id == productId);
    const requestedQuantity = quantity + (existProductInCart ? Number(existProductInCart.quantity) : 0);
    if (requestedQuantity > Math.max(Number(product.stock) || 0, 0)) {
        req.flash("error", `${product.title} chỉ còn ${Math.max(Number(product.stock) || 0, 0)} sản phẩm trong kho.`);
        return res.redirect(req.get("Referrer") || "/products");
    }

    // console.log(existProductInCart);

    if (existProductInCart) {
        // console.log("Cap nhat quantity");
        const newQuantity = quantity + existProductInCart.quantity;
        // console.log(newQuantity);

        await Cart.updateOne(
            {
                _id: cartId,
                'products.product_id': productId
            }, {
                'products.$.quantity': newQuantity
            }
        )
    } else {
        const objectCart = {
            product_id: productId,
            quantity: quantity
        }

        await Cart.updateOne(
            {
                _id: cartId
            }, {
                $push: { products: objectCart }
            }
        )
    }
    req.flash("success", "Thêm sản phẩm vào giỏ hàng thành công!");
    
    res.redirect(req.get("Referrer") || "/");
}

// [GET] /delete/:productId
module.exports.delete = async (req, res) => {
    const productId = req.params.productId;

    // console.log(productId);
    const cartId = req.cookies.cartId;
    await Cart.updateOne({
        _id: cartId
    }, {
        "$pull": { products: {"product_id": productId}}
    })

    req.flash("success", "Đã xóa sản phẩm khỏi giỏ hàng!");
    res.redirect(req.get("Referrer") || "/");
}

// [GET] /update/:productId/:quantity
module.exports.update = async (req, res) => {
    const cartId = req.cookies.cartId;
    const productId = req.params.productId;
    const quantity = Number(req.params.quantity);
    const product = await Product.findOne({ _id: productId, deleted: false, status: "active" })
        .select("stock title").lean().catch(() => null);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > (Number(product.stock) || 0)) {
        req.flash("error", product
            ? `${product.title} chỉ còn ${Math.max(Number(product.stock) || 0, 0)} sản phẩm trong kho.`
            : "Sản phẩm không còn khả dụng.");
        return res.redirect(req.get("Referrer") || "/cart");
    }

    await Cart.updateOne({
        _id: cartId,
        'products.product_id': productId
    }, {
        'products.$.quantity': quantity
    })

    req.flash("success", "Đã cập nhật số lượng!");
    res.redirect(req.get("Referrer") || "/");
}
