
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

document.addEventListener('DOMContentLoaded', function() {
    fetchChatbots();  // Fetch chatbots when the page loads
});

document.addEventListener('DOMContentLoaded', () => {
    const chatbotSelect = document.getElementById('chatbot-select');
    const feedbackContainer = document.querySelector('.feedback-container');
    const token = localStorage.getItem('token');
    // Fetch chatbots and populate the dropdown
    fetch('/api/chatbots', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(chatbots => {
            chatbots.forEach(chatbot => {
                const option = document.createElement('option');
                option.value = chatbot._id;
                option.textContent = chatbot.name;
                chatbotSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching chatbots:', error));

    // Fetch feedbacks when a chatbot is selected
    chatbotSelect.addEventListener('change', (event) => {
        const chatbotId = event.target.value;
        const token = localStorage.getItem('token');
        if (chatbotId) {
            fetch(`/api/chatbots/feedbacks/${chatbotId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(feedbacks => {
                    feedbackContainer.innerHTML = ''; // Clear previous feedbacks
                    feedbacks.forEach(feedback => {
                        const feedbackElement = document.createElement('div');
                        feedbackElement.className = 'feedback';
                        feedbackElement.innerHTML = `
                            <div class="feedback-header">
                                <span class="prompt">user@feedback:~$</span>
                                <span>${new Date(feedback.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="feedback-content">
                                <div><span class="prompt">&gt;</span> <strong>Chatbot:</strong> <span class="chatbot-name">${chatbotSelect.options[chatbotSelect.selectedIndex].text}</span></div>
                                <div><span class="prompt">&gt;</span> <strong>Rating:</strong> ${feedback.rating}</div>
                                <div><span class="prompt">&gt;</span> <strong>Feedback:</strong> ${feedback.feedback}</div>
                            </div>
                        `;
                        feedbackContainer.appendChild(feedbackElement);
                    });
                })
                .catch(error => console.error('Error fetching feedbacks:', error));
        } else {
            feedbackContainer.innerHTML = ''; // Clear feedbacks if no chatbot is selected
        }
    });
});
