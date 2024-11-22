const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');

// Route for user signup
router.post('/signup', authController.signup);

// Route for user login
router.post('/login', authController.login);

module.exports = router;
