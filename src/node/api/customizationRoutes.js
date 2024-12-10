const express = require('express');
const router = express.Router();
const multer = require('multer');
const ChatbotCustomization = require('../models/chatbotCustomizationModel');
const authenticate = require('../signup/middleware/authMiddleware');
const Chatbot = require('../models/chatbotModel');
const User = require('../models/userModel'); // Assuming this is the User model
const bcrypt = require('bcrypt');

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Specify the absolute path to the shared folder
        const uploadPath = path.resolve(__dirname, '../shared');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({ storage });


router.get('/get-customization/:chatbotId', authenticate, async (req, res) => {
    try {
        const { chatbotId } = req.params;

        // Verify that the chatbot belongs to the authenticated user
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId: req.user.id });
        if (!chatbot) {
            return res.status(404).json({ message: 'Chatbot not found or does not belong to the user.' });
        }

        // Fetch customization if it exists
        const customization = await ChatbotCustomization.findOne({ chatbotId });

        if (customization) {
            // Return existing customization if found
            return res.status(200).json({
                logo: customization.logo || '/default/logo.png',  // Use default logo if none exists
                themeColor: customization.themeColor || '#FFFFFF',  // Default theme color
                welcomeMessage: customization.welcomeMessage || 'Welcome to our chatbot!',  // Default welcome message
            });
        } else {
            // Return default values if no customization exists
            return res.status(200).json({
                logo: '/default/logo.png',
                themeColor: '#FFFFFF',
                welcomeMessage: 'Welcome to our chatbot!',
            });
        }
    } catch (error) {
        console.error('Error fetching customization:', error);
        res.status(500).json({ message: 'Error fetching customization', error: error.message });
    }
});


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
            customizationData.logo = `/shared/${req.file.filename}`; // Adjust the path for your frontend
        }

        // Update existing customization or create a new one if it doesn't exist
        const customization = await ChatbotCustomization.findOneAndUpdate(
            { chatbotId },
            { $set: customizationData },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'Customization saved successfully', customization });
    } catch (error) {
        console.error('Error saving customization:', error);
        res.status(500).json({ message: 'Error saving customization', error: error.message });
    }
});


router.post('/update-profile', authenticate, async (req, res) => {
    const { id } = req.user; // Extract the user ID from the token
    const { username, email, oldPassword, newPassword } = req.body;

    if (!username || !email || !oldPassword) {
        return res.status(400).json({ message: 'Username, email, and old password are required.' });
    }

    try {
        // Find user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify old password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect old password.' });
        }

        // Update user details
        user.username = username;
        user.email = email;

        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
        }

        await user.save();

        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'An error occurred while updating the profile.' });
    }
});


module.exports = router;
