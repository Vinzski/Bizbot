(function () {
    let token; // Store the widget token in memory

    // Function to add Font Awesome
    function addFontAwesome() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
        link.integrity = 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==';
        link.crossOrigin = 'anonymous';
        link.referrerPolicy = 'no-referrer';
        document.head.appendChild(link);
    }

    // Inject SweetAlert2 CDN dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    document.head.appendChild(script);

 // Event listener for sending feedback
feedbackBtn.onclick = function () {
    if (selectedRating) {
        const feedbackText = feedbackTextarea.value; 
        if (feedbackText.trim() === '') {
            // Show SweetAlert if feedback text is empty
            Swal.fire({
                icon: 'warning',
                title: 'Oops...',
                text: 'Please enter your feedback.'
            });
        } else {
            console.log(`Feedback submitted: ${feedbackText}`);
            console.log(`Feedback submitted with rating: ${selectedRating}`);
            
            // Get the user ID and chatbot ID from the widget
            const widgetElement = document.getElementById('bizbot-widget');
            const userId = widgetElement.getAttribute('data-user-id');
            const chatbotId = widgetElement.getAttribute('data-chatbot-id');
    
            // Prepare the feedback data
            const feedbackData = {
                userId: userId,
                chatbotId: chatbotId,
                rating: selectedRating,
                feedback: feedbackText,
            };
    
            // Send feedback to the server
            fetch('https://bizbot-khpq.onrender.com/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show SweetAlert for success and reload the page
                    Swal.fire({
                        icon: 'success',
                        title: 'Thank you!',
                        text: 'Your feedback has been submitted successfully.'
                    }).then(() => {
                        // Reload the page after the user clicks "OK"
                        window.location.reload();
                    });
                } else {
                    // Show SweetAlert for error
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'There was an issue submitting your feedback. Please try again.'
                    });
                }
            })
            .catch(error => {
                console.error('Error submitting feedback:', error);
                // Show SweetAlert for error
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'There was an issue submitting your feedback. Please try again.'
                });
            });
        }
    } else {
        // Show SweetAlert when rating is not selected
        Swal.fire({
            icon: 'warning',
            title: 'Please select a rating before submitting feedback.'
        });
    }
};



    addFontAwesome(); // Add Font Awesome on load

    // Function to initialize the chatbot widget
    function initializeChatbot() {
        const widgetElement = document.getElementById('bizbot-widget');
        const chatbotId = widgetElement.getAttribute('data-chatbot-id');
        const userId = widgetElement.getAttribute('data-user-id');
        const initialToken = widgetElement.getAttribute('data-token');

        console.log('Initializing Chatbot Widget:');
        console.log(`chatbotId: ${chatbotId}`);
        console.log(`userId: ${userId}`);
        console.log(`initialToken: ${initialToken}`);

        if (!chatbotId || !userId || !initialToken) {
            console.error('Chatbot ID, User ID, or initial token is missing.');
            return;
        }

        // Fetch the token from the server
        fetch('https://bizbot-khpq.onrender.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${initialToken}`
            },
            body: JSON.stringify({ chatbotId, userId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.token) {
                token = data.token; // Store token in memory
                console.log('Chatbot token fetched successfully:', token);
                enableSendButton(); // Enable send button once token is ready
            } else {
                throw new Error('Failed to fetch token');
            }
        })
        .catch(error => {
            console.error('Error fetching chatbot token:', error);
        });
    }

    // Function to enable the send button after token is fetched
    function enableSendButton() {
        const sendButton = document.getElementById('send-message');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.style.cursor = 'pointer';
        }
    }

    // Function to send user messages to the server
    function sendMessage(userInput) {
        const widgetElement = document.getElementById('bizbot-widget');
        const chatbotId = widgetElement.getAttribute('data-chatbot-id');
        const userId = widgetElement.getAttribute('data-user-id');

        if (!token) {
            console.error('Token is not available. Ensure the widget is initialized correctly.');
            return;
        }

        console.log('Sending message with the following details:');
        console.log(`chatbotId: ${chatbotId}`);
        console.log(`token: ${token}`);
        console.log(`userId: ${userId}`);
        console.log(`userInput: ${userInput}`);

        fetch('https://bizbot-khpq.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Use the updated token
            },
            body: JSON.stringify({ question: userInput, userId: userId }) // Send chatbotId instead of userId
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received response from server:', data);
                displayBotMessage(data.reply);
                console.log(`Response Source: ${data.source}`);
            })
            .catch(error => {
                console.error('Error sending message:', error);
                displayBotMessage("Sorry, something went wrong. Please try again later.");
            });
    }

    // Function to display bot messages
    function displayBotMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('message', 'bot-message');
        botMessageElement.textContent = message;
        chatMessages.appendChild(botMessageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message
    }

    // Create elements for the chatbot widget
    const chatbotWidget = document.createElement('div');
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
                <textarea name="feedback" id="feedback" placeholder="Your feedback..."></textarea>
                <button id="sendfeedback" class="sendfeedback">Send Feedback</button>  <!-- Added "Send Feedback" button -->
            </div>
        </div>
        <div id="chat-messages">
            <div class="message bot-message">
                <div class="profile-image"></div>
                <span class="message-content">Welcome! How can I assist you today?</span>
            </div>
        </div>
        <div id="chat-input">
            <input type="text" id="user-input" placeholder="Type your message...">
            <button id="send-message" disabled>Send</button> <!-- Disabled until token is ready -->
        </div>
    `;

    // Create the toggle button once
    const chatToggle = document.createElement('button');
    chatToggle.id = 'chat-toggle';
    chatToggle.textContent = 'Chat';
    chatToggle.style.display = 'block'; // Ensure it is visible initially

    // Add styles directly or link to an external stylesheet
    const styles = `
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
    #close-chats {
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
    .satisfactory{
        display: none;
        flex-direction: column;
        height: 100%;
        text-align: center;
        background-color: white;
    }
    .satisfactory span{
        text-align: left;
        height: 100%;
    }
    .satisfactory .rating{
        display: flex;
        flex-direction: column;
    }
    .satisfactory .rating p{
        margin: 0.5em;
    }
    .satisfactory .rating textarea{
        margin: 0.5em;
        border-radius: 5px;
        border: 1px solid #ccc;
    }
    .satisfactory .rating .sendfeedback{
        display: flex;
        align-self: center;
        border-radius: 5px;
        background-color: #3a80d2;
        color: white;
    }
    .emojis{
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-evenly;
    }
    .emoji{
        display: flex;
        flex-direction: column;
        align-items: center;
        border: none;
        background-color: white;
        cursor: pointer;
        color:#127999;
        width: 80px;
    }
    .emoji i{
        color: gray;
    }
    .emoji i.active#poor {
    color: red;
    }
    .emoji i.active#unsatisfied {
        color: orangered;
    }
    .emoji i.active#neutral {
        color: yellow;
    }
    .emoji i.active#satisfied {
        color: yellowgreen;
    }
    .emoji i.active#excellent {
        color: green;
    }
    .emoji:hover #poor {
        color: red;
        transform: scale(1.2); /* Scale up slightly on hover */
        transition: transform 0.3s ease; /* Smooth scaling transition */
    }
    .emoji:hover #unsatisfied {
        color: orangered;
        transform: scale(1.2); /* Scale up slightly on hover */
        transition: transform 0.3s ease; /* Smooth scaling transition */
    }
    .emoji:hover #neutral {
        color: yellow;
        transform: scale(1.2); /* Scale up slightly on hover */
        transition: transform 0.3s ease; /* Smooth scaling transition */
    }
    .emoji:hover #satisfied {
        color: yellowgreen;
        transform: scale(1.2); /* Scale up slightly on hover */
        transition: transform 0.3s ease; /* Smooth scaling transition */
    }
    .emoji:hover #excellent {
        color: green;
        transform: scale(1.2); /* Scale up slightly on hover */
        transition: transform 0.3s ease; /* Smooth scaling transition */
    }
    /* Prevent hover effects from overriding the active state */
    .emoji i:hover:not(.active) {
        transform: scale(1.2); /* Keep hover effects for non-active buttons */
    }
    .emoji i{
        font-size: 2em;
    }
    .emoji p{
        margin: 0.5em;
    }
    .top-emojis{
        display: flex;
        flex-direction: row;
    }
    .bot-emojis{
        display: flex;
        flex-direction: row;
    }
    `;
   const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Append elements to body
    document.body.appendChild(chatbotWidget);
    document.body.appendChild(chatToggle);

    // Elements for chat widget
    const chatToggleButton = document.getElementById('chat-toggle');
    const chatbotWidgetElement = document.getElementById('chatbot-widget');
    const closeChatButton = document.getElementById('close-chat');
    const chatMsgs = document.getElementById('chat-messages');
    const chatInp = document.getElementById('chat-input');
    const satisfactory = document.querySelector('.satisfactory');
    const emojiButtons = document.querySelectorAll('.emoji');
    const feedbackTextarea = document.getElementById('feedback');
    const feedbackBtn = document.getElementById('sendfeedback');
    const sendMessageButton = document.getElementById('send-message');
    let selectedRating = ''; // Variable to store the selected rating

    // Disable send button until token is fetched
    sendMessageButton.disabled = true;
    sendMessageButton.style.cursor = 'not-allowed';

    // Event listener to open chat
    chatToggleButton.onclick = function () {
        chatbotWidgetElement.style.display = 'flex';
        chatToggleButton.style.display = 'none';
        chatMsgs.style.display = 'flex';
        chatInp.style.display = 'flex';
    };

    // Event listener to close chat
    closeChatButton.onclick = function () {
        chatbotWidgetElement.style.display = 'none';
        chatToggleButton.style.display = 'block';
        chatMsgs.style.display = 'none';
        chatInp.style.display = 'none';
        setTimeout(function () {
            chatbotWidgetElement.style.display = 'flex';
            chatToggleButton.style.display = 'none';
            chatMsgs.style.display = 'none';
            satisfactory.style.display = 'flex';
        }, 1000);
    };

    // Event listeners for emoji buttons
    emojiButtons.forEach((button) => {
        button.addEventListener('click', function () {
            emojiButtons.forEach(btn => {
                btn.querySelector('i').classList.remove('active');
            });
            const icon = this.querySelector('i');
            icon.classList.add('active');
            selectedRating = this.querySelector('p').innerText; // Update the selected rating
        });
    });

    // Event listener for sending feedback
    feedbackBtn.onclick = function () {
        if (selectedRating) {
            const feedbackText = feedbackTextarea.value; 
            if (feedbackText.trim() === '') {
                alert('Please enter your feedback.');
            } else {
                console.log(`Feedback submitted: ${feedbackText}`);
                console.log(`Feedback submitted with rating: ${selectedRating}`);
                
                // Get the user ID and chatbot ID from the widget
                const widgetElement = document.getElementById('bizbot-widget');
                const userId = widgetElement.getAttribute('data-user-id');
                const chatbotId = widgetElement.getAttribute('data-chatbot-id');
        
                // Prepare the feedback data
                const feedbackData = {
                    userId: userId,
                    chatbotId: chatbotId,
                    rating: selectedRating,
                    feedback: feedbackText,
                };
        
                // Send feedback to the server
                fetch('https://bizbot-khpq.onrender.com/api/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(feedbackData),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Hide the chatbot widget and show the toggle button
                        widgetElement.style.display = 'none'; // Hide the main widget
                        const chatToggleButton = document.getElementById('chat-toggle');
                        chatToggleButton.style.display = 'block'; // Show the toggle button
                        const chatMsgs = document.getElementById('chat-messages');
                        chatMsgs.style.display = 'none'; // Hide chat messages
                        const chatInp = document.getElementById('chat-input');
                        chatInp.style.display = 'none'; // Hide chat input
                    } else {
                        alert('Error submitting feedback. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting feedback:', error);
                    alert('Error submitting feedback. Please try again.');
                });
            }
        } else {
            alert('Please select a rating before submitting feedback.');
        }
    };

        document.getElementById('sendfeedback').addEventListener('click', function () {
        const feedback = document.getElementById('feedback').value;
        if (feedback) {
            document.getElementById('feedback').value = ''; // Clear the feedback input
        }
    });

    // Event listener for sending user message
    sendMessageButton.onclick = function () {
        const userInput = document.getElementById('user-input');
        const chatMessages = document.getElementById('chat-messages');

        if (userInput.value.trim() === '') {
            alert('Please enter a message.');
            return; 
        }

        // Append the user's message to the chat
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('message', 'user-message');
        const userProfileImage = document.createElement('div');
        userProfileImage.classList.add('profile-image');
        const userText = document.createElement('span');
        userText.classList.add('message-content');
        userText.textContent = userInput.value;
        userMessageElement.appendChild(userProfileImage);
        userMessageElement.appendChild(userText);
        chatMessages.appendChild(userMessageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message

        // Send the message to the API
        sendMessage(userInput.value);

        // Clear the input field after sending
        userInput.value = '';
    };

    // Initialize the chatbot widget on load
    initializeChatbot();
})();
