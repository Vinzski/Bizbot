const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chatbot', required: true }, // New Field
}, { timestamps: true }); // Optional: Adds createdAt and updatedAt fields

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;
