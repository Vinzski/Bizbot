(function () {
    let token; // Store the widget token in memory

    // Function to initialize the chatbot widget
    function initializeChatbot() {
        const chatbotId = document.getElementById('bizbot-widget').getAttribute('data-chatbot-id');
        if (!chatbotId) {
            console.error('Chatbot ID is missing.');
            return;
        }

        // Fetch the token from the server
        fetch('https://bizbot-khpq.onrender.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chatbotId })
        })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    token = data.token; // Store token in memory
                    console.log('Chatbot token fetched successfully');
                } else {
                    throw new Error('Failed to fetch token');
                }
            })
            .catch(error => {
                console.error('Error fetching chatbot token:', error);
            });
    }

    // Function to send user messages to the server
function sendMessage(userInput) {
    if (!token) {
        console.error('Token is not available. Ensure the widget is initialized correctly.');
        return;
    }

    // Send the user input along with the chatbotId to the backend
    fetch('https://bizbot-khpq.onrender.com/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            question: userInput,
            chatbotId: document.getElementById('bizbot-widget').getAttribute('data-chatbot-id')  // Ensure chatbotId is passed
        })
    })
    .then(response => response.json())
    .then(data => {
        // Display the bot's reply in the chatbot UI
        displayBotMessage(data.reply);
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
}



    // Function to display bot messages
    function displayBotMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('message', 'bot-message');
        botMessageElement.textContent = message;
        chatMessages.appendChild(botMessageElement);
    }

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
    #chatbot-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      height: 400px;
      background-color: var(--theme-color, #f0f0f0);
      border-radius: 15px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    #chat-header {
      background-color: var(--theme-color, #4a90e2);
      color: white;
      padding: 15px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    #close-chat {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2em;
      transition: transform 0.2s ease;
    }
    
    #close-chat:hover {
      transform: scale(1.1);
    }
    
    #chat-messages {
      flex-grow: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      scroll-behavior: smooth;
    }
    
    #chat-input {
      display: flex;
      padding: 10px;
      background-color: #fff;
      border-top: 1px solid #e0e0e0;
    }
    
    #user-input {
      flex-grow: 1;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 20px;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }
    
    #user-input:focus {
      outline: none;
      border-color: var(--theme-color, #4a90e2);
    }
    
    #send-message {
      background-color: var(--theme-color, #4a90e2);
      color: white;
      border: none;
      padding: 10px 15px;
      margin-left: 10px;
      cursor: pointer;
      border-radius: 20px;
      transition: background-color 0.2s ease;
    }
    
    #send-message:hover {
      background-color: var(--theme-color-dark, #3a80d2);
    }
    
    #chat-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--theme-color, #4a90e2);
      color: white;
      border: none;
      padding: 15px;
      border-radius: 10%;
      cursor: pointer;
      width: 5%; 
      height: 6%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    }
    
    #chat-toggle:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      background-color: var(--theme-color-dark, #3a80d2);
    }
    
    .message {
      display: flex;
      align-items: flex-start;
      margin: 10px 0;
      padding: 10px;
      border-radius: 15px;
      max-width: 80%;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .user-message {
      background-color: #e6f3ff;
      align-self: flex-end;
      flex-direction: row-reverse;
      border-bottom-right-radius: 5px;
      padding-top: 10px;
      padding-bottom: 10px;
    }
    
    .bot-message {
      background-color: #f0f0f0;
      align-self: flex-start;
      flex-direction: row;
      border-bottom-left-radius: 5px;
    }
    
    .profile-image {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      background-color: #ccc;
      flex-shrink: 0;
      margin: 0 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #fff;
      font-size: 16px;
    }
    
    .message-content {
      flex-grow: 1;
      word-break: break-word;
      font-size: 14px;
      line-height: 1.4;
    }
    
    /* Scrollbar Styles */
    #chat-messages::-webkit-scrollbar {
      width: 6px;
    }
    
    #chat-messages::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    #chat-messages::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }
    
    #chat-messages::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
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
        sendMessage(userInput.value);

        // Clear the input field after sending
        userInput.value = '';
    };

    // Initialize the chatbot widget on load
    initializeChatbot();
})();
