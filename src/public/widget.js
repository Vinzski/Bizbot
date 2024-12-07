(function () {
    let token; // Store the widget token in memory

    function addFontAwesome() {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
        link.integrity = 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==';
        link.crossOrigin = 'anonymous';
        link.referrerPolicy = 'no-referrer';
        document.head.appendChild(link);
    }

    // Call the function to add Font Awesome
    addFontAwesome();

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

        fetch('https://bizbot-khpq.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ question: userInput, chatbotId: document.getElementById('bizbot-widget').getAttribute('data-chatbot-id') })
        })
            .then(response => response.json())
            .then(data => {
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
    chatbotWidget.innerHTML = `
        <div id="chat-header">
            <span id="chat-title">BizBot</span>
            <button id="close-chat">X</button>
        </div>
        <div class="satisfactory">
            <div class="message bot-message">
                <div class="profile-image"></div>
                <span class="message-content">For better experiences, we would like to hear your feedback about the performance.</span>
            </div>
            <div class="rating">
                <p>How would you rate it?</p>
                <div class="emojis">
                    <div class="top-emojis">
                        <button class="emoji">
                            <i id="poor" class="fa-solid fa-face-sad-tear"></i>
                            <p>Poor</p>
                        </button>
                        <button class="emoji">
                            <i id="unsatisfied" class="fa-solid fa-face-frown"></i>
                            <p>Unsatisfied</p>
                        </button>
                    </div>
                    <div class="bot-emojis">
                        <button class="emoji">
                            <i id="neutral" class="fa-solid fa-face-meh"></i>
                            <p>Neutral</p>
                        </button>
                        <button class="emoji">
                            <i id="satisfied" class="fa-solid fa-face-smile"></i>
                            <p>Satisfied</p>
                        </button>
                        <button class="emoji">
                            <i id="excellent" class="fa-solid fa-face-laugh-beam"></i>
                            <p>Excellent</p>
                        </button>
                    </div>
                </div>
                <textarea name="feedback" id="feedback"></textarea>
                <button id="sendfeedback" class="sendfeedback">Send Feedback</button>
            </div>
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
        </div>
    `;

    // Create the toggle button once
    var chatToggle = document.createElement('button');
    chatToggle.id = 'chat-toggle';
    chatToggle.textContent = 'Chat';
    chatToggle.style.display = 'block'; // Ensure it is visible initially

    // Add styles directly or link to an external stylesheet
    var styles = `
    #chatbot-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        height: 400px;
        background-color: #f0f0f0;
        border-radius: 15px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
    }

    #chat-header {
        background-color: #4a90e2;
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

    #chat-messages {
        flex-grow: 1;
        overflow-y: auto;
        padding: 15px;
        display: flex;
        flex-direction: column;
        scroll-behavior: smooth;
        background-color: #ffffff;
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
        border-color: #4a90e2;
    }

    #send-message {
        background-color: #4a90e2;
        color: white;
        border: none;
        padding: 10px 15px;
        margin-left: 10px;
        cursor: pointer;
        border-radius: 20px;
        transition: background-color 0.2s ease;
    }

    #send-message:hover {
        background-color: #3a80d2;
    }

    #chat-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #4a90e2;
        color: white;
        border: none;
        padding: 15px;
        border-radius: 50%;
        cursor: pointer;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        z-index: 1000;
    }

    #chat-toggle:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        background-color: #3a80d2;
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
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .bot-message {
        background-color: #e3e3e3;
        align-self: flex-start;
    }

    .profile-image {
        width: 30px;
        height: 30px;
        background-color: #888;
        border-radius: 50%;
        margin-right: 10px;
    }

    .message-content {
        font-size: 14px;
    }

    .satisfactory {
        display: flex;
        flex-direction: column;
        padding: 10px;
    }

    .emoji {
        background: none;
        border: none;
        font-size: 1.5em;
        margin-right: 10px;
        cursor: pointer;
    }

    .sendfeedback {
        background-color: #4a90e2;
        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        margin-top: 10px;
    }
    `;

    var styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Append elements to body
    document.body.appendChild(chatbotWidget);
    document.body.appendChild(chatToggle);

    // Elements for chat widget
    const closeChatButton = document.getElementById('close-chat');
    const chatMsgs = document.getElementById('chat-messages');
    const chatInp = document.getElementById('chat-input');
    const sendMessageButton = document.getElementById('send-message');
    const userInput = document.getElementById('user-input');

    // Elements for feedback rating
    const sendFeedbackButton = document.getElementById('sendfeedback');
    const feedbackInput = document.getElementById('feedback');

    // Toggle chat visibility
    chatToggle.onclick = function () {
        chatbotWidget.style.display = 'flex';
        chatToggle.style.display = 'none';
        chatMsgs.style.display = 'flex';
        chatInp.style.display = 'flex';
    };

    // Close chat widget
    closeChatButton.onclick = function () {
        chatbotWidget.style.display = 'none';
        chatToggle.style.display = 'flex';
        chatMsgs.style.display = 'none';
        chatInp.style.display = 'none';
    };

    // Send user message
    sendMessageButton.onclick = function () {
        const userInputText = userInput.value.trim();
        if (userInputText) {
            sendMessage(userInputText);
            userInput.value = ''; // Clear the input field
        }
    };

    // Send feedback
    sendFeedbackButton.onclick = function () {
        const feedback = feedbackInput.value.trim();
        if (feedback) {
            console.log('Feedback sent:', feedback);
            alert('Thank you for your feedback!');
            feedbackInput.value = ''; // Clear the feedback textarea
        }
    };

    // Initialize the chatbot widget on load
    initializeChatbot();
})();
