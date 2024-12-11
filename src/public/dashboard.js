// public/dashboard.js

document.addEventListener("DOMContentLoaded", function() {
    // Function to fetch and display dashboard data
    async function fetchDashboardData() {
        // Get the script tag with id 'bizbot-widget'
        const widgetScript = document.getElementById('bizbot-widget');
        const userId = widgetScript.getAttribute('data-user-id');
        const token = widgetScript.getAttribute('data-token');

        if (!userId || !token) {
            console.error('User ID or Token is missing.');
            return;
        }

        try {
            // Make an API call to fetch dashboard data
            const response = await fetch(`https://bizbot-khpq.onrender.com/api/chat/dashboard-data/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Update the HTML elements with the fetched counts
            const interactionCountElement = document.getElementById('user-interactions-count');
            const chatbotCountElement = document.getElementById('chatbot-count');
            const faqCountElement = document.getElementById('faq-count');

            if (interactionCountElement) {
                interactionCountElement.textContent = data.interactionCount.toLocaleString();
            }

            if (chatbotCountElement) {
                chatbotCountElement.textContent = data.chatbotCount.toLocaleString();
            }

            if (faqCountElement) {
                faqCountElement.textContent = data.faqCount.toLocaleString();
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            // Optional: Display an error message to the user
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to load dashboard data!',
            });
        }
    }

    // Function to fetch and display user interactions count
    async function fetchUserInteractions() {
        // Get the script tag with id 'bizbot-widget'
        const widgetScript = document.getElementById('bizbot-widget');
        const userId = widgetScript.getAttribute('data-user-id');
        const token = widgetScript.getAttribute('data-token');

        if (!userId || !token) {
            console.error('User ID or Token is missing.');
            return;
        }

        try {
            // Make an API call to fetch user interactions count
            const response = await fetch(`https://bizbot-khpq.onrender.com/api/chat/user-interactions/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const interactionCount = data.interactionCount || 0;

            // Update the HTML element with the fetched count
            const interactionCountElement = document.getElementById('user-interactions-count');
            if (interactionCountElement) {
                interactionCountElement.textContent = interactionCount.toLocaleString();
            } else {
                console.error('Element with ID "user-interactions-count" not found.');
            }
        } catch (error) {
            console.error('Failed to fetch user interactions count:', error);
        }
    }

    // Call the function to fetch and display dashboard data
    fetchDashboardData();

    // Existing code for displaying success toast is handled in the HTML script tag

    // Additional Code from User's Provided Snippets

    window.onload = () => {
        const token = localStorage.getItem('token');  // Retrieve token from localStorage

        if (!token) {
            alert('You are not logged in!');
            window.location.href = '/login.html'; // Redirect to login page or appropriate route
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
        .then(response => response.json())
        .then(data => {
            const chatbotCountElement = document.getElementById('chatbot-count');
            if (chatbotCountElement) {
                chatbotCountElement.textContent = data.count.toLocaleString();
            }
        })
        .catch(error => {
            console.error('Error fetching chatbot count:', error);
            const chatbotCountElement = document.getElementById('chatbot-count');
            if (chatbotCountElement) {
                chatbotCountElement.textContent = 'Error';
            }
        });

        // Fetch the FAQ count from the server
        fetch('https://bizbot-khpq.onrender.com/api/faqs/count', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const faqCountElement = document.getElementById('faq-count');
            if (faqCountElement) {
                faqCountElement.textContent = data.count.toLocaleString();
            }
        })
        .catch(error => {
            console.error('Error fetching FAQ count:', error);
            const faqCountElement = document.getElementById('faq-count');
            if (faqCountElement) {
                faqCountElement.textContent = 'Error';
            }
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        const chatbotSelect = document.getElementById('chatbot-select');
        const feedbackContainer = document.querySelector('.feedback-container');
        const ratingSelect = document.getElementById('rating-select'); // Reference to the new rating select dropdown
        const token = localStorage.getItem('token');

        if (!token) {
            console.error('Token not found in localStorage.');
            return;
        }

        // Fetch chatbots and populate the dropdown
        fetch('https://bizbot-khpq.onrender.com/api/chatbots', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(chatbots => {
            chatbots.forEach(chatbot => {
                const option = document.createElement('option');
                option.value = chatbot._id;
                option.textContent = chatbot.name;
                chatbotSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching chatbots:', error));

        // Event listener for the rating select dropdown
        ratingSelect.addEventListener('change', () => {
            if (chatbotSelect.value) fetchFeedbacks(chatbotSelect.value); // Fetch feedbacks with the selected rating
        });

        // Event listener for the chatbot select dropdown
        chatbotSelect.addEventListener('change', () => {
            fetchFeedbacks(chatbotSelect.value); // Fetch feedbacks for the selected chatbot ID
        });

        function fetchFeedbacks(chatbotId) {
            const selectedRating = ratingSelect.value; // Get the selected rating
            fetch(`https://bizbot-khpq.onrender.com/api/chatbots/feedbacks/${chatbotId}?rating=${selectedRating}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(feedbacks => renderFeedbacks(feedbacks))
            .catch(error => console.error('Error fetching feedbacks:', error));
        }

        function renderFeedbacks(feedbacks) {
            feedbackContainer.innerHTML = ''; // Clear previous feedbacks
            feedbacks.forEach(feedback => {
                const feedbackElement = document.createElement('div');
                feedbackElement.className = 'feedback';
                feedbackElement.innerHTML = `
                    <div class="feedback-header">
                        <span class="prompt">@user</span>
                        <span>${new Date(feedback.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="feedback-content">
                        <div><span class="prompt">&gt;</span> <strong>Chatbot:</strong> <span>${chatbotSelect.options[chatbotSelect.selectedIndex].text}</span></div>
                        <div><span class="prompt">&gt;</span> <strong>Rating:</strong> ${feedback.rating}</div>
                        <div><span class="prompt">&gt;</span> <strong>Feedback:</strong> ${feedback.feedback.substring(0, 100)}${feedback.feedback.length > 100 ? '...' : ''}</div>
                    </div>
                `;
                feedbackElement.addEventListener('click', () => {
                    Swal.fire({
                        title: 'Feedback Details',
                        html: `
                            <div style="text-align: left;">
                                <p><strong>Chatbot:</strong> ${chatbotSelect.options[chatbotSelect.selectedIndex].text}</p>
                                <p><strong>Rating:</strong> ${feedback.rating}</p>
                                <p><strong>Feedback:</strong> ${feedback.feedback}</p>
                                <p><strong>Date:</strong> ${new Date(feedback.createdAt).toLocaleString()}</p>
                            </div>
                        `,
                        icon: 'info',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#10B981',
                        customClass: {
                            container: 'swal-container',
                            popup: 'swal-popup',
                            header: 'swal-header',
                            title: 'swal-title',
                            closeButton: 'swal-close',
                            icon: 'swal-icon',
                            image: 'swal-image',
                            content: 'swal-content',
                            input: 'swal-input',
                            actions: 'swal-actions',
                            confirmButton: 'swal-confirm',
                            cancelButton: 'swal-cancel',
                            footer: 'swal-footer'
                        }
                    
                    });
                
                });
                feedbackContainer.appendChild(feedbackElement);
            });
        }
    });
