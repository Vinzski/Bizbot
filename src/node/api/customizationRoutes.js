const express = require('express');
const router = express.Router();
const multer = require('multer');
const ChatbotCustomization = require('../models/chatbotCustomizationModel');
const authenticate = require('../signup/middleware/authMiddleware');
const Chatbot = require('../models/chatbotModel');

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '../../uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// Save customization
router.post('/save', authenticate, upload.single('logo'), async (req, res) => {
    try {
        const { chatbotId, themeColor, welcomeMessage } = req.body;

        // Verify that the chatbot belongs to the authenticated user
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId: req.user.id });
        if (!chatbot) {
            return res.status(404).json({ message: 'Chatbot not found or does not belong to the user.' });
        }

        const customizationData = {
            chatbotId,
            themeColor,
            welcomeMessage,
        };

        if (req.file) {
            customizationData.logo = `/uploads/${req.file.filename}`;
        }

        const customization = await ChatbotCustomization.findOneAndUpdate(
            { chatbotId },
            customizationData,
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'Customization saved successfully', customization });
    } catch (error) {
        console.error('Error saving customization:', error);
        res.status(500).json({ message: 'Error saving customization', error: error.message });
    }
});

module.exports = router;
