const express = require('express');
const router = express.Router();
const multer = require('multer');
const ChatbotCustomization = require('../models/chatbotCustomizationModel');
const authenticate = require('../signup/middleware/authMiddleware');
const Chatbot = require('../models/chatbotModel');
const User = require('../models/userModel'); // Assuming this is the User model
const bcrypt = require('bcrypt');
const authenticateToken = require('../signup/middleware/authMiddleware'); // For profile update (reuse if same)

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '../../../uploads/'),
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

router.post('/update-profile', authenticateToken, async (req, res) => {
    const { username, email, oldPassword, newPassword } = req.body;
    console.log('Update-profile route hit');

    if (!username || !email || !oldPassword) {
        return res.status(400).json({ message: 'Username, email, and old password are required.' });
    }

    try {
        const user = await User.findOne({ username: req.user.username });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect old password.' });
        }

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
