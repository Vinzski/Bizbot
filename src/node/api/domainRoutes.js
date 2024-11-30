const express = require('express');
const router = express.Router();
const Domain = require('../models/domainModel');
const authenticate = require('../signup/middleware/authMiddleware');  // Path to your authentication middleware

// POST endpoint to add a new domain
router.post('/add-domain', authenticate, async (req, res) => {
    const { domain } = req.body;
    const userId = req.user.id;  // Extracted from token after authentication

    // Validate the domain input
    if (!domain) {
        return res.status(400).json({ message: "Domain is required." });
    }

    try {
        // Check for existing domain
        const existingDomain = await Domain.findOne({ domain });
        if (existingDomain) {
            return res.status(409).json({ message: "Domain already registered." });
        }

        // Save the new domain
        const newDomain = new Domain({ domain, userId });
        await newDomain.save();

        res.status(201).json({ message: "Domain added successfully", newDomain });
    } catch (error) {
        console.error('Error saving domain:', error);
        res.status(500).json({ message: "Failed to add domain", error: error.toString() });
    }
});

module.exports = router;
