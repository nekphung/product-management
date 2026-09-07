const mongoose = require("mongoose");
const Coupon = require("../../models/coupon.model");
const CouponCollection = require("../../models/coupon-collection.model");
const Product = require("../../models/product.model");
const ProductCategory = require("../../models/products-category.model");
const systemConfig = require("../../config/system");

const basePath = `${systemConfig.prefixAdmin}/coupons`;
const can = (res, permission) => res.locals.role.permissions.includes("roles_permissions") || res.locals.role.permissions.includes(permission);
const cleanIds = value => (Array.isArray(value) ? value : value ? [value] : []).filter(mongoose.isValidObjectId);
const couponData = body => ({
    collection_id: body.collection_id,
    code: String(body.code || "").trim().toUpperCase(),
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    couponType: body.couponType === "shipping" ? "shipping" : "order",
    discountType: body.discountType,
    discountValue: Number(body.discountValue),
    maxDiscount: Number(body.maxDiscount || 0),
    minOrderValue: Number(body.minOrderValue || 0),
    scope: body.scope,
    productIds: cleanIds(body.productIds),
    categoryIds: cleanIds(body.categoryIds),
    usageLimit: Number(body.usageLimit || 0),
    perUserLimit: Math.max(1, Number(body.perUserLimit || 1)),
    stackable: body.stackable === "true",
    status: body.status === "inactive" ? "inactive" : "active"
});
const validCoupon = async data => data.title && data.code && mongoose.isValidObjectId(data.collection_id)
    && ["percentage", "fixed"].includes(data.discountType) && ["order", "products", "categories"].includes(data.scope)
    && data.discountValue > 0 && (data.discountType !== "percentage" || data.discountValue <= 100)
    && await CouponCollection.exists({ _id: data.collection_id, deleted: false });

module.exports.index = async (req, res) => {
    if (!can(res, "coupons_view")) return res.status(403).redirect(`${systemConfig.prefixAdmin}/dashboard`);
    const [collections, coupons] = await Promise.all([
        CouponCollection.find({ deleted: false }).sort({ createdAt: -1 }).lean(),
        Coupon.find({ deleted: false }).sort({ createdAt: -1 }).lean()
    ]);
    const collectionMap = new Map(collections.map(item => [String(item._id), item.title]));
    coupons.forEach(item => { item.collectionTitle = collectionMap.get(item.collection_id) || "Collection đã xóa"; });
    res.render("admin/pages/coupons/index", { pageTitle: "Mã giảm giá", collections, coupons });
};

module.exports.createCollection = (req, res) => {
    if (!can(res, "coupons_create")) return res.status(403).redirect(basePath);
    res.render("admin/pages/coupons/collection-form", { pageTitle: "Tạo collection voucher" });
};
module.exports.createCollectionPost = async (req, res) => {
    if (!can(res, "coupons_create")) return res.status(403).redirect(basePath);
    const data = { title: String(req.body.title || "").trim(), description: String(req.body.description || "").trim(), startAt: req.body.startAt, endAt: req.body.endAt, status: req.body.status };
    if (!data.title || !data.startAt || !data.endAt || new Date(data.endAt) <= new Date(data.startAt)) {
        req.flash("error", "Tên và khoảng thời gian collection không hợp lệ."); return res.redirect(req.get("Referrer") || basePath);
    }
    data.createdBy = { account_id: res.locals.user.id };
    await CouponCollection.create(data); req.flash("success", "Đã tạo collection voucher."); res.redirect(basePath);
};
module.exports.editCollection = async (req, res) => {
    if (!can(res, "coupons_edit") || !mongoose.isValidObjectId(req.params.id)) return res.status(403).redirect(basePath);
    const collection = await CouponCollection.findOne({ _id: req.params.id, deleted: false }).lean();
    if (!collection) return res.redirect(basePath);
    res.render("admin/pages/coupons/collection-form", { pageTitle: "Chỉnh sửa collection", collection });
};
module.exports.editCollectionPatch = async (req, res) => {
    if (!can(res, "coupons_edit") || !mongoose.isValidObjectId(req.params.id)) return res.status(403).redirect(basePath);
    if (!req.body.title || new Date(req.body.endAt) <= new Date(req.body.startAt)) { req.flash("error", "Dữ liệu collection không hợp lệ."); return res.redirect(req.get("Referrer") || basePath); }
    await CouponCollection.updateOne({ _id: req.params.id, deleted: false }, { $set: { title: req.body.title.trim(), description: String(req.body.description || "").trim(), startAt: req.body.startAt, endAt: req.body.endAt, status: req.body.status }, $push: { updatedBy: { account_id: res.locals.user.id, updatedAt: new Date() } } });
    req.flash("success", "Đã cập nhật collection."); res.redirect(basePath);
};

const renderCouponForm = async (res, coupon) => {
    const [collections, products, categories] = await Promise.all([CouponCollection.find({ deleted: false }).lean(), Product.find({ deleted: false }).select("title").lean(), ProductCategory.find({ deleted: false }).select("title").lean()]);
    res.render("admin/pages/coupons/form", { pageTitle: coupon ? "Chỉnh sửa voucher" : "Tạo voucher", coupon, collections, products, categories });
};
module.exports.create = async (req, res) => { if (!can(res, "coupons_create")) return res.status(403).redirect(basePath); await renderCouponForm(res); };
module.exports.createPost = async (req, res) => {
    if (!can(res, "coupons_create")) return res.status(403).redirect(basePath);
    const data = couponData(req.body);
    if (!await validCoupon(data)) { req.flash("error", "Thông tin voucher hoặc điều kiện không hợp lệ."); return res.redirect(req.get("Referrer") || basePath); }
    data.createdBy = { account_id: res.locals.user.id };
    try { await Coupon.create(data); req.flash("success", "Đã tạo voucher."); res.redirect(basePath); }
    catch (error) { req.flash("error", error.code === 11000 ? "Mã voucher đã tồn tại." : "Không thể tạo voucher."); res.redirect(req.get("Referrer") || basePath); }
};
module.exports.edit = async (req, res) => { if (!can(res, "coupons_edit") || !mongoose.isValidObjectId(req.params.id)) return res.status(403).redirect(basePath); await renderCouponForm(res, await Coupon.findOne({ _id: req.params.id, deleted: false }).lean()); };
module.exports.editPatch = async (req, res) => {
    if (!can(res, "coupons_edit") || !mongoose.isValidObjectId(req.params.id)) return res.status(403).redirect(basePath);
    const data = couponData(req.body); if (!await validCoupon(data)) { req.flash("error", "Thông tin voucher không hợp lệ."); return res.redirect(req.get("Referrer") || basePath); }
    try { await Coupon.updateOne({ _id: req.params.id, deleted: false }, { $set: data, $push: { updatedBy: { account_id: res.locals.user.id, updatedAt: new Date() } } }); req.flash("success", "Đã cập nhật voucher."); res.redirect(basePath); }
    catch (error) { req.flash("error", error.code === 11000 ? "Mã voucher đã tồn tại." : "Không thể cập nhật voucher."); res.redirect(req.get("Referrer") || basePath); }
};
module.exports.deleteItem = async (req, res) => { if (!can(res, "coupons_delete") || !mongoose.isValidObjectId(req.params.id)) return res.status(403).redirect(basePath); await Coupon.updateOne({ _id: req.params.id }, { deleted: true, status: "inactive" }); req.flash("success", "Đã xóa voucher."); res.redirect(basePath); };
module.exports.deleteCollection = async (req, res) => { if (!can(res, "coupons_delete") || !mongoose.isValidObjectId(req.params.id)) return res.status(403).redirect(basePath); await Promise.all([CouponCollection.updateOne({ _id: req.params.id }, { deleted: true, status: "inactive" }), Coupon.updateMany({ collection_id: req.params.id }, { status: "inactive" })]); req.flash("success", "Đã xóa collection và ngừng các voucher bên trong."); res.redirect(basePath); };
