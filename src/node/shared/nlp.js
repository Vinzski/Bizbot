const spacy = require('spacy-node');
const { calculateSimilarity } = require('./similarity');

const nlpModel = spacy.load('en_core_web_md'); // Load the spaCy language model

// Function to process and find the best FAQ match
async function findBestMatch(question, faqs) {
    const questionDoc = await nlpModel(question);
    let bestMatch = { score: 0, faq: null };

    for (const faq of faqs) {
        const faqDoc = await nlpModel(faq.question);
        const similarity = calculateSimilarity(questionDoc.vector, faqDoc.vector);

        if (similarity > bestMatch.score) {
            bestMatch = { score: similarity, faq };
        }
    }

    return bestMatch;
}

module.exports = { findBestMatch };
