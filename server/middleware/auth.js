const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { logger } = require('../utils/Logger');

/**
 * Middleware to authenticate JWT tokens
 * Attaches the user to the request object if authenticated
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Auth error: ${error.message}`);
    
    // Handle expired token specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired', 
        expired: true 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

/**
 * Middleware to ensure user has admin role
 * Must be used after authenticateToken
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  if (!req.user.is_admin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  
  next();
};

/**
 * Generate JWT token for a user
 */
const generateToken = (user, expiresIn = '24h') => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    }, 
    process.env.JWT_SECRET, 
    { expiresIn }
  );
};

/**
 * Generate refresh token with longer expiry
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  generateRefreshToken
};
