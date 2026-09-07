const Coupon = require("../models/coupon.model");
const CouponCollection = require("../models/coupon-collection.model");
const UserCoupon = require("../models/user-coupon.model");

const lineTotal = item => Math.round((Number(item.price) || 0) * (1 - (Number(item.discountPercentage) || 0) / 100)) * (Number(item.quantity) || 0);

const calculateDiscount = (coupon, products, subtotal, shippingFee = 0) => {
    if (coupon.couponType === "shipping") {
        const base = Math.max(0, Number(shippingFee) || 0);
        if (!base) return 0;
        let shippingDiscount = coupon.discountType === "percentage" ? Math.round(base * Number(coupon.discountValue) / 100) : Number(coupon.discountValue);
        if (Number(coupon.maxDiscount) > 0) shippingDiscount = Math.min(shippingDiscount, Number(coupon.maxDiscount));
        return Math.min(base, Math.max(0, shippingDiscount));
    }
    let eligibleAmount = subtotal;
    if (coupon.scope === "products") {
        const ids = new Set(coupon.productIds || []);
        eligibleAmount = products.filter(item => ids.has(String(item.product_id))).reduce((sum, item) => sum + lineTotal(item), 0);
    } else if (coupon.scope === "categories") {
        const ids = new Set(coupon.categoryIds || []);
        eligibleAmount = products.filter(item => ids.has(String(item.product_category_id))).reduce((sum, item) => sum + lineTotal(item), 0);
    }
    if (eligibleAmount <= 0) return 0;
    let amount = coupon.discountType === "percentage"
        ? Math.round(eligibleAmount * Number(coupon.discountValue) / 100)
        : Math.min(Number(coupon.discountValue), eligibleAmount);
    if (Number(coupon.maxDiscount) > 0) amount = Math.min(amount, Number(coupon.maxDiscount));
    return Math.max(0, amount);
};

const getApplicableCoupons = async (userId, products, options = {}) => {
    const shippingFee = Math.max(0, Number(options.shippingFee) || 0);
    if (!userId) return { applied: [], available: [], discount: 0, orderDiscount: 0, shippingDiscount: 0, shippingFee };
    const subtotal = products.reduce((sum, item) => sum + lineTotal(item), 0);
    const wallet = await UserCoupon.find({ user_id: userId }).lean();
    if (!wallet.length) return { applied: [], available: [], discount: 0, orderDiscount: 0, shippingDiscount: 0, shippingFee };
    const couponIds = wallet.map(item => item.coupon_id);
    const coupons = await Coupon.find({ _id: { $in: couponIds }, status: "active", deleted: false }).lean();
    const collections = await CouponCollection.find({ _id: { $in: coupons.map(item => item.collection_id) }, status: "active", deleted: false }).lean();
    const collectionMap = new Map(collections.map(item => [String(item._id), item]));
    const walletMap = new Map(wallet.map(item => [item.coupon_id, item]));
    const now = new Date();
    const available = coupons.map(coupon => {
        const collection = collectionMap.get(coupon.collection_id);
        const owned = walletMap.get(String(coupon._id));
        let reason = "";
        if (!collection || now < new Date(collection.startAt) || now > new Date(collection.endAt)) reason = "Chưa đến hạn hoặc đã hết hạn";
        else if (subtotal < Number(coupon.minOrderValue || 0)) reason = `Đơn tối thiểu ${Number(coupon.minOrderValue).toLocaleString("vi-VN")}đ`;
        else if (Number(owned.quantity == null ? 1 : owned.quantity) <= 0) reason = "Bạn đã dùng hết số voucher đã lưu";
        const discount = reason ? 0 : calculateDiscount(coupon, products, subtotal, shippingFee);
        if (!reason && discount <= 0) reason = "Không áp dụng cho sản phẩm trong đơn";
        return { ...coupon, walletQuantity: Number(owned.quantity == null ? 1 : owned.quantity), discount, eligible: !reason, reason, collectionTitle: collection ? collection.title : "" };
    });
    const eligible = available.filter(item => item.eligible).sort((a, b) => b.discount - a.discount);
    const requestedIds = Array.isArray(options.selectedCouponIds) ? new Set(options.selectedCouponIds) : null;
    const choose = type => {
        const candidates = eligible.filter(item => (item.couponType || "order") === type);
        return requestedIds ? candidates.find(item => requestedIds.has(String(item._id))) : candidates[0];
    };
    const applied = [choose("order"), choose("shipping")].filter(Boolean);
    const orderDiscount = applied.filter(item => (item.couponType || "order") === "order").reduce((sum, item) => sum + item.discount, 0);
    const shippingDiscount = applied.filter(item => item.couponType === "shipping").reduce((sum, item) => sum + item.discount, 0);
    return { applied, available, discount: orderDiscount + shippingDiscount, orderDiscount, shippingDiscount, shippingFee };
};

const restoreOrderCoupons = async order => {
    if (!order.user_id || !order.appliedCoupons || !order.appliedCoupons.length || order.couponsRestored) return;
    for (const item of order.appliedCoupons) {
        await Coupon.updateOne({ _id: item.coupon_id, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
        await UserCoupon.updateOne({ user_id: order.user_id, coupon_id: item.coupon_id, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1, quantity: 1 }, $pull: { orderIds: String(order._id) } });
    }
};

module.exports = { lineTotal, calculateDiscount, getApplicableCoupons, restoreOrderCoupons };
