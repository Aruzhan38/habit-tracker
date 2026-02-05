const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const isUserRegistered = await User.exists({ email });

        if (isUserRegistered) {
            return res.status(400).json({ message: 'User already registered' });
        }

        await User.create({ username, email, password });
        return res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({ error: "Error registering user" }); 
    }
};

exports.login = async (req, res) => {
    try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id },
        process.env.JWT_SECRET,{ expiresIn: '1d' });

    const userData = {
        id: user._id,
        username: user.username,
        email: user.email,
        timezone: user.timezone
    }

    res.json({ token, user: userData });
    }
    catch (err) {
        return res.status(500).json({ error: "Error logging in user" });
    }
};