require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const connectDB = require('../config/db');
const userModel = require('../models/userModel');
const Domain = require('../models/domainModel');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));  // Adjust as necessary

connectDB();
app.use(async (req, res, next) => {
    try {
        const domains = await Domain.find().select('domain -_id'); // Fetch all domains from the database
        let allowedOrigins = domains.map(domain => domain.domain); // Extract domain names

        // Add the static domain to the allowed origins
        allowedOrigins.push('https://bizbot-khpq.onrender.com');

        cors({
            origin: function (origin, callback) {
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
            credentials: true, // Set this based on whether you need to handle authenticated requests from the client.
        })(req, res, next);
    } catch (error) {
        console.error('Error fetching domains for CORS:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Import route modules
const authRoutes = require('./routes/authRoutes');
const faqRoutes = require('../api/faqRoutes');
const chatRoutes = require('../api/chatRoutes');
const chatbotRoutes = require('../api/chatbotRoutes');
const customizationRoutes = require('../api/customizationRoutes');
const domainRoutes = require('../api/domainRoutes')
// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/domains', domainRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
});
app.get('/', (req, res) => {
    res.send('Chatbot Server is running');
});
app.use('/uploads', express.static('uploads'));

app.post('/api/token', (req, res) => {
    const { chatbotId } = req.body;

    if (!chatbotId) {
        return res.status(400).json({ message: 'Chatbot ID is required' });
    }

    // Optionally validate chatbotId if needed
    // For example: Check if chatbotId exists in your database
    // const chatbot = await Chatbot.findById(chatbotId);
    // if (!chatbot) return res.status(404).json({ message: 'Invalid chatbot ID' });

    const token = jwt.sign({ chatbotId }, process.env.JWT_SECRET || 'mysecretkey_12345', {
        expiresIn: '1h', // Token expires in 1 hour
    });

    res.json({ token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
