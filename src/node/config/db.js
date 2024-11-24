const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Use the Mongo URI from environment variables (process.env)
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatbot_db'; // Default for local development
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
};

module.exports = connectDB;
