
window.onload = () => {
    const token = localStorage.getItem('token');  // Retrieve token from localStorage

    if (!token) {
        alert('You are not logged in!');
        return;
    }

    // Fetch the chatbot count from the server
    fetch('https://bizbot-khpq.onrender.com/api/chatbots/count', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`  // Send token in the Authorization header
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch chatbot count');
        }
        return response.json();  // Parse JSON response
    })
    .then(data => {
        const chatbotCount = data.count;  // Extract the count from the response
        document.getElementById('chatbot-count').textContent = chatbotCount; // Update the UI with the count
    })
    .catch(error => {
        console.error('Error fetching chatbot count:', error);
        document.getElementById('chatbot-count').textContent = 'Error';  // Display error in the UI
    });

    // Fetch the FAQ count from the server
    fetch('https://bizbot-khpq.onrender.com/api/faqs/count', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`  // Send token in the Authorization header
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch FAQ count');
        }
        return response.json();  // Parse JSON response
    })
    .then(data => {
        const faqCount = data.count;  // Extract the count from the response
        document.querySelector('.faq-number').textContent = faqCount; // Update the FAQ count in the UI
    })
    .catch(error => {
        console.error('Error fetching FAQ count:', error);
        document.querySelector('.faq-number').textContent = 'Error';  // Display error in the UI
    });
};
