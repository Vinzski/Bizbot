const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware');  // Existing auth middleware
const Chatbot = require('../models/chatbotModel'); // Assuming you have a Chatbot model

// Middleware to conditionally authenticate
const conditionalAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
    } else {
        // No token provided, proceed without attaching user
        next();
    }
};

router.post('/chat', conditionalAuth, async (req, res) => {
    const { question, chatbotId } = req.body;

    if (!chatbotId) {
        return res.status(400).json({ message: "chatbotId is required." });
    }

    // Fetch the chatbot details
    const chatbot = await Chatbot.findById(chatbotId);
    if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found." });
    }

    // Fetch FAQs specific to the chatbot
    const faqs = await FAQ.find({ chatbotId: chatbotId });

    // If FAQs are found, search for the best match
    let bestMatch = { score: 0, faq: null };

    faqs.forEach(faq => {
        const tokens1 = question.toLowerCase().split(' ');
        const tokens2 = faq.question.toLowerCase().split(' ');
        let intersection = tokens1.filter(token => tokens2.includes(token));
        let score = intersection.length / tokens1.length;
        if (score > bestMatch.score) {
            bestMatch = { score, faq };
        }
    });

    // If a FAQ match is found with a sufficient score, return that FAQ answer
    if (bestMatch.score >= 0.5) {
        return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
    } else {
        // If no FAQ matches well, send the query to Rasa
        try {
            const rasaResponse = await axios.post('https://empty-ideas-lick.loca.lt/webhooks/rest/webhook', {
                message: question,
                sender: chatbotId // Use chatbotId as sender to differentiate sessions
            });
            const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
            res.json({ reply: botReply, source: 'Rasa' });
        } catch (error) {
            console.error('Error querying Rasa:', error);
            res.status(500).json({ message: "Error contacting Rasa", error: error.toString() });
        }
    }
});

module.exports = router;
