// models/chatLogModel.js
const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
    chatbotId: { type: String, required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatLog', chatLogSchema);
