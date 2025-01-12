const express = require('express');
const router = express.Router();
const pdfParse = require('pdf-parse');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const PDF = require('../models/PDFModel');
const FAQ = require('../models/faqModel');
const Chatbot = require('../models/chatbotModel');
const authenticate = require('../signup/middleware/authMiddleware');

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads'); // Ensure this directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename to prevent conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept only PDF files
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB
});

// DELETE /api/pdfs/:id
router.delete('/delete-pdf/:id', authenticate, async (req, res) => {
    try {
        const pdfId = req.params.id;

        // Validate PDF ID
        if (!mongoose.Types.ObjectId.isValid(pdfId)) {
            return res.status(400).json({ message: 'Invalid PDF ID provided' });
        }

        // Find the PDF document
        const pdf = await PDF.findById(pdfId);
        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        // Ensure the PDF belongs to the authenticated user
        if (pdf.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this PDF' });
        }

        // Find the associated chatbot
        const chatbot = await Chatbot.findOne({ _id: pdf.chatbotId, userId: req.user.id });
        if (!chatbot) {
            return res.status(404).json({ message: 'Associated chatbot not found or does not belong to the user' });
        }

        // Remove the PDF reference from the chatbot's pdfId array
        chatbot.pdfId = chatbot.pdfId.filter(id => id.toString() !== pdfId);
        await chatbot.save();

        // Delete the PDF document from the database
        await PDF.findByIdAndDelete(pdfId);

        // Delete the PDF file from the filesystem
        const filePath = path.join(__dirname, '..', 'uploads', pdf.filename);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Failed to delete file ${pdf.filename}:`, err);
                // Optionally, you can choose to handle this error differently
            }
        });

        // Populate the updated pdfId array
        const updatedChatbot = await Chatbot.findById(chatbot._id).populate('pdfId');

        res.status(200).json({
            message: 'PDF deleted successfully',
            chatbot: {
                _id: updatedChatbot._id,
                name: updatedChatbot.name,
                type: updatedChatbot.type,
                pdfs: updatedChatbot.pdfId, // Updated array of PDFs
            },
        });

    } catch (error) {
        console.error('Error deleting PDF:', error);
        res.status(500).json({ message: 'Error deleting PDF', error: error.toString() });
    }
});

// POST /api/faqs/upload-pdf
router.post('/upload-pdf', authenticate, upload.single('pdf'), async (req, res) => {
    try {
        // Check if a file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }

        const { chatbotId } = req.body;

        // Require chatbotId to associate the PDF with an existing chatbot
        if (!chatbotId) {
            return res.status(400).json({ message: 'chatbotId is required to associate the PDF with an existing chatbot' });
        }

        // Validate chatbotId
        if (!mongoose.Types.ObjectId.isValid(chatbotId)) {
            return res.status(400).json({ message: 'Invalid chatbotId provided' });
        }

        // Find the chatbot and ensure it belongs to the authenticated user
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId: req.user.id });
        if (!chatbot) {
            return res.status(404).json({ message: 'Chatbot not found or does not belong to the user' });
        }

        // Parse the new PDF content
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        const extractedText = pdfData.text;

        // Create and save the new PDF document
        const newPDF = new PDF({
            filename: req.file.filename,
            chatbotId: chatbot._id,
            userId: req.user.id,
            content: extractedText,  // Content of the PDF
        });

        await newPDF.save();

        // Add the new PDF to the chatbot's pdfId array (instead of replacing it)
        chatbot.pdfId.push(newPDF._id);  // Push the new PDF to the pdfId array
        await chatbot.save();

        res.status(200).json({
            message: 'PDF uploaded and associated with chatbot successfully',
            pdf: {
                filename: newPDF.filename,
                _id: newPDF._id,
            },
            chatbot: {
                _id: chatbot._id,
                name: chatbot.name,
                type: chatbot.type,
            },
        });

    } catch (error) {
        console.error('Error processing PDF upload:', error);

        // Handle Multer-specific errors
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: error.message });
        } else if (error.message === 'Only PDF files are allowed') {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: 'Error processing PDF upload', error: error.toString() });
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
