const express = require('express');
const axios = require('axios');
const FAQ = require('../models/faqModel');
const ChatLog = require('../models/chatLogModel'); // Import ChatLog model
const natural = require('natural');
const router = express.Router();
const authenticate = require('../signup/middleware/authMiddleware'); // Ensure the path is correct

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

    console.log('--- Incoming Chat Request ---');
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: "${question}"`);

    try {
        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });
        console.log(`Number of FAQs found: ${faqs.length}`);

        if (faqs.length === 0) {
            console.log('No FAQs found for the given userId and chatbotId.');
        }

        // Normalize the user question
        const normalizedUserQuestion = question.toLowerCase().trim();

        // 1. Exact Match Check
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === normalizedUserQuestion);

        let botReply = '';
        let replySource = '';

        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
            botReply = exactMatch.answer;
            replySource = 'FAQ';
        } else {
            // 2. Similarity-Based Matching
            let bestMatch = { score: 0, faq: null };
            faqs.forEach(faq => {
                const faqText = faq.question.toLowerCase().trim();
                const similarity = natural.JaroWinklerDistance(faqText, normalizedUserQuestion);
                console.log(`FAQ Question: "${faq.question}" | Similarity: ${similarity.toFixed(2)}`);

                if (similarity > bestMatch.score) {
                    bestMatch = { score: similarity, faq };
                }
            });

            // Define similarity threshold
            const SIMILARITY_THRESHOLD = 0.8; // Adjust as needed

            if (bestMatch.score >= SIMILARITY_THRESHOLD) {
                console.log(`FAQ Match Found: "${bestMatch.faq.question}" with similarity ${bestMatch.score.toFixed(2)}`);
                botReply = bestMatch.faq.answer;
                replySource = 'FAQ';
            } else {
                console.log('No adequate FAQ match found. Forwarding to Rasa.');
                try {
                    const rasaResponse = await axios.post('https://smart-teeth-brush.loca.lt/webhooks/rest/webhook', {
                        message: question,
                        sender: 'chatbot-widget',
                    });
                    botReply = rasaResponse.data[0]?.text || "Sorry, I couldn't understand that.";
                    console.log(`Rasa Response: "${botReply}"`);
                    replySource = 'Rasa';
                } catch (error) {
                    console.error('Error querying Rasa:', error);
                    botReply = "Sorry, something went wrong while processing your request.";
                    replySource = 'Error';
                }
            }
        }

        // Save the chat log to the database
        const chatLog = new ChatLog({
            chatbotId: chatbotId,
            userId: userId,
            question: question,
            answer: botReply,
            // timestamp is automatically set to current date and time
        });

        await chatLog.save();
        console.log('Chat log saved successfully.');

        // Respond to the frontend
        res.json({ reply: botReply, source: replySource });
    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});

module.exports = router;
