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

// Jaccard Similarity function
function jaccardSimilarity(setA, setB) {
    const intersection = setA.filter(x => setB.includes(x));
    const union = [...new Set([...setA, ...setB])];
    return intersection.length / union.length;
}

// Cosine Similarity function
function cosineSimilarity(tokensA, tokensB) {
    const tfidfModel = new TfIdf(); // Corrected: instantiate TfIdf here
    tfidfModel.addDocument(tokensA);
    tfidfModel.addDocument(tokensB);
    return tfidfModel.tfidfs(tokensA)[1]; // Get cosine similarity between the two documents
}

// Jaro-Winkler Similarity
function jaroWinklerSimilarity(str1, str2) {
    if (!str1 || !str2) {
        console.error("Invalid input to JaroWinkler: one of the strings is undefined or empty.");
        return 0; // Return a default similarity score if inputs are invalid
    }
    // Use the JaroWinklerDistance function directly as it is not a method of a class
    return JaroWinklerDistance(str1, str2); // Correctly using the function now
}

// Define a list of stop words
const stopWords = new Set(['the', 'are', 'what', 'can', 'this', 'for', 'which', 'if', 'to', 'and', 'or', 'is', 'in', 'on', 'it', 'of', 'why', 'who', 'do']);

// Function to remove stop words
function removeStopWords(tokens) {
    return tokens.filter(token => !stopWords.has(token));
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

        // Remove stop words from the tokenized user question
        const filteredTokens = removeStopWords(tokenizedUserQuestion);

        // Apply stemming after removing stop words
        const stemmedUserQuestion = filteredTokens.map(token => stemmer.stem(token)).join(' ');

        console.log(`Filtered and Stemmed Question: "${stemmedUserQuestion}"`);

        // 1. Exact Match Check
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === normalizedUserQuestion);
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

        // 2. Improved Keyword Inclusion Check
        let bestKeywordMatch = { faq: null, keywordCount: 0 };
        
        // Use filtered tokens for improved keyword inclusion check
        faqs.forEach(faq => {
            const faqTokens = tokenizer.tokenize(faq.question.toLowerCase());
            const filteredFaqTokens = removeStopWords(faqTokens); // Apply stop word removal to FAQ tokens
            const commonKeywords = filteredFaqTokens.filter(token => filteredTokens.includes(token)); // Compare with filtered user tokens
        
            if (commonKeywords.length > bestKeywordMatch.keywordCount) {
                console.log(`Keyword Match Found in FAQ: "${faq.question}" | Common Keywords: ${commonKeywords.join(', ')}`);
                bestKeywordMatch = { faq, keywordCount: commonKeywords.length };
            }
        });
        
        if (bestKeywordMatch.faq) {
            console.log(`Best FAQ Matched by Keyword Inclusion: "${bestKeywordMatch.faq.question}" with ${bestKeywordMatch.keywordCount} common keywords`);
        
            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: bestKeywordMatch.faq.answer,
            });
        
            await botMessage.save();
            console.log('Bot response saved to database.');
        
            return res.json({ reply: bestKeywordMatch.faq.answer, source: 'FAQ' });
        }

        // 3. Jaccard Similarity Check
        faqs.forEach(faq => {
            const faqTokens = tokenizer.tokenize(faq.question.toLowerCase());
            const filteredFaqTokens = removeStopWords(faqTokens); // Filter FAQ tokens
            const similarity = jaccardSimilarity(filteredTokens, filteredFaqTokens); // Use filtered user tokens
            console.log(`FAQ Question: "${faq.question}" | Jaccard Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 4. Cosine Similarity Check
        faqs.forEach(faq => {
            const faqTokens = tokenizer.tokenize(faq.question.toLowerCase());
            const filteredFaqTokens = removeStopWords(faqTokens); // Filter FAQ tokens
            const similarity = cosineSimilarity(filteredTokens, filteredFaqTokens); // Use filtered user tokens
            console.log(`FAQ Question: "${faq.question}" | Cosine Similarity: ${similarity}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });
        
        // 5. Jaro-Winkler Similarity Check (for fuzzy matching)
        faqs.forEach(faq => {
            const faqTokens = tokenizer.tokenize(faq.question.toLowerCase().trim());
            const filteredFaqTokens = removeStopWords(faqTokens).join(' '); // Filter and rejoin FAQ tokens into a string
            const filteredUserQuestion = removeStopWords(tokenizer.tokenize(normalizedUserQuestion)).join(' '); // Filter and rejoin user question tokens
        
            const similarity = jaroWinklerSimilarity(filteredUserQuestion, filteredFaqTokens);
            console.log(`FAQ Question: "${faq.question}" | Jaro-Winkler Similarity: ${similarity.toFixed(2)}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // Define threshold for similarity matching
        const SIMILARITY_THRESHOLD = 1.0; // Adjust this threshold based on testing

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
        const tokenizedUserQuestion = tokenizer.tokenize(normalizedUserQuestion);

        // Remove stop words from the tokenized user question
        const filteredTokens = removeStopWords(tokenizedUserQuestion);

        // Apply stemming after removing stop words
        const stemmedUserQuestion = filteredTokens.map(token => stemmer.stem(token)).join(' ');

        console.log(`Filtered and Stemmed Question: "${stemmedUserQuestion}"`);
        
        // 1. Exact Match Check
        const exactMatch = faqs.find(faq => faq.question.toLowerCase().trim() === normalizedUserQuestion);
        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
            return res.json({ reply: exactMatch.answer, source: 'FAQ' });
        }

        // 2. Improved Keyword Inclusion Check
        let bestKeywordMatch = { faq: null, keywordCount: 0 };
        
        faqs.forEach(faq => {
            const faqTokens = tokenizer.tokenize(faq.question.toLowerCase());
            const commonKeywords = faqTokens.filter(token => tokenizedUserQuestion.includes(token));
            if (commonKeywords.length > bestKeywordMatch.keywordCount) {
                console.log(`Keyword Match Found in FAQ: "${faq.question}" | Common Keywords: ${commonKeywords.join(', ')}`);
                bestKeywordMatch = { faq, keywordCount: commonKeywords.length };
            }
        });
        
        if (bestKeywordMatch.faq) {
            console.log(`Best FAQ Matched by Keyword Inclusion: "${bestKeywordMatch.faq.question}" with ${bestKeywordMatch.keywordCount} common keywords`);
        
            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: 'bot',
                message: bestKeywordMatch.faq.answer,
            });
        
            await botMessage.save();
            console.log('Bot response saved to database.');
        
            return res.json({ reply: bestKeywordMatch.faq.answer, source: 'FAQ' });
        }

        // 3. Jaccard Similarity Check
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

        // 4. Cosine Similarity Check
        faqs.forEach(faq => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const similarity = cosineSimilarity(tokenizedUserQuestion, tokenizedFaq);
            console.log(`FAQ Question: "${faq.question}" | Cosine Similarity: ${similarity}`);
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 5. Jaro-Winkler Similarity Check (for fuzzy matching)
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
