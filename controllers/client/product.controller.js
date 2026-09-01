const Product = require("../../models/product.model");
const ProductCategory = require("../../models/products-category.model");
const productsHelper = require("../../helpers/products");
const productsCategoryHelper = require("../../helpers/products-category");
const StockWaitlist = require("../../models/stock-waitlist.model");
const paginationHelper = require("../../helpers/pagination");

const createPagination = (req, count) => {
    const pagination = paginationHelper({ currentPage: 1, limitItem: 6 }, req.query, count);
    pagination.path = req.originalUrl.split("?")[0];
    pagination.queryString = new URLSearchParams(
        Object.entries(req.query).filter(([key]) => key !== "page")
    ).toString();
    return pagination;
};

// [GET] /products
module.exports.index = async (req, res) => {
    const find = {
        status: "active",
        deleted: false
    };
    const countProducts = await Product.countDocuments(find);
    const pagination = createPagination(req, countProducts);
    const products = await Product.find(find)
        .sort({position: "desc"})
        .limit(pagination.limitItem)
        .skip(pagination.skip);

    const newProducts = productsHelper.priceNewProducts(products);
    // console.log(products);
    
    res.render("client/pages/products/index", {
        pageTitle: "Trang danh sách sản phẩm",
        products: newProducts,
        totalProducts: countProducts,
        pagination
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

        const find = {
            product_category_id: { $in: [category.id, ...listSubCategoryId]},
            deleted: false,
            status: "active"
        };
        const countProducts = await Product.countDocuments(find);
        const pagination = createPagination(req, countProducts);
        const products = await Product.find(find)
            .sort({ position: "desc" })
            .limit(pagination.limitItem)
            .skip(pagination.skip);

        const newProducts = productsHelper.priceNewProducts(products);

        res.render("client/pages/products/index", {
            pageTitle: category.title,
            products: newProducts,
            totalProducts: countProducts,
            pagination
        });
    } catch (error) {
        console.error("Lỗi controller category:", error);
        res.redirect("/products");
    }
};

// [POST] /products/detail/:productId/waitlist
module.exports.joinWaitlist = async (req, res) => {
    const product = await Product.findOne({
        _id: req.params.productId,
        deleted: false,
        status: "active"
    }).select("slug title stock").lean().catch(() => null);

    if (!product) {
        req.flash("error", "Sản phẩm không tồn tại.");
        return res.redirect("/products");
    }
    if (Number(product.stock) > 0) {
        req.flash("success", "Sản phẩm đã có hàng, bạn có thể đặt mua ngay.");
        return res.redirect(`/products/detail/${product.slug}`);
    }

    const fullName = String(req.body.fullName || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim();
    const quantity = Number(req.body.quantity);
    if (!fullName || !phone || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        req.flash("error", "Vui lòng nhập họ tên, số điện thoại và số lượng hợp lệ.");
        return res.redirect(`/products/detail/${product.slug}`);
    }

    await StockWaitlist.findOneAndUpdate({
        product_id: product._id.toString(),
        phone,
        status: "waiting"
    }, {
        $set: {
            user_id: res.locals.user ? res.locals.user.id : "",
            fullName,
            email,
            quantity
        }
    }, { upsert: true, new: true, setDefaultsOnInsert: true });

    req.flash("success", "Đã đăng ký chờ. Người bán sẽ thấy yêu cầu và liên hệ khi có hàng.");
    res.redirect(`/products/detail/${product.slug}`);
};
