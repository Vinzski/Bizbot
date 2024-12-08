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
    const userId = req.user.id;

    try {
        // Fetch the chatbot to get associated FAQs
        const chatbot = await Chatbot.findById(chatbotId).populate('faqs');
        if (!chatbot) {
            return res.status(404).json({ message: "Chatbot not found" });
        }

        // Extract FAQs associated with this chatbot
        const faqs = chatbot.faqs;
        console.log("Fetched FAQs:", faqs);

        let bestMatch = { score: 0, faq: null };

        faqs.forEach(faq => {
            const tokens1 = tokenizer.tokenize(question.toLowerCase());
            const tokens2 = tokenizer.tokenize(faq.question.toLowerCase());
            let intersection = tokens1.filter(token => tokens2.includes(token));
            let score = intersection.length / Math.max(tokens1.length, tokens2.length);
            if (score > bestMatch.score) {
                bestMatch = { score, faq };
            }
        });

        if (bestMatch.score >= 0.5) { // Adjust threshold as needed
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            // If no FAQ matches well, send the query to Rasa
            try {
                const rasaResponse = await axios.post('https://smart-teeth-brush.loca.lt/webhooks/rest/webhook', {
                    message: question,
                    sender: 'chatbot-widget'
                });
                const botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
                return res.json({ reply: botReply, source: 'Rasa' });
            } catch (error) {
                console.error('Error querying Rasa:', error);
                return res.status(500).json({ message: "Error contacting Rasa", error: error.toString() });
            }
        }
    } catch (error) {
        console.error('Error in chat route:', error);
        res.status(500).json({ message: "Internal server error", error: error.toString() });
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
