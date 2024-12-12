const express = require('express');
const Message = require('../models/messagesModel'); // Assuming you have a messages model
const router = express.Router();

// Route to fetch messages sent by the user for a specific chatbot
router.get('/:chatbotId', async (req, res) => {
    const { chatbotId } = req.params;

    try {
        // Fetch all messages where sender is 'user' and chatbotId matches
        const messages = await Message.find({ 
            chatbotId: chatbotId,
            sender: 'user'  // Only messages from the user
        }).sort({ createdAt: -1 }); // Sort by creation date, latest first

        // If messages are found, return them
        if (messages.length > 0) {
            res.json(messages);
        } else {
            res.status(404).json({ success: false, message: 'No user messages found for this chatbot.' });
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching messages.' });
    }
});

// Export the router
module.exports = router;
