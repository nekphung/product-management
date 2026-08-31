const mongoose = require("mongoose");

const User = require("../../models/user.model");
const Order = require("../../models/order.model");
const paginationHelper = require("../../helpers/pagination");
const searchHelper = require("../../helpers/search");
const systemConfig = require("../../config/system");

const statuses = ["active", "inactive"];
const can = (res, permission) => res.locals.role.permissions.includes(permission);
const customerPath = `${systemConfig.prefixAdmin}/customers`;

const orderTotal = products => (products || []).reduce((total, item) => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discountPercentage) || 0;
    return total + Math.round(price * (1 - discount / 100)) * (Number(item.quantity) || 0);
}, 0);

module.exports.index = async (req, res) => {
    if (!can(res, "customers_view")) return res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    const find = { deleted: false };
    const objectSearch = searchHelper(req.query);

    if (statuses.includes(req.query.status)) find.status = req.query.status;
    if (objectSearch.regex) {
        find.$or = [
            { fullName: objectSearch.regex },
            { email: objectSearch.regex },
            { phone: objectSearch.regex }
        ];
    }

    const countCustomers = await User.countDocuments(find);
    const pagination = paginationHelper({ currentPage: 1, limitItem: 10 }, req.query, countCustomers);
    const sort = req.query.sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const customers = await User.find(find)
        .select("-password -tokenUser")
        .sort(sort)
        .limit(pagination.limitItem)
        .skip(pagination.skip)
        .lean();

    const customerIds = customers.map(item => item._id.toString());
    const orders = await Order.find({ user_id: { $in: customerIds }, deleted: { $ne: true } })
        .select("user_id products status")
        .lean();
    const summaries = new Map();
    orders.forEach(order => {
        const summary = summaries.get(order.user_id) || { orderCount: 0, totalSpent: 0 };
        summary.orderCount += 1;
        if (order.status === "completed") summary.totalSpent += orderTotal(order.products);
        summaries.set(order.user_id, summary);
    });
    customers.forEach(customer => Object.assign(customer, summaries.get(customer._id.toString()) || { orderCount: 0, totalSpent: 0 }));

    res.render("admin/pages/customers/index", {
        pageTitle: "Quản lý khách hàng",
        customers,
        keyword: objectSearch.keyword,
        pagination,
        currentStatus: req.query.status || "",
        currentSort: req.query.sort || "newest"
    });
};

module.exports.detail = async (req, res) => {
    if (!can(res, "customers_view")) return res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    if (!mongoose.isValidObjectId(req.params.id)) return res.redirect(customerPath);
    const customer = await User.findOne({ _id: req.params.id, deleted: false }).select("-password -tokenUser").lean();
    if (!customer) return res.redirect(customerPath);

    const orders = await Order.find({ user_id: customer._id.toString(), deleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    orders.forEach(order => {
        order.code = order._id.toString().slice(-10).toUpperCase();
        order.totalPrice = orderTotal(order.products);
        order.totalQuantity = order.products.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    });
    customer.totalSpent = orders.filter(order => order.status === "completed").reduce((sum, order) => sum + order.totalPrice, 0);

    res.render("admin/pages/customers/detail", { pageTitle: customer.fullName || "Chi tiết khách hàng", customer, orders });
};

module.exports.edit = async (req, res) => {
    if (!can(res, "customers_edit") || !mongoose.isValidObjectId(req.params.id)) return res.redirect(customerPath);
    const customer = await User.findOne({ _id: req.params.id, deleted: false }).select("-password -tokenUser").lean();
    if (!customer) return res.redirect(customerPath);
    res.render("admin/pages/customers/edit", { pageTitle: "Chỉnh sửa khách hàng", customer });
};

module.exports.editPatch = async (req, res) => {
    if (!can(res, "customers_edit") || !mongoose.isValidObjectId(req.params.id)) return res.redirect(customerPath);
    const email = String(req.body.email || "").trim().toLowerCase();
    const emailExists = await User.exists({ _id: { $ne: req.params.id }, email, deleted: false });
    if (!email || emailExists) {
        req.flash("error", emailExists ? `Email ${email} đã tồn tại.` : "Email không được để trống.");
        return res.redirect(req.get("Referrer") || customerPath);
    }

    const update = {
        fullName: String(req.body.fullName || "").trim(),
        email,
        phone: String(req.body.phone || "").trim(),
        address: String(req.body.address || "").trim(),
        status: statuses.includes(req.body.status) ? req.body.status : "active"
    };
    if (req.body.avatar) update.avatar = req.body.avatar;
    await User.updateOne({ _id: req.params.id, deleted: false }, update);
    req.flash("success", "Cập nhật khách hàng thành công.");
    res.redirect(`${customerPath}/detail/${req.params.id}`);
};

module.exports.changeStatus = async (req, res) => {
    if (!can(res, "customers_edit") || !statuses.includes(req.params.status) || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền hoặc trạng thái không hợp lệ.");
        return res.redirect(req.get("Referrer") || customerPath);
    }
    await User.updateOne({ _id: req.params.id, deleted: false }, { status: req.params.status });
    req.flash("success", "Cập nhật trạng thái khách hàng thành công.");
    res.redirect(req.get("Referrer") || customerPath);
};

module.exports.changeMulti = async (req, res) => {
    const ids = String(req.body.ids || "").split(", ").filter(mongoose.isValidObjectId);
    if (!can(res, "customers_edit") || ids.length === 0) {
        req.flash("error", "Vui lòng chọn khách hàng và kiểm tra quyền thao tác.");
        return res.redirect(req.get("Referrer") || customerPath);
    }
    if (statuses.includes(req.body.type)) {
        await User.updateMany({ _id: { $in: ids }, deleted: false }, { status: req.body.type });
        req.flash("success", `Đã cập nhật ${ids.length} khách hàng.`);
    } else if (req.body.type === "delete-all" && can(res, "customers_delete")) {
        await User.updateMany({ _id: { $in: ids } }, { deleted: true, deletedAt: new Date() });
        req.flash("success", `Đã xóa ${ids.length} khách hàng.`);
    } else req.flash("error", "Thao tác không hợp lệ.");
    res.redirect(req.get("Referrer") || customerPath);
};

module.exports.deleteItem = async (req, res) => {
    if (!can(res, "customers_delete") || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền xóa khách hàng.");
        return res.redirect(req.get("Referrer") || customerPath);
    }
    await User.updateOne({ _id: req.params.id }, { deleted: true, deletedAt: new Date() });
    req.flash("success", "Đã xóa khách hàng.");
    res.redirect(customerPath);
};
