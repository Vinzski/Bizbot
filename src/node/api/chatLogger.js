// utils/chatLogger.js
const ChatLog = require('../models/chatLogModel');

/**
 * Saves a chat interaction to the database.
 * @param {String} chatbotId - The ID of the chatbot.
 * @param {String} userId - The ID of the user.
 * @param {String} question - The user's question.
 * @param {String} answer - The chatbot's answer.
 */
const saveChatLog = async (chatbotId, userId, question, answer) => {
    try {
        const chatLog = new ChatLog({
            chatbotId,
            userId,
            question,
            answer,
            // timestamp is automatically set
        });

        await chatLog.save();
        console.log('Chat log saved successfully.');
    } catch (error) {
        console.error('Error saving chat log:', error);
        // Optionally, handle the error (e.g., retry mechanism, alerting)
    }
};

module.exports = { saveChatLog };
