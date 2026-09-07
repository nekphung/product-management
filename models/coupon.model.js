const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    collection_id: { type: String, required: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    couponType: { type: String, enum: ["order", "shipping"], default: "order" },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    scope: { type: String, enum: ["order", "products", "categories"], default: "order" },
    productIds: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
    usageLimit: { type: Number, default: 0, min: 0 },
    claimedCount: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    stackable: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deleted: { type: Boolean, default: false },
    createdBy: { account_id: String, createdAt: { type: Date, default: Date.now } },
    updatedBy: [{ account_id: String, updatedAt: Date }]
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema, "coupons");
