const mongoose = require('mongoose');

// Define the FAQ schema
const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Create and export the FAQ model
const FAQ = mongoose.model('FAQ', faqSchema);
module.exports = FAQ;
