const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getCurrentUser = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret-key');

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }

};

module.exports = { getCurrentUser };