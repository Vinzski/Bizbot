const express = require("express");
const axios = require("axios");
const natural = require("natural");
const JaroWinklerDistance = natural.JaroWinklerDistance;
const TfIdf = require("natural").TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const fuzzy = require("fuzzy");
const router = express.Router();

const Message = require("../models/messageModel");
const Chatbot = require("../models/chatbotModel");
const FAQ = require("../models/faqModel");
const authenticate = require("../signup/middleware/authMiddleware"); 

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

async function searchPDFContent(chatbotId, query) {
    try {
        // Fetch PDFs related to the chatbot
        const pdfs = await PDF.find({ chatbotId });

        if (!pdfs || pdfs.length === 0) {
            console.log('No PDFs found for the given chatbot.');
            return null;
        }

        // Normalize the query
        const normalizedQuery = query.toLowerCase().trim();
        const tokenizedQuery = tokenizer.tokenize(normalizedQuery);
        const stemmedQuery = tokenizedQuery.map(token => stemmer.stem(token));

        let bestMatch = { score: 0, content: null };

        // Iterate over PDFs to find the best matching content
        pdfs.forEach(pdf => {
            // Tokenize and stem the PDF content
            const tokenizedContent = tokenizer.tokenize(pdf.content.toLowerCase());
            const stemmedContent = tokenizedContent.map(token => stemmer.stem(token));

            // Calculate Jaccard similarity
            const jaccardScore = jaccardSimilarity(stemmedQuery, stemmedContent);
            console.log(`PDF Filename: "${pdf.filename}" | Jaccard Similarity: ${jaccardScore.toFixed(2)}`);

            // Update best match if score is higher
            if (jaccardScore > bestMatch.score) {
                bestMatch = { score: jaccardScore, content: pdf.content };
            }
        });

        // Define a similarity threshold
        const SIMILARITY_THRESHOLD = 0.2; // Adjust based on testing

        if (bestMatch.score >= SIMILARITY_THRESHOLD) {
            console.log(`Best PDF Match Found: Similarity Score ${bestMatch.score.toFixed(2)}`);
            return bestMatch.content;
        } else {
            console.log('No adequate PDF match found.');
            return null;
        }
    } catch (error) {
        console.error('Error searching PDF content:', error);
        return null;
    }
}

// Jaccard Similarity function
function jaccardSimilarity(setA, setB) {
  const intersection = setA.filter((x) => setB.includes(x));
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
    console.error(
      "Invalid input to JaroWinkler: one of the strings is undefined or empty."
    );
    return 0; // Return a default similarity score if inputs are invalid
  }
  // Use the JaroWinklerDistance function directly as it is not a method of a class
  return JaroWinklerDistance(str1, str2); // Correctly using the function now
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

      // If no match found in FAQ, forward the question to Rasa for response
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

      // Check PDF Database
      const pdfResponse = await searchPDFContent(chatbotId, question);
      if (pdfResponse) {
          return res.json({ reply: pdfResponse, source: 'PDF' });
      }

      // If no match found in FAQ, forward the question to Rasa for response
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

// Function to get response from Rasa (this is just a placeholder, replace with actual Rasa API call)
async function getRasaResponse(question) {
  // Assuming Rasa API is set up to accept a POST request with the user question
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
