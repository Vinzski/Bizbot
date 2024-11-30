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
    var styles = `
        #chatbot-widget { position: fixed; bottom: 20px; right: 20px; width: 300px; height: 400px; background-color: var(--theme-color, #f0f0f0); border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: none; flex-direction: column; overflow: hidden; }
        #chat-header { background-color: var(--theme-color, #4a90e2); color: white; padding: 10px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        #close-chat { background: none; border: none; color: white; cursor: pointer; }
        #chat-messages { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; }
        #chat-input { display: flex; padding: 10px; }
        #user-input { flex-grow: 1; padding: 5px; border: 1px solid #ccc; border-radius: 3px; }
        #send-message { background-color: var(--theme-color, #4a90e2); color: white; border: none; padding: 5px 10px; margin-left: 5px; cursor: pointer; border-radius: 3px; }
        #chat-toggle { position: fixed; bottom: 20px; right: 20px; background-color: var(--theme-color, #4a90e2); color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer; }
        .message { display: flex; align-items: flex-start; margin: 5px; padding: 5px; border-radius: 5px; border: 1px solid #888; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .user-message { background-color: #bfefff; align-self: flex-end; flex-direction: row-reverse; }
        .bot-message { background-color: #f0f0f0; align-self: flex-start; flex-direction: row; }
        .profile-image { width: 30px; height: 30px; border-radius: 50%; background-color: #ccc; flex-shrink: 0; margin: 0 5px; }
        .message-content { flex-grow: 1; word-break: break-word; }
    `;
    var styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Append elements to body
    document.body.appendChild(chatbotWidget);
    document.body.appendChild(chatToggle);

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
        var token = localStorage.getItem('token');  // Retrieve the JWT from localStorage

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
            const token = localStorage.getItem('token');
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ question: userInput.value }) // Assuming the API expects a question field
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
