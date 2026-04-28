const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    numberOfPeople: {
        type: Number,
        required: true
    },
    bookingDate: {
        type: String, // Or Date
        required: true
    },
    bookingTime: {
        type: String,
        required: true
    },
    specialRequest: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
