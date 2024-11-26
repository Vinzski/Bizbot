require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('../config/db');
const userModel = require('../models/userModel');

const app = express();

// Connect to Database
connectDB();

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000', // Frontend origin during development
    'https://bizbot-khpq.onrender.com',
    'https://empty-ideas-lick.loca.lt',
    
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Serve Static Files
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/uploads', express.static('uploads'));

// Import Route Modules
const authRoutes = require('./routes/authRoutes');
const faqRoutes = require('../api/faqRoutes');
const chatRoutes = require('../api/chatRoutes');
const chatbotRoutes = require('../api/chatbotRoutes');
const customizationRoutes = require('../api/customizationRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/customization', customizationRoutes);

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

// Catch-All Route for Undefined Routes
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
