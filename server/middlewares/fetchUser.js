const jwt = require('jsonwebtoken');

const fetchUser = (req, res, next) => {
  const token = req.header('auth-token') || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = fetchUser;
