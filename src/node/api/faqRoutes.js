const express = require('express');
const router = express.Router();
const FAQ = require('../models/faqModel');
const authenticate = require('../signup/middleware/authMiddleware');  // Adjust the path as necessary

// Fetch the count of FAQs for the current user
router.get('/count', authenticate, async (req, res) => {
    try {
        const faqCount = await FAQ.countDocuments({ userId: req.user.id });
        res.json({ count: faqCount });
    } catch (error) {
        console.error('Error counting FAQs:', error);
        res.status(500).json({ message: 'Failed to count FAQs', error: error.toString() });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        // Ensure that you're correctly querying based on user ID
        const faqs = await FAQ.find({ userId: req.user.id });
        res.json(faqs);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: "Failed to fetch FAQs", error: error.toString() });
    }
});

router.post('/', authenticate, async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ message: "Question and answer are required" });
    }

    try {
        const newFaq = new FAQ({
            question,
            answer,
            userId: req.user.id
        });
        const savedFaq = await newFaq.save();
        res.status(201).json(savedFaq);
    } catch (error) {
        console.error('Error saving FAQ:', error);
