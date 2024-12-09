
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

async function fetchChatbots() {
    const token = localStorage.getItem('token');  // Assuming the token is stored in localStorage

    if (!token) {
        console.error('No token found in localStorage');
        return;  // If no token, abort the request
    }

    try {
        const response = await fetch('/api/chatbots', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Add the token to the request headers
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch chatbots');
        }

        const chatbots = await response.json();

        const chatbotSelect = document.getElementById('chatbot-select');

        chatbots.forEach(chatbot => {
            const option = document.createElement('option');
            option.value = chatbot._id;  // Assuming the chatbot has an _id
            option.textContent = chatbot.name;  // Assuming name is the field for chatbot name
            chatbotSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching chatbots:', error);
    }
}


function displayFeedbacks(feedbacks) {
    const feedbacksContainer = document.getElementById('feedbacks');
    feedbacksContainer.innerHTML = '';  // Clear any previous feedbacks

    if (feedbacks.length === 0) {
        feedbacksContainer.innerHTML = '<p>No feedbacks available for this chatbot.</p>';
        return;
    }

    feedbacks.forEach(feedback => {
        const feedbackElement = document.createElement('div');
        feedbackElement.classList.add('feedback');

        feedbackElement.innerHTML = `
            <p><strong style="color: #007bff;">${feedback.chatbotId}</strong></p>
            <p><strong>Rating:</strong> ${feedback.rating}</p>
            <p><strong>Feedback:</strong> ${feedback.feedback}</p>
        `;

        feedbacksContainer.appendChild(feedbackElement);
    });

    // Make the feedbacks scrollable
    feedbacksContainer.style.maxHeight = '300px';
    feedbacksContainer.style.overflowY = 'scroll';
}

async function fetchFeedbacks() {
    const chatbotId = document.getElementById('chatbot-select').value;  // Get selected chatbot ID

    if (!chatbotId) {
        return;  // If no chatbot is selected, do nothing
    }

    const token = localStorage.getItem('token');  // Get the token from localStorage

    if (!token) {
        console.error('No token found in localStorage');
        return;  // Abort if token is not found
    }

    try {
        const response = await fetch(`/api/feedbacks/${chatbotId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Send the token with the request
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch feedbacks');
        }

        const feedbacks = await response.json();

        const feedbacksContainer = document.getElementById('feedbacks');
        feedbacksContainer.innerHTML = '';  // Clear any previous feedbacks

        if (feedbacks.length === 0) {
            feedbacksContainer.innerHTML = '<p>No feedbacks available for this chatbot.</p>';
            return;
        }

        // Loop through the feedbacks and display them
        feedbacks.forEach(feedback => {
            const feedbackElement = document.createElement('div');
            feedbackElement.classList.add('feedback');
            feedbackElement.innerHTML = `
                <strong class="chatbot-name">${feedback.chatbotName}</strong>
                <p><strong>Rating:</strong> ${feedback.rating}</p>
                <p><strong>Feedback:</strong> ${feedback.feedback}</p>
            `;
            feedbacksContainer.appendChild(feedbackElement);
        });
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
    }
}

