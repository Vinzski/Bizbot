const mongoose = require('mongoose');

const chatbotCustomizationSchema = new mongoose.Schema({
    chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    themeColor: { type: String, required: true },
    welcomeMessage: { type: String, required: true },
    logo: { type: String } // Path to the uploaded logo file
}, { timestamps: true });

module.exports = mongoose.model('ChatbotCustomization', chatbotCustomizationSchema);
