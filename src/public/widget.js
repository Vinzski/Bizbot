;(() => {
  let token // Store the widget token in memory
  let themeColor = "#10B981" // Default theme color
  let welcomeMessage = "Welcome! How can I assist you today?" // Default welcome message
  let chatbotName = "BizBot" // Default name, will be replaced
  let currentProfileImageUrl = "" // Initialize profile image URL
  let selectedRating = "" // Variable to store the selected rating

  // Drag functionality variables
  let isDragging = false
  let dragStartTime = 0
  let longPressTimer = null
  let startX = 0
  let startY = 0
  const currentX = 0
  const currentY = 0
  const initialTransform = { x: 0, y: 0 }
  let isLongPress = false
  const LONG_PRESS_DURATION = 500 // 500ms for long press

  // Session management for feedback
  const SESSION_FEEDBACK_KEY = "chatbot_feedback_shown"
  const SESSION_CHAT_COUNT_KEY = "chatbot_interaction_count"

  // Function to add Font Awesome
  function addFontAwesome() {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    link.integrity = "sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
    link.crossOrigin = "anonymous"
    link.referrerPolicy = "no-referrer"
    document.head.appendChild(link)
  }

  // Inject SweetAlert2 CDN dynamically
  const script = document.createElement("script")
  script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11"
  document.head.appendChild(script)

  let Swal // Declare the Swal variable

  script.onload = () => {
    Swal = window.Swal // Assign the SweetAlert2 library to the Swal variable

    // Event listener for sending feedback using SweetAlert
    const feedbackBtn = document.getElementById("sendfeedback")
    if (feedbackBtn) {
      feedbackBtn.onclick = () => {
        if (selectedRating) {
          const feedbackTextarea = document.getElementById("feedback")
          const feedbackText = feedbackTextarea.value
          if (feedbackText.trim() === "") {
            // Show SweetAlert if feedback text is empty
            Swal.fire({
              icon: "warning",
              title: "Oops...",
              text: "Please enter your feedback.",
              confirmButtonColor: themeColor,
            })
          } else {
            console.log(`Feedback submitted: ${feedbackText}`)
            console.log(`Feedback submitted with rating: ${selectedRating}`)

            // Get the user ID and chatbot ID from the widget
            const widgetElement = document.getElementById("bizbot-widget")
            const userId = widgetElement.getAttribute("data-user-id")
            const chatbotId = widgetElement.getAttribute("data-chatbot-id")

            // Prepare the feedback data
            const feedbackData = {
              userId: userId,
              chatbotId: chatbotId,
              rating: selectedRating,
              feedback: feedbackText,
            }

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
                  // Show SweetAlert for success
                  Swal.fire({
                    icon: "success",
                    title: "Thank you!",
                    text: "Your feedback has been submitted successfully.",
                    confirmButtonColor: themeColor,
                  }).then(() => {
                    // Mark feedback as submitted in session storage
                    sessionStorage.setItem(SESSION_FEEDBACK_KEY, "submitted")

                    // Close the feedback form and show the toggle button
                    closeFeedbackForm()
                  })
                } else {
                  // Show SweetAlert for error
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "There was an issue submitting your feedback. Please try again.",
                    confirmButtonColor: themeColor,
                  })
                }
              })
              .catch((error) => {
                console.error("Error submitting feedback:", error)
                // Show SweetAlert for error
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "There was an issue submitting your feedback. Please try again.",
                  confirmButtonColor: themeColor,
                })
              })
          }
        } else {
          // Show SweetAlert when rating is not selected
          Swal.fire({
            icon: "warning",
            title: "Please select a rating before submitting feedback.",
            confirmButtonColor: themeColor,
          })
        }
      }
    }
  }

  addFontAwesome() // Add Font Awesome on load

  // Function to initialize the chatbot widget
  function initializeChatbot() {
    const widgetElement = document.getElementById("bizbot-widget")
    const chatbotId = widgetElement.getAttribute("data-chatbot-id")
    const userId = widgetElement.getAttribute("data-user-id")
    const initialToken = widgetElement.getAttribute("data-token")

    console.log("Initializing Chatbot Widget:")
    console.log(`chatbotId: ${chatbotId}`)
    console.log(`userId: ${userId}`)
    console.log(`initialToken: ${initialToken}`)

    if (!chatbotId || !userId || !initialToken) {
      console.error("Chatbot ID, User ID, or initial token is missing.")
      return
    }

    // Initialize session storage for chat interactions if not exists
    if (!sessionStorage.getItem(SESSION_CHAT_COUNT_KEY)) {
      sessionStorage.setItem(SESSION_CHAT_COUNT_KEY, "0")
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
        })
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.token) {
          token = data.token // Store token in memory
          console.log("Chatbot token fetched successfully:", token)
          // Once we have the token, fetch the customization
          fetchCustomization(chatbotId)
        } else {
          throw new Error("Failed to fetch token")
        }
      })
      .catch((error) => {
        console.error("Error initializing chatbot:", error)
      })
  }

  // Function to fetch the chatbot's name
  function fetchChatbotName(chatbotId) {
    const widgetElement = document.getElementById("bizbot-widget")
    const userId = widgetElement.getAttribute("data-user-id")
    const initialToken = widgetElement.getAttribute("data-token")

    return fetch(`https://bizbot-khpq.onrender.com/api/chatbots/name/${chatbotId}`, {
      headers: {
        Authorization: `Bearer ${initialToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.name) {
          chatbotName = data.name
          console.log(`Chatbot name fetched: ${chatbotName}`)
        } else {
          console.warn("No chatbot name found, using default.")
        }
      })
      .catch((error) => {
        console.error("Error fetching chatbot name:", error)
      })
  }

  // Function to fetch customization
  function fetchCustomization(chatbotId) {
    fetch(`https://bizbot-khpq.onrender.com/api/customization?chatbotId=${chatbotId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.success && data.customization) {
          themeColor = data.customization.themeColor || themeColor
          welcomeMessage = data.customization.welcomeMessage || welcomeMessage
          currentProfileImageUrl = data.customization.logo || currentProfileImageUrl // Set the current profile image URL

          // Apply customization and display profile image
          applyCustomization(currentProfileImageUrl)
          enableSendButton()
        } else {
          console.warn("No customization found, using defaults.")
          applyCustomization(currentProfileImageUrl)
          enableSendButton()
        }
      })
      .catch((error) => {
        console.error("Error fetching customization:", error)
        applyCustomization(currentProfileImageUrl)
        enableSendButton()
      })
  }

  // Function to apply customization
  function applyCustomization(profileImageUrl, element = null) {
    console.log("Profile Image URL:", profileImageUrl)

    const chatHeader = document.getElementById("chat-header")
    const sendfeedbackBtn = document.getElementById("sendfeedback")
    const chatTitle = document.getElementById("chat-title")
    const botMessages = document.querySelectorAll("#chat-messages .bot-message .message-content")
    const chatToggleButton = document.getElementById("chat-toggle")
    const sendMessageButton = document.getElementById("send-message")
    const botProfileImages = element
      ? [element.querySelector(".profile-image")]
      : document.querySelectorAll(".profile-image")

    // Apply chatbot name
    if (chatTitle && chatbotName) {
      chatTitle.textContent = chatbotName
    }

    // Apply theme color
    if (chatHeader) {
      chatHeader.style.backgroundColor = themeColor
    }
    if (sendfeedbackBtn) {
      sendfeedbackBtn.style.backgroundColor = themeColor
    }
    if (chatToggleButton) {
      chatToggleButton.style.backgroundColor = themeColor
    }
    if (sendMessageButton) {
      sendMessageButton.style.backgroundColor = themeColor
    }

    // Apply theme color to skip button and feedback button
    const skipFeedbackBtn = document.getElementById("skip-feedback")
    if (skipFeedbackBtn) {
      skipFeedbackBtn.style.borderColor = themeColor
      skipFeedbackBtn.style.color = themeColor
    }

    // Apply profile image to a single element or all bot profile images
    if (botProfileImages && profileImageUrl) {
      botProfileImages.forEach((img) => {
        if (img) {
          img.style.backgroundImage = `url('${profileImageUrl}')`
          img.style.backgroundSize = "cover"
          img.style.backgroundPosition = "center"
          img.style.backgroundRepeat = "no-repeat"
        }
      })
    }

    // Apply welcome message
    if (botMessages && botMessages.length > 0) {
      botMessages[botMessages.length - 1].textContent = welcomeMessage
    }
  }

  // Function to enable the send button after token and customization are fetched
  function enableSendButton() {
    const sendButton = document.getElementById("send-message")
    if (sendButton) {
      sendButton.disabled = false
      sendButton.style.cursor = "pointer"
    }
  }

  // Function to format content (from app.js)
  function formatContent(content) {
    const lines = content.split("\n").map((line) => line.trim())
    let formattedContent = ""
    let isList = false
    let listType = "ul" // 'ul' for unordered, 'ol' for ordered
    lines.forEach((line, index) => {
      // Check for unordered list items
      if (/^[-*\u2022]\s+/.test(line)) {
        if (!isList) {
          isList = true
          listType = "ul"
          formattedContent += `<${listType}>`
        }
        const listItem = line.replace(/^[-*\u2022]\s+/, "")
        formattedContent += `<li>${listItem}</li>`
      }
      // Check for ordered list items
      else if (/^\d+\.\s+/.test(line)) {
        if (!isList) {
          isList = true
          listType = "ol"
          formattedContent += `<${listType}>`
        }
        const listItem = line.replace(/^\d+\.\s+/, "")
        formattedContent += `<li>${listItem}</li>`
      }
      // Regular paragraph
      else {
        if (isList) {
          formattedContent += `</${listType}>`
          isList = false
        }
        if (line !== "") {
          formattedContent += `<p>${line}</p>`
        }
      }

      // If it's the last line and still inside a list, close the list
      if (index === lines.length - 1 && isList) {
        formattedContent += `</${listType}>`
        isList = false
      }
    })

    return formattedContent
  }

  // Function to send user messages to the server
  function sendMessage(userInput) {
    const widgetElement = document.getElementById("bizbot-widget")
    const chatbotId = widgetElement.getAttribute("data-chatbot-id")
    const userId = widgetElement.getAttribute("data-user-id")

    if (!token) {
      console.error("Token is not available. Ensure the widget is initialized correctly.")
      return
    }

    console.log("Sending message with the following details:")
    console.log(`chatbotId: ${chatbotId}`)
    console.log(`token: ${token}`)
    console.log(`userId: ${userId}`)
    console.log(`userInput: ${userInput}`)

    // Increment chat interaction count
    incrementChatCount()

    // Append "Loading..." bot message
    const chatMessages = document.getElementById("chat-messages")
    const loadingMessageElement = document.createElement("div")
    const botProfileImage = document.createElement("div")
    botProfileImage.classList.add("profile-image")
    loadingMessageElement.classList.add("message", "bot-message")
    const messageContent = document.createElement("span")
    messageContent.classList.add("message-content")
    messageContent.textContent = "Loading..."
    loadingMessageElement.appendChild(botProfileImage)
    loadingMessageElement.appendChild(messageContent)
    loadingMessageElement.setAttribute("data-loading", "true") // Assign a data attribute
    chatMessages.appendChild(loadingMessageElement)
    chatMessages.scrollTop = chatMessages.scrollHeight // Auto-scroll

    if (currentProfileImageUrl) {
      botProfileImage.style.backgroundImage = `url('${currentProfileImageUrl}')`
      botProfileImage.style.backgroundSize = "cover"
      botProfileImage.style.backgroundPosition = "center"
      botProfileImage.style.backgroundRepeat = "no-repeat"
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
          throw new Error(`Network response was not ok: ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        console.log("Received response from server:", data)
        // Use formatContent to format the reply
        const formattedReply = formatContent(data.reply)
        updateLoadingMessage(formattedReply) // Update the "Loading..." message
        console.log(`Response Source: ${data.source}`)
      })
      .catch((error) => {
        console.error("Error sending message:", error)
        updateLoadingMessage("Sorry, something went wrong. Please try again later.") // Update with error message
      })
  }

  // Function to update the "Loading..." message with the actual response
  function updateLoadingMessage(formattedReply) {
    const chatMessages = document.getElementById("chat-messages")
    const loadingMessageElement = chatMessages.querySelector('[data-loading="true"]')
    if (loadingMessageElement) {
      const messageContent = loadingMessageElement.querySelector(".message-content")
      messageContent.innerHTML = formattedReply // Replace "Loading..." with the actual response
      loadingMessageElement.removeAttribute("data-loading") // Remove the data attribute
    } else {
      // If "Loading..." message not found, append the response as a new message
      displayBotMessage(formattedReply)
    }
  }

  // Function to display bot messages with formatted content
  function displayBotMessage(message) {
    const chatMessages = document.getElementById("chat-messages")
    const botMessageElement = document.createElement("div")
    const botProfileImage = document.createElement("div")
    botProfileImage.classList.add("profile-image")
    botMessageElement.classList.add("message", "bot-message")
    const messageContent = document.createElement("span")
    messageContent.classList.add("message-content")
    // Use innerHTML to insert formatted content
    messageContent.innerHTML = message
    botMessageElement.appendChild(botProfileImage)
    botMessageElement.appendChild(messageContent)
    chatMessages.appendChild(botMessageElement)
    chatMessages.scrollTop = chatMessages.scrollHeight // Auto-scroll

    // Apply the profile image to the new message
    if (currentProfileImageUrl) {
      botProfileImage.style.backgroundImage = `url('${currentProfileImageUrl}')`
      botProfileImage.style.backgroundSize = "cover"
      botProfileImage.style.backgroundPosition = "center"
      botProfileImage.style.backgroundRepeat = "no-repeat"
    }
  }

  // Session management functions
  function incrementChatCount() {
    const currentCount = Number.parseInt(sessionStorage.getItem(SESSION_CHAT_COUNT_KEY) || "0")
    sessionStorage.setItem(SESSION_CHAT_COUNT_KEY, (currentCount + 1).toString())
  }

  function getChatCount() {
    return Number.parseInt(sessionStorage.getItem(SESSION_CHAT_COUNT_KEY) || "0")
  }

  function shouldShowFeedback() {
    // Check if feedback has already been shown or submitted this session
    const feedbackStatus = sessionStorage.getItem(SESSION_FEEDBACK_KEY)
    if (feedbackStatus === "shown" || feedbackStatus === "submitted" || feedbackStatus === "skipped") {
      return false
    }

    // Only show feedback after a meaningful interaction (at least 3 messages)
    return getChatCount() >= 3
  }

  function markFeedbackAsShown() {
    sessionStorage.setItem(SESSION_FEEDBACK_KEY, "shown")
  }

  function markFeedbackAsSkipped() {
    sessionStorage.setItem(SESSION_FEEDBACK_KEY, "skipped")
  }

  // Drag and Drop Functions
  function getWidgetPosition() {
    const saved = localStorage.getItem("chatbot-widget-position")
    if (saved) {
      return JSON.parse(saved)
    }
    return { side: "right", bottom: 20 }
  }

  function saveWidgetPosition(position) {
    localStorage.setItem("chatbot-widget-position", JSON.stringify(position))
  }

  function setWidgetPosition(side, bottom = 20) {
    const widget = document.getElementById("chatbot-widget")
    const toggle = document.getElementById("chat-toggle")

    // Enable transitions for smooth movement
    widget.style.transition = "all 0.3s ease-out"
    toggle.style.transition = "all 0.3s ease-out"

    if (side === "left") {
      widget.style.left = "20px"
      widget.style.right = "auto"
      toggle.style.left = "20px"
      toggle.style.right = "auto"
    } else {
      widget.style.right = "20px"
      widget.style.left = "auto"
      toggle.style.right = "20px"
      toggle.style.left = "auto"
    }

    widget.style.bottom = bottom + "px"
    toggle.style.bottom = bottom + "px"

    saveWidgetPosition({ side, bottom })
  }

  // Check if element is an input field or inside an input area
  function isInputElement(element) {
    if (!element) return false

    const inputTags = ["INPUT", "TEXTAREA", "SELECT"]
    const inputIds = ["user-input", "feedback"]
    const inputClasses = ["emoji", "sendfeedback"]

    // Check if element itself is an input
    if (inputTags.includes(element.tagName)) return true
    if (inputIds.includes(element.id)) return true
    if (inputClasses.some((cls) => element.classList.contains(cls))) return true

    // Check if element is inside an input area
    const closestInput = element.closest("input, textarea, select, .emoji, .sendfeedback, #chat-input, .rating")
    return !!closestInput
  }

  function startDrag(e) {
    // Don't initiate drag on input elements or interactive elements
    if (isInputElement(e.target)) {
      return
    }

    const widget = document.getElementById("chatbot-widget")
    const toggle = document.getElementById("chat-toggle")
    const target = e.target.closest("#chatbot-widget, #chat-toggle")

    if (!target) return

    isDragging = false
    isLongPress = false
    dragStartTime = Date.now()

    // Get initial position
    if (e.type === "touchstart") {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    } else {
      startX = e.clientX
      startY = e.clientY
    }

    // Start long press timer
    longPressTimer = setTimeout(() => {
      isLongPress = true
      isDragging = true

      // Add visual feedback
      target.style.transform = "scale(1.05)"
      target.style.opacity = "0.8"
      target.style.transition = "transform 0.2s ease, opacity 0.2s ease"
      target.style.cursor = "grabbing"

      // Add drag indicator
      const dragIndicator = document.createElement("div")
      dragIndicator.id = "drag-indicator"
      dragIndicator.innerHTML = "↔️ Drag to left or right side"
      dragIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 10001;
        pointer-events: none;
        animation: fadeIn 0.3s ease;
      `
      document.body.appendChild(dragIndicator)
    }, LONG_PRESS_DURATION)

    // Only prevent default for non-input elements
    if (!isInputElement(e.target)) {
      e.preventDefault()
    }
  }

  function drag(e) {
    // Don't drag when interacting with input elements
    if (isInputElement(e.target)) {
      return
    }

    if (!isDragging || !isLongPress) return

    e.preventDefault()

    let clientX, clientY
    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Get the widget and determine which one is visible
    const widget = document.getElementById("chatbot-widget")
    const toggle = document.getElementById("chat-toggle")
    const target = widget.style.display !== "none" ? widget : toggle

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate boundaries to keep the element within the viewport
    const targetRect = target.getBoundingClientRect()
    const targetWidth = targetRect.width
    const targetHeight = targetRect.height

    // Calculate new absolute position instead of using transforms
    // This ensures the widget directly follows the cursor/finger
    let newLeft = clientX - targetWidth / 2
    let newBottom = viewportHeight - clientY - targetHeight / 2

    // Keep the widget within viewport boundaries
    newLeft = Math.max(10, Math.min(newLeft, viewportWidth - targetWidth - 10))
    newBottom = Math.max(10, Math.min(newBottom, viewportHeight - targetHeight - 10))

    // Apply the new position directly
    target.style.transition = "none" // Disable transitions for smooth dragging
    target.style.left = `${newLeft}px`
    target.style.right = "auto"
    target.style.bottom = `${newBottom}px`

    // Add visual feedback for drop zones
    const dropZoneWidth = viewportWidth * 0.3 // 30% of screen width for drop zones

    if (clientX < dropZoneWidth) {
      // Left drop zone
      target.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.5)"
    } else if (clientX > viewportWidth - dropZoneWidth) {
      // Right drop zone
      target.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.5)"
    } else {
      // No drop zone
      target.style.boxShadow = "0 0 20px rgba(255, 0, 0, 0.3)"
    }
  }

  function endDrag(e) {
    clearTimeout(longPressTimer)

    if (!isDragging || !isLongPress) {
      isDragging = false
      isLongPress = false
      return
    }

    const widget = document.getElementById("chatbot-widget")
    const toggle = document.getElementById("chat-toggle")
    const target = widget.style.display !== "none" ? widget : toggle

    let clientX
    if (e.type === "touchend") {
      clientX = e.changedTouches[0].clientX
    } else {
      clientX = e.clientX
    }

    // Determine which side to snap to
    const screenWidth = window.innerWidth
    const dropZoneWidth = screenWidth * 0.3
    let newSide = "right" // default

    if (clientX < dropZoneWidth) {
      newSide = "left"
    } else if (clientX > screenWidth - dropZoneWidth) {
      newSide = "right"
    } else {
      // If dropped in the middle, determine closest side
      newSide = clientX < screenWidth / 2 ? "left" : "right"
    }

    // Reset styles
    target.style.transition = "" // Re-enable transitions
    target.style.transform = ""
    target.style.opacity = ""
    target.style.boxShadow = ""
    target.style.cursor = ""

    // Remove drag indicator
    const dragIndicator = document.getElementById("drag-indicator")
    if (dragIndicator) {
      dragIndicator.remove()
    }

    // Set new position with animation
    target.style.transition = "all 0.3s ease-out"
    setWidgetPosition(newSide)

    // Add success feedback
    const currentPosition = getWidgetPosition()
    if (newSide !== currentPosition.side) {
      const successIndicator = document.createElement("div")
      successIndicator.innerHTML = `✅ Moved to ${newSide} side`
      successIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,128,0,0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 10001;
        pointer-events: none;
        animation: fadeIn 0.3s ease;
      `
      document.body.appendChild(successIndicator)

      setTimeout(() => {
        successIndicator.remove()
      }, 2000)
    }

    isDragging = false
    isLongPress = false
  }

  function cancelDrag() {
    clearTimeout(longPressTimer)

    if (isDragging) {
      const widget = document.getElementById("chatbot-widget")
      const toggle = document.getElementById("chat-toggle")
      const target = widget.style.display !== "none" ? widget : toggle

      // Reset styles
      target.style.transform = ""
      target.style.opacity = ""
      target.style.transition = ""
      target.style.cursor = ""
      target.style.boxShadow = ""

      // Remove drag indicator
      const dragIndicator = document.getElementById("drag-indicator")
      if (dragIndicator) {
        dragIndicator.remove()
      }
    }

    isDragging = false
    isLongPress = false
  }

  // Function to show the feedback form
  function showFeedbackForm() {
    const chatbotWidgetElement = document.getElementById("chatbot-widget")
    const chatToggleButton = document.getElementById("chat-toggle")
    const chatMsgs = document.getElementById("chat-messages")
    const chatInp = document.getElementById("chat-input")
    const satisfactory = document.querySelector(".satisfactory")

    chatbotWidgetElement.style.display = "flex"
    chatToggleButton.style.display = "none"
    chatMsgs.style.display = "none"
    chatInp.style.display = "none"
    satisfactory.style.display = "flex"

    // Mark feedback as shown in session storage
    markFeedbackAsShown()
  }

  // Function to close the feedback form
  function closeFeedbackForm() {
    const chatbotWidgetElement = document.getElementById("chatbot-widget")
    const chatToggleButton = document.getElementById("chat-toggle")

    chatbotWidgetElement.style.display = "none"
    chatToggleButton.style.display = "block"
  }

  // Function to show a subtle feedback prompt in the chat
  function showFeedbackPrompt() {
    const chatMessages = document.getElementById("chat-messages")

    // Create a subtle feedback prompt
    const promptElement = document.createElement("div")
    promptElement.classList.add("feedback-prompt")
    promptElement.innerHTML = `
      <div class="feedback-prompt-content">
        <div class="feedback-prompt-icon">
          <i class="fa-solid fa-heart"></i>
        </div>
        <p>How are we doing? We'd love your feedback!</p>
        <div class="feedback-prompt-buttons">
          <button id="open-feedback-btn">Give Feedback</button>
          <button id="dismiss-feedback-btn">Maybe Later</button>
        </div>
      </div>
    `

    chatMessages.appendChild(promptElement)
    chatMessages.scrollTop = chatMessages.scrollHeight

    // Add event listeners to the buttons
    document.getElementById("open-feedback-btn").addEventListener("click", () => {
      showFeedbackForm()
      promptElement.remove()
    })

    document.getElementById("dismiss-feedback-btn").addEventListener("click", () => {
      promptElement.remove()
      markFeedbackAsSkipped()
    })
  }

  // Create elements for the chatbot widget
  const chatbotWidget = document.createElement("div")
  chatbotWidget.id = "chatbot-widget"
  chatbotWidget.innerHTML = `<div id="chat-header">
    <span id="chat-title">BizBot</span>
    <button id="close-chat">
        <i class="fa-solid fa-times"></i>
    </button>
</div>
<div class="satisfactory">
    <div class="feedback-header">
        <div class="message bot-message">
            <div class="profile-image"></div>
            <span class="message-content">We value your feedback! Please rate and share your thoughts to help us improve. Thank you!</span>
        </div>
    </div>
    <div class="rating">
        <div class="rating-question">
            <p>How would you rate your experience?</p>
        </div>
        <div class="emojis">
            <div class="emoji-row">
                <button class="emoji" data-rating="Poor">
                    <i id="poor" class="fa-solid fa-face-sad-tear"></i>
                    <span>Poor</span>
                </button>
                <button class="emoji" data-rating="Unsatisfied">
                    <i id="unsatisfied" class="fa-solid fa-face-frown"></i>
                    <span>Fair</span>
                </button>
                <button class="emoji" data-rating="Neutral">
                    <i id="neutral" class="fa-solid fa-face-meh"></i>
                    <span>Good</span>
                </button>
                <button class="emoji" data-rating="Satisfied">
                    <i id="satisfied" class="fa-solid fa-face-smile"></i>
                    <span>Great</span>
                </button>
                <button class="emoji" data-rating="Excellent">
                    <i id="excellent" class="fa-solid fa-face-laugh-beam"></i>
                    <span>Excellent</span>
                </button>
            </div>
        </div>
        <div class="feedback-input-container">
            <label for="feedback">Tell us more about your experience:</label>
            <textarea name="feedback" id="feedback" placeholder="Your feedback helps us improve our service..."></textarea>
        </div>
        <div class="feedback-buttons">
            <button id="skip-feedback" class="skip-feedback">
                <i class="fa-solid fa-arrow-right"></i>
                Skip for now
            </button>
            <button id="sendfeedback" class="sendfeedback">
                <i class="fa-solid fa-paper-plane"></i>
                Send Feedback
            </button>
        </div>
    </div>
</div>
<div id="chat-messages">
    <div class="message bot-message">
        <div class="profile-image"></div>
        <span class="message-content">Welcome! How can I assist you today?</span>
    </div>
</div>
<div id="chat-input">
    <div class="input-container">
        <input type="text" id="user-input" placeholder="Type your message...">
        <button id="send-message" disabled>
            <i class="fa-solid fa-paper-plane"></i>
        </button>
    </div>
</div>
<div id="feedback-button-container">
    <button id="feedback-button" title="Give us feedback">
        <i class="fa-solid fa-comment-dots"></i>
    </button>
</div>`

  // Create the toggle button once
  const chatToggle = document.createElement("button")
  chatToggle.id = "chat-toggle"
  chatToggle.innerHTML = `
    <div class="toggle-content">
      <i class="fa-solid fa-comments"></i>
      <span class="toggle-text">Chat</span>
    </div>
  `
  chatToggle.style.display = "block" // Ensure it is visible initially

  // Add styles directly or link to an external stylesheet
  const styles = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

#chatbot-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 380px;
    height: 500px;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1);
    display: none;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
}

#chatbot-widget.dragging {
    transition: none !important;
}

#chat-header {
    background-color: #4a90e2;
    color: white;
    padding: 20px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    cursor: grab;
    position: relative;
    overflow: hidden;
    font-size: 16px;
}

#chat-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    pointer-events: none;
}

#chat-title {
    z-index: 1;
    position: relative;
}

#chat-header:active {
    cursor: grabbing;
}

#close-chat {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    z-index: 1;
    font-size: 14px;
}

#close-chat:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

#chat-messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #ffffff;
    scroll-behavior: smooth;
}

#chat-input {
    padding: 20px;
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
}

.input-container {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 16px;
    padding: 4px;
    transition: all 0.2s ease;
}

.input-container:focus-within {
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

#user-input {
    flex-grow: 1;
    padding: 12px 16px;
    border: none;
    background: transparent;
    font-size: 14px;
    font-family: inherit;
    color: #1e293b;
    outline: none;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
}

#user-input::placeholder {
    color: #94a3b8;
}

#send-message {
    background-color: #4a90e2;
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 14px;
}

#send-message:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

#send-message:disabled {
    background: #e2e8f0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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
    cursor: grab;
    width: 70px;
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    font-family: inherit;
    overflow: hidden;
    font-size: 12px;
}

.toggle-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    z-index: 1;
    height: 100%;
}

.toggle-content i {
    font-size: 20px;
}

.toggle-text {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

#chat-toggle::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.2) 0%, transparent 100%);
    pointer-events: none;
}

#chat-toggle:active {
    cursor: grabbing;
}

#chat-toggle:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 12px 35px rgba(74, 144, 226, 0.4), 0 6px 20px rgba(0, 0, 0, 0.2);
}

.message {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 8px 0;
    padding: 12px;
    border-radius: 16px;
    max-width: 85%;
    animation: fadeIn 0.4s ease;
    word-wrap: break-word;
}

.user-message {
    background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
    align-self: flex-end;
    flex-direction: row-reverse;
    border-bottom-right-radius: 4px;
    border: 1px solid rgba(74, 144, 226, 0.1);
}

.bot-message {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
    border: 1px solid #e2e8f0;
}

.profile-image {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background-color: #ccc;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #fff;
    font-size: 16px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-content {
    flex-grow: 1;
    word-break: break-word;
    font-size: 14px;
    line-height: 1.5;
    color: #1e293b;
}

/* Scrollbar Styles */
#chat-messages::-webkit-scrollbar {
    width: 6px;
}

#chat-messages::-webkit-scrollbar-track {
    background: transparent;
}

#chat-messages::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

#chat-messages::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* Feedback Form Styles */
.satisfactory {
    display: none;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    overflow-y: auto;
}

.feedback-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.feedback-header .message {
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
    max-width: 100%;
}

.rating {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.rating-question {
    text-align: center;
}

.rating-question p {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #1e293b;
}

.emojis {
    display: flex;
    justify-content: center;
}

.emoji-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
}

.emoji {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border: 2px solid #e2e8f0;
    background: #ffffff;
    cursor: pointer;
    padding: 12px 8px;
    border-radius: 12px;
    transition: all 0.2s ease;
    min-width: 60px;
    font-family: inherit;
}

.emoji:hover {
    border-color: #4a90e2;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
}

.emoji.selected {
    border-color: #4a90e2;
    background: #4a90e2;
    color: white;
    transform: scale(1.05);
}

.emoji i {
    font-size: 24px;
    transition: all 0.2s ease;
}

.emoji span {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.emoji i#poor { color: #ef4444; }
.emoji i#unsatisfied { color: #f97316; }
.emoji i#neutral { color: #eab308; }
.emoji i#satisfied { color: #22c55e; }
.emoji i#excellent { color: #16a34a; }

.emoji.selected i {
    color: white !important;
}

.feedback-input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.feedback-input-container label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
}

.feedback-input-container textarea {
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    font-family: inherit;
    color: #1e293b;
    background: #f8fafc;
    resize: vertical;
    min-height: 80px;
    transition: all 0.2s ease;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
}

.feedback-input-container textarea:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    background: #ffffff;
}

.feedback-input-container textarea::placeholder {
    color: #94a3b8;
}

.feedback-buttons {
    display: flex;
    gap: 12px;
    margin-top: 8px;
}

.skip-feedback {
    flex: 1;
    padding: 12px 20px;
    border: 2px solid #e2e8f0;
    background: #ffffff;
    color: #64748b;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.skip-feedback:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
    transform: translateY(-1px);
}

.sendfeedback {
    flex: 2;
    padding: 12px 20px;
    border: none;
    background-color: #4a90e2;
    color: white;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

.sendfeedback:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
}

/* Feedback button styles */
#feedback-button-container {
    position: absolute;
    bottom: 15px;
    right: 15px;
    z-index: 5;
}

#feedback-button {
    background: rgba(74, 144, 226, 0.1);
    color: #4a90e2;
    border: 1px solid rgba(74, 144, 226, 0.2);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
}

#feedback-button:hover {
    background: rgba(74, 144, 226, 0.2);
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

/* Feedback prompt styles */
.feedback-prompt {
    align-self: center;
    width: calc(100% - 20px);
    margin: 16px 0;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #0ea5e9;
    border-radius: 16px;
    overflow: hidden;
    animation: slideUp 0.5s ease;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
}

.feedback-prompt-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.feedback-prompt-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    animation: pulse 2s infinite;
}

.feedback-prompt-content p {
    margin: 0;
    font-size: 14px;
    color: #0c4a6e;
    text-align: center;
    font-weight: 500;
}

.feedback-prompt-buttons {
    display: flex;
    gap: 12px;
}

.feedback-prompt-buttons button {
    padding: 8px 16px;
    border-radius: 20px;
    border: none;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
}

#open-feedback-btn {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
}

#open-feedback-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

#dismiss-feedback-btn {
    background: rgba(14, 165, 233, 0.1);
    color: #0c4a6e;
    border: 1px solid rgba(14, 165, 233, 0.2);
}

#dismiss-feedback-btn:hover {
    background: rgba(14, 165, 233, 0.2);
    transform: translateY(-1px);
}

/* Message content formatting */
.message-content p {
    margin: 0 0 8px 0;
}

.message-content p:last-child {
    margin-bottom: 0;
}

.message-content ul,
.message-content ol {
    margin: 8px 0;
    padding-left: 20px;
}

.message-content li {
    margin: 4px 0;
    line-height: 1.4;
}

.message-content ul li {
    list-style-type: disc;
}

.message-content ol li {
    list-style-type: decimal;
}

/* Responsive design */
@media (max-width: 480px) {
    #chatbot-widget {
        width: calc(100vw - 40px);
        height: calc(100vh - 40px);
        bottom: 20px;
        right: 20px;
        left: 20px;
        max-width: none;
    }
    
    .emoji-row {
        gap: 6px;
    }
    
    .emoji {
        min-width: 50px;
        padding: 10px 6px;
    }
    
    .emoji i {
        font-size: 20px;
    }
    
    .feedback-buttons {
        flex-direction: column;
    }
}`
  const styleSheet = document.createElement("style")
  styleSheet.type = "text/css"
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)

  // Append elements to body
  document.body.appendChild(chatbotWidget)
  document.body.appendChild(chatToggle)

  // Set initial position from localStorage
  const savedPosition = getWidgetPosition()
  setWidgetPosition(savedPosition.side, savedPosition.bottom)

  // Function to setup input listeners for proper functionality
  function setupInputListeners() {
    const userInput = document.getElementById("user-input")
    const feedbackInput = document.getElementById("feedback")

    if (userInput) {
      userInput.addEventListener("click", function (e) {
        e.stopPropagation() // Prevent event bubbling
        this.focus()
      })

      // Add keypress event for sending message on Enter
      userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const sendButton = document.getElementById("send-message")
          if (sendButton && !sendButton.disabled) {
            sendButton.click()
          }
        }
      })
    }

    if (feedbackInput) {
      feedbackInput.addEventListener("click", function (e) {
        e.stopPropagation() // Prevent event bubbling
        this.focus()
      })
    }
  }

  // Add drag event listeners - only to header and toggle button
  function addDragListeners() {
    const toggle = document.getElementById("chat-toggle")
    const header = document.getElementById("chat-header")

    // Touch events for mobile - only on header and toggle
    ;[header, toggle].forEach((element) => {
      if (element) {
        element.addEventListener("touchstart", startDrag, { passive: false })
        element.addEventListener("touchmove", drag, { passive: false })
        element.addEventListener("touchend", endDrag, { passive: false })
        element.addEventListener("touchcancel", cancelDrag, { passive: false })
      }
    })

    // Mouse events for desktop - only on header and toggle
    ;[header, toggle].forEach((element) => {
      if (element) {
        element.addEventListener("mousedown", startDrag)
      }
    })

    // Global mouse events for better drag experience
    document.addEventListener("mousemove", drag)
    document.addEventListener("mouseup", endDrag)
  }

  // Elements for chat widget
  const chatToggleButton = document.getElementById("chat-toggle")
  const chatbotWidgetElement = document.getElementById("chatbot-widget")
  const closeChatButton = document.getElementById("close-chat")
  const chatMsgs = document.getElementById("chat-messages")
  const chatInp = document.getElementById("chat-input")
  const satisfactory = document.querySelector(".satisfactory")
  const emojiButtons = document.querySelectorAll(".emoji")
  const feedbackTextarea = document.getElementById("feedback")
  const feedbackBtn = document.getElementById("sendfeedback")
  const skipFeedbackBtn = document.getElementById("skip-feedback")
  const sendMessageButton = document.getElementById("send-message")
  const feedbackButton = document.getElementById("feedback-button")

  // Disable send button until token is fetched
  sendMessageButton.disabled = true
  sendMessageButton.style.cursor = "not-allowed"

  // Event listener to open chat
  chatToggleButton.onclick = (e) => {
    // Prevent opening chat if dragging
    if (isDragging || isLongPress) {
      e.preventDefault()
      return
    }

    chatbotWidgetElement.style.display = "flex"
    chatToggleButton.style.display = "none"
    chatMsgs.style.display = "flex"
    chatInp.style.display = "flex"
    satisfactory.style.display = "none"

    // Focus on input field when chat opens
    setTimeout(() => {
      const userInput = document.getElementById("user-input")
      if (userInput) {
        userInput.focus()
      }
    }, 100)
  }

  // Event listener to close chat - modified to check for feedback eligibility
  closeChatButton.onclick = () => {
    // Check if we should show feedback form
    if (shouldShowFeedback()) {
      showFeedbackForm()
    } else {
      // Just close the chat
      chatbotWidgetElement.style.display = "none"
      chatToggleButton.style.display = "block"
    }
  }

  // Event listener for the skip feedback button
  if (skipFeedbackBtn) {
    skipFeedbackBtn.addEventListener("click", () => {
      markFeedbackAsSkipped()
      closeFeedbackForm()
    })
  }

  // Event listener for the feedback button in chat
  if (feedbackButton) {
    feedbackButton.addEventListener("click", () => {
      showFeedbackForm()
    })
  }

  // Event listeners for emoji buttons with improved selection
  emojiButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove selected class from all buttons
      emojiButtons.forEach((btn) => {
        btn.classList.remove("selected")
        btn.querySelector("i").classList.remove("active")
      })

      // Add selected class to clicked button
      this.classList.add("selected")
      const icon = this.querySelector("i")
      icon.classList.add("active")
      selectedRating = this.getAttribute("data-rating") || this.querySelector("span").innerText
    })
  })

  // Event listener for sending user message
  sendMessageButton.onclick = () => {
    const userInput = document.getElementById("user-input")
    const chatMessages = document.getElementById("chat-messages")

    if (userInput.value.trim() === "") {
      alert("Please enter a message.")
      return
    }

    // Append the user's message to the chat
    const userMessageElement = document.createElement("div")
    userMessageElement.classList.add("message", "user-message")
    const messageContent = document.createElement("div")
    messageContent.classList.add("message-content")
    messageContent.textContent = userInput.value
    userMessageElement.appendChild(messageContent)
    chatMessages.appendChild(userMessageElement)
    chatMessages.scrollTop = chatMessages.scrollHeight // Auto-scroll

    // Send the message to the API
    sendMessage(userInput.value)

    // Clear the input field after sending
    userInput.value = ""

    // Check if we should show the feedback prompt after a few messages
    const chatCount = getChatCount()
    if (chatCount === 5 && !sessionStorage.getItem(SESSION_FEEDBACK_KEY)) {
      // Show a subtle feedback prompt after 5 messages
      setTimeout(() => {
        showFeedbackPrompt()
      }, 1000)
    }
  }

  // Setup input listeners and drag functionality after elements are created
  setupInputListeners()
  addDragListeners()

  // Initialize the chatbot widget on load
  initializeChatbot()
})()
