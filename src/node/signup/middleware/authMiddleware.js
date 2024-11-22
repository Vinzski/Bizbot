const jwt = require('jsonwebtoken');
const path = require('path');
const userModel = require('../../models/userModel');

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey_12345');
        req.user = decoded; // Assuming your JWT has user info, particularly `id`
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
};

module.exports = authenticate;
