const Product = require("../../models/product.model");
const ProductCategory = require("../../models/products-category.model");
const productsHelper = require("../../helpers/products");
const productsCategoryHelper = require("../../helpers/products-category");

// [GET] /products
module.exports.index = async (req, res) => {
    const products = await Product.find({
        status: "active",
        deleted: false
    }).sort({position: "desc"});

    const newProducts = productsHelper.priceNewProducts(products);
    // console.log(products);
    
    res.render("client/pages/products/index", {
        pageTitle: "Trang danh sách sản phẩm",
        products: newProducts
    });
}

// [GET] /products/detail/:slugProduct
module.exports.detail = async (req, res) => {
    try {
        const find = {
            deleted: false,
            slug: req.params.slugProduct,
            status: "active" 
        };

        const product = await Product.findOne(find);

        if (product.product_category_id) {
            const category = await ProductCategory.findOne({
                _id: product.product_category_id,
                status: "active",
                deleted: false
            });

            product.category = category;
        }
        // console.log(product);

        product.priceNew = productsHelper.priceNewProduct(product);

        res.render("client/pages/products/detail", {
            pageTitle: product.title,
            product: product
        });
    } catch (error) {
        res.redirect("/products");
    }
}

// [GET] /products/:slugCategory
module.exports.category = async (req, res) => {
    // console.log(req.params.slugCategory);
    try {
        const category = await ProductCategory.findOne({
            slug: req.params.slugCategory,
            deleted: false
        });

        // Nếu không tìm thấy danh mục, chuyển hướng hoặc thông báo lỗi
        if (!category) {
            // console.log("Khong co danh muc nao");
            return res.redirect("/products"); // Hoặc res.status(404).render("404");
        }

        const listSubCategory = await productsCategoryHelper.getSubCategory(category.id);
        
        const listSubCategoryId = listSubCategory.map(item => item.id);

        // console.log(listSubCategoryId);

        const products = await Product.find({
            product_category_id: { $in: [category.id, ...listSubCategoryId]},
            deleted: false
        }).sort({ position: "desc" });

        const newProducts = productsHelper.priceNewProducts(products);

        res.render("client/pages/products/index", {
            pageTitle: category.title,
            products: newProducts
        });
    } catch (error) {
        console.error("Lỗi controller category:", error);
        res.redirect("/products");
    }
};