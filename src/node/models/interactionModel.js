const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    question: { type: String, required: true },
    reply: { type: String },
    source: { type: String, required: true }, // Either "FAQ" or "Rasa"
    timestamp: { type: Date, default: Date.now },
});

const Interaction = mongoose.model('Interaction', interactionSchema);

module.exports = Interaction;
