const express = require('express');
const natural = require('natural');
const JaroWinklerDistance = natural.JaroWinklerDistance; // Correct function import
const TfIdf = require('natural').TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const fuzzy = require('fuzzy');
const router = express.Router();

const { getSynonyms } = require('../shared/thesaurusAPI');
const Message = require('../models/messageModel');
const Chatbot = require('../models/chatbotModel');
const FAQ = require('../models/faqModel');
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

// Jaccard Similarity function
function jaccardSimilarity(setA, setB) {
    const intersection = setA.filter(x => setB.includes(x));
    const union = [...new Set([...setA, ...setB])];
    return intersection.length / union.length;
}

// Cosine Similarity function
function cosineSimilarity(tokensA, tokensB) {
    const tfidf = new (require('natural').TfIdf)(); // Using TfIdf for cosine similarity
    tfidf.addDocument(tokensA);
    tfidf.addDocument(tokensB);
    return tfidf.tfidfs(tokensA)[1]; // Get cosine similarity between the two documents
}

// Jaro-Winkler Similarity
function jaroWinklerSimilarity(str1, str2) {
    if (!str1 || !str2) {
        console.error("Invalid input to JaroWinkler: one of the strings is undefined or empty.");
        return 0; // Return a default similarity score if inputs are invalid
    }
    return JaroWinklerDistance.distance(str1, str2); // Corrected the way to access JaroWinkler
}

// Helper function to fetch and normalize the user query with synonyms
async function normalizeQueryWithSynonyms(query) {
    const tokens = tokenizer.tokenize(query.toLowerCase());
    const normalizedTokens = [];

    for (let token of tokens) {
        const synonyms = await getSynonyms(token); // Fetch synonyms dynamically
        normalizedTokens.push(...synonyms, token);  // Add synonyms and the original token
    }

    return normalizedTokens.map(token => stemmer.stem(token)); // Stem tokens for better matching
}

// Protected route for handling chat
router.post('/', authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id; // Get user ID from token

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

        // Normalize the user question and fetch dynamic synonyms
        const normalizedTokens = await normalizeQueryWithSynonyms(question);
        console.log(`Normalized User Question (with Synonyms): ${normalizedTokens.join(' ')}`);

        // 1. Exact Match Check
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === question.toLowerCase().trim());
        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
            // Save the bot response to the database
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
            const similarity = jaccardSimilarity(normalizedTokens, tokenizedFaq);
            console.log(`FAQ Question: "${faq.question}" | Jaccard Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 3. Cosine Similarity Check
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const similarity = cosineSimilarity(normalizedTokens, tokenizedFaq);
            console.log(`FAQ Question: "${faq.question}" | Cosine Similarity: ${similarity}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 4. Jaro-Winkler Similarity Check
        faqs.forEach(faq => {
            const similarity = jaroWinklerSimilarity(question, faq.question.toLowerCase().trim());
            console.log(`FAQ Question: "${faq.question}" | Jaro-Winkler Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // Define threshold for similarity matching
        const SIMILARITY_THRESHOLD = 0.2; // Adjust this threshold based on testing

        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log(`FAQ Match Found: "${bestMatch.faq.question}" with similarity ${bestMatch.score.toFixed(2)}`);

            // Save the bot response to the database
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
            res.json({ reply: "Sorry, I couldn't find an answer to that question.", source: 'FAQ' });
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
