const router = require('express').Router();
const Chatbot = require('../models/chatbotModel');
const FAQ = require('../models/faqModel');
const Feedback = require('../models/feedbackModel');
const authenticate = require('../signup/middleware/authMiddleware'); // Path to your auth middleware



router.get('/', authenticate, async (req, res) => {
    try {
        console.log('Fetching chatbots for user:', req.user.id); // Log the user ID to confirm it's being passed
        const chatbots = await Chatbot.find({ userId: req.user.id });
        console.log('Chatbots found:', chatbots); // Log the fetched chatbots
        res.json(chatbots);
    } catch (error) {
        console.error('Failed to fetch chatbots', error);
        res.status(500).json({ message: "Failed to fetch chatbots", error: error.toString() });
    }
});


router.post('/', authenticate, async (req, res) => {
    const { name, type, faqs } = req.body;  // Data from the client
    const userId = req.user.id;  // Retrieved from authentication middleware

    try {
        let chatbot = await Chatbot.findOne({ userId, name });
        if (chatbot) {
            // Update existing chatbot if found
            chatbot.faqs = faqs;
            chatbot.type = type;
            chatbot.name = name;
            await chatbot.save();
        } else {
            // Create a new chatbot if not found
            chatbot = new Chatbot({
                name,
                type,
                userId,
                faqs,
                creationDate: new Date()  // Set the creation date on creation
            });
            await chatbot.save();
        }
        res.status(201).json({ message: 'Chatbot saved successfully', chatbot });
    } catch (error) {
        console.error('Error in saving chatbot:', error);
        res.status(500).json({ message: "Failed to create or update chatbot", error: error.toString() });
    }
});

router.get('/count', authenticate, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(400).json({ message: 'Invalid or missing user ID' });
    }

    try {
        const chatbotCount = await Chatbot.countDocuments({ userId: req.user.id });
        res.json({ count: chatbotCount });
    } catch (error) {
        console.error('Error counting chatbots:', error);
        res.status(500).json({ message: 'Failed to count chatbots', error: error.toString() });
    }
});

router.get('/:chatbotId', authenticate, async (req, res) => {
    try {
        const chatbot = await Chatbot.findById(req.params.chatbotId);
        if (!chatbot) {
            return res.status(404).json({ message: 'Chatbot not found' });
        }

        // Fetch FAQs associated with this chatbot
        const faqs = await FAQ.find({ _id: { $in: chatbot.faqs } });

        // Send both chatbot and FAQs data
        res.json({ chatbot, faqs });
    } catch (error) {
        console.error('Failed to fetch chatbot', error);
        res.status(500).json({ message: "Failed to fetch chatbot", error: error.toString() });
    }
});

router.delete('/:chatbotId', authenticate, async (req, res) => {
    const { chatbotId } = req.params;
    console.log("DELETE request received for Chatbot ID:", chatbotId);

    try {
        // Check if the chatbot exists
        const chatbot = await Chatbot.findById(chatbotId);
        if (!chatbot) {
            console.log("Chatbot not found for ID:", chatbotId);
            return res.status(404).json({ message: 'Chatbot not found' });
        }

        // Log the FAQs to be deleted
        console.log("Associated FAQs:", chatbot.faqs);

        // Delete associated FAQs
        await FAQ.deleteMany({ _id: { $in: chatbot.faqs } });
        console.log("FAQs deleted successfully.");

        // Delete the chatbot
        await Chatbot.findByIdAndDelete(chatbotId);
        console.log("Chatbot deleted successfully.");

        res.json({ message: 'Chatbot and associated FAQs deleted successfully' });
    } catch (error) {
        console.error("Error during deletion:", error);
        res.status(500).json({ message: 'Failed to delete chatbot', error: error.toString() });
    }
});

router.get('/ratings/:chatbotId', authenticate, async (req, res) => {
    try {
        const chatbotId = req.params.chatbotId;

        // Fetch ratings based on chatbot ID, assuming you have a Ratings model.
        const ratings = await Feedback.find({ chatbotId });

        if (!ratings || ratings.length === 0) {
            return res.status(404).json({ message: 'No ratings found for this chatbot' });
        }

        res.json(ratings);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ message: 'Failed to fetch ratings', error: error.toString() });
    }
});



module.exports = router;
