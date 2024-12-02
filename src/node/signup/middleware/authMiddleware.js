const jwt = require('jsonwebtoken');
const userModel = require('../../models/userModel');

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey_12345');
        req.user = decoded;  // Assuming your JWT contains user info
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

module.exports = authenticate;
