(function () {
  let token; // Store the widget token in memory
  let isFeedbackSubmitted = false; // Flag to track feedback submission status
  let themeColor = "#10B981"; // Default theme color
  let welcomeMessage = "Welcome! How can I assist you today?"; // Default welcome message
  let chatbotName = "BizBot"; // Default name, will be replaced
  let currentProfileImageUrl = ""; // Initialize profile image URL

  // Function to add Font Awesome
  function addFontAwesome() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    link.integrity =
      "sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==";
    link.crossOrigin = "anonymous";
    link.referrerPolicy = "no-referrer";
    document.head.appendChild(link);
  }

  // Inject SweetAlert2 CDN dynamically
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
  document.head.appendChild(script);

  script.onload = function () {
    // Event listener for sending feedback using SweetAlert
    feedbackBtn.onclick = function () {
      if (selectedRating) {
        const feedbackText = feedbackTextarea.value;
        if (feedbackText.trim() === "") {
          // Show SweetAlert if feedback text is empty
          Swal.fire({
            icon: "warning",
            title: "Oops...",
            text: "Please enter your feedback.",
            confirmButtonColor: themeColor,
          });
        } else {
          console.log(`Feedback submitted: ${feedbackText}`);
          console.log(`Feedback submitted with rating: ${selectedRating}`);

          // Get the user ID and chatbot ID from the widget
          const widgetElement = document.getElementById("bizbot-widget");
          const userId = widgetElement.getAttribute("data-user-id");
          const chatbotId = widgetElement.getAttribute("data-chatbot-id");

          // Prepare the feedback data
          const feedbackData = {
            userId: userId,
            chatbotId: chatbotId,
            rating: selectedRating,
            feedback: feedbackText,
          };

          // Send feedback to the server
          fetch("https://bizbot-khpq.onrender.com/api/feedback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(feedbackData),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                // Show SweetAlert for success and reload the page
                Swal.fire({
                  icon: "success",
                  title: "Thank you!",
                  text: "Your feedback has been submitted successfully.",
                  confirmButtonColor: themeColor,
                }).then(() => {
                  // Reload the page after the user clicks "OK"
                  window.location.reload();
                });
              } else {
                // Show SweetAlert for error
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "There was an issue submitting your feedback. Please try again.",
                  confirmButtonColor: themeColor,
                });
              }
            })
            .catch((error) => {
              console.error("Error submitting feedback:", error);
              // Show SweetAlert for error
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "There was an issue submitting your feedback. Please try again.",
                confirmButtonColor: themeColor,
              });
            });
        }
      } else {
        // Show SweetAlert when rating is not selected
        Swal.fire({
          icon: "warning",
          title: "Please select a rating before submitting feedback.",
          confirmButtonColor: themeColor,
        });
      }
    };
  };

  addFontAwesome(); // Add Font Awesome on load

  // Function to initialize the chatbot widget
  function initializeChatbot() {
    const widgetElement = document.getElementById("bizbot-widget");
    const chatbotId = widgetElement.getAttribute("data-chatbot-id");
    const userId = widgetElement.getAttribute("data-user-id");
    const initialToken = widgetElement.getAttribute("data-token");

    console.log("Initializing Chatbot Widget:");
    console.log(`chatbotId: ${chatbotId}`);
    console.log(`userId: ${userId}`);
    console.log(`initialToken: ${initialToken}`);

    if (!chatbotId || !userId || !initialToken) {
      console.error("Chatbot ID, User ID, or initial token is missing.");
      return;
    }

    // First fetch the chatbot's name
    fetchChatbotName(chatbotId)
      .then(() => {
        // Once name is fetched, proceed to fetch the token
        return fetch("https://bizbot-khpq.onrender.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${initialToken}`,
          },
          body: JSON.stringify({ chatbotId, userId }),
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.token) {
          token = data.token; // Store token in memory
          console.log("Chatbot token fetched successfully:", token);
          // Once we have the token, fetch the customization
          fetchCustomization(chatbotId);
        } else {
          throw new Error("Failed to fetch token");
        }
      })
      .catch((error) => {
        console.error("Error initializing chatbot:", error);
      });
  }

  // Function to fetch the chatbot's name
  function fetchChatbotName(chatbotId) {
    const widgetElement = document.getElementById("bizbot-widget");
    const userId = widgetElement.getAttribute("data-user-id");
    const initialToken = widgetElement.getAttribute("data-token");

    return fetch(
      `https://bizbot-khpq.onrender.com/api/chatbots/name/${chatbotId}`,
      {
        headers: {
          Authorization: `Bearer ${initialToken}`,
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (data.name) {
          chatbotName = data.name;
          console.log(`Chatbot name fetched: ${chatbotName}`);
        } else {
          console.warn("No chatbot name found, using default.");
        }
      })
      .catch((error) => {
        console.error("Error fetching chatbot name:", error);
      });
  }

  // Function to fetch customization
  function fetchCustomization(chatbotId) {
    fetch(
      `https://bizbot-khpq.onrender.com/api/customization?chatbotId=${chatbotId}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (data.success && data.customization) {
          themeColor = data.customization.themeColor || themeColor;
          welcomeMessage = data.customization.welcomeMessage || welcomeMessage;
          currentProfileImageUrl =
            data.customization.logo || currentProfileImageUrl; // Set the current profile image URL

          // Apply customization and display profile image
          applyCustomization(currentProfileImageUrl);
          enableSendButton();
        } else {
          console.warn("No customization found, using defaults.");
          applyCustomization(currentProfileImageUrl);
          enableSendButton();
        }
      })
      .catch((error) => {
        console.error("Error fetching customization:", error);
        applyCustomization(currentProfileImageUrl);
        enableSendButton();
      });
  }

  // Function to apply customization
  function applyCustomization(profileImageUrl, element = null) {
    console.log("Profile Image URL:", profileImageUrl);

    const chatHeader = document.getElementById("chat-header");
    const sendfeedbackBtn = document.getElementById("sendfeedback");
    const chatTitle = document.getElementById("chat-title");
    const botMessages = document.querySelectorAll(
      "#chat-messages .bot-message .message-content"
    );
    const chatToggleButton = document.getElementById("chat-toggle");
    const sendMessageButton = document.getElementById("send-message");
    const botProfileImages = element
      ? [element.querySelector(".profile-image")]
      : document.querySelectorAll(".profile-image");

    // Apply chatbot name
    if (chatTitle && chatbotName) {
      chatTitle.textContent = chatbotName;
    }

    // Apply theme color
    if (chatHeader) {
      chatHeader.style.backgroundColor = themeColor;
    }
    if (sendfeedbackBtn) {
      sendfeedbackBtn.style.backgroundColor = themeColor;
    }
    if (chatToggleButton) {
      chatToggleButton.style.backgroundColor = themeColor;
    }
    if (sendMessageButton) {
      sendMessageButton.style.backgroundColor = themeColor;
    }

    // Apply profile image to a single element or all bot profile images
    if (botProfileImages && profileImageUrl) {
      botProfileImages.forEach((img) => {
        if (img) {
          img.style.backgroundImage = `url('${profileImageUrl}')`;
          img.style.backgroundSize = "cover";
          img.style.backgroundPosition = "center";
          img.style.backgroundRepeat = "no-repeat";
        }
      });
    }

    // Apply welcome message
    if (botMessages && botMessages.length > 0) {
      botMessages[botMessages.length - 1].textContent = welcomeMessage;
    }
  }

  // Function to enable the send button after token and customization are fetched
  function enableSendButton() {
    const sendButton = document.getElementById("send-message");
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.style.cursor = "pointer";
    }
  }

  // Function to format content (from app.js)
  function formatContent(content) {
    const lines = content.split("\n").map((line) => line.trim());
    let formattedContent = "";
    let isList = false;
    let listType = "ul"; // 'ul' for unordered, 'ol' for ordered
    lines.forEach((line, index) => {
      // Check for unordered list items
      if (/^[-*\u2022]\s+/.test(line)) {
        if (!isList) {
          isList = true;
          listType = "ul";
          formattedContent += `<${listType}>`;
        }
        const listItem = line.replace(/^[-*\u2022]\s+/, "");
        formattedContent += `<li>${listItem}</li>`;
      }
      // Check for ordered list items
      else if (/^\d+\.\s+/.test(line)) {
        if (!isList) {
          isList = true;
          listType = "ol";
          formattedContent += `<${listType}>`;
        }
        const listItem = line.replace(/^\d+\.\s+/, "");
        formattedContent += `<li>${listItem}</li>`;
      }
      // Regular paragraph
      else {
        if (isList) {
          formattedContent += `</${listType}>`;
          isList = false;
        }
        if (line !== "") {
          formattedContent += `<p>${line}</p>`;
        }
      }

      // If it's the last line and still inside a list, close the list
      if (index === lines.length - 1 && isList) {
        formattedContent += `</${listType}>`;
        isList = false;
      }
    });

    return formattedContent;
  }

  // Function to send user messages to the server
  function sendMessage(userInput) {
    const widgetElement = document.getElementById("bizbot-widget");
    const chatbotId = widgetElement.getAttribute("data-chatbot-id");
    const userId = widgetElement.getAttribute("data-user-id");

    if (!token) {
      console.error(
        "Token is not available. Ensure the widget is initialized correctly."
      );
      return;
    }

    console.log("Sending message with the following details:");
    console.log(`chatbotId: ${chatbotId}`);
    console.log(`token: ${token}`);
    console.log(`userId: ${userId}`);
    console.log(`userInput: ${userInput}`);

    // Append "Loading..." bot message
    const chatMessages = document.getElementById("chat-messages");
    const loadingMessageElement = document.createElement("div");
    const botProfileImage = document.createElement("div");
    botProfileImage.classList.add("profile-image");
    loadingMessageElement.classList.add("message", "bot-message");
    const messageContent = document.createElement("span");
    messageContent.classList.add("message-content");
    messageContent.textContent = "Loading...";
    loadingMessageElement.appendChild(botProfileImage);
    loadingMessageElement.appendChild(messageContent);
    loadingMessageElement.setAttribute("data-loading", "true"); // Assign a data attribute
    chatMessages.appendChild(loadingMessageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll

    if (currentProfileImageUrl) {
      botProfileImage.style.backgroundImage = `url('${currentProfileImageUrl}')`;
      botProfileImage.style.backgroundSize = "cover";
      botProfileImage.style.backgroundPosition = "center";
      botProfileImage.style.backgroundRepeat = "no-repeat";
    }

    // Send the message to the API
    fetch("https://bizbot-khpq.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: userInput,
        userId: userId,
        chatbotId: chatbotId,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log("Received response from server:", data);
        // Use formatContent to format the reply
        const formattedReply = formatContent(data.reply);
        updateLoadingMessage(formattedReply); // Update the "Loading..." message
        console.log(`Response Source: ${data.source}`);
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        updateLoadingMessage(
          "Sorry, something went wrong. Please try again later."
        ); // Update with error message
      });
  }

  // Function to update the "Loading..." message with the actual response
  function updateLoadingMessage(formattedReply) {
    const chatMessages = document.getElementById("chat-messages");
    const loadingMessageElement = chatMessages.querySelector(
      '[data-loading="true"]'
    );
    if (loadingMessageElement) {
      const messageContent =
        loadingMessageElement.querySelector(".message-content");
      messageContent.innerHTML = formattedReply; // Replace "Loading..." with the actual response
      loadingMessageElement.removeAttribute("data-loading"); // Remove the data attribute
    } else {
      // If "Loading..." message not found, append the response as a new message
      displayBotMessage(formattedReply);
    }
  }

  // Function to display bot messages with formatted content
  function displayBotMessage(message) {
    const chatMessages = document.getElementById("chat-messages");
    const botMessageElement = document.createElement("div");
    const botProfileImage = document.createElement("div");
    botProfileImage.classList.add("profile-image");
    botMessageElement.classList.add("message", "bot-message");
    const messageContent = document.createElement("span");
    messageContent.classList.add("message-content");
    // Use innerHTML to insert formatted content
    messageContent.innerHTML = message;
    botMessageElement.appendChild(botProfileImage);
    botMessageElement.appendChild(messageContent);
    chatMessages.appendChild(botMessageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll

    // Apply the profile image to the new message
    if (currentProfileImageUrl) {
      botProfileImage.style.backgroundImage = `url('${currentProfileImageUrl}')`;
      botProfileImage.style.backgroundSize = "cover";
      botProfileImage.style.backgroundPosition = "center";
      botProfileImage.style.backgroundRepeat = "no-repeat";
    }
  }

  // Create elements for the chatbot widget
  const chatbotWidget = document.createElement("div");
  chatbotWidget.id = "chatbot-widget";
  chatbotWidget.innerHTML = `<div id="chat-header">
          <span id="chat-title">BizBot</span>
          <button id="close-chat">X</button>
      </div>
      <div class="satisfactory">
          <div class="message bot-message">
              <div class="profile-image"></div>
              <span class="message-content">We value your feedback! Please rate and share your thoughts to help us improve. Thank you!</span>
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
              <button id="sendfeedback" class="sendfeedback">Send Feedback</button>
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
          <button id="send-message" disabled>Send</button>
      </div>`;

  // Create the toggle button once
  const chatToggle = document.createElement("button");
  chatToggle.id = "chat-toggle";
  chatToggle.textContent = "Chat";
  chatToggle.style.display = "block"; // Ensure it is visible initially

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
  #close-chat:hover {
      transform: scale(1.1);
  }
  #chat-messages {
      flex-grow: 1;
      overflow-y: auto;
      padding: 10px; /* Reduced from 15px to 10px */
      display: flex;
      flex-direction: column;
      scroll-behavior: smooth;
      background-color: #ffffff;
  }
  #chat-input {
      display: flex;
      padding: 8px; /* Reduced from 10px to 8px */
      background-color: #fff;
      border-top: 1px solid #e0e0e0;
  }
  #user-input {
      flex-grow: 1;
      padding: 8px; /* Reduced from 10px to 8px */
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
      padding: 8px 12px; /* Reduced from 10px 15px to 8px 12px */
      margin-left: 8px; /* Reduced from 10px to 8px */
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
      margin: 8px 0; /* Reduced from 10px to 8px */
      padding: 8px; /* Reduced from 10px to 8px */
      border-radius: 15px;
      max-width: 80%;
      animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
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
      border-bottom-left-radius: 5px;
      padding-left: 0;
  }
  .profile-image {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      background-color: #ccc; /* Fallback color if no image is loaded */
      flex-shrink: 0;
      margin: 5px; /* Reduced from 10px to 5px */
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #fff;
      font-size: 16px;
  
      /* Ensure proper image rendering */
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
  }
  .message-content {
      flex-grow: 1;
      word-break: break-word;
      font-size: 14px;
      line-height: 1.4;
      padding: 10px;
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
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  // Append elements to body
  document.body.appendChild(chatbotWidget);
  document.body.appendChild(chatToggle);

  // Elements for chat widget
  const chatToggleButton = document.getElementById("chat-toggle");
  const chatbotWidgetElement = document.getElementById("chatbot-widget");
  const closeChatButton = document.getElementById("close-chat");
  const chatMsgs = document.getElementById("chat-messages");
  const chatInp = document.getElementById("chat-input");
  const satisfactory = document.querySelector(".satisfactory");
  const emojiButtons = document.querySelectorAll(".emoji");
  const feedbackTextarea = document.getElementById("feedback");
  const feedbackBtn = document.getElementById("sendfeedback");
  const sendMessageButton = document.getElementById("send-message");
  let selectedRating = ""; // Variable to store the selected rating

  // Disable send button until token is fetched
  sendMessageButton.disabled = true;
  sendMessageButton.style.cursor = "not-allowed";

  // Event listener to open chat
  chatToggleButton.onclick = function () {
    chatbotWidgetElement.style.display = "flex";
    chatToggleButton.style.display = "none";
    chatMsgs.style.display = "flex";
    chatInp.style.display = "flex";
  };

  // Event listener to close chat
  closeChatButton.onclick = function () {
    chatbotWidgetElement.style.display = "none";
    chatToggleButton.style.display = "block";
    chatMsgs.style.display = "none";
    chatInp.style.display = "none";
    setTimeout(function () {
      chatbotWidgetElement.style.display = "flex";
      chatToggleButton.style.display = "none";
      chatMsgs.style.display = "none";
      satisfactory.style.display = "flex";
    }, 1000);
  };

  // Event listeners for emoji buttons
  emojiButtons.forEach((button) => {
    button.addEventListener("click", function () {
      emojiButtons.forEach((btn) => {
        btn.querySelector("i").classList.remove("active");
      });
      const icon = this.querySelector("i");
      icon.classList.add("active");
      selectedRating = this.querySelector("p").innerText; // Update the selected rating
    });
  });

  // Feedback fallback event listener
  feedbackBtn.onclick = function () {
    if (selectedRating) {
      const feedbackText = feedbackTextarea.value;
      if (feedbackText.trim() === "") {
        alert("Please enter your feedback.");
      } else {
        console.log(`Feedback submitted: ${feedbackText}`);
        console.log(`Feedback submitted with rating: ${selectedRating}`);

        // Get the user ID and chatbot ID from the widget
        const widgetElement = document.getElementById("bizbot-widget");
        const userId = widgetElement.getAttribute("data-user-id");
        const chatbotId = widgetElement.getAttribute("data-chatbot-id");

        // Prepare the feedback data
        const feedbackData = {
          userId: userId,
          chatbotId: chatbotId,
          rating: selectedRating,
          feedback: feedbackText,
        };

        // Send feedback to the server
        fetch("https://bizbot-khpq.onrender.com/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(feedbackData),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              // Hide the chatbot widget and show the toggle button
              widgetElement.style.display = "none";
              chatToggleButton.style.display = "block";
              chatMsgs.style.display = "none";
              chatInp.style.display = "none";
            } else {
              alert("Error submitting feedback. Please try again.");
            }
          })
          .catch((error) => {
            console.error("Error submitting feedback:", error);
            alert("Error submitting feedback. Please try again.");
          });
      }
    } else {
      alert("Please select a rating before submitting feedback.");
    }
  };

  document
    .getElementById("sendfeedback")
    .addEventListener("click", function () {
      const feedback = document.getElementById("feedback").value;
      if (feedback) {
        document.getElementById("feedback").value = ""; // Clear the feedback input
      }
    });

  // Event listener for sending user message
  sendMessageButton.onclick = function () {
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");

    if (userInput.value.trim() === "") {
      alert("Please enter a message.");
      return;
    }

    // Append the user's message to the chat
    const userMessageElement = document.createElement("div");
    userMessageElement.classList.add("message", "user-message");
    const userText = document.createElement("span");
    userText.classList.add("message-content");
    userText.textContent = userInput.value;
    userMessageElement.appendChild(userText);
    chatMessages.appendChild(userMessageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll

    // Send the message to the API
    sendMessage(userInput.value);

    // Clear the input field after sending
    userInput.value = "";
  };

  // Initialize the chatbot widget on load
  initializeChatbot();
})();
