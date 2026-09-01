const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");
const paginationHelper = require("../../helpers/pagination");

// [GET] /search
module.exports.index = async (req, res) => {
    const keyword = req.query.keyword;

    let newProducts = [];
    let countProducts = 0;
    let pagination = null;
    
    if (keyword) {
        const escapedKeyword = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const keywordRegex = new RegExp(escapedKeyword, "i");

        const find = {
            title: keywordRegex,
            status: "active",
            deleted: false
        };
        countProducts = await Product.countDocuments(find);
        pagination = paginationHelper({ currentPage: 1, limitItem: 6 }, req.query, countProducts);
        pagination.path = "/search";
        pagination.queryString = new URLSearchParams(
            Object.entries(req.query).filter(([key]) => key !== "page")
        ).toString();
        const products = await Product.find(find)
            .sort({ position: "desc" })
            .limit(pagination.limitItem)
            .skip(pagination.skip);
        
        newProducts = productsHelper.priceNewProducts(products);
    }

    let suggestedProducts = [];
    if (newProducts.length === 0) {
        const products = await Product.find({
            status: "active",
            deleted: false
        }).sort({ featured: "desc", position: "desc" }).limit(6);

        suggestedProducts = productsHelper.priceNewProducts(products);
    }

    res.render("client/pages/search/index", {
        pageTitle: "Kết quả tìm kiếm",
        keyword: keyword,
        products: newProducts,
        suggestedProducts,
        totalProducts: countProducts,
        pagination
    });
}
