require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const connectDB = require('../config/db');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, '../../public')));  // Adjust as necessary

connectDB();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    credentials: true
}));

// Import route modules
const authRoutes = require('./routes/authRoutes');
const faqRoutes = require('../api/faqRoutes');
const chatRoutes = require('../api/chatRoutes');
const chatbotRoutes = require('../api/chatbotRoutes');
const customizationRoutes = require('../api/customizationRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api', chatRoutes); 
app.use('/api/customization', customizationRoutes);
app.use('/widget.js', widgetRoute);

app.get('/widget.js', authenticate, (req, res) => {
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
app.post('/chat', (req, res) => {
    const userMessage = req.body.message;
    // In a real application, you'd process the user's message here
    const botResponse = "Thanks for your message! I'm a demo bot, so I can't provide a real response. How else can I help you?";
    res.json({ message: botResponse });
  });
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
