const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chatbot', required: true } // Linking each FAQ to a specific chatbot
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;
