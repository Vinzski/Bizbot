const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel'); // Ensure the path to userModel is correct

exports.signup = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check if user already exists with the same email or username
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });
        res.status(201).json({ 
            message: 'User created successfully', 
            user: { 
                id: newUser._id, 
                username: newUser.username, 
                email: newUser.email 
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: "Error creating the user", error: error.message });
    }
};


// Login function
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Directly specifying the secret key
        const jwtSecret = process.env.JWT_SECRET || 'mysecretkey_12345';
        const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '24h' });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, username: user.username } // Include user details in the response
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
