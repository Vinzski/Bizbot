const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
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

router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id; // Get user ID from token

    console.log('Incoming Chat Request:');
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: ${question}`);

    try {
        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });
        console.log(`Number of FAQs found: ${faqs.length}`);

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
            console.log(`FAQ Match Found: ${bestMatch.faq.question} with score ${bestMatch.score}`);
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            console.log('No FAQ Match Found. Forwarding to Rasa.');
            try {
                const rasaResponse = await axios.post('https://smart-teeth-brush.loca.lt/webhooks/rest/webhook', {
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
    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});



module.exports = router;
