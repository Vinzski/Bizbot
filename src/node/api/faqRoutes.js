const express = require('express');
const router = express.Router();
const pdfParse = require('pdf-parse');
const multer = require('multer');
const mongoose = require('mongoose');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const PDF = require('../models/PDFModel');
const FAQ = require('../models/faqModel');
const Chatbot = require('../models/chatbotModel');
const authenticate = require('../signup/middleware/authMiddleware');

router.post('/upload-pdf', authenticate, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Parse the PDF content
        const pdfText = await pdfParse(req.file.buffer);
        const extractedText = pdfText.text;

        let chatbotId = req.body.chatbotId;

        // Validate chatbotId if provided
        if (chatbotId && !mongoose.Types.ObjectId.isValid(chatbotId)) {
            return res.status(400).json({ message: 'Invalid chatbotId provided' });
        }

        let chatbot;
        if (chatbotId) {
            chatbot = await Chatbot.findById(chatbotId);
            if (!chatbot) {
                return res.status(404).json({ message: 'Chatbot not found with the provided chatbotId' });
            }
        } else {
            // Create a new chatbot since chatbotId is not provided
            chatbot = new Chatbot({
                name: req.body.name || 'Default Chatbot Name', // Customize as needed
                type: req.body.type || 'Default Type',         // Customize as needed
                userId: req.user.id,
                faqs: [], // Initialize with empty FAQs or as needed
                // pdfId will be set after saving the PDF
            });
            await chatbot.save();
        }

        // Create and save the PDF
        const pdfData = new PDF({
            filename: req.file.originalname,
            chatbotId: chatbot._id, // Associate with the chatbot
            userId: req.user.id,
            content: extractedText,
        });

        await pdfData.save();

        // Update the chatbot to reference the new PDF
        chatbot.pdfId = pdfData._id;
        await chatbot.save();

        res.status(200).json({
            message: 'PDF uploaded and associated with chatbot successfully',
            pdf: {
                filename: pdfData.filename,
                content: pdfData.content, // Be cautious about sending content if sensitive
                _id: pdfData._id,
            },
            chatbot: {
                _id: chatbot._id,
                name: chatbot.name,
                type: chatbot.type,
            },
        });
    } catch (error) {
        console.error('Error processing PDF upload:', error);
        res.status(500).json({ message: 'Error processing PDF', error: error.toString() });
    }
});

// Fetch the count of FAQs for the current user
router.get('/count', authenticate, async (req, res) => {
    try {
        const faqCount = await FAQ.countDocuments({ userId: req.user.id });
        res.json({ count: faqCount });
    } catch (error) {
        console.error('Error counting FAQs:', error);
        res.status(500).json({ message: 'Failed to count FAQs', error: error.toString() });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        // Ensure that you're correctly querying based on user ID
        const faqs = await FAQ.find({ userId: req.user.id });
        res.json(faqs);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: "Failed to fetch FAQs", error: error.toString() });
    }
});

router.post('/', authenticate, async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ message: "Question and answer are required" });
    }

    try {
        const newFaq = new FAQ({
            question,
            answer,
            userId: req.user.id
        });
        const savedFaq = await newFaq.save();
        res.status(201).json(savedFaq);
    } catch (error) {
        console.error('Error saving FAQ:', error);
        res.status(500).json({ message: "Failed to create FAQ", error: error.toString() });
    }
});

// First, search for the FAQ and if it exists, delete it
router.delete('/:id', authenticate, async (req, res) => {
    const faqId = req.params.id;

    try {
        // Find the FAQ by ID and ensure it belongs to the authenticated user
        const faq = await FAQ.findOne({ _id: faqId, userId: req.user.id });

        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found or you do not have permission to delete it.' });
        }

        // Delete the FAQ
        await FAQ.deleteOne({ _id: faqId });

        res.status(200).json({ message: 'FAQ deleted successfully.' });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ message: 'Failed to delete FAQ', error: error.toString() });
    }
});



router.put('/:id', authenticate, async (req, res) => {
    const faqId = req.params.id;
    const { question, answer } = req.body;

    if (!question || !answer) {
        return res.status(400).json({ message: 'Question and answer are required' });
    }

    try {
        const faq = await FAQ.findOneAndUpdate(
            { _id: faqId, userId: req.user.id },
            { question, answer },
            { new: true } // Return the updated document
        );
        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found or you do not have permission to update it' });
        }
        res.json(faq);
    } catch (error) {
        console.error('Error updating FAQ:', error);
        res.status(500).json({ message: 'Failed to update FAQ', error: error.toString() });
    }
});


module.exports = router;
