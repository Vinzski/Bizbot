// Toggle between login and signup forms
function toggleForm() {
  const isLogin = document
    .getElementById("formTitle")
    .textContent.includes("Login");
  const usernameField = document.getElementById("username");
  const usernameLabel = document.querySelector('label[for="username"]');
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("submitBtn");
  const toggleBtn = document.querySelector(".switch-btn"); // Select the toggle button

  if (isLogin) {
    formTitle.textContent = "Signup";
    submitBtn.textContent = "Signup";
    usernameField.style.display = "block"; // Show the input field
    usernameLabel.style.display = "block"; // Show the label
    usernameField.required = true; // Make it required
    toggleBtn.textContent = "Switch to Login"; // Update toggle button text
  } else {
    formTitle.textContent = "Login";
    submitBtn.textContent = "Login";
    usernameField.style.display = "none"; // Hide the input field
    usernameLabel.style.display = "none"; // Hide the label
    usernameField.required = false; // Remove the required attribute
    toggleBtn.textContent = "Switch to Signup"; // Update toggle button text
  }
}


document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const chatbotId = urlParams.get("chatbotId");
  const faqs = urlParams.get("faqs")?.split(",") || []; // Fetch FAQ IDs from the URL

  if (chatbotId) {
    loadChatbotDetails(chatbotId);
  }

  if (faqs.length) {
    loadFAQsForChatbot(faqs); // Load FAQ IDs passed in the URL
  }
});

function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.username) {
    console.log(`Currently logged in as: ${user.username}`);
  } else {
    console.log("No user is currently logged in.");
  }
}

function setupEventListeners() {
  document
    .getElementById("submit-faq")
    .addEventListener("click", addOrUpdateFAQ);
  document
    .getElementById("test-chatbot")
    .addEventListener("click", testChatbot);
  document
    .getElementById("saveChatbotBtn")
    .addEventListener("click", saveChatbot);
}

function loadChatbotDetails(chatbotId) {
  const token = localStorage.getItem("token");
  fetch(`/api/chatbots/${chatbotId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.chatbot) {
        const chatbot = data.chatbot;
        // Assign the chatbot details
        document.getElementById("chatbot-name").value = chatbot.name || "";
        document.getElementById("chatbot-select").value = chatbot.type || "";
        loadFAQsForChatbot(data.faqs); // Pass the fetched FAQs data
      } else {
        console.error("Chatbot data is missing");
      }
    })
    .catch((error) => {
      console.error("Error loading chatbot details:", error);
    });
}

function loadFAQsForChatbot(faqIds) {
  const token = localStorage.getItem("token");
  fetch("/api/faqs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((allFaqs) => {
      const tbody = document.querySelector("#faq-table tbody");
      const filteredFaqs = allFaqs.filter((faq) => faqIds.includes(faq._id));
      filteredFaqs.forEach((faq) => {
        const row = document.createElement("tr");
        row.setAttribute("data-faq-id", faq._id);
        row.innerHTML = `
            <td>${faq.question}</td>
            <td>${faq.answer}</td>
            <td>
                <button class="btn-edit" onclick="editFunc('${faq._id}')">EDIT</button>
                <button class="btn-delete" onclick="deleteFunc('${faq._id}')">DELETE</button>
            </td>
          `;
        tbody.appendChild(row);
      });
      console.log(`Loaded ${filteredFaqs.length} FAQs for this chatbot`);
    })
    .catch((error) => {
      console.error("Error loading FAQs:", error);
    });
}

function addOrUpdateFAQ() {
  const questionInput = document.getElementById("faq-question");
  const answerInput = document.getElementById("faq-answer");
  const chatbotTypeSelect = document.getElementById("chatbot-select");
  const token = localStorage.getItem("token");

  const question = questionInput.value;
  const answer = answerInput.value;
  const chatbotType = chatbotTypeSelect.value;

  fetch("/api/faqs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, answer, chatbotType }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Success Alert using SweetAlert2
      Swal.fire({
        title: "Good job!",
        text: "FAQ saved successfully!",
        icon: "success",
        confirmButtonText: "OK",
      });

      const tbody = document.querySelector("#faq-table tbody");
      const row = document.createElement("tr");
      row.setAttribute("data-faq-id", data._id);
      row.innerHTML = `
        <td>${data.question}</td>
        <td>${data.answer}</td>
        <td>
            <button class="btn-edit" onclick="editFunc('${data._id}')">EDIT</button>
            <button class="btn-delete" onclick="deleteFunc('${data._id}')">DELETE</button>
        </td>
      `;
      tbody.appendChild(row);
      questionInput.value = "";
      answerInput.value = "";
    })
    .catch((error) => {
      console.error("Error saving FAQ:", error);
      // Error Alert using SweetAlert2
      Swal.fire({
        title: "Error",
        text: `Failed to save FAQ: ${error.message}`,
        icon: "error",
        confirmButtonText: "Try Again",
      });
    });
}

function testChatbot() {
  const queryElement = document.getElementById("test-query");
  const query = queryElement.value.trim();

  // Log the user input
  console.log("User Query:", query);

  if (!query) {
    alert("Please enter a query.");
    console.warn("No query entered. Exiting function.");
    return;
  }

  const token = localStorage.getItem("token"); // Retrieve the JWT from localStorage

  // Log the retrieved token
  console.log("Retrieved Token from localStorage:", token);

  if (!token) {
    console.error("No token found in localStorage. Authentication may fail.");
    alert("Authentication token is missing. Please log in again.");
    return;
  }

  // Prepare the payload
  const payload = { question: query };

  // Log the payload being sent
  console.log("Payload to be sent:", payload);

  // Optionally, log the headers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`, // Include the JWT in the Authorization header
  };
  console.log("Request Headers:", headers);

  fetch("/api/chat/test", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  })
    .then((response) => {
      // Log the response status
      console.log("Response Status:", response.status, response.statusText);

      if (!response.ok) {
        console.error("Network response was not ok:", response.statusText);
        throw new Error("Network response was not ok: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      // Log the received data
      console.log("Received Data from Server:", data);

      const resultDiv = document.getElementById("simulation-result");

      // Safeguard against missing data
      if (data.reply && data.source) {
        resultDiv.innerHTML = `<strong>Response:</strong> ${data.reply} <br><strong>Source:</strong> ${data.source}`;
        console.log("Displayed Response and Source in UI.");
      } else {
        console.warn("Received data is incomplete:", data);
        resultDiv.innerHTML = `<strong>Response:</strong> ${
          data.reply || "No reply received."
        } <br><strong>Source:</strong> ${data.source || "Unknown"}`;
      }
    })
    .catch((error) => {
      // Log detailed error information
      console.error("Error testing chatbot:", error);
      const resultDiv = document.getElementById("simulation-result");
      resultDiv.textContent = "Error: " + error.message;
    });
}

async function saveChatbot() {
    const chatbotTypeSelect = document.getElementById("chatbot-select");
    const chatbotNameInput = document.getElementById("chatbot-name");
    const token = localStorage.getItem("token");

    // Validate chatbot name and type
    if (!chatbotTypeSelect.value || !chatbotNameInput.value) {
        Swal.fire({
            title: "Error",
            text: "Please fill out all chatbot fields before saving.",
            icon: "error",
            confirmButtonText: "OK",
        });
        return;
    }

    // Extract FAQs
    const faqs = Array.from(document.querySelectorAll("#faq-table tbody tr")).map((row) => ({
        question: row.cells[0].innerText,
        answer: row.cells[1].innerText,
    }));

    // Extract PDFs (use dataset.pdfId if each list item has it)
    const pdfs = Array.from(document.querySelectorAll("#pdf-list li")).map((li) => li.dataset.pdfId).filter(Boolean);

    // Prepare the data
    const chatbotData = {
        name: chatbotNameInput.value,
        type: chatbotTypeSelect.value,
        faqs: faqs,
        pdfs: pdfs,
    };

    try {
        // Send the POST request to save the chatbot
        const response = await fetch("/api/chatbots", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(chatbotData),
        });

        const data = await response.json();
        if (response.ok) {
            Swal.fire('Success', data.message, 'success');
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving chatbot:', error);
        Swal.fire('Error', 'Failed to save chatbot', 'error');
    }
}


// Handling authentication and form submissions
document
  .getElementById("authForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    authenticateUser();
  });

function authenticateUser() {
  const isLogin = document.getElementById("formTitle").textContent.includes("Login");
  const username = isLogin ? null : document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const body = isLogin ? { email, password } : { username, email, password };
  const url = isLogin ? "/api/auth/login" : "/api/auth/signup";

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "User created successfully") {
        Swal.fire({
          icon: "success",
          title: "Successfully Created an Account!",
          text: "You can now log in using your credentials.",
        });
      } else if (data.message === "Login successful") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify({ username: data.user.username, email: email }));
        localStorage.setItem("loginSuccess", "true");
        window.location.href = "dashboard.html";
      } else if (data.message === "Username or Email already exists") {
        Swal.fire({
          icon: "error",
          title: "Username or Email Already Exist",
          text: "Please use a different username or email.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Invalid Credentials",
          text: "Please check your username or password.",
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Failed to execute: " + error.message,
      });
    });
}


function logout() {
  // Clear user data and token from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Display a message or redirect to the login page
  console.log("User logged out successfully");
  // Redirect to login page
  window.location.href = "index.html";
}

function editFunc(id) {
  // Find the table row with the matching ID
  const row = document.querySelector(`tr[data-faq-id="${id}"]`);
  if (!row) {
    console.error("Row not found!");
    return;
  }

  // Get all <td> elements in the row (excluding the Actions column)
  const cells = row.querySelectorAll("td:not(:last-child)");

  // Check if the row is already in editing mode
  if (row.classList.contains("editing")) {
    // Save changes
    const updatedData = {};
    const questionInput = cells[0].querySelector("input"); // First cell for question
    const answerInput = cells[1].querySelector("input"); // Second cell for answer

    if (questionInput && answerInput) {
      updatedData.question = questionInput.value;
      updatedData.answer = answerInput.value;

      // Replace input values back into the cells
      cells[0].textContent = updatedData.question;
      cells[1].textContent = updatedData.answer;
    }

    // Change button text back to "EDIT"
    const editButton = row.querySelector(".btn-edit");
    editButton.textContent = "EDIT";

    row.classList.remove("editing");

    // Update the database with the edited data
    const token = localStorage.getItem("token");
    fetch(`/api/faqs/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to update FAQ with ID ${id}.`);
        }
        return response.json();
      })
      .then((updateData) => {
        console.log(`FAQ with ID ${id} updated successfully:`, updateData);
        Swal.fire({
          title: "Good job!",
          text: "FAQ updated successfully!",
          icon: "success",
          confirmButtonText: "OK",
        });
      })
      .catch((error) => {
        console.error("Error updating FAQ:", error);
        Swal.fire({
          title: "Error",
          text: `Error updating FAQ: ${error.message}`,
          icon: "error",
          confirmButtonText: "Try Again",
        });
      });

    console.log(`Saved changes for FAQ with ID: ${id}`);
  } else {
    // Make cells editable
    cells.forEach((cell) => {
      const text = cell.textContent; // Get the current text content of the cell
      cell.innerHTML = `<input type="text" value="${text}" style="width: 100%;" />`;
    });

    // Change button text to "SAVE"
    const editButton = row.querySelector(".btn-edit");
    editButton.textContent = "SAVE";

    row.classList.add("editing");
    console.log(`Editing FAQ with ID: ${id}`);
  }
}

function deleteFunc(id) {
  // Show a confirmation dialog with SweetAlert2
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this action!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      // Log the ID that will be deleted
      console.log(`Attempting to delete FAQ with ID: ${id}`);

      // Fetch the FAQ data to check if it exists
      const token = localStorage.getItem("token"); // Get token from local storage
      fetch(`/api/faqs/${id}`, {
        method: "DELETE", // Using DELETE method to remove the FAQ
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((deleteResponse) => {
          if (!deleteResponse.ok) {
            throw new Error("Failed to delete FAQ");
          }
          return deleteResponse.json();
        })
        .then((deleteData) => {
          Swal.fire({
            title: "Deleted!",
            text: deleteData.message || "FAQ deleted successfully.",
            icon: "success",
            confirmButtonText: "OK",
          });
          removeFaqRow(id); // Remove the FAQ row from the table
        })
        .catch((error) => {
          console.error("Error deleting FAQ:", error);
          Swal.fire({
            title: "Error",
            text: `Failed to delete FAQ: ${error.message}`,
            icon: "error",
            confirmButtonText: "Try Again",
          });
        });
    } else {
      console.log("Deletion canceled by the user.");
    }
  });
}

// Function to remove the deleted FAQ row from the table
function removeFaqRow(id) {
  const row = document.querySelector(`tr[data-faq-id="${id}"]`);
  if (row) {
    row.remove(); // Remove the row from the table
  } else {
    console.warn("Row not found to remove!");
  }
}

async function uploadPDF() {
    const form = document.getElementById('pdf-upload-form');
    const fileInput = document.getElementById('pdf-file');
    const statusDiv = document.getElementById('upload-status');
    const pdfList = document.getElementById('pdf-list');

    // Extract chatbotId from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const chatbotId = urlParams.get('chatbotId'); // Assuming ?chatbotId=XYZ in the URL

    if (!fileInput.files.length) {
        statusDiv.textContent = 'Please select a file to upload.';
        return;
    }

    if (!chatbotId) {
        statusDiv.textContent = 'Chatbot ID not found in the URL.';
        return;
    }

    const formData = new FormData();
    formData.append('pdf', fileInput.files[0]); // Append the file
    formData.append('chatbotId', chatbotId);   // Append chatbotId

    try {
        statusDiv.textContent = 'Uploading...';
        const response = await fetch('/api/faqs/upload-pdf', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`, // Include JWT if needed
            },
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            statusDiv.textContent = data.message;
        
            // Dynamically add the newly uploaded PDF to the list with an icon
            const pdfItem = document.createElement('li');
            pdfItem.innerHTML = `<i class="fas fa-file-pdf"></i> <span>${data.pdf.filename}</span>`;
            pdfList.appendChild(pdfItem);
        } else {
            const error = await response.json();
            statusDiv.textContent = `Error: ${error.message}`;
        }
    } catch (err) {
        console.error('Upload error:', err);
        statusDiv.textContent = 'An error occurred while uploading the PDF.';
    }
}




