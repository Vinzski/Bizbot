require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('../config/db');

const app = express();

// Database Connection
connectDB();

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*',  // Allows all origins
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    credentials: true
}));
app.use(express.static(path.join(__dirname, '../../public')));

// Routes
const authRoutes = require('./routes/authRoutes');
const faqRoutes = require('../api/faqRoutes');
const chatRoutes = require('../api/chatRoutes');
const chatbotRoutes = require('../api/chatbotRoutes');
const customizationRoutes = require('../api/customizationRoutes');
const domainRoutes = require('../api/domainRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/chat', chatRoutes);  // Only one route to '/api/chat'
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/domains', domainRoutes);  // Make sure front-end posts to '/api/domains/add-domain'

// Static Files
app.use('/uploads', express.static('uploads'));

// Base Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
