const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const Chatbot = require('../models/chatbotModel');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware');

// Function to calculate similarity score
const getSimilarityScore = (input, faqQuestion) => {
    const inputTokens = tokenizer.tokenize(input.toLowerCase());
    const faqTokens = tokenizer.tokenize(faqQuestion.toLowerCase());

    const intersection = inputTokens.filter(token => faqTokens.includes(token));
    const score = intersection.length / inputTokens.length;
    return score;
};

// POST /api/chat
router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id; // Get user ID from token

    if (!question || !chatbotId) {
        return res.status(400).json({ message: 'Question and Chatbot ID are required.' });
    }

    try {
        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });

        // Find the best matching FAQ
        let bestMatch = { score: 0, faq: null };

        faqs.forEach(faq => {
            const score = getSimilarityScore(question, faq.question);
            if (score > bestMatch.score) {
                bestMatch = { score, faq };
            }
        });

        // If a FAQ match is found with a sufficient score, return that FAQ answer
        if (bestMatch.score >= 0.5) { // Adjust the threshold as needed
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            // If no FAQ matches well, send the query to Rasa
            try {
                const rasaResponse = await axios.post('https://smart-wings-tell.loca.lt/webhooks/rest/webhook', {
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
    } catch (error) {
        console.error('Error in chat route:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
