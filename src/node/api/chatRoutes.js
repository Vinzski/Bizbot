// chatRoutes.js

const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const Chatbot = require('../models/chatbotModel');
const natural = require('natural');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Initialize the natural language tokenizer
const tokenizer = new natural.WordTokenizer();

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

// Function to calculate similarity score
const getSimilarityScore = (input, faqQuestion) => {
    const inputTokens = tokenizer.tokenize(input.toLowerCase());
    const faqTokens = tokenizer.tokenize(faqQuestion.toLowerCase());

    const intersection = inputTokens.filter(token => faqTokens.includes(token));
    const score = intersection.length / inputTokens.length;
    return score;
};

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
        // Fetch the chatbot to ensure it exists
        const chatbot = await Chatbot.findById(chatbotId);
        if (!chatbot) {
            return res.status(404).json({ message: 'Chatbot not found' });
        }

        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ chatbotId: chatbotId, userId: userId });
        if (!faqs || faqs.length === 0) {
            console.log("No FAQs found for the given user and chatbot.");
            // Proceed to Rasa if no FAQs are found
        }

        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const score = getSimilarityScore(question, faq.question);
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
            const rasaURL = 'https://small-words-pay.loca.lt/webhooks/rest/webhook'; // Update to your Rasa URL
            try {
                const rasaResponse = await axios.post(rasaURL, {
                    message: question,
                    sender: 'chatbot-widget'
                });

                // Extract bot reply from Rasa's response
                const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
                return res.json({ reply: botReply, source: 'Rasa' });
            } catch (error) {
                console.error('Error querying Rasa:', error);
                return res.status(500).json({ message: "Error contacting Rasa", error: error.toString() });
            }
        }
    } catch (error) {
        console.error('Error handling chat message:', error);
        return res.status(500).json({ message: "An error occurred while processing your request." });
    }
});

module.exports = router;
