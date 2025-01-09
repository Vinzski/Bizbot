require("dotenv").config();
const express = require("express");
const axios = require("axios");
const natural = require("natural");
const JaroWinklerDistance = natural.JaroWinklerDistance; // Correct function import
const TfIdf = require("natural").TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const fuzzy = require("fuzzy");
const router = express.Router();
const { CohereClient } = require('cohere-ai'); // Import Cohere

// Initialize Cohere with your API key from environment variables
const cohere = new CohereClient({ 
  token: process.env.COHERE_API_KEY 
});

const Message = require("../models/messageModel");
const Chatbot = require("../models/chatbotModel");
const FAQ = require("../models/faqModel");
const PDF = require("../models/PDFModel");
const authenticate = require("../signup/middleware/authMiddleware"); // Add path to your auth middleware

// Route to send a simple message (unprotected)
router.post("/send_message", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("Received message:", userMessage);
    // Save the user message to the database
    const message = new Message({
      userId: req.user ? req.user.id : null, // Handle cases where user might not be authenticated
      chatbotId: req.body.chatbotId, // Ensure chatbotId is sent in the request
      sender: "user",
      message: userMessage,
    });
    await message.save();
    console.log("User message saved to database.");

    // Respond with a simple JSON object
    res.json({ reply: "Response based on " + userMessage });
  } catch (error) {
    console.error("Error in /send_message:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
});

router.get("/user-interactions/:userId", authenticate, async (req, res) => {
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
      sender: "user",
    });

    res.json({ userId, interactionCount });
  } catch (error) {
    console.error("Error fetching user interactions count:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
});

// Jaccard Similarity function
function jaccardSimilarity(setA, setB) {
  const intersection = setA.filter((x) => setB.includes(x));
  const union = [...new Set([...setA, ...setB])];
  return intersection.length / union.length;
}

// Cosine Similarity function
function cosineSimilarity(tokensA, tokensB) {
  const tfidfModel = new TfIdf();
  tfidfModel.addDocument(tokensA);
  tfidfModel.addDocument(tokensB);

  // Retrieve all unique terms from both documents
  const termsA = tfidfModel.listTerms(0).map((item) => item.term);
  const termsB = tfidfModel.listTerms(1).map((item) => item.term);
  const allTerms = Array.from(new Set([...termsA, ...termsB]));

  const vectorA = allTerms.map((term) => tfidfModel.tfidf(term, 0));
  const vectorB = allTerms.map((term) => tfidfModel.tfidf(term, 1));

  // Compute dot product and magnitudes
  const dotProduct = vectorA.reduce(
    (acc, val, idx) => acc + val * vectorB[idx],
    0
  );
  const magnitudeA = Math.sqrt(
    vectorA.reduce((acc, val) => acc + val * val, 0)
  );
  const magnitudeB = Math.sqrt(
    vectorB.reduce((acc, val) => acc + val * val, 0)
  );

  // Prevent division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

// Jaro-Winkler Similarity
function jaroWinklerSimilarity(str1, str2) {
  if (!str1 || !str2) {
    console.error(
      "Invalid input to JaroWinkler: one of the strings is undefined or empty."
    );
    return 0; // Return a default similarity score if inputs are invalid
  }
  return JaroWinklerDistance(str1, str2);
}

// Function to get response from Rasa (replace with actual Rasa API call)
async function getRasaResponse(question) {
  try {
    const response = await axios.post(
      "http://13.55.82.197:5005/webhooks/rest/webhook",
      {
        message: question,
      }
    );

    if (response.data && response.data.length > 0) {
      return response.data[0].text;
    } else {
      return "Sorry, I couldn't find an answer to that question.";
    }
  } catch (error) {
    console.error("Error fetching response from Rasa:", error);
    return "Sorry, I couldn't fetch an answer from Rasa at the moment.";
  }
}

// Update the getCohereResponse function
async function getCohereResponse(question, pdfContents) {
    try {
        if (!pdfContents || pdfContents.length === 0) {
            console.log('No PDF content available for Cohere response.');
            return null;
        }

        let combinedPDFContent = pdfContents.join('\n\n');
        const MAX_CONTENT_LENGTH = 3000;
        if (combinedPDFContent.length > MAX_CONTENT_LENGTH) {
            combinedPDFContent = combinedPDFContent.substring(0, MAX_CONTENT_LENGTH);
            console.log('Combined PDF content truncated to fit token limits.');
        }

        const prompt = `
You are a friendly and helpful assistant. Answer the question based on the information provided below using simple language and a conversational tone.
Question: ${question}
Information:
${combinedPDFContent}
Answer:
`;

        console.log('Cohere Prompt:', prompt);
        const response = await cohere.generate({
            model: 'command-nightly',
            prompt: prompt,
            max_tokens: 150,
            temperature: 0.5,
            k: 0,
            p: 0.75,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop_sequences: ['\n'],
            return_likelihoods: 'NONE'
        });

        console.log('Cohere Raw Response:', JSON.stringify(response, null, 2));

        if (response && response.generations && response.generations.length > 0) {
            const cohereAnswer = response.generations[0].text.trim();
            console.log('Cohere Generated Answer:', cohereAnswer);

            if (cohereAnswer.length > 10) {
                return cohereAnswer;
            } else {
                console.log('Cohere response is too short.');
                return null;
            }
        } else {
            console.log('Cohere response does not contain expected data structure.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching response from Cohere:', error);
        return null;
    }
}

// Protected route for handling chat
router.post("/", authenticate, async (req, res) => {
    const { question, chatbotId } = req.body;
    const userId = req.user.id;

    console.log("--- Incoming Chat Request ---");
    console.log(`User ID: ${userId}`);
    console.log(`Chatbot ID: ${chatbotId}`);
    console.log(`Question: "${question}"`);

    try {
        // Save the user question to the database
        const userMessage = new Message({
            userId: userId,
            chatbotId: chatbotId,
            sender: "user",
            message: question,
        });

        await userMessage.save();
        console.log("User message saved to database.");

        // Fetch FAQs specific to the chatbot and user
        const faqs = await FAQ.find({ userId: userId });
        console.log(`Number of FAQs found: ${faqs.length}`);

        if (faqs.length === 0) {
            console.log("No FAQs found for the given userId and chatbotId.");
        }

        // Normalize the user question
        const normalizedUserQuestion = question.toLowerCase().trim();
        const tokenizedUserQuestion = tokenizer.tokenize(normalizedUserQuestion);
        const stemmedUserQuestion = tokenizedUserQuestion
            .map((token) => stemmer.stem(token))
            .join(" ");

        // Handle short queries (1- or 2-word inputs)
        if (tokenizedUserQuestion.length <= 2) {
            console.log("Short query detected. Attempting keyword match...");
            const keywordMatch = faqs.find((faq) =>
                tokenizedUserQuestion.some((token) =>
                    faq.question.toLowerCase().includes(token)
                )
            );
            if (keywordMatch) {
                console.log(`Keyword Match Found: "${keywordMatch.question}"`);
                // Save the bot response to the database
                const botMessage = new Message({
                    userId: userId,
                    chatbotId: chatbotId,
                    sender: "bot",
                    message: keywordMatch.answer,
                });
                await botMessage.save();
                console.log("Bot response saved to database.");

                return res.json({
                    reply: keywordMatch.answer,
                    source: "Keyword Match",
                });
            }
        }

        // 1. Exact Match Check
        const exactMatch = faqs.find(
            (faq) => faq.question.toLowerCase().trim() === normalizedUserQuestion
        );
        if (exactMatch) {
            console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: "bot",
                message: exactMatch.answer,
            });
            await botMessage.save();
            console.log("Bot response saved to database.");

            return res.json({ reply: exactMatch.answer, source: "FAQ" });
        }

        // 2. Jaccard Similarity Check
        let bestMatch = { score: 0, faq: null };
        faqs.forEach((faq) => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const similarity = jaccardSimilarity(tokenizedUserQuestion, tokenizedFaq);
            console.log(
                `FAQ Question: "${faq.question}" | Jaccard Similarity: ${similarity.toFixed(2)}`
            );
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 3. Cosine Similarity Check
        faqs.forEach((faq) => {
            const faqText = faq.question.toLowerCase().trim();
            const tokenizedFaq = tokenizer.tokenize(faqText);
            const similarity = cosineSimilarity(tokenizedUserQuestion, tokenizedFaq);
            console.log(
                `FAQ Question: "${faq.question}" | Cosine Similarity: ${similarity}`
            );
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // 4. Jaro-Winkler Similarity Check (for fuzzy matching)
        faqs.forEach((faq) => {
            const similarity = jaroWinklerSimilarity(
                normalizedUserQuestion,
                faq.question.toLowerCase().trim()
            );
            console.log(
                `FAQ Question: "${faq.question}" | Jaro-Winkler Similarity: ${similarity.toFixed(2)}`
            );
            if (similarity > bestMatch.score) {
                bestMatch = { score: similarity, faq };
            }
        });

        // Define threshold for similarity matching
        const SIMILARITY_THRESHOLD = 1.0; // Adjust this threshold based on testing

        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log(
                `FAQ Match Found: "${bestMatch.faq.question}" with similarity ${bestMatch.score.toFixed(2)}`
            );
            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: "bot",
                message: bestMatch.faq.answer,
            });
            await botMessage.save();
            console.log("Bot response saved to database.");

            return res.json({ reply: bestMatch.faq.answer, source: "FAQ" });
        } else {
            console.log("No adequate FAQ match found.");
            // Proceed to Cohere Integration
            // Fetch PDFs specific to the chatbot and user
            const pdfs = await PDF.find({ userId: userId, chatbotId: chatbotId });
            console.log(`Number of PDFs found: ${pdfs.length}`);

            if (pdfs.length > 0) {
                console.log("Proceeding to search PDFs with Cohere.");
                // Extract the content from all PDFs
                const pdfContents = pdfs.map((pdf) => pdf.content);

                // Get response from Cohere
                const cohereResponse = await getCohereResponse(question, pdfContents);

                if (cohereResponse) {
                    console.log("Cohere provided a response based on PDF content.");
                    // Save the bot response to the database
                    const botMessage = new Message({
                        userId: userId,
                        chatbotId: chatbotId,
                        sender: "bot",
                        message: cohereResponse,
                    });
                    await botMessage.save();
                    console.log("Bot response saved to database.");

                    return res.json({ reply: cohereResponse, source: "PDF via Cohere" });
                } else {
                    console.log(
                        "Cohere failed to generate a response. Proceeding to Rasa."
                    );
                }
            } else {
                console.log("No PDFs available to search.");
            }

            // If Cohere fails or no PDFs, fallback to Rasa
            const rasaResponse = await getRasaResponse(question); // Function to call Rasa API
            // Save the bot response to the database
            const botMessage = new Message({
                userId: userId,
                chatbotId: chatbotId,
                sender: "bot",
                message: rasaResponse,
            });
            await botMessage.save();
            console.log("Bot response saved to database.");

            return res.json({ reply: rasaResponse, source: "Rasa" });
        }
    } catch (error) {
        console.error("Error processing chat request:", error);
        res
            .status(500)
            .json({ message: "Internal Server Error", error: error.toString() });
    }
});

// Protected route for handling chat
router.post("/test", authenticate, async (req, res) => {
  const { question, chatbotId } = req.body;
  const userId = req.user.id;

  console.log("--- Incoming Chat Request ---");
  console.log(`User ID: ${userId}`);
  console.log(`Chatbot ID: ${chatbotId}`);
  console.log(`Question: "${question}"`);

  try {
    // Fetch FAQs specific to the chatbot and user
    const faqs = await FAQ.find({ userId: userId });
    console.log(`Number of FAQs found: ${faqs.length}`);

    if (faqs.length === 0) {
      console.log("No FAQs found for the given userId and chatbotId.");
    }

    // Normalize the user question
    const normalizedUserQuestion = question.toLowerCase().trim();
    const tokenizedUserQuestion = tokenizer.tokenize(normalizedUserQuestion);
    const stemmedUserQuestion = tokenizedUserQuestion
      .map((token) => stemmer.stem(token))
      .join(" ");

    // Short Query Handling
    if (tokenizedUserQuestion.length <= 2) {
      console.log("Short query detected. Attempting keyword match...");
      const keywordMatch = faqs.find((faq) =>
        tokenizedUserQuestion.some((token) =>
          faq.question.toLowerCase().includes(token)
        )
      );

      if (keywordMatch) {
        console.log(`Keyword Match Found: "${keywordMatch.question}"`);
        return res.json({
          reply: keywordMatch.answer,
          source: "Keyword Match",
        });
      }
    }

    // 1. Exact Match Check
    const exactMatch = faqs.find(
      (faq) => faq.question.toLowerCase().trim() === normalizedUserQuestion
    );
    if (exactMatch) {
      console.log(`Exact FAQ Match Found: "${exactMatch.question}"`);
      return res.json({ reply: exactMatch.answer, source: "FAQ" });
    }

    // 2. Jaccard Similarity Check
    let bestMatch = { score: 0, faq: null };
    faqs.forEach((faq) => {
      const faqText = faq.question.toLowerCase().trim();
      const tokenizedFaq = tokenizer.tokenize(faqText);
      const similarity = jaccardSimilarity(tokenizedUserQuestion, tokenizedFaq);
      console.log(
        `FAQ Question: "${
          faq.question
        }" | Jaccard Similarity: ${similarity.toFixed(2)}`
      );
      if (similarity > bestMatch.score) {
        bestMatch = { score: similarity, faq };
      }
    });

    // 3. Cosine Similarity Check
    faqs.forEach((faq) => {
      const faqText = faq.question.toLowerCase().trim();
      const tokenizedFaq = tokenizer.tokenize(faqText);
      const similarity = cosineSimilarity(tokenizedUserQuestion, tokenizedFaq);
      console.log(
        `FAQ Question: "${faq.question}" | Cosine Similarity: ${similarity}`
      );
      if (similarity > bestMatch.score) {
        bestMatch = { score: similarity, faq };
      }
    });

    // 4. Jaro-Winkler Similarity Check (for fuzzy matching)
    faqs.forEach((faq) => {
      const similarity = jaroWinklerSimilarity(
        normalizedUserQuestion,
        faq.question.toLowerCase().trim()
      );
      console.log(
        `FAQ Question: "${
          faq.question
        }" | Jaro-Winkler Similarity: ${similarity.toFixed(2)}`
      );
      if (similarity > bestMatch.score) {
        bestMatch = { score: similarity, faq };
      }
    });

    // Define threshold for similarity matching
    const SIMILARITY_THRESHOLD = 1.0; // Adjust this threshold based on testing

    if (bestMatch.score >= SIMILARITY_THRESHOLD) {
      console.log(
        `FAQ Match Found: "${
          bestMatch.faq.question
        }" with similarity ${bestMatch.score.toFixed(2)}`
      );
      return res.json({ reply: bestMatch.faq.answer, source: "FAQ" });
    } else {
      console.log("No adequate FAQ match found.");

      // Proceed to Cohere Integration
      // Fetch PDFs specific to the chatbot and user
      const pdfs = await PDF.find({ userId: userId, chatbotId: chatbotId });
      console.log(`Number of PDFs found: ${pdfs.length}`);

      if (pdfs.length > 0) {
        console.log("Proceeding to search PDFs with Cohere.");
        // Extract the content from all PDFs
        const pdfContents = pdfs.map((pdf) => pdf.content);

        // Get response from Cohere
        const cohereResponse = await getCohereResponse(question, pdfContents);

        if (cohereResponse) {
          console.log("Cohere provided a response based on PDF content.");
          return res.json({ reply: cohereResponse, source: "PDF via Cohere" });
        } else {
          console.log(
            "Cohere failed to generate a response. Proceeding to Rasa."
          );
        }
      } else {
        console.log("No PDFs available to search.");
      }

      // If Cohere fails or no PDFs, fallback to Rasa
      const rasaResponse = await getRasaResponse(question); // Function to call Rasa API
      return res.json({ reply: rasaResponse, source: "Rasa" });
    }
  } catch (error) {
    console.error("Error processing chat request:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
});

router.get("/user-interactions/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;
  try {
    const interactionCount = await Message.countDocuments({
      userId: userId,
      sender: "user",
    });
    res.json({ userId, interactionCount });
  } catch (error) {
    console.error("Error fetching user interactions count:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
});

module.exports = router;
