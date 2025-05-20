# BizBot: Customizable Intelligent Chatbot for Business Support and Information Retrieval

BizBot is a customizable chatbot solution designed to assist businesses with answering customer inquiries and providing information retrieval. The bot is adaptable and learns from user interactions, helping businesses automate their support systems. It comes with a wide array of features that allow for a personalized user experience and detailed analytics.

## Features
- **Admin Control**: Full admin access for managing and configuring chatbots.
- **Customizable Q&A System**: Businesses can customize responses by adding FAQs and modifying the bot's source responses.
- **PDF Reading**: The bot can read and extract content from PDFs to answer user queries.
- **Embeddable Chatbot Widget**: Easily integrate the chatbot into any website using a simple embeddable widget.
- **Design Customization**: Customize the bot’s color scheme, add a logo, and configure a personalized welcome message.
- **Analytics Report**: View detailed performance reports including user ratings for each chatbot interaction to gauge effectiveness.

## Prerequisites

Before you begin, ensure you have met the following requirements:

### Software Requirements:
- **Node.js** (Version 16 or higher)
- **npm** (Node Package Manager)
- **MongoDB** (for storing user data and training information)
- **Rasa** (for advanced AI features, optional, if you're integrating with it)
- **ngrok** (optional, for tunneling the local server for external testing)

### Database Setup:
BizBot uses **MongoDB** for data storage (user information, logs, chatbot data, etc.). You can set it up locally or use a cloud service like MongoDB Atlas.

1. Download and install [MongoDB](https://www.mongodb.com/try/download/community) (if using locally).
2. Create a database called `bizbot` in MongoDB.

Alternatively, if using MongoDB Atlas, you can create a cluster and get the connection string for your app.

### Additional Tools (Optional):
- **Rasa**: If you are implementing the AI features with Rasa, follow the [Rasa Installation Guide](https://rasa.com/docs/rasa/installation/).

## Setup

### 1. Clone the Repository
[git clone https://github.com/Vinzski/bizbot.git](https://github.com/Vinzski/Bizbot.git)

### 2. Install Dependencies

Run the following command to install the required dependencies:

```shellscript
npm install
```

### 3. Configuration

Create a `.env` file in the root of the project and set the following environment variables:

```shellscript
MONGODB_URI=<Your MongoDB Connection String>
PORT=3000
JWT_SECRET=<Your Secret Key for JWT>
RASA_SERVER_URL=http://localhost:5005  # If using Rasa, set the URL of the Rasa server
COHERE_API_KEY=<Your Cohere API Key>  # For advanced NLP features
```

### 4. Running the Application

Once everything is set up, you can start the BizBot application with the following command:

```shellscript
cd src
```
```shellscript
cd node
```
```shellscript
cd signup
```
```shellscript
npm run server
```

This will start the server on [http://localhost:3000](http://localhost:3000). The bot will be available at this URL for local testing.

### 5. Testing and Deployment

You can use ngrok for external access if needed:

```shellscript
ngrok http 3000
```

This will provide a public URL that can be used for testing and deployment on other sites.

## Project Structure

### API Routes

#### chatRoutes.js

Handles chat functionality with NLP and AI integrations:

- Uses similarity algorithms (Jaccard, Cosine, Jaro-Winkler) to match user questions with FAQs
- Integrates with Cohere AI for PDF content searching
- Falls back to Rasa NLU when no match is found


#### chatbotRoutes.js

Manages CRUD operations for chatbots:

- Create/update chatbots with FAQs and PDF references
- Retrieve chatbot details with populated FAQs and PDFs
- Delete chatbots and associated resources


#### customizationRoutes.js

Handles chatbot UI customization:

- Save theme colors, welcome messages, and logos
- Upload logo images to AWS S3
- Update user profiles with password verification


#### domainRoutes.js

Manages domain registration for chatbots:

- Register new domains for CORS embedding the chatbot
- Retrieve domains registered by users


#### faqRoutes.js

Handles FAQ management and PDF uploads:

- Upload and parse PDFs using pdf-parse
- Create, read, update, and delete FAQs
- Associate PDFs with specific chatbots


#### feedbackRoutes.js

Manages user feedback for chatbots:

- Submit ratings and feedback text
- Retrieve feedbacks with optional rating filters


#### messageRoutes.js

Retrieves message history for chatbots:

- Get all user messages for a specific chatbot


### Controllers and Core Files

#### authController.js

Handles user authentication:

- User registration with password hashing
- Login with JWT token generation

#### authMiddleware.js

Authentication middleware for protecting routes:

- Verifies JWT tokens
- Attaches user information to requests


#### server.js

Main Express server configuration:

- Dynamic CORS configuration based on registered domains
- API route registration
- Global error handling
- Token generation for the chatbot widget


#### db.js

MongoDB connection configuration:

- Establishes connection to MongoDB using environment variables


#### widget.js

Client-side chatbot widget for embedding in websites:

- Customizable appearance (theme color, logo, welcome message)
- Message formatting and display
- Feedback collection with emoji rating system
- Token-based authentication


## How to Use

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Admin users can configure the bot through the admin control panel.
3. The bot will respond to user queries based on the customizable responses and FAQs.
4. Customize the chatbot's look and feel, including color schemes, logos, and welcome messages.
5. View chatbot performance analytics to gauge user engagement and effectiveness.


## How to Customize the Chatbot Widget

To embed the chatbot into a website, simply add the following script to your HTML:

SAMPLE
```html
<script src="http://localhost:3000/chatbot-widget.js"></script>
<div id="bizbot-widget" data-chatbot-id="YOUR_CHATBOT_ID" data-user-id="YOUR_USER_ID" data-token="YOUR_TOKEN"></div>
```

Replace localhost:3000 with your production URL if deploying.

## Analytics and Reporting

BizBot provides a detailed analytics report showing user ratings and interaction statistics. Admins can access these reports from the admin dashboard to evaluate the bot's performance.

## Natural Language Processing Features

BizBot employs several NLP techniques for accurate response matching:

- **Jaccard Similarity**: Measures word overlap between queries
- **Cosine Similarity**: Uses TF-IDF for vector-based text comparison
- **Jaro-Winkler Distance**: Handles string edit distances with prefix emphasis
- **Cohere Integration**: Uses advanced AI to extract answers from PDF content
- **Rasa Fallback**: Default response system when no matches are found


## Contributing

We welcome contributions to the BizBot project! Please fork this repository, create a branch, and submit a pull request for review.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For any inquiries or support, please contact [[vinzmuloc@gmail.com](mailto:vinzmuloc@gmail.com)].

Enjoy using BizBot, and feel free to customize it to fit your business needs!
Copy
Edit

This complete README now includes all the features, setup instructions, and relevant information yo
