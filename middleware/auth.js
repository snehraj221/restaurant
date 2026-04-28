const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.token;

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied, admin only' });
    }
};

module.exports = { verifyToken, isAdmin };
