const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRouter = require('../../routes/auth');
const { User } = require('../../models');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../models');
jest.mock('../../utils/Logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      username: 'testuser',
      password: 'testpassword'
    };

    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      is_admin: false,
      save: jest.fn()
    };

    it('should login successfully with valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce(mockToken).mockReturnValueOnce(mockRefreshToken);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          is_admin: mockUser.is_admin
        }
      });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { username: validLoginData.username }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(validLoginData.password, mockUser.password);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject login with missing username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'testpassword' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Username and password are required'
      });
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Username and password are required'
      });
    });

    it('should reject login with non-existent user', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid username or password'
      });
    });

    it('should reject login with incorrect password', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid username or password'
      });
    });

    it('should handle database errors gracefully', async () => {
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });
    });

    it('should handle bcrypt errors gracefully', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('POST /auth/register', () => {
    const validRegisterData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'newpassword'
    };

    it('should register new user successfully', async () => {
      const hashedPassword = 'hashed-password';
      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';
      const mockNewUser = {
        id: 2,
        username: validRegisterData.username,
        email: validRegisterData.email,
        is_admin: false
      };

      User.findOne.mockResolvedValue(null); // No existing user
      bcrypt.hash.mockResolvedValue(hashedPassword);
      User.create.mockResolvedValue(mockNewUser);
      jwt.sign.mockReturnValueOnce(mockToken).mockReturnValueOnce(mockRefreshToken);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: mockNewUser
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(validRegisterData.password, 12);
      expect(User.create).toHaveBeenCalledWith({
        username: validRegisterData.username,
        email: validRegisterData.email,
        password: hashedPassword,
        is_admin: false
      });
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'test' }); // Missing email and password

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Username, email, and password are required'
      });
    });

    it('should reject registration with existing username', async () => {
      const existingUser = { id: 1, username: validRegisterData.username };
      User.findOne.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Username or email already exists'
      });
    });

    it('should reject registration with invalid email format', async () => {
      const invalidData = {
        ...validRegisterData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email format'
      });
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordData = {
        ...validRegisterData,
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/auth/register')
        .send(weakPasswordData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    });
  });

  describe('POST /auth/refresh', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      is_admin: false
    };

    it('should refresh token successfully', async () => {
      const newToken = 'new-jwt-token';
      const newRefreshToken = 'new-refresh-token';
      const decodedToken = { userId: 1 };

      jwt.verify.mockReturnValue(decodedToken);
      User.findByPk.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValueOnce(newToken).mockReturnValueOnce(newRefreshToken);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: mockRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        token: newToken,
        refreshToken: newRefreshToken
      });

      expect(jwt.verify).toHaveBeenCalledWith(mockRefreshToken, process.env.JWT_SECRET);
      expect(User.findByPk).toHaveBeenCalledWith(1);
    });

    it('should reject refresh with missing token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Refresh token is required'
      });
    });

    it('should reject refresh with invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid refresh token'
      });
    });

    it('should reject refresh for non-existent user', async () => {
      const decodedToken = { userId: 999 };
      jwt.verify.mockReturnValue(decodedToken);
      User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: mockRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid refresh token'
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });

  describe('Integration Tests', () => {
    it('should complete full authentication flow', async () => {
      const userData = {
        username: 'integrationuser',
        email: 'integration@example.com',
        password: 'integrationpassword'
      };

      // Mock successful registration
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      const mockUser = {
        id: 3,
        username: userData.username,
        email: userData.email,
        is_admin: false,
        password: 'hashed-password',
        save: jest.fn()
      };
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');

      // Register
      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);

      // Mock successful login
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();

      // Logout
      const logoutResponse = await request(app)
        .post('/auth/logout');

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
    });
  });
});
