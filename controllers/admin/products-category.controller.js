const ProductCategory = require("../../models/products-category.model");
const Product = require("../../models/product.model");
const mongoose = require("mongoose");

const filterStatusHelper = require("../../helpers/filterStatus");
const searchHelper = require("../../helpers/search")
const paginationHelper = require("../../helpers/pagination")
const createTreeHelper = require("../../helpers/createTree")

const systemConfig = require("../../config/system");

// [GET] /admin/product-category
module.exports.index = async (req, res) => {
    const filterStatus = filterStatusHelper(req.query);

    const find = {
        deleted: false,
    }

    if (req.query.status) {
        find.status = req.query.status;
    }

    const records = await ProductCategory.find(find);

    const newRecords = createTreeHelper.tree(records);

    res.render("admin/pages/products-category/index", {
        pageTitle: "Danh mục sản phẩm",
        records: newRecords,
        filterStatus: filterStatus
    });
}

// [GET] /admin/products-category/detail/:id
module.exports.detail = async (req, res) => {
    if (!res.locals.role.permissions.includes("products-category_view") || !mongoose.isValidObjectId(req.params.id)) {
        return res.redirect(`${systemConfig.prefixAdmin}/products-category`);
    }

    const category = await ProductCategory.findOne({ _id: req.params.id, deleted: false }).lean();
    if (!category) return res.redirect(`${systemConfig.prefixAdmin}/products-category`);

    const [parent, children, products, productCount] = await Promise.all([
        category.parent_id && mongoose.isValidObjectId(category.parent_id)
            ? ProductCategory.findOne({ _id: category.parent_id, deleted: false }).select("title").lean()
            : null,
        ProductCategory.find({ parent_id: category._id.toString(), deleted: false }).sort({ position: 1 }).lean(),
        Product.find({ product_category_id: category._id.toString(), deleted: false })
            .select("title thumbnail price stock status slug")
            .sort({ position: 1 })
            .limit(8)
            .lean(),
        Product.countDocuments({ product_category_id: category._id.toString(), deleted: false })
    ]);

    res.render("admin/pages/products-category/detail", {
        pageTitle: `Danh mục ${category.title}`,
        category,
        parent,
        children,
        products,
        productCount
    });
};

// [GET] /admin/products-category/create
module.exports.create = async (req, res) => {
    let find = {
        deleted: false
    };

    const records = await ProductCategory.find(find);

    const newRecords = createTreeHelper.tree(records);

    // console.log(newRecords);

    res.render("admin/pages/products-category/create", {
        pageTitle: "Tạo danh mục sản phẩm",
        records: newRecords
    });
}

// [POST] /admin/products-category/create
module.exports.createPost = async (req, res) => {
    // Check cai nay de postman khong gui len duoc 
    const permissions = res.locals.role.permissions;
    if (permissions.includes("products-category_create")) {
        if (req.body.position == "") {
            const count = await ProductCategory.countDocuments();
            req.body.position = count + 1;
        } else {
        req.body.position = parseInt(req.body.position);
        }

        const record = new ProductCategory(req.body);
        await record.save();

        res.redirect(`${systemConfig.prefixAdmin}/products-category`);
    } else {
        return;
    }
}

// [GET] /admin/products-category/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;

        // console.log(id);
        const data = await ProductCategory.findOne({
            _id: id,
            deleted: false
        })

        const records = await ProductCategory.find({
            deleted: false
        });

        const newRecords = createTreeHelper.tree(records);

        // console.log(data);

        res.render("admin/pages/products-category/edit", {
            pageTitle: "Chỉnh sửa danh mục sản phẩm",
            data: data,
            records: newRecords
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products-category`)
    }
}

// [PATCH] /admin/products-category/edit/:id
module.exports.editPatch = async (req, res) => {
    const id = req.params.id;

    // console.log(id);
    // console.log(req.body);

    req.body.position = parseInt(req.body.position);

    await ProductCategory.updateOne({
        _id: id
    }, req.body);

    res.redirect(req.get("Referrer") || "/");
}

// [PATCH] /admin/products-category/change-multi
module.exports.changeMulti = async (req, res) => {
    if (!res.locals.role.permissions.includes("products-category_edit")) {
        req.flash("error", "Bạn không có quyền cập nhật danh mục.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/products-category`);
    }

    const rawItems = String(req.body.ids || "").split(", ").filter(Boolean);
    const ids = rawItems.filter(mongoose.isValidObjectId);
    if (!rawItems.length) {
        req.flash("error", "Vui lòng chọn ít nhất một danh mục.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/products-category`);
    }

    if (["active", "inactive"].includes(req.body.type)) {
        await ProductCategory.updateMany({ _id: { $in: ids }, deleted: false }, { status: req.body.type });
        req.flash("success", `Đã cập nhật ${ids.length} danh mục.`);
    } else if (req.body.type === "delete-all" && res.locals.role.permissions.includes("products-category_delete")) {
        await ProductCategory.updateMany(
            { _id: { $in: ids }, deleted: false },
            { deleted: true, deletedAt: new Date() }
        );
        req.flash("success", `Đã xóa ${ids.length} danh mục.`);
    } else if (req.body.type === "change-position") {
        for (const item of rawItems) {
            const separator = item.lastIndexOf("-");
            const id = item.slice(0, separator);
            const position = Number(item.slice(separator + 1));
            if (mongoose.isValidObjectId(id) && Number.isInteger(position) && position > 0) {
                await ProductCategory.updateOne({ _id: id, deleted: false }, { position });
            }
        }
        req.flash("success", "Đã cập nhật vị trí danh mục.");
    } else {
        req.flash("error", "Thao tác không hợp lệ hoặc bạn không có quyền xóa.");
    }

    res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/products-category`);
};

// [DELETE] /admin/products-category/delete/:id
module.exports.deleteItem = async (req, res) => {
    if (!res.locals.role.permissions.includes("products-category_delete") || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền xóa danh mục.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/products-category`);
    }
    await ProductCategory.updateOne(
        { _id: req.params.id, deleted: false },
        { deleted: true, deletedAt: new Date() }
    );
    req.flash("success", "Đã xóa danh mục sản phẩm.");
    res.redirect(`${systemConfig.prefixAdmin}/products-category`);
};

