const mongoose = require("mongoose");
const StockWaitlist = require("../../models/stock-waitlist.model");
const Product = require("../../models/product.model");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");

const statuses = [
    { value: "waiting", label: "Đang chờ" },
    { value: "contacted", label: "Đã liên hệ" },
    { value: "fulfilled", label: "Đã đáp ứng" },
    { value: "cancelled", label: "Đã hủy" }
];
const validStatuses = statuses.map(item => item.value);
const can = (res, permission) => res.locals.role.permissions.includes("roles_permissions")
    || res.locals.role.permissions.includes(permission);
const basePath = `${systemConfig.prefixAdmin}/stock-waitlist`;

module.exports.index = async (req, res) => {
    if (!can(res, "stock-waitlist_view")) return res.status(403).redirect(`${systemConfig.prefixAdmin}/dashboard`);

    const find = {};
    if (validStatuses.includes(req.query.status)) find.status = req.query.status;
    const keyword = String(req.query.keyword || "").trim();
    if (keyword) {
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        find.$or = [{ fullName: regex }, { phone: regex }, { email: regex }];
    }

    const count = await StockWaitlist.countDocuments(find);
    const pagination = paginationHelper({ currentPage: 1, limitItem: 10 }, req.query, count);
    const registrations = await StockWaitlist.find(find)
        .sort({ createdAt: -1 })
        .limit(pagination.limitItem)
        .skip(pagination.skip)
        .lean();
    const productIds = [...new Set(registrations.map(item => item.product_id))];
    const products = await Product.find({ _id: { $in: productIds } }).select("title thumbnail slug stock").lean();
    const productMap = new Map(products.map(product => [product._id.toString(), product]));
    registrations.forEach(item => { item.product = productMap.get(item.product_id); });

    res.render("admin/pages/stock-waitlist/index", {
        pageTitle: "Khách chờ hàng",
        registrations,
        statuses,
        currentStatus: req.query.status || "",
        keyword,
        pagination
    });
};

module.exports.changeStatus = async (req, res) => {
    if (!can(res, "stock-waitlist_edit") || !mongoose.isValidObjectId(req.params.id) || !validStatuses.includes(req.body.status)) {
        req.flash("error", "Bạn không có quyền hoặc trạng thái không hợp lệ.");
        return res.redirect(req.get("Referrer") || basePath);
    }
    await StockWaitlist.updateOne({ _id: req.params.id }, { $set: { status: req.body.status } });
    req.flash("success", "Đã cập nhật trạng thái khách chờ hàng.");
    res.redirect(req.get("Referrer") || basePath);
};

module.exports.deleteItem = async (req, res) => {
    if (!can(res, "stock-waitlist_delete") || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền xóa yêu cầu chờ hàng.");
        return res.redirect(req.get("Referrer") || basePath);
    }
    await StockWaitlist.deleteOne({ _id: req.params.id });
    req.flash("success", "Đã xóa yêu cầu chờ hàng.");
    res.redirect(req.get("Referrer") || basePath);
};
