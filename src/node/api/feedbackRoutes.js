const express = require('express');
const Feedback = require('../models/feedbackModel'); // Assuming you have a feedback model
const router = express.Router();

// Feedback function
router.post('/api/feedback', async (req, res) => {
    const { userId, chatbotId, rating, feedback } = req.body;

    if (!userId || !chatbotId || !rating || !feedback) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        const newFeedback = new Feedback({
            userId: userId,
            chatbotId: chatbotId,
            rating: rating,
            feedback: feedback,
        });

        await newFeedback.save();

        res.json({ success: true, message: 'Feedback submitted successfully.' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ success: false, message: 'Server error. Could not save feedback.' });
    }
});
