const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },  // This stores the message (question/answer)
    sender: { type: String, required: true },  // 'user' or 'bot'
    timestamp: { type: Date, default: Date.now },  // Timestamp when the message was sent
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
