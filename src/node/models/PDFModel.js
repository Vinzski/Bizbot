const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
    filename: { type: String, required: true },  // Store the filename of the uploaded PDF
    chatbotId: { type: String, required: false },  // Store the chatbotId, optional
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Reference to the User who uploaded
    content: { type: String, required: true },  // Store the extracted text content from the PDF
    timestamp: { type: Date, default: Date.now },  // Store the timestamp of when the PDF was uploaded
});

module.exports = mongoose.model('PDF', pdfSchema);
