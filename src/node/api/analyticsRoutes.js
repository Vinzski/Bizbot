const express = require('express');
const router = express.Router();
const Message = require('../messageModel'); // adjust path as needed
const Chatbot = require('../chatbotModel'); // adjust path as needed

// Route to get all chatbots for dropdown
router.get('/chatbots', async (req, res) => {
    try {
        const chatbots = await Chatbot.find({}, '_id name');
        res.json(chatbots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching chatbots.' });
    }
});

// Route to get user message counts by day for a given chatbotId
router.get('/messages/analytics', async (req, res) => {
    const { chatbotId } = req.query;

    if (!chatbotId) {
        return res.status(400).json({ error: 'chatbotId is required' });
    }

    try {
        // Aggregate messages by day for sender = "user"
        const results = await Message.aggregate([
            { $match: { chatbotId: { $eq: require('mongoose').Types.ObjectId(chatbotId) }, sender: 'user' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                    '_id.day': 1
                }
            }
        ]);

        // Transform aggregation results into arrays for Chart.js
        const labels = results.map(item => `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`);
        const counts = results.map(item => item.count);

        res.json({ labels, counts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching analytics data.' });
    }
});

module.exports = router;
