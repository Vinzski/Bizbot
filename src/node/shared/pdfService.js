const { HuggingFaceInference } = require('langchain/llms/hf');
const { Document } = require('langchain/document');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { FaissStore } = require('langchain/vectorstores/faiss');
const { HuggingFaceEmbeddings } = require('langchain/embeddings/hf');
const PDF = require('../models/PDFModel');

class PDFService {
    constructor() {
        // Initialize HuggingFace model - using a free model
        this.model = new HuggingFaceInference({
            model: "google/flan-t5-small", // Free to use, general-purpose model
            apiKey: process.env.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 // Get a free key from HuggingFace
        });

        // Initialize embeddings with a free model
        this.embeddings = new HuggingFaceEmbeddings({
            model: "sentence-transformers/all-MiniLM-L6-v2" // Free, lightweight model
        });
    }

    async createVectorStore(pdfContent) {
        // Split the text into chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });

        const docs = await splitter.createDocuments([pdfContent]);
        
        // Create and return the vector store
        return await FaissStore.fromDocuments(docs, this.embeddings);
    }

    async findSimilarContent(question, vectorStore) {
        // Search for relevant content
        const results = await vectorStore.similaritySearch(question, 1);
        
        if (results.length === 0) {
            return null;
        }

        // Generate response using the model
        const context = results[0].pageContent;
        const prompt = `
        Context: ${context}
        Question: ${question}
        Answer the question based on the context provided. If the answer cannot be found in the context, say "I cannot find a specific answer to this question in the provided content."
        Answer:`;

        const response = await this.model.call(prompt);
        return response;
    }
}

module.exports = new PDFService();
