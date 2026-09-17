const ProductCategory = require("../../models/products-category.model");
const Product = require("../../models/product.model");
const { isObjectIdOrHexString } = require("mongoose");

const filterStatusHelper = require("../../helpers/filterStatus");
const createTreeHelper = require("../../helpers/createTree")

const systemConfig = require("../../config/system");

// [GET] /admin/products-category/detail/:id
module.exports.detail = async (req, res) => {
    if (!res.locals.role?.permissions?.includes("products-category_view")) {
        return res.sendStatus(403);
    }
    if (!isObjectIdOrHexString(req.params.id)) return res.sendStatus(404);

    const category = await ProductCategory.findOne({ _id: req.params.id, deleted: false });
    if (!category) return res.sendStatus(404);

    const [parent, children, products, productCount] = await Promise.all([
        isObjectIdOrHexString(category.parent_id)
            ? ProductCategory.findOne({ _id: category.parent_id, deleted: false })
            : null,
        ProductCategory.find({ parent_id: String(category._id), deleted: false }).sort({ position: 1 }),
        Product.find({ product_category_id: String(category._id), deleted: false }).sort({ position: 1 }).limit(10),
        Product.countDocuments({ product_category_id: String(category._id), deleted: false })
    ]);

    res.render("admin/pages/products-category/detail", {
        pageTitle: category.title, category, parent, children, products, productCount
    });
};

// [PATCH] /admin/products-category/change-multi
module.exports.changeMulti = async (req, res) => {
    const { type, ids } = req.body || {};
    if (!["active", "inactive", "delete-all", "change-position"].includes(type)) {
        return res.sendStatus(400);
    }
    const permission = type === "delete-all" ? "products-category_delete" : "products-category_edit";
    if (!res.locals.role?.permissions?.includes(permission)) return res.sendStatus(403);
    if (typeof ids !== "string" || !ids.trim()) return res.sendStatus(400);

    const entries = ids.split(",").map(value => value.trim());
    if (type === "change-position") {
        const positions = entries.map(value => {
            const match = /^([a-f\d]{24})-(\d+)$/i.exec(value);
            return match ? { id: match[1], position: Number(match[2]) } : null;
        });
        if (positions.some(item => !item || !Number.isSafeInteger(item.position) || item.position < 1)) {
            return res.sendStatus(400);
        }
        for (const item of positions) {
            await ProductCategory.updateOne({ _id: item.id, deleted: false }, { $set: { position: item.position } });
        }
    } else {
        if (entries.some(id => !isObjectIdOrHexString(id))) return res.sendStatus(400);
        const update = type === "delete-all"
            ? { deleted: true, deletedAt: new Date() }
            : { status: type };
        await ProductCategory.updateMany({ _id: { $in: entries }, deleted: false }, { $set: update });
    }

    req.flash("success", "Cập nhật danh mục thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/products-category`);
};

// [DELETE] /admin/products-category/delete/:id
module.exports.deleteItem = async (req, res) => {
    if (!res.locals.role?.permissions?.includes("products-category_delete")) return res.sendStatus(403);
    if (!isObjectIdOrHexString(req.params.id)) return res.sendStatus(400);
    const result = await ProductCategory.updateOne(
        { _id: req.params.id, deleted: false },
        { $set: { deleted: true, deletedAt: new Date() } }
    );
    if (!result.matchedCount) return res.sendStatus(404);
    req.flash("success", "Đã xóa danh mục thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/products-category`);
};

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

