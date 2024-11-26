const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel'); // Ensure the path to userModel is correct

exports.signup = async (req, res) => {
    console.log('Signup data received:', req.body);
    const { username, email, password } = req.body;
    try {
        console.log('Attempting to hash password');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed, creating user');
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });
        console.log('User created:', newUser);
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

        // Use environment variable for JWT secret
        const jwtSecret = process.env.JWT_SECRET;  // Removed fallback to enforce using .env
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

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




