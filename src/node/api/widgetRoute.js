const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    const userId = req.user.id;
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'mysecretkey_12345', { expiresIn: '1h' });

    res.type('text/javascript');
    res.send(`
        (function () {
            var token = "${token}";

            // Embed your chatbot widget code here, using 'token' for API requests
        })();
    `);
});

module.exports = router;
