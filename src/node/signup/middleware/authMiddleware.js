// authMiddleware.js
const jwt = require('jsonwebtoken');
const userModel = require('../../models/userModel');

/**
 * Authentication middleware to verify JWT tokens and attach user information to the request.
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if Authorization header is present and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('No token provided in Authorization header.');
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Ensure JWT_SECRET is set
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ message: 'Internal Server Error. Authentication secret not configured.' });
        }

        // Verify and decode the token
        const decoded = jwt.verify(token, secret);
        console.log('JWT decoded successfully:', decoded);

        // Extract user ID from the decoded token
        const userId = decoded.id || decoded.userId;
        if (!userId) {
            console.error('Token does not contain user ID.');
            return res.status(401).json({ message: 'Invalid token. User ID not found.' });
        }

        // Fetch the user from the database to ensure they exist
        const user = await userModel.findById(userId).select('-password'); // Exclude sensitive fields
        if (!user) {
            console.error(`User with ID ${userId} not found.`);
            return res.status(401).json({ message: 'Invalid token. User does not exist.' });
        }

        // Attach user information to the request object
        req.user = { id: user._id, email: user.email, name: user.name };
        console.log(`Authentication successful. User ID: ${req.user.id}`);

        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(400).json({ message: 'Invalid token.' });
    }
};

module.exports = authenticate;
