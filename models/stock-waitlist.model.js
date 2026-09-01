const mongoose = require("mongoose");

const stockWaitlistSchema = new mongoose.Schema({
    product_id: { type: String, required: true, index: true },
    user_id: { type: String, default: "" },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    status: {
        type: String,
        enum: ["waiting", "contacted", "fulfilled", "cancelled"],
        default: "waiting"
    }
}, { timestamps: true });

stockWaitlistSchema.index({ product_id: 1, phone: 1, status: 1 });

module.exports = mongoose.model("StockWaitlist", stockWaitlistSchema, "stock-waitlists");
