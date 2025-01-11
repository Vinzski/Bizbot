// Initialize the pendingPdfs array at the top
let pendingPdfs = [];

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
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch chatbot details');
      }
      return response.json();
    })
    .then((data) => {
      if (data.chatbot) {
        const chatbot = data.chatbot;
        // Assign the chatbot details
        document.getElementById("chatbot-name").value = chatbot.name || "";
        document.getElementById("chatbot-select").value = chatbot.type || "";
        loadFAQsForChatbot(data.faqs); // Pass the fetched FAQs data

        // Load and display PDFs associated with the chatbot
        loadPDFsForChatbot(data.pdfs); // Pass the PDFs data
      } else {
        console.error("Chatbot data is missing");
      }
    })
    .catch((error) => {
      console.error("Error loading chatbot details:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load chatbot details. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    });
}


function loadPDFsForChatbot(pdfs) {
  const pdfList = document.getElementById('pdf-list');
  pdfList.innerHTML = ''; // Clear the list first

  if (!Array.isArray(pdfs)) {
    console.error("pdfs is not an array");
    return;
  }

  if (pdfs.length === 0) {
    pdfList.innerHTML = '<li>No PDF associated with this chatbot.</li>';
    return;
  }

  pdfs.forEach((pdf) => {
    const pdfItem = document.createElement('li');
    // Create a link to view/download the PDF
    const pdfLink = document.createElement('a');
    pdfLink.href = `/uploads/${pdf.filename}`; // Adjust the path if needed
    pdfLink.target = '_blank'; // Open in a new tab
    pdfLink.textContent = pdf.filename;
    pdfLink.style.marginLeft = '10px';

    pdfItem.innerHTML = `<i class="fas fa-file-pdf"></i> `;
    pdfItem.appendChild(pdfLink);

    // Optionally, add a "Remove" button if you want to allow PDF deletion
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.marginLeft = '10px';
    removeBtn.onclick = () => {
      removePDF(pdf._id);
    };
    pdfItem.appendChild(removeBtn);

    pdfList.appendChild(pdfItem);
  });

  console.log(`Loaded ${pdfs.length} PDF(s) for this chatbot`);
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

function formatContent(content) {
    const lines = content.split('\n').map(line => line.trim());
    let formattedContent = '';
    let isList = false;
    let listType = 'ul'; // 'ul' for unordered, 'ol' for ordered
    lines.forEach((line, index) => {
        // Check for unordered list items
        if (/^[-*\u2022]\s+/.test(line)) {
            if (!isList) {
                isList = true;
                listType = 'ul';
                formattedContent += `<${listType}>`;
            }
            const listItem = line.replace(/^[-*\u2022]\s+/, '');
            formattedContent += `<li>${listItem}</li>`;
        }
        // Check for ordered list items
        else if (/^\d+\.\s+/.test(line)) {
            if (!isList) {
                isList = true;
                listType = 'ol';
                formattedContent += `<${listType}>`;
            }
            const listItem = line.replace(/^\d+\.\s+/, '');
            formattedContent += `<li>${listItem}</li>`;
        }
        // Regular paragraph
        else {
            if (isList) {
                formattedContent += `</${listType}>`;
                isList = false;
            }
            if (line !== '') {
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

function testChatbot() {
    const queryElement = document.getElementById("test-query");
    const query = queryElement.value.trim();
    const resultDiv = document.getElementById("simulation-result");
    const sendButton = document.getElementById("send-button"); // Assuming there's a send button with this ID

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

    // Fetch chatbotId from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const chatbotId = urlParams.get("chatbotId");

    // Log the fetched chatbotId
    console.log("Fetched chatbotId from URL:", chatbotId);

    if (!chatbotId) {
        console.error("No chatbotId found in URL.");
        alert("chatbotId is missing in the URL.");
        return;
    }

    // Prepare the payload
    const payload = { question: query, chatbotId: chatbotId };

    // Log the payload being sent
    console.log("Payload to be sent:", payload);

    // Prepare the headers
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Include the JWT in the Authorization header
    };
    console.log("Request Headers:", headers);

    // Display "Loading..." message
    resultDiv.innerHTML = `<p>Loading...</p>`;
    console.log("Displayed 'Loading...' message to the user.");

    // Optional: Disable the send button to prevent multiple submissions
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.style.cursor = 'not-allowed';
        console.log("Send button disabled to prevent multiple submissions.");
    }

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
            // Safeguard against missing data
            if (data.reply && data.source) {
                const formattedReply = formatContent(data.reply);
                resultDiv.innerHTML = `<strong>Response:</strong> ${formattedReply} <br><strong>Source:</strong> ${data.source}`;
                console.log("Displayed Formatted Response and Source in UI.");
            } else {
                console.warn("Received data is incomplete:", data);
                resultDiv.innerHTML = `<strong>Response:</strong> ${
                    data.reply || "No reply received."
                }`;
            }
        })
        .catch((error) => {
            // Log detailed error information
            console.error("Error testing chatbot:", error);
            resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
            console.log("Displayed error message to the user.");
        })
        .finally(() => {
            // Re-enable the send button after the request completes
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.style.cursor = 'pointer';
                console.log("Send button re-enabled.");
            }
        });
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

function uploadPDF() {
    const pdfFileInput = document.getElementById("pdf-file");
    const chatbotIdInput = document.getElementById("chatbot-id"); // Hidden input for Chatbot ID
    const token = localStorage.getItem("token");

    const file = pdfFileInput.files[0];
    if (!file) {
        Swal.fire({
            title: "Error",
            text: "Please select a PDF file to upload.",
            icon: "error",
            confirmButtonText: "OK",
        });
        return;
    }

    const chatbotId = chatbotIdInput.value; // Get the chatbotId from hidden input

    if (chatbotId) {
        // Chatbot is already saved; upload the PDF immediately
        const formData = new FormData();
        formData.append("pdf", file);
        formData.append("chatbotId", chatbotId);

        fetch("/api/faqs/upload-pdf", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                throw new Error(data.message || "Failed to upload PDF");
            }

            Swal.fire({
                title: "Success",
                text: data.message,
                icon: "success",
                confirmButtonText: "OK",
            });

            // Update the PDF list
            loadPDFsForChatbot([data.pdf]);

            // Optionally, clear the file input
            pdfFileInput.value = "";
        })
        .catch((error) => {
            console.error("Error uploading PDF:", error);
            Swal.fire({
                title: "Error",
                text: `Failed to upload PDF: ${error.message}`,
                icon: "error",
                confirmButtonText: "Try Again",
            });
        });
    } else {
        // Chatbot is not saved yet; store the PDF in pendingPdfs
        pendingPdfs.push(file);

        Swal.fire({
            title: "Info",
            text: "Chatbot not saved yet. The PDF will be uploaded once you save the chatbot.",
            icon: "info",
            confirmButtonText: "OK",
        });

        // Optionally, update the UI to show pending PDFs
        displayPendingPdfs();

        // Optionally, clear the file input
        pdfFileInput.value = "";
    }
}

function displayPendingPdfs() {
    const pdfList = document.getElementById("pdf-list");
    const pendingPdfCard = document.getElementById("pending-pdf-card");
    pdfList.innerHTML = ""; // Clear existing list

    if (pendingPdfs.length === 0) {
        pendingPdfCard.style.display = "none";
        return;
    }

    pendingPdfs.forEach((file, index) => {
        const listItem = document.createElement("li");
        listItem.classList.add("pending-pdf");

        const fileNameSpan = document.createElement("span");
        fileNameSpan.textContent = file.name;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => {
            pendingPdfs.splice(index, 1);
            displayPendingPdfs();
        };

        listItem.appendChild(fileNameSpan);
        listItem.appendChild(removeBtn);
        pdfList.appendChild(listItem);
    });

    pendingPdfCard.style.display = "block";
}

function saveChatbot() {
    console.log("saveChatbot called");

    const chatbotTypeSelect = document.getElementById("chatbot-select");
    const chatbotNameInput = document.getElementById("chatbot-name");
    const chatbotIdInput = document.getElementById("chatbot-id"); // Hidden input for Chatbot ID
    const token = localStorage.getItem("token");

    // Verify that the hidden input exists
    if (!chatbotIdInput) {
        console.error("Element with ID 'chatbot-id' not found.");
        Swal.fire({
            title: "Error",
            text: "Chatbot ID element is missing.",
            icon: "error",
            confirmButtonText: "OK",
        });
        return;
    }

    if (!chatbotTypeSelect.value || !chatbotNameInput.value) {
        console.log("Chatbot name or type is missing");
        Swal.fire({
            title: "Error",
            text: "Please fill out all chatbot fields before saving.",
            icon: "error",
            confirmButtonText: "OK",
        });
        return;
    }

    const faqs = Array.from(document.querySelectorAll("#faq-table tbody tr"))
        .map((row) => row.getAttribute("data-faq-id"))
        .filter(Boolean);
    console.log("Collected FAQs:", faqs);

    // Prepare the payload
    const payload = {
        name: chatbotNameInput.value,
        type: chatbotTypeSelect.value,
        faqs: faqs,
    };

    // Include pdfId if it exists
    const pdfIdInput = document.getElementById("pdf-id"); // Hidden input for PDF ID
    if (pdfIdInput && pdfIdInput.value) {
        payload.pdfId = pdfIdInput.value;
        console.log("Including pdfId in payload:", payload.pdfId);
    }

    fetch("/api/chatbots", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    })
        .then((response) => {
            console.log("Received response:", response);
            if (!response.ok) {
                return response.json().then(errData => {
                    console.log("Error response data:", errData);
                    throw new Error(errData.message || "Network response was not ok");
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log("Success data:", data);
            Swal.fire({
                title: "Good job!",
                text: "Chatbot saved successfully!",
                icon: "success",
                confirmButtonText: "OK",
            });

            // Update chatbotId hidden input
            if (data.chatbot && data.chatbot._id) {
                chatbotIdInput.value = data.chatbot._id;
                console.log("Updated chatbotId:", chatbotIdInput.value);
            }

            // If there are pending PDFs, upload them now
            if (pendingPdfs.length > 0) {
                uploadPendingPdfs();
            }

            // Optionally, disable the Save Chatbot button or provide further UI feedback
        })
        .catch((error) => {
            console.error("Error saving chatbot:", error);
            Swal.fire({
                title: "Error",
                text: `Failed to save chatbot: ${error.message}`,
                icon: "error",
                confirmButtonText: "Try Again",
            });
        });
}

function uploadPendingPdfs() {
    const chatbotIdInput = document.getElementById("chatbot-id");
    const chatbotId = chatbotIdInput.value;
    const token = localStorage.getItem("token");

    // Iterate through pendingPdfs and upload each
    pendingPdfs.forEach((file) => {
        const formData = new FormData();
        formData.append("pdf", file);
        formData.append("chatbotId", chatbotId);

        fetch("/api/faqs/upload-pdf", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                throw new Error(data.message || "Failed to upload PDF");
            }

            Swal.fire({
                title: "Success",
                text: `PDF "${data.pdf.filename}" uploaded successfully.`,
                icon: "success",
                confirmButtonText: "OK",
            });

            // Update the PDF list
            loadPDFsForChatbot([data.pdf]);

            // Remove the uploaded PDF from pendingPdfs
            pendingPdfs = pendingPdfs.filter(pendingFile => pendingFile.name !== file.name);
            displayPendingPdfs();
        })
        .catch((error) => {
            console.error("Error uploading PDF:", error);
            Swal.fire({
                title: "Error",
                text: `Failed to upload PDF "${file.name}": ${error.message}`,
                icon: "error",
                confirmButtonText: "Try Again",
            });
        });
    });
}

// Example implementation of loadPDFsForChatbot (you might need to adjust this based on your actual implementation)
function loadPDFsForChatbot(pdfs) {
    const pdfList = document.getElementById("pdf-list");
    pdfList.innerHTML = ""; // Clear existing list

    pdfs.forEach((pdf) => {
        const listItem = document.createElement("li");
        listItem.textContent = pdf.filename;
        pdfList.appendChild(listItem);
    });
}

function removePDF(pdfId) {
    const token = localStorage.getItem("token");
    const chatbotId = document.getElementById("chatbot-id").value;

    Swal.fire({
        title: 'Are you sure?',
        text: "This will remove the PDF from the chatbot.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/api/faqs/${pdfId}`, { // Ensure you have a DELETE route for PDFs
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to remove PDF');
                }
                return response.json();
            })
            .then(() => {
                Swal.fire(
                    'Removed!',
                    'The PDF has been removed from the chatbot.',
                    'success'
                );
                // Refresh the chatbot details to reflect PDF removal
                loadChatbotDetails(chatbotId);
            })
            .catch(error => {
                console.error('Error removing PDF:', error);
                Swal.fire(
                    'Error!',
                    'Failed to remove PDF. Please try again.',
                    'error'
                );
            });
        }
    });
}


