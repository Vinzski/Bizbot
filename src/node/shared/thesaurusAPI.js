const axios = require('axios');

// Function to fetch synonyms dynamically from Datamuse API
async function getSynonyms(word) {
    try {
        const response = await axios.get(`https://api.datamuse.com/words?rel_syn=${word}`);
        return response.data.map(item => item.word); // Return only the synonyms
    } catch (error) {
        console.error("Error fetching synonyms:", error);
        return [];
    }
}

module.exports = { getSynonyms };
