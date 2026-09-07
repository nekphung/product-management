const mongoose = require("mongoose");

const userCouponSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    coupon_id: { type: String, required: true, index: true },
    collectedAt: { type: Date, default: Date.now },
    quantity: { type: Number, default: 1, min: 0 },
    usedCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    orderIds: { type: [String], default: [] }
}, { timestamps: true });

userCouponSchema.index({ user_id: 1, coupon_id: 1 }, { unique: true });

module.exports = mongoose.model("UserCoupon", userCouponSchema, "user-coupons");
