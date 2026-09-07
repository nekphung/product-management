const mongoose = require("mongoose");

const couponCollectionSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deleted: { type: Boolean, default: false },
    createdBy: { account_id: String, createdAt: { type: Date, default: Date.now } },
    updatedBy: [{ account_id: String, updatedAt: Date }]
}, { timestamps: true });

module.exports = mongoose.model("CouponCollection", couponCollectionSchema, "coupon-collections");
