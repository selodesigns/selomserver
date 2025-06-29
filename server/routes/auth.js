const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, generateToken, generateRefreshToken } = require('../middleware/auth');
const { logger } = require('../utils/Logger');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already in use'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (non-admin by default)
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      display_name: displayName || username,
      is_admin: false
    });

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Return user info and tokens (exclude password)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    };

    res.status(201).json({
      success: true,
      user: userResponse,
      token,
      refreshToken
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required'
      });
    }

    // Check if user exists (by username or email)
    console.log('[DEBUG] Login endpoint hit', req.body);
    logger.debug(`Login attempt for username/email: ${username}`);
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username } // Allow login with email too
        ]
      }
    });
    logger.debug(`User lookup result: ${user ? 'FOUND' : 'NOT FOUND'}`);
    console.log('[DEBUG] User lookup result:', user ? { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin, is_active: user.is_active } : 'NOT FOUND');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    logger.debug(`Password match result: ${isMatch}`);
    console.log('[DEBUG] Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return user info and tokens (exclude password)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    };

    res.json({
      success: true,
      user: userResponse,
      token,
      refreshToken
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user data
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user info (exclude password)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    };

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    logger.error(`Auth me error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving user data'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired, please log in again'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

module.exports = router;
