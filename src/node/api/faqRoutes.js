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
        res.status(500).json({ message: "Failed to create FAQ", error: error.toString() });
    }
});

// First, search for the FAQ and if it exists, delete it
router.get('/:id', authenticate, async (req, res) => {
    const faqId = req.params.id;

    try {
        // Find the FAQ by ID and ensure it belongs to the authenticated user
        const faq = await FAQ.findOne({ _id: faqId, userId: req.user.id });

        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found or you do not have permission to delete it' });
        }

        // FAQ found, now delete it
        await FAQ.deleteOne({ _id: faqId });

        res.json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ message: 'Failed to delete FAQ', error: error.toString() });
    }
});


module.exports = router;
