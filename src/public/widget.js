(function () {
    // Add a fallback welcome message
    let welcomeMessage = "Welcome! How can I assist you today?";

    // Create elements for the chatbot widget
    var chatbotWidget = document.createElement('div');
    chatbotWidget.id = 'chatbot-widget';
    chatbotWidget.innerHTML =
        `<div id="chat-header">
            <span id="chat-title">Chatbot</span>
            <button id="close-chat">X</button>
        </div>
        <div id="chat-messages">
            <div class="message bot-message">
                <div class="profile-image"></div>
                <span class="message-content">${welcomeMessage}</span>
            </div>
        </div>
        <div id="chat-input">
            <input type="text" id="user-input" placeholder="Type your message...">
            <button id="send-message">Send</button>
        </div>`;

    var chatToggle = document.createElement('button');
    chatToggle.id = 'chat-toggle';
    chatToggle.textContent = 'Chat';
    chatToggle.style.display = 'block';

    // Add styles directly or link to an external stylesheet
    var styles = `/* Your styles go here */`;
    var styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Append elements to body
    document.body.appendChild(chatbotWidget);
    document.body.appendChild(chatToggle);

    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token'); // Get the token from URL

    // Event listeners for toggling the widget
    document.getElementById('chat-toggle').onclick = function () {
        chatbotWidget.style.display = 'flex';
        chatToggle.style.display = 'none';
    };

    document.getElementById('close-chat').onclick = function () {
        chatbotWidget.style.display = 'none';
        chatToggle.style.display = 'block';
    };

    // Event listener for sending a message
    document.getElementById('send-message').onclick = function () {
        var userInput = document.getElementById('user-input');
        var chatMessages = document.getElementById('chat-messages');

        if (userInput.value.trim() === '') {
            alert('Please enter a message.');
            return; // Prevent sending empty messages
        }

        // Append the user's message to the chat
        var userMessageElement = document.createElement('div');
        userMessageElement.classList.add('message', 'user-message');
        var userProfileImage = document.createElement('div');
        userProfileImage.classList.add('profile-image');
        var userText = document.createElement('span');
        userText.classList.add('message-content');
        userText.textContent = userInput.value;
        userMessageElement.appendChild(userProfileImage);
        userMessageElement.appendChild(userText);
        chatMessages.appendChild(userMessageElement);

        // Send the message to the API
        fetch('https://bizbot-khpq.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Use the token from URL
            },
            body: JSON.stringify({ question: userInput.value })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not OK');
                }
                return response.json();
            })
            .then(data => {
                // Append the bot's reply to the chat
                var botMessageElement = document.createElement('div');
                botMessageElement.classList.add('message', 'bot-message');
                var botProfileImage = document.createElement('div');
                botProfileImage.classList.add('profile-image');
                var botText = document.createElement('span');
                botText.classList.add('message-content');
                botText.textContent = data.reply;
                botMessageElement.appendChild(botProfileImage);
                botMessageElement.appendChild(botText);
                chatMessages.appendChild(botMessageElement);

                // Scroll to the bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            })
            .catch(error => {
                console.error('Error sending message:', error);
            });

        // Clear the input field after sending
        userInput.value = '';
    };
})();
