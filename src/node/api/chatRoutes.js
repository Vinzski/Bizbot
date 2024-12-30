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

// List of stopwords to filter out
const stopwords = new Set([
    'the', 'are', 'what', 'can', 'this', 'for', 'which', 'if', 'to', 'and', 'or', 'is', 'in', 'on', 'it', 'of'
]);

// Function to filter stopwords from a question
function filterStopwords(tokens) {
    return tokens.filter(token => !stopwords.has(token));
}

// Jaccard Similarity function (remains unchanged)
function jaccardSimilarity(setA, setB) {
    const intersection = setA.filter(x => setB.includes(x));
    const union = [...new Set([...setA, ...setB])];
    return intersection.length / union.length;
}

// Cosine Similarity function (remains unchanged)
function cosineSimilarity(tokensA, tokensB) {
    const tfidfModel = new TfIdf();
    tfidfModel.addDocument(tokensA);
    tfidfModel.addDocument(tokensB);
    return tfidfModel.tfidfs(tokensA)[1];
}

// Jaro-Winkler Similarity (remains unchanged)
function jaroWinklerSimilarity(str1, str2) {
    if (!str1 || !str2) {
        console.error("Invalid input to JaroWinkler: one of the strings is undefined or empty.");
        return 0;
    }
    return JaroWinklerDistance(str1, str2);
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
        const filteredUserQuestion = filterStopwords(tokenizedUserQuestion);
        const stemmedUserQuestion = filteredUserQuestion.map(token => stemmer.stem(token)).join(' ');

        // 1. Direct Word Match (Check if any FAQ matches directly with a word in the question)
        let directMatch = null;
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const faqTokens = tokenizer.tokenize(faqText);
            const filteredFaqTokens = filterStopwords(faqTokens);
            if (filteredFaqTokens.some(token => filteredUserQuestion.includes(token))) {
                directMatch = faq;
            }
        });

        if (directMatch) {
            console.log(`Direct Match Found: "${directMatch.question}"`);
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: directMatch.answer,
            });

            await botMessage.save();
            console.log('Bot response saved to database.');
            return res.json({ reply: directMatch.answer, source: 'FAQ' });
        }

        // 2. Jaccard Similarity Check (continued)
        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const filteredFaq = filterStopwords(tokenizedFaq);
            const similarity = jaccardSimilarity(filteredUserQuestion, filteredFaq);
            console.log(`FAQ Question: "${faq.question}" | Jaccard Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 3. Cosine Similarity Check (continued)
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const filteredFaq = filterStopwords(tokenizedFaq);
            const similarity = cosineSimilarity(filteredUserQuestion, filteredFaq);
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

        const SIMILARITY_THRESHOLD = 0.8;

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
            const rasaResponse = await getRasaResponse(question);  // Forward to Rasa if no FAQ match
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

    console.log('--- Incoming Chat Request ---');
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: "${question}"`);

    try {
        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId });
        console.log(`Number of FAQs found: ${faqs.length}`);

        if (faqs.length === 0) {
            console.log('No FAQs found for the given userId and chatbotId.');
        }

        // Normalize the user question
        const normalizedUserQuestion = question.toLowerCase().trim();
        let tokenizedUserQuestion = tokenizer.tokenize(normalizedUserQuestion);
        tokenizedUserQuestion = removeStopWords(tokenizedUserQuestion); // Remove stop words
        const stemmedUserQuestion = tokenizedUserQuestion.map(token => stemmer.stem(token)).join(' ');

        // 1. Exact Match Check (direct match of words in FAQ)
        let exactMatch = null;
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const faqTokens = tokenizer.tokenize(faqText);
            const filteredFaqTokens = removeStopWords(faqTokens); // Remove stop words from FAQ question
            if (filteredFaqTokens.some(token => tokenizedUserQuestion.includes(token))) {
                exactMatch = faq;
            }
        });

        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
            return res.json({ reply: exactMatch.answer, source: 'FAQ' });
        }

        // 2. Jaccard Similarity Check
        let bestMatch = { score: 0, faq: null };
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const filteredFaqTokens = removeStopWords(tokenizedFaq); // Remove stop words from FAQ question
            const similarity = jaccardSimilarity(tokenizedUserQuestion, filteredFaqTokens);
            console.log(`FAQ Question: "${faq.question}" | Jaccard Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 3. Cosine Similarity Check
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const filteredFaqTokens = removeStopWords(tokenizedFaq); // Remove stop words from FAQ question
            const similarity = cosineSimilarity(tokenizedUserQuestion, filteredFaqTokens);
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
        const SIMILARITY_THRESHOLD = 0.8; // Adjust this threshold based on testing

        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log(`FAQ Match Found: "${bestMatch.faq.question}" with similarity ${bestMatch.score.toFixed(2)}`);
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

// Function to get response from Rasa (this is just a placeholder, replace with actual Rasa API call)
async function getRasaResponse(question) {
    // Assuming Rasa API is set up to accept a POST request with the user question
    try {
        const response = await axios.post('http://13.55.82.197:5005/webhooks/rest/webhook', {
            message: question
        });

        if (response.data && response.data.length > 0) {
            return response.data[0].text;
        } else {
            return "Sorry, I couldn't find an answer to that question.";
        }
    } catch (error) {
        console.error('Error fetching response from Rasa:', error);
        return "Sorry, I couldn't fetch an answer from Rasa at the moment.";
    }
}


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
