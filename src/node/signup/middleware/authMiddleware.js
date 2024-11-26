const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const jwtSecret = process.env.JWT_SECRET 'mysecretkey_12345'; // Removed fallback to enforce using .env
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined in environment variables.');
            return res.status(500).send('Server configuration error.');
        }
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded; // Assuming your JWT has user info, particularly `id`
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
};
module.exports = authenticate;
