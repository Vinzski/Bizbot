const express = require('express');
const Feedback = require('../models/feedbackModel'); // Assuming you have a feedback model
const router = express.Router();

// Feedback submission route
router.post('/', async (req, res) => {
    const { userId, chatbotId, rating, feedback } = req.body;

    // Validate input fields
    if (!userId || !chatbotId || !rating || !feedback) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        // Create a new Feedback document
        const newFeedback = new Feedback({
            userId: userId,
            chatbotId: chatbotId,
            rating: rating,
            feedback: feedback,
        });

        // Save the feedback to the database
        await newFeedback.save();

        // Send a response back to the client
        res.json({ success: true, message: 'Feedback submitted successfully.' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ success: false, message: 'Server error. Could not save feedback.' });
    }
});

// Get feedbacks for a specific chatbot with an optional rating filter
router.get('/feedbacks/:chatbotId', async (req, res) => {
    const { chatbotId } = req.params;
    const { rating } = req.query; // Capture the rating from query parameters

    try {
        let query = { chatbotId: chatbotId };
        if (rating && rating !== 'all') {
            query.rating = rating; // Add rating to the query if it's specified and not 'all'
        }

        const feedbacks = await Feedback.find(query);
        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        res.status(500).json({ message: 'Server error while fetching feedbacks.' });
    }
});

// Export the router
module.exports = router;
