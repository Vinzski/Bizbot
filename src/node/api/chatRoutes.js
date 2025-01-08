const express = require('express');
const axios = require('axios');
const natural = require('natural');
const JaroWinklerDistance = natural.JaroWinklerDistance; // Correct function import
const TfIdf = require('natural').TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const fuzzy = require('fuzzy');
const router = express.Router();

const Message = require('../models/messageModel');
const Chatbot = require('../models/chatbotModel');
const FAQ = require('../models/faqModel');
const PDF = require('../models/PDFModel');
const authenticate = require('../signup/middleware/authMiddleware'); // Add path to your auth middleware

// Route to send a simple message (unprotected)
router.post('/send_message', async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log("Received message:", userMessage);
        // Save the user message to the database
        const message = new Message({
            userId: req.user ? req.user.id : null, // Handle cases where user might not be authenticated
            chatbotId: req.body.chatbotId, // Ensure chatbotId is sent in the request
            sender: 'user',
            message: userMessage,
        });
        await message.save();
        console.log('User message saved to database.');

        // Respond with a simple JSON object
        res.json({ reply: "Response based on " + userMessage });
    } catch (error) {
        console.error('Error in /send_message:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});

router.get('/user-interactions/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;
    // Optional: Check if the requester has admin privileges
    // This depends on your authentication middleware setup
    // For example:
    // if (!req.user.isAdmin) {
    //     return res.status(403).json({ message: 'Access denied' });
    // }
    try {
        // Count the number of messages sent by the user
        const interactionCount = await Message.countDocuments({
            userId: userId,
            sender: 'user',
        });

        res.json({ userId, interactionCount });
    } catch (error) {
        console.error('Error fetching user interactions count:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.toString() });
    }
});

// Define weights for each similarity metric
const SIMILARITY_WEIGHTS = {
    exactMatch: 3,
    jaccard: 1,
    cosine: 2,
    jaroWinkler: 1.5
};

// Jaccard Similarity function
function jaccardSimilarity(setA, setB) {
    const intersection = setA.filter(x => setB.includes(x));
    const union = [...new Set([...setA, ...setB])];
    return union.length === 0 ? 0 : intersection.length / union.length;
}

// Cosine Similarity function using TfIdf
function cosineSimilarity(tokensA, tokensB) {
    const tfidfModel = new TfIdf();
    tfidfModel.addDocument(tokensA);
    tfidfModel.addDocument(tokensB);

    const vectorA = [];
    const vectorB = [];

    const terms = tfidfModel.listTerms(0).map(item => item.term);
    terms.forEach(term => {
        vectorA.push(tfidfModel.tfidf(term, 0));
        vectorB.push(tfidfModel.tfidf(term, 1));
    });

    // Calculate dot product and magnitudes
    const dotProduct = vectorA.reduce((sum, val, idx) => sum + (val * (vectorB[idx] || 0)), 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}

// Jaro-Winkler Similarity
function jaroWinklerSimilarity(str1, str2) {
    if (!str1 || !str2) {
        console.error("Invalid input to JaroWinkler: one of the strings is undefined or empty.");
        return 0;
    }
    return JaroWinklerDistance(str1, str2);
}

// Define a composite similarity score
function computeCompositeScore(questionTokens, faq) {
    let score = 0;
    let maxScore = 0;

    const normalizedFAQQuestion = faq.question.toLowerCase().trim();
    const tokenizedFaq = tokenizer.tokenize(normalizedFAQQuestion);

    // Exact Match
    if (normalizedFAQQuestion === questionTokens.join(' ')) {
        score += SIMILARITY_WEIGHTS.exactMatch;
    }
    maxScore += SIMILARITY_WEIGHTS.exactMatch;

    // Jaccard Similarity
    const jaccard = jaccardSimilarity(questionTokens, tokenizedFaq);
    score += jaccard * SIMILARITY_WEIGHTS.jaccard;
    maxScore += 1 * SIMILARITY_WEIGHTS.jaccard; // Jaccard similarity ranges from 0 to 1

    // Cosine Similarity
    const cosine = cosineSimilarity(questionTokens, tokenizedFaq);
    score += cosine * SIMILARITY_WEIGHTS.cosine;
    maxScore += 1 * SIMILARITY_WEIGHTS.cosine; // Assuming cosine similarity normalized between 0 and 1

    // Jaro-Winkler Similarity
    const jaroWinkler = jaroWinklerSimilarity(questionTokens.join(' '), normalizedFAQQuestion);
    score += jaroWinkler * SIMILARITY_WEIGHTS.jaroWinkler;
    maxScore += 1 * SIMILARITY_WEIGHTS.jaroWinkler; // Assuming Jaro-Winkler similarity normalized between 0 and 1

    // Normalize the composite score between 0 and 1
    return maxScore === 0 ? 0 : score / maxScore;
}

// Function to get response from Rasa with a default 'sender'
async function getRasaResponse(question) {
    try {
        const defaultSender = "default_sender"; // Provide a default sender value
        const response = await axios.post('http://13.55.82.197:5005/webhooks/rest/webhook', {
            sender: defaultSender, // Use default sender
            message: question
        });

        if (response.data && response.data.length > 0) {
            const rasaMessage = response.data[0].text;
            const confidence = response.data[0].confidence || 1; // Adjust based on your Rasa response structure
            return { text: rasaMessage, confidence };
        } else {
            return { text: "Sorry, I couldn't find an answer to that question.", confidence: 0 };
        }
    } catch (error) {
        console.error('Error fetching response from Rasa:', error.response ? error.response.data : error.message);
        return { text: "Sorry, I couldn't fetch an answer from Rasa at the moment.", confidence: 0 };
    }
}

// Protected route for handling chat
router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id;
    console.log('--- Incoming Chat Request ---');
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: "${question}"`);
    try {
        // Save the user question to the database
        const userMessage = new Message({
            userId: userId,
            chatbotId: chatbotId,
            sender: 'user',
            message: question,
        });

        await userMessage.save();
        console.log('User message saved to database.');
        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId });
        console.log(`Number of FAQs found: ${faqs.length}`);
        if (faqs.length === 0) {
            console.log('No FAQs found for the given userId and chatbotId.');
        }
        // Normalize the user question
        const normalizedUserQuestion = question.toLowerCase().trim();
        const tokenizedUserQuestion = tokenizer.tokenize(normalizedUserQuestion);
        const stemmedUserQuestion = tokenizedUserQuestion.map(token => stemmer.stem(token)).join(' ');
        // Handle short queries (1- or 2-word inputs)
        if (tokenizedUserQuestion.length <= 2) {
            console.log('Short query detected. Attempting keyword match...');
            const keywordMatch = faqs.find(faq => 
                tokenizedUserQuestion.some(token => faq.question.toLowerCase().includes(token))
            );
            if (keywordMatch) {
                console.log(`Keyword Match Found: "${keywordMatch.question}"`);
                // Save the bot response to the database
                const botMessage = new Message({
                    userId: userId,
                    chatbotId: chatbotId,
                    sender: 'bot',
                    message: keywordMatch.answer,
                });
                await botMessage.save();
                console.log('Bot response saved to database.');
                return res.json({ reply: keywordMatch.answer, source: 'Keyword Match' });
            }
        }
        // 1. Exact Match Check
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === normalizedUserQuestion);
        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: exactMatch.answer,
            });
            await botMessage.save();
            console.log('Bot response saved to database.');
            return res.json({ reply: exactMatch.answer, source: 'FAQ' });
        }
        // 2. Jaccard Similarity Check
        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const similarity = jaccardSimilarity(tokenizedUserQuestion, tokenizedFaq);
            console.log(`FAQ Question: "${faq.question}" | Jaccard Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 3. Cosine Similarity Check
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const similarity = cosineSimilarity(tokenizedUserQuestion, tokenizedFaq);
            console.log(`FAQ Question: "${faq.question}" | Cosine Similarity: ${similarity}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 4. Jaro-Winkler Similarity Check (for fuzzy matching)
        faqs.forEach(faq => {
            const similarity = jaroWinklerSimilarity(normalizedUserQuestion, faq.question.toLowerCase().trim());
            console.log(`FAQ Question: "${faq.question}" | Jaro-Winkler Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // Define threshold for similarity matching
        const SIMILARITY_THRESHOLD = 1.0; // Adjust this threshold based on testing
        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log(`FAQ Match Found: "${bestMatch.faq.question}" with similarity ${bestMatch.score.toFixed(2)}`);
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: bestMatch.faq.answer,
            });
            await botMessage.save();
            console.log('Bot response saved to database.');
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            console.log('No adequate FAQ match found.');
            // If no match found in FAQ, forward the question to Rasa for response
            const rasaResponse = await getRasaResponse(question);  // Function to call Rasa API
            return res.json({ reply: rasaResponse, source: 'Rasa' });
        }
    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});


// Protected route for handling chat
router.post('/test', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id;

    // Provide a default sender value to satisfy the Message model's requirement
    const defaultSender = "default_sender"; // Replace with a meaningful default if possible

    console.log('--- Incoming Chat Request ---');
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: "${question}"`);

    try {
        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId, chatbotId: chatbotId });
        console.log(`Number of FAQs found: ${faqs.length}`);

        if (faqs.length === 0) {
            console.log('No FAQs found for the given userId and chatbotId.');
        }

        // Normalize the user question
        const normalizedUserQuestion = question.toLowerCase().trim();
        const tokenizedUserQuestion = tokenizer.tokenize(normalizedUserQuestion);
        const stemmedUserQuestion = tokenizedUserQuestion.map(token => stemmer.stem(token)).join(' ');

        // Short Query Handling
        if (tokenizedUserQuestion.length <= 2) {
            console.log('Short query detected. Attempting keyword match...');
            const keywordMatch = faqs.find(faq =>
                tokenizedUserQuestion.some(token => faq.question.toLowerCase().includes(token))
            );

            if (keywordMatch) {
                console.log(`Keyword Match Found: "${keywordMatch.question}"`);
                // Log the message with default sender
                await Message.create({
                    userId,
                    chatbotId,
                    message: question,
                    response: keywordMatch.answer,
                    source: 'Keyword Match',
                    sender: defaultSender, // Use default sender
                });
                return res.json({ reply: keywordMatch.answer, source: 'Keyword Match' });
            }
        }

        // Compute composite similarity scores
        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const compositeScore = computeCompositeScore(tokenizedUserQuestion, faq);
            console.log(`FAQ Question: "${faq.question}" | Composite Similarity: ${compositeScore.toFixed(2)}`);
            if (compositeScore > bestMatch.score) {
                bestMatch = { score: compositeScore, faq };
            }
        });

        // Define threshold for similarity matching
        const SIMILARITY_THRESHOLD = 0.75; // Adjust this threshold based on testing

        if (bestMatch.score >= SIMILARITY_THRESHOLD && bestMatch.faq) {
            console.log(`FAQ Match Found: "${bestMatch.faq.question}" with composite similarity ${bestMatch.score.toFixed(2)}`);
            // Log the message with default sender
            await Message.create({
                userId,
                chatbotId,
                message: question,
                response: bestMatch.faq.answer,
                source: 'FAQ',
                sender: defaultSender, // Use default sender
            });
            return res.json({ reply: bestMatch.faq.answer, source: 'FAQ' });
        } else {
            console.log('No adequate FAQ match found. Forwarding to Rasa.');
            // Forward the question to Rasa for response
            const rasaResponseObj = await getRasaResponse(question);
            // Log the message with default sender
            await Message.create({
                userId,
                chatbotId,
                message: question,
                response: rasaResponseObj.text,
                source: 'Rasa',
                sender: defaultSender, // Use default sender
            });
            return res.json({ reply: rasaResponseObj.text, source: 'Rasa' });
        }
    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.toString() });
    }
});

router.get('/user-interactions/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;
    try {
        const interactionCount = await Message.countDocuments({
            userId: userId,
            sender: 'user',
        });
        res.json({ userId, interactionCount });
    } catch (error) {
        console.error('Error fetching user interactions count:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.toString() });
    }
});

module.exports = router;
