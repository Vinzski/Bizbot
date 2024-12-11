const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Assuming you have a User model
            required: true,
        },
        chatbotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chatbot', // Assuming you have a Chatbot model
            required: false, // Make it optional
        },
        sender: {
            type: String,
            enum: ['user', 'bot'],
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
