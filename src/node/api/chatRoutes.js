const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const JaroWinklerDistance = natural.JaroWinklerDistance;
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware'); // Add path to your auth middleware

// Route to send a simple message (unprotected)
router.post('/send_message', (req, res) => {
    console.log("Received message:", req.body.message); // Log the received message to ensure it's reaching here
    const userMessage = req.body.message;
    // Respond with a simple JSON object
    res.json({ reply: "Response based on " + userMessage });
});

// Route to handle incoming messages and check FAQ or forward to Rasa
router.post('/', authenticate, async (req, res) => {
    const { message, chatbotId } = req.body;
    const userId = req.user.id;

    console.log('Received chat request:', { userId, chatbotId, message });

    try {
        const faqs = await FAQ.find({ userId, chatbotId });
        console.log('FAQs loaded:', faqs.length);

        if (!faqs.length) {
            console.log('No FAQs available, forwarding to Rasa.');
            return forwardToRasa(message, res);
        }

        const normalizedMessage = message.toLowerCase().trim();
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === normalizedMessage);

        if (exactMatch) {
            console.log('Exact match found:', exactMatch.question);
            return res.json({ reply: exactMatch.answer, source: 'FAQ' });
        }

        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const similarity = JaroWinklerDistance(faqText, normalizedMessage);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        const SIMILARITY_THRESHOLD = 0.7; // Adjusted for more accuracy
        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log('Similar FAQ found:', bestMatch.faq.question, 'with score:', bestMatch.score);
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        }

        console.log('No satisfactory FAQ match, forwarding to Rasa.');
        forwardToRasa(message, res);

    } catch (error) {
        console.error('Error handling chat request:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.toString() });
    }
});

// Function to handle forwarding messages to Rasa
async function forwardToRasa(message, res) {
    try {
        const rasaResponse = await axios.post('https://your-rasa-server/webhooks/rest/webhook', {
            message: message,
            sender: 'chatbot-widget'
        });
        const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
        res.json({ reply: botReply, source: 'Rasa' });
    } catch (error) {
        console.error('Failed to get response from Rasa:', error);
        res.status(500).json({ reply: "Error contacting Rasa", error: error.toString() });
    }
}

module.exports = router;
