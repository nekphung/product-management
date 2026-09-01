const Product = require("../models/product.model");

module.exports.reserveProducts = async products => {
    const reserved = [];

    for (const item of products) {
        const quantity = Number(item.quantity);
        const product = await Product.findOneAndUpdate({
            _id: item.product_id,
            deleted: false,
            status: "active",
            stock: { $gte: quantity }
        }, {
            $inc: { stock: -quantity }
        }, { new: true });

        if (!product) {
            await module.exports.restoreProducts(reserved);
            return { ok: false, productId: item.product_id };
        }

        reserved.push({ product_id: item.product_id, quantity });
    }

    return { ok: true, reserved };
};

module.exports.restoreProducts = async products => {
    if (!products || products.length === 0) return;
    await Promise.all(products.map(item => Product.updateOne(
        { _id: item.product_id },
        { $inc: { stock: Number(item.quantity) || 0 } }
    )));
};
