const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware');  // Add path to your auth middleware

// Define the authenticateByDomain middleware
const authenticateByDomain = (req, res, next) => {
    // List of allowed domains
    const allowedDomains = ['http://localhost:3000/'];
    const refererHeader = req.headers.referer;

    if (refererHeader && allowedDomains.some(domain => refererHeader.startsWith(domain))) {
        next();
    } else {
        return res.status(401).send('Access denied. You are not allowed to access this resource.');
    }
};


router.post('/chat', authenticateByDomain, async (req, res) => {
    const { question, chatbotId } = req.body;

    // Validate inputs
    if (!question || typeof question !== 'string' || question.trim() === '') {
        return res.status(400).json({ message: 'Invalid question input' });
    }

    if (!chatbotId || typeof chatbotId !== 'string') {
        return res.status(400).json({ message: 'Invalid chatbot ID' });
    }

    // Fetch the chatbot to get the associated userId
    const chatbot = await Chatbot.findById(chatbotId);
    if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
    }
    const userId = chatbot.userId;

    // Fetch FAQs specific to the chatbot and user
    const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });

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
            const rasaResponse = await axios.post('https://your-rasa-endpoint/webhooks/rest/webhook', {
                message: question,
                sender: 'chatbot-widget'
            });
            const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
            res.json({ reply: botReply, source: 'Rasa' });
        } catch (error) {
            console.error('Error querying Rasa:', error);
            res.status(500).json({ message: "Error contacting Rasa", error: error.toString() });
        }
    }

router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id; // Get user ID from token

    // Fetch FAQs specific to the chatbot and user
    const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });

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
            const rasaResponse = await axios.post('https://odd-bags-raise.loca.lt/webhooks/rest/webhook', {
                message: question,
                sender: 'chatbot-widget'
            });
            const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
            res.json({ reply: botReply, source: 'Rasa' });
        } catch (error) {
            console.error('Error querying Rasa:', error);
            res.status(500).json({ message: "Error contacting Rasa", error: error.toString() });
        }
    }
});



router.post('/send_message', (req, res) => {
    console.log("Received message:", req.body.message);  // Log the received message to ensure it's reaching here
    const userMessage = req.body.message;
    // Respond with a simple JSON object
    res.json({reply: "Response based on " + userMessage});
});
});

module.exports = router;
