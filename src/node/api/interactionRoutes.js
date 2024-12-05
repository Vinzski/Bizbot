const express = require('express');
const router = express.Router();
const Interaction = require('../models/Interaction'); // Ensure you have the correct model path
const authenticate = require('../signup/middleware/authMiddleware');  // Ensure correct middleware path


// Add this route in the appropriate section:
router.get('/interactions/count', authenticate, async (req, res) => {
    try {
        const userId = req.user._id; // Provided by the auth middleware
        const count = await Interaction.countDocuments({ userId });
        res.json({ count });
    } catch (error) {
        console.error('Error fetching interaction count:', error);
        res.status(500).json({ message: 'Failed to fetch interaction count' });
    }
});

// Export the router
module.exports = router;
