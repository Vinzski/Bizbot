// server.js

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import Models
const User = require('../models/userModel'); // Ensure the correct path
const Chatbot = require('../models/chatbotModel');
const Domain = require('../models/domainModel');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const faqRoutes = require('../api/faqRoutes');
const chatRoutes = require('../api/chatRoutes');
const chatbotRoutes = require('../api/chatbotRoutes');
const customizationRoutes = require('../api/customizationRoutes');
const domainRoutes = require('../api/domainRoutes');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bizbot', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));  // Adjust as necessary

// CORS Configuration
app.use(async (req, res, next) => {
    try {
        const domains = await Domain.find().select('domain -_id'); // Fetch all allowed domains
        let allowedOrigins = domains.map(domain => domain.domain);

        // Add your own domain if necessary
        allowedOrigins.push('https://bizbot-khpq.onrender.com');

        cors({
            origin: function (origin, callback) {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
            credentials: true, // Adjust based on your needs
        })(req, res, next);
    } catch (error) {
        console.error('Error fetching domains for CORS:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/domains', domainRoutes);

// Serve Login Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
});

// Token Generation Endpoint
// This endpoint generates a JWT token containing both chatbotId and userId
app.post('/api/token', async (req, res) => {
    const { chatbotId } = req.body;
    const token = req.headers['authorization']?.split(' ')[1];

    if (!chatbotId) {
        return res.status(400).json({ message: 'Chatbot ID is required' });
    }

    if (!token) {
        return res.status(401).json({ message: 'Authorization token is missing' });
    }

    try {
        // Verify the existing token to extract userId
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey_12345');
        const userId = decoded.id;

        // Validate chatbotId
        const chatbot = await Chatbot.findById(chatbotId);
        if (!chatbot) {
            return res.status(404).json({ message: 'Invalid Chatbot ID' });
        }

        // Create payload with both chatbotId and userId
        const payload = { chatbotId, userId };

        // Sign the new token
        const newToken = jwt.sign(payload, process.env.JWT_SECRET || 'mysecretkey_12345', {
            expiresIn: '24h', // Token expires in 24 hours
        });

        res.json({ token: newToken });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(403).json({ message: 'Invalid or expired token' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
