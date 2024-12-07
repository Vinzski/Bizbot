const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware'); // Add path to your auth middleware

// Middleware to authenticate and extract chatbotId and userId from the token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token missing' });

    jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey_12345', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.chatbotId = user.chatbotId;
        req.userId = user.userId;
        next();
    });
}

// POST /api/chat
router.post('/', authenticateToken, async (req, res) => {
    const { question } = req.body;
    const chatbotId = req.chatbotId;
    const userId = req.userId;

    if (!question) {
        return res.status(400).json({ message: 'Question is required' });
    }

    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`User ID: ${userId}`);
    console.log(`Question: ${question}`);

    try {
        // Fetch the chatbot and populate faqs
        const chatbot = await Chatbot.findById(chatbotId).populate('faqs');
        if (!chatbot) {
            return res.status(404).json({ message: 'Chatbot not found' });
        }

        // Fetch FAQs specific to the user and chatbot
        const faqs = await FAQ.find({ chatbotId: chatbotId, userId: userId });

        if (!faqs || faqs.length === 0) {
            console.log("No FAQs found for the given user and chatbot.");
            // Proceed to Rasa if no FAQs are found
        }

        let bestMatch = { score: 0, faq: null };

        faqs.forEach(faq => {
            const tokens1 = tokenizer.tokenize(question.toLowerCase());
            const tokens2 = tokenizer.tokenize(faq.question.toLowerCase());
            let intersection = tokens1.filter(token => tokens2.includes(token));
            let score = intersection.length / tokens1.length;
            console.log(`FAQ: "${faq.question}", Score: ${score.toFixed(2)}`);
            if (score > bestMatch.score) {
                bestMatch = { score, faq };
            }
        });

        if (bestMatch.score >= 0.3) { // Adjust threshold as needed
            console.log(`Best Match Found: "${bestMatch.faq.question}" with score ${bestMatch.score.toFixed(2)}`);
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            console.log("No suitable FAQ match found. Querying Rasa.");
            // Fallback to Rasa
            const rasaURL = 'https://silver-walls-repeat.loca.lt/webhooks/rest/webhook'; // Update to your Rasa URL
            const rasaResponse = await axios.post(rasaURL, {
                message: question,
                sender: 'chatbot-widget'
            });

            const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
            return res.json({ reply: botReply, source: 'Rasa' });
        }
    } catch (error) {
        console.error('Error handling chat message:', error);
        return res.status(500).json({ message: "An error occurred while processing your request." });
    }
});

// Route to send a simple message (unprotected)
router.post('/send_message', (req, res) => {
    console.log("Received message:", req.body.message); // Log the received message to ensure it's reaching here
    const userMessage = req.body.message;
    // Respond with a simple JSON object
    res.json({ reply: "Response based on " + userMessage });
});

module.exports = router;
