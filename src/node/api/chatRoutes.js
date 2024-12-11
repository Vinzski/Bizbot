const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const jwt = require('jsonwebtoken');
const router = express.Router();
const Message = require('../models/messageModel');
const Chatbot = require('../models/chatbotModel');
const authenticate = require('../signup/middleware/authMiddleware'); // Add path to your auth middleware

// Route to send a simple message (unprotected)
router.post('/send_message', async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log("Received message:", userMessage);

        // Save the user message to the database
        const message = new Message({
            userId: req.user ? req.user.id : null, // Handle cases where user might not be authenticated
            chatbotId: req.body.chatbotId, // Ensure chatbotId is sent in the request
            sender: 'user',
            message: userMessage,
        });

        await message.save();
        console.log('User message saved to database.');

        // Respond with a simple JSON object
        res.json({ reply: "Response based on " + userMessage });
    } catch (error) {
        console.error('Error in /send_message:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});

router.get('/user-interactions/', authenticate, async (req, res) => {
    const { userId } = req.params;

    // Optional: Check if the requester has admin privileges
    // This depends on your authentication middleware setup
    // For example:
    // if (!req.user.isAdmin) {
    //     return res.status(403).json({ message: 'Access denied' });
    // }

    try {
        // Count the number of messages sent by the user
        const interactionCount = await Message.countDocuments({
            userId: userId,
            sender: 'user',
        });

        res.json({ userId, interactionCount });
    } catch (error) {
        console.error('Error fetching user interactions count:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.toString() });
    }
});

// Protected route for handling chat
router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id; // Get user ID from token

    console.log('--- Incoming Chat Request ---');
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: "${question}"`);

    try {
        // Save the user question to the database
        const userMessage = new Message({
            userId: userId,
            chatbotId: chatbotId,
            sender: 'user',
            message: question,
        });

        await userMessage.save();
        console.log('User message saved to database.');

        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId });
        console.log(`Number of FAQs found: ${faqs.length}`);

        if (faqs.length === 0) {
            console.log('No FAQs found for the given userId and chatbotId.');
        }

        // Normalize the user question
        const normalizedUserQuestion = question.toLowerCase().trim();

        // 1. Exact Match Check
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === normalizedUserQuestion);

        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);

            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: exactMatch.answer,
            });

            await botMessage.save();
            console.log('Bot response saved to database.');

            return res.json({ reply: exactMatch.answer, source: 'FAQ' });
        }

        // 2. Similarity-Based Matching
        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const similarity = natural.JaroWinklerDistance(faqText, normalizedUserQuestion);
            console.log(`FAQ Question: "${faq.question}" | Similarity: ${similarity.toFixed(2)}`);

            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // Define similarity threshold
        const SIMILARITY_THRESHOLD = 0.9; // Adjust as needed

        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log(`FAQ Match Found: "${bestMatch.faq.question}" with similarity ${bestMatch.score.toFixed(2)}`);

            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: bestMatch.faq.answer,
            });

            await botMessage.save();
            console.log('Bot response saved to database.');

            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            console.log('No adequate FAQ match found. Forwarding to Rasa.');
            try {
                const rasaResponse = await axios.post('https://chatty-apples-share.loca.lt/webhooks/rest/webhook', {
                    message: question,
                    sender: 'chatbot-widget',
                });
                const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
                console.log(`Rasa Response: "${botReply}"`);

                // Save the bot response to the database
                const botMessage = new Message({
                    userId: userId,
                    chatbotId: chatbotId,
                    sender: 'bot',
                    message: botReply,
                });

                await botMessage.save();
                console.log('Bot response saved to database.');

                res.json({ reply: botReply, source: 'Rasa' });
            } catch (error) {
                console.error('Error querying Rasa:', error);
                res.status(500).json({ message: "Error contacting Rasa", error: error.toString() });
            }
        }
    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});

router.get('/user-interactions/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;

    try {
        // Count the number of messages sent by the user
        const interactionCount = await Message.countDocuments({
            userId: userId,
            sender: 'user',
        });

        res.json({ userId, interactionCount });
    } catch (error) {
        console.error('Error fetching user interactions count:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.toString() });
    }
});

router.get('/dashboard-data/', authenticate, async (req, res) => {
    const { userId } = req.params;

    try {
        // Count user interactions
        const interactionCount = await Message.countDocuments({
            userId: userId,
            sender: 'user',
        });

        // Count total chatbots
        const chatbotCount = await Chatbot.countDocuments();

        // Count total FAQs
        const faqCount = await FAQ.countDocuments();

        res.json({
            userId,
            interactionCount,
            chatbotCount,
            faqCount,
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.toString() });
    }
});

module.exports = router;
