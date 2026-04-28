const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerEmail: {
        type: String,
        required: true,
        index: true
    },
    items: {
        type: String, // Storing as JSON string or could be an Array of Objects
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'],
        default: 'Pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
