const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");

// [GET] /
module.exports.index = async (req, res) => {
    const find = {
        featured: "1",
        deleted: false,
        status: "active"
    }

    const productsFeatured = await Product.find(find).limit(6);

    const newProducts = productsHelper.priceNewProducts(productsFeatured);

    res.render("client/pages/home/index", {
        pageTitle: "Trang chủ",
        productsFeatued: newProducts
    });
}
