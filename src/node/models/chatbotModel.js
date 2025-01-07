const mongoose = require('mongoose');

const chatbotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    faqs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
    pdfId: { type: mongoose.Schema.Types.ObjectId, ref: 'PDF' }
}, 
{ timestamps: true });  

const Chatbot = mongoose.model('Chatbot', chatbotSchema);

module.exports = Chatbot;
