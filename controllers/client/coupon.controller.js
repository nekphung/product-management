const mongoose = require("mongoose");
const Coupon = require("../../models/coupon.model");
const CouponCollection = require("../../models/coupon-collection.model");
const UserCoupon = require("../../models/user-coupon.model");

const safeReturnTo = value => {
    const path = String(value || "");
    return path.startsWith("/checkout") && !path.startsWith("//") ? path : "";
};

module.exports.index = async (req, res) => {
    const now = new Date();
    const collections = await CouponCollection.find({ deleted: false, status: "active", startAt: { $lte: now }, endAt: { $gte: now } }).sort({ endAt: 1 }).lean();
    const coupons = await Coupon.find({ deleted: false, status: "active", collection_id: { $in: collections.map(item => String(item._id)) } }).sort({ createdAt: -1 }).lean();
    const owned = res.locals.user ? await UserCoupon.find({ user_id: res.locals.user.id }).lean() : [];
    const ownedMap = new Map(owned.map(item => [item.coupon_id, item]));
    const grouped = collections.map(collection => ({
        ...collection,
        coupons: coupons.filter(coupon => coupon.collection_id === String(collection._id)).map(coupon => {
            const wallet = ownedMap.get(String(coupon._id));
            const quantity = wallet ? Number(wallet.quantity == null ? 1 : wallet.quantity) : 0;
            const ownedTotal = quantity + Number(wallet ? wallet.usedCount : 0);
            const hasSupply = Number(coupon.usageLimit) === 0 || Number(coupon.claimedCount || 0) < Number(coupon.usageLimit);
            return { ...coupon, wallet, walletQuantity: quantity, canCollect: hasSupply && ownedTotal < Number(coupon.perUserLimit || 1) };
        })
    })).filter(item => item.coupons.length);
    res.render("client/pages/coupons/index", { pageTitle: "Kho voucher", collections: grouped, returnTo: safeReturnTo(req.query.returnTo) });
};

module.exports.wallet = async (req, res) => {
    const wallet = await UserCoupon.find({ user_id: res.locals.user.id }).sort({ createdAt: -1 }).lean();
    const coupons = await Coupon.find({ _id: { $in: wallet.map(item => item.coupon_id) }, deleted: false }).lean();
    const collections = await CouponCollection.find({ _id: { $in: coupons.map(item => item.collection_id) } }).lean();
    const collectionMap = new Map(collections.map(item => [String(item._id), item]));
    const walletMap = new Map(wallet.map(item => [item.coupon_id, item]));
    const now = new Date();
    const items = coupons.map(coupon => {
        const owned = walletMap.get(String(coupon._id));
        const collection = collectionMap.get(coupon.collection_id);
        const expired = !collection || new Date(collection.endAt) < now || new Date(collection.startAt) > now || collection.status !== "active" || coupon.status !== "active";
        return { ...coupon, wallet: owned, walletQuantity: Number(owned.quantity == null ? 1 : owned.quantity), collection, expired };
    }).filter(coupon => coupon.walletQuantity > 0);
    const validVoucherCount = items.filter(item => !item.expired).reduce((sum, item) => sum + item.walletQuantity, 0);
    res.render("client/pages/coupons/wallet", { pageTitle: "Voucher của tôi", coupons: items, validVoucherCount });
};

module.exports.collect = async (req, res) => {
    const returnTo = safeReturnTo(req.body.returnTo || req.query.returnTo);
    const couponPage = returnTo ? `/coupons?returnTo=${encodeURIComponent(returnTo)}` : "/coupons";
    if (!mongoose.isValidObjectId(req.params.id)) return res.redirect(couponPage);
    const coupon = await Coupon.findOne({ _id: req.params.id, deleted: false, status: "active" }).lean();
    if (!coupon) { req.flash("error", "Voucher không còn khả dụng."); return res.redirect(couponPage); }
    const collection = await CouponCollection.findOne({ _id: coupon.collection_id, deleted: false, status: "active", startAt: { $lte: new Date() }, endAt: { $gte: new Date() } });
    if (!collection) { req.flash("error", "Voucher đã hết hạn."); return res.redirect(couponPage); }

    const walletFilter = { user_id: res.locals.user.id, coupon_id: coupon._id.toString() };
    let wallet = await UserCoupon.findOne(walletFilter);
    if (wallet) {
        // Các bản ghi được tạo trước tính năng số lượng chưa có field quantity trong MongoDB.
        await UserCoupon.updateOne({ _id: wallet._id, quantity: { $exists: false } }, { $set: { quantity: 1 } });
        wallet.quantity = Number(wallet.quantity == null ? 1 : wallet.quantity);
    }
    const ownedTotal = wallet ? Number(wallet.quantity || 0) + Number(wallet.usedCount || 0) : 0;
    if (ownedTotal >= Number(coupon.perUserLimit || 1)) {
        req.flash("error", `Bạn chỉ được thu thập tối đa ${coupon.perUserLimit} voucher này.`);
        return res.redirect(couponPage);
    }

    const supplyFilter = coupon.usageLimit > 0 ? { $or: [{ claimedCount: { $lt: coupon.usageLimit } }, { claimedCount: { $exists: false } }] } : {};
    const claimed = await Coupon.findOneAndUpdate({ _id: coupon._id, status: "active", deleted: false, ...supplyFilter }, { $inc: { claimedCount: 1 } });
    if (!claimed) { req.flash("error", "Voucher đã được thu thập hết."); return res.redirect(couponPage); }
    try {
        const walletUpdated = wallet
            ? await UserCoupon.updateOne({ _id: wallet._id, quantity: { $lt: coupon.perUserLimit - Number(wallet.usedCount || 0) } }, { $inc: { quantity: 1 }, $set: { collectedAt: new Date() } })
            : await UserCoupon.create({ ...walletFilter, quantity: 1, usedCount: 0 });
        if (wallet && walletUpdated.modifiedCount !== 1) throw new Error("WALLET_LIMIT_REACHED");
    } catch (error) {
        await Coupon.updateOne({ _id: coupon._id, claimedCount: { $gt: 0 } }, { $inc: { claimedCount: -1 } });
        req.flash("error", "Không thể lưu voucher, vui lòng thử lại."); return res.redirect(couponPage);
    }
    req.flash("success", `Đã lưu thêm 1 voucher ${coupon.code} vào ví.`); res.redirect(couponPage);
};
