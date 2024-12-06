const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware'); // Add path to your auth middleware

// Middleware for token-based authentication in the /chat route
router.post('/chat', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user?.id; // Ensure user is authenticated

    console.log("Received chatbotId:", chatbotId);
    console.log("Received question:", question);

    try {
        const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });
        if (!faqs || faqs.length === 0) {
            console.log("No FAQs found for the given user and chatbot.");
            return res.json({ reply: "No FAQs found.", source: "FAQ" });
        }

        let bestMatch = { score: 0, faq: null };

        faqs.forEach(faq => {
            const tokens1 = tokenizer.tokenize(question.toLowerCase());
            const tokens2 = tokenizer.tokenize(faq.question.toLowerCase());
            let intersection = tokens1.filter(token => tokens2.includes(token));
            let score = intersection.length / tokens1.length;
            console.log(`FAQ: ${faq.question}, Score: ${score}`);
            if (score > bestMatch.score) {
                bestMatch = { score, faq };
            }
        });

        if (bestMatch.score >= 0.3) { // Adjust threshold as needed
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            const rasaResponse = await axios.post('https://silver-walls-repeat.loca.lt/webhooks/rest/webhook', {
                message: question,
                sender: 'chatbot-widget'
            });
            const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
            res.json({ reply: botReply, source: 'Rasa' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: "An error occurred.", error: error.toString() });
    }
});


// Route to send a simple message (unprotected)
router.post('/send_message', (req, res) => {
    console.log("Received message:", req.body.message); // Log the received message to ensure it's reaching here
    const userMessage = req.body.message;
    // Respond with a simple JSON object
    res.json({ reply: "Response based on " + userMessage });
});

// Protected route using middleware
router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id; // Get user ID from token

    // Fetch FAQs specific to the chatbot and user
    const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });

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

    if (bestMatch.score >= 0.5) {
        return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
    } else {
        try {
            const rasaResponse = await axios.post('https://silver-walls-repeat.loca.lt/webhooks/rest/webhook', {
                message: question,
                sender: 'chatbot-widget',
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
