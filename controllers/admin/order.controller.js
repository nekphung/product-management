const mongoose = require("mongoose");

const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const paginationHelper = require("../../helpers/pagination");
const searchHelper = require("../../helpers/search");
const { ORDER_STATUSES } = require("../../helpers/orderStatus");
const systemConfig = require("../../config/system");
const inventoryHelper = require("../../helpers/inventory");

const validStatuses = ORDER_STATUSES.map(item => item.value);

const calculateOrderTotal = products => products.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discountPercentage) || 0;
    const quantity = Number(item.quantity) || 0;
    return total + Math.round(price * (1 - discount / 100)) * quantity;
}, 0);

const decorateOrder = order => ({
    ...order,
    userInfo: order.userInfo || {},
    code: order._id.toString().slice(-10).toUpperCase(),
    status: order.status || "pending",
    totalQuantity: order.products.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    totalPrice: calculateOrderTotal(order.products)
});

const can = (res, permission) => res.locals.role.permissions.includes(permission);

// [GET] /admin/orders
module.exports.index = async (req, res) => {
    const find = { deleted: { $ne: true } };
    const objectSearch = searchHelper(req.query);

    if (req.query.status && validStatuses.includes(req.query.status)) {
        find.status = req.query.status === "pending"
            ? { $in: ["pending", null] }
            : req.query.status;
    }

    if (objectSearch.regex) {
        find.$or = [
            { "userInfo.fullName": objectSearch.regex },
            { "userInfo.phone": objectSearch.regex },
            { "userInfo.address": objectSearch.regex }
        ];
    }

    const countOrders = await Order.countDocuments(find);
    const pagination = paginationHelper({ currentPage: 1, limitItem: 10 }, req.query, countOrders);
    const sort = req.query.sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const records = await Order.find(find)
        .sort(sort)
        .limit(pagination.limitItem)
        .skip(pagination.skip)
        .lean();

    const orders = records.map(decorateOrder);
    const statusFilters = [
        { value: "", label: "Tất cả", active: !req.query.status },
        ...ORDER_STATUSES.map(item => ({
            ...item,
            active: req.query.status === item.value
        }))
    ];

    res.render("admin/pages/orders/index", {
        pageTitle: "Quản lý đơn hàng",
        orders,
        keyword: objectSearch.keyword,
        pagination,
        statusFilters,
        currentSort: req.query.sort || "newest",
        orderStatuses: ORDER_STATUSES
    });
};

// [PATCH] /admin/orders/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    if (!can(res, "orders_edit") || !validStatuses.includes(req.params.status) || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền hoặc trạng thái không hợp lệ.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
    }

    const update = {
        status: req.params.status,
        $push: { updatedBy: { account_id: res.locals.user.id, updatedAt: new Date() } }
    };
    const find = { _id: req.params.id, deleted: { $ne: true } };
    if (req.params.status !== "cancelled") find.status = { $ne: "cancelled" };

    const previousOrder = await Order.findOneAndUpdate(find, update);
    if (!previousOrder) {
        req.flash("error", "Không thể đổi trạng thái của đơn đã hủy.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
    }
    if (req.params.status === "cancelled" && previousOrder.status !== "cancelled" && previousOrder.inventoryReserved && !previousOrder.inventoryRestored) {
        await inventoryHelper.restoreProducts(previousOrder.products);
        await Order.updateOne({ _id: previousOrder._id }, { $set: { inventoryRestored: true } });
    }

    req.flash("success", "Cập nhật trạng thái đơn hàng thành công.");
    res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
};

// [PATCH] /admin/orders/change-multi
module.exports.changeMulti = async (req, res) => {
    if (!can(res, "orders_edit")) {
        req.flash("error", "Bạn không có quyền cập nhật đơn hàng.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
    }

    const ids = String(req.body.ids || "").split(", ").filter(mongoose.isValidObjectId);
    if (ids.length === 0) {
        req.flash("error", "Vui lòng chọn ít nhất một đơn hàng.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
    }

    if (validStatuses.includes(req.body.type)) {
        const orders = await Order.find({ _id: { $in: ids }, deleted: { $ne: true }, status: { $ne: "cancelled" } });
        for (const order of orders) {
            order.status = req.body.type;
            order.updatedBy.push({ account_id: res.locals.user.id, updatedAt: new Date() });
            if (req.body.type === "cancelled" && order.inventoryReserved && !order.inventoryRestored) {
                await inventoryHelper.restoreProducts(order.products);
                order.inventoryRestored = true;
            }
            await order.save();
        }
        req.flash("success", `Đã cập nhật ${ids.length} đơn hàng.`);
    } else if (req.body.type === "delete-all" && can(res, "orders_delete")) {
        await Order.updateMany(
            { _id: { $in: ids } },
            {
                deleted: true,
                deletedBy: { account_id: res.locals.user.id, deletedAt: new Date() }
            }
        );
        req.flash("success", `Đã xóa ${ids.length} đơn hàng.`);
    } else {
        req.flash("error", "Thao tác không hợp lệ.");
    }

    res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
};

// [DELETE] /admin/orders/delete/:id
module.exports.deleteItem = async (req, res) => {
    if (!can(res, "orders_delete") || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền xóa đơn hàng.");
        return res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
    }

    await Order.updateOne(
        { _id: req.params.id },
        {
            deleted: true,
            deletedBy: { account_id: res.locals.user.id, deletedAt: new Date() }
        }
    );

    req.flash("success", "Đã xóa đơn hàng.");
    res.redirect(req.get("Referrer") || `${systemConfig.prefixAdmin}/orders`);
};

// [GET] /admin/orders/detail/:id
module.exports.detail = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.redirect(`${systemConfig.prefixAdmin}/orders`);
    }

    const record = await Order.findOne({ _id: req.params.id, deleted: { $ne: true } }).lean();
    if (!record) return res.redirect(`${systemConfig.prefixAdmin}/orders`);

    const productIds = record.products.map(item => item.product_id).filter(mongoose.isValidObjectId);
    const products = await Product.find({ _id: { $in: productIds } })
        .select("title thumbnail slug")
        .lean();
    const productMap = new Map(products.map(product => [product._id.toString(), product]));

    const order = decorateOrder(record);
    order.products = order.products.map(item => {
        const product = productMap.get(item.product_id);
        const priceNew = Math.round((Number(item.price) || 0) * (1 - (Number(item.discountPercentage) || 0) / 100));
        return {
            ...item,
            title: product ? product.title : "Sản phẩm không còn tồn tại",
            thumbnail: product ? product.thumbnail : "",
            priceNew,
            totalPrice: priceNew * (Number(item.quantity) || 0)
        };
    });

    res.render("admin/pages/orders/detail", {
        pageTitle: `Đơn hàng #${order.code}`,
        order,
        orderStatuses: ORDER_STATUSES
    });
};
