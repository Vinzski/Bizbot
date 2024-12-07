// faqRoutes.js
const express = require('express');
const router = express.Router();
const FAQ = require('../models/faqModel');
const Chatbot = require('../models/chatbotModel'); // Import Chatbot model
const authenticate = require('../signup/middleware/authMiddleware');  // Adjust the path as necessary

// Fetch the count of FAQs for the current user and specific chatbot
router.get('/count', authenticate, async (req, res) => {
    const { chatbotId } = req.query; // Expecting chatbotId as a query parameter
    if (!chatbotId) {
        console.error('Chatbot ID is missing in the request query.');
        return res.status(400).json({ message: 'Chatbot ID is required as a query parameter.' });
    }
    try {
        // Verify that the chatbot exists and belongs to the user
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId: req.user.id });
        if (!chatbot) {
            console.error(`Chatbot not found or does not belong to the user. ChatbotID=${chatbotId}`);
            return res.status(404).json({ message: 'Chatbot not found or does not belong to the user.' });
        }
        const faqCount = await FAQ.countDocuments({ userId: req.user.id, chatbotId: chatbotId });
        res.json({ count: faqCount });
    } catch (error) {
        console.error('Error counting FAQs:', error);
        res.status(500).json({ message: 'Failed to count FAQs', error: error.toString() });
    }
});

// Fetch all FAQs for the current user and specific chatbot
router.get('/', authenticate, async (req, res) => {
    const { chatbotId } = req.query; // Expecting chatbotId as a query parameter
    if (!chatbotId) {
        console.error('Chatbot ID is missing in the request query.');
        return res.status(400).json({ message: 'Chatbot ID is required as a query parameter.' });
    }
    try {
        // Verify that the chatbot exists and belongs to the user
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId: req.user.id }).populate('faqs');
        if (!chatbot) {
            console.error(`Chatbot not found or does not belong to the user. ChatbotID=${chatbotId}`);
            return res.status(404).json({ message: 'Chatbot not found or does not belong to the user.' });
        }
        // Fetch FAQs based on userId and chatbotId
        const faqs = await FAQ.find({ userId: req.user.id, chatbotId: chatbotId });
        res.json(faqs);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: "Failed to fetch FAQs", error: error.toString() });
    }
});

// Create a new FAQ for the current user and specific chatbot
router.post('/', authenticate, async (req, res) => {
    const { question, answer, chatbotId } = req.body;
    if (!question || !answer || !chatbotId) {
        console.error('Question, answer, or chatbotId is missing in the request body.');
        return res.status(400).json({ message: "Question, answer, and chatbotId are required." });
    }

    try {
        // Verify that the chatbot exists and belongs to the user
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId: req.user.id });
        if (!chatbot) {
            console.error(`Chatbot not found or does not belong to the user. ChatbotID=${chatbotId}`);
            return res.status(404).json({ message: 'Chatbot not found or does not belong to the user.' });
        }
        // Create and save the new FAQ
        const newFaq = new FAQ({
            question,
            answer,
            userId: req.user.id,
            chatbotId: chatbotId
        });
        const savedFaq = await newFaq.save();
        // Link the FAQ to the Chatbot's faqs array
        chatbot.faqs.push(savedFaq._id);
        await chatbot.save();
        console.log(`Created new FAQ: "${question}" for ChatbotID=${chatbotId}`);
        res.status(201).json(savedFaq);
    } catch (error) {
        console.error('Error saving FAQ:', error);
        res.status(500).json({ message: "Failed to create FAQ", error: error.toString() });
    }
});

module.exports = router;
