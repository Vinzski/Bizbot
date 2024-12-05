const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware'); 
const Interaction = require('../models/interactionModel');

// Middleware for token-based authentication in the /chat route
router.post('/chat', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header is missing' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey_12345');
        const { userId } = decoded;
        console.log('Decoded Token:', decoded); // Debugging

        const { chatbotId, question } = req.body;
        console.log('Chat request received:', { chatbotId, question });

        if (!chatbotId) {
            return res.status(400).json({ message: 'Chatbot ID is required' });
        }

        const faqs = await FAQ.find({ chatbotId });
        console.log('FAQs fetched:', faqs);

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

        let reply, source;
        if (bestMatch.score >= 0.5) {
            reply = bestMatch.faq.answer;
            source = 'FAQ';
        } else {
            try {
                const rasaResponse = await axios.post('https://calm-sloths-burn.loca.lt/webhooks/rest/webhook', {
                    message: question,
                    sender: 'chatbot-widget',
                });
                reply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
                source = 'Rasa';
            } catch (error) {
                console.error('Error querying Rasa:', error);
                return res.status(500).json({ message: 'Error contacting Rasa', error: error.toString() });
            }
        }

        console.log('Saving interaction:', { userId, chatbotId, question, reply, source });
        const interaction = new Interaction({ userId, chatbotId, question, reply, source });

        try {
            await interaction.save();
            console.log('Interaction saved successfully:', interaction);
        } catch (saveError) {
            console.error('Error saving interaction:', saveError);
        }

        res.json({ reply, source });
    } catch (error) {
        console.error('Error handling chat:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
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
            const rasaResponse = await axios.post('https://calm-sloths-burn.loca.lt/webhooks/rest/webhook', {
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
