const jwt = require('jsonwebtoken');
const User = require('../models/user'); 

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) { return res.status(401).json({ message: 'Not authorized' }); }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id || decoded._id);
        if (!user) { return res.status(401).json({ message: 'User not found' }); }

        req.user = user; 
        next();

    } catch (err) {
        return res.status(401).json({ message: 'Token failed' });
    }
};