// models/chatLogModel.js
const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema(
    {
        chatbotId: { type: String, required: true, },
        userId: { type: mongoose.Schema.Types.ObjectId,ref: 'User', required: true, },
        question: { type: String, required: true, },
        answer: { type: String, required: true, },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

module.exports = mongoose.model('ChatLog', chatLogSchema);
