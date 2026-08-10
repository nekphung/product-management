const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");

// [GET] /
module.exports.index = async (req, res) => {
    // Lay ra san pham noi bat
    const find = {
        featured: "1",
        deleted: false,
        status: "active"
    }

    const productsFeatured = await Product.find(find).limit(6);

    const newProducts = productsHelper.priceNewProducts(productsFeatured);

    // Lay ra san pham moi nhat 
    const productsNew = await Product.find({
        deleted: false,
        status: "active"
    }).sort({ position: "desc" }).limit(6);

    const newProductsNew = productsHelper.priceNewProducts(productsNew);

    res.render("client/pages/home/index", {
        pageTitle: "Trang chủ",
        productsFeatued: newProducts,
        productsNew: newProductsNew
    });
}
