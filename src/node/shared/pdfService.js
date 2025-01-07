// pdfService.js
const { HuggingFaceInference } = require('@langchain/community/llms/hf');
const { Document } = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { HuggingFaceEmbeddings } = require('@langchain/community/embeddings/hf');
const PDF = require('../models/PDFModel');
require('dotenv').config();

class PDFService {
    constructor() {
        this.model = new HuggingFaceInference({
            model: "google/flan-t5-small",
            apiKey: process.env.HUGGINGFACEHUB_API_KEY
        });

        this.embeddings = new HuggingFaceEmbeddings({
            model: "sentence-transformers/all-MiniLM-L6-v2"
        });
    }

    async createVectorStore(pdfContent) {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });

        const docs = await splitter.createDocuments([pdfContent]);
        return await FaissStore.fromDocuments(docs, this.embeddings);
    }

    async findSimilarContent(question, vectorStore) {
        const results = await vectorStore.similaritySearch(question, 1);
        
        if (results.length === 0) {
            return null;
        }

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
