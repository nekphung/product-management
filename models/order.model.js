const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        user_id: String,
        cart_id: String,
        userInfo: {
            fullName: String,
            phone: String,
            address: String,
            avatar: String,
            paymentMethod: {
                type: String,
                enum: ["cod", "banking"],
                default: "cod"
            }
        },
        products: [
            {
                product_id: String,
                price: Number,
                discountPercentage: Number,
                quantity: Number
            }
        ],
        status: {
            type: String,
            enum: ["pending", "confirmed", "shipping", "completed", "cancelled"],
            default: "pending"
        },
        inventoryRestored: {
            type: Boolean,
            default: false
        },
        inventoryReserved: {
            type: Boolean,
            default: false
        },
        cancellation: {
            reason: {
                type: String,
                trim: true,
                maxlength: 500
            },
            source: {
                type: String,
                enum: ["client", "admin"]
            },
            cancelledAt: Date
        },
        deleted: {
            type: Boolean,
            default: false
        },
        updatedBy: [
            {
                account_id: String,
                updatedAt: Date
            }
        ],
        deletedBy: {
            account_id: String,
            deletedAt: Date
        }
    }, {
        timestamps: true 
    }
);

const Order = mongoose.model('Order', orderSchema, "orders");

module.exports = Order;
