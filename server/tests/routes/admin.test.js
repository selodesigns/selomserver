const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const adminRouter = require('../../routes/admin');
const { User, Stream } = require('../../models');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models');
jest.mock('os');
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('../../utils/Logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/admin', adminRouter);

describe('Admin Routes Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    const mockAdminUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      is_admin: true
    };

    const mockRegularUser = {
      id: 2,
      username: 'user',
      email: 'user@example.com',
      is_admin: false
    };

    it('should allow admin user to access admin routes', async () => {
      const token = 'valid-admin-token';
      jwt.verify.mockReturnValue({ userId: 1 });
      User.findByPk.mockResolvedValue(mockAdminUser);

      // Mock system stats dependencies
      const os = require('os');
      os.cpus.mockReturnValue([{ times: { user: 1000, nice: 0, sys: 500, idle: 8000, irq: 0 } }]);
      os.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      os.freemem.mockReturnValue(8 * 1024 * 1024 * 1024);   // 8GB
      os.uptime.mockReturnValue(86400); // 1 day
      os.networkInterfaces.mockReturnValue({});
      os.platform.mockReturnValue('linux');
      os.arch.mockReturnValue('x64');
      os.hostname.mockReturnValue('test-server');
      os.loadavg.mockReturnValue([0.5, 0.3, 0.2]);

      User.count.mockResolvedValue(5);
      Stream.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(User.findByPk).toHaveBeenCalledWith(1);
    });

    it('should reject non-admin user from admin routes', async () => {
      const token = 'valid-user-token';
      jwt.verify.mockReturnValue({ userId: 2 });
      User.findByPk.mockResolvedValue(mockRegularUser);

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: 'Admin access required'
      });
    });

    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/admin/stats');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Access denied. No token provided.'
      });
    });

    it('should reject requests with invalid token', async () => {
      const token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should reject requests with expired token', async () => {
      const token = 'expired-token';
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Token expired',
        expired: true
      });
    });

    it('should reject token for non-existent user', async () => {
      const token = 'valid-token';
      jwt.verify.mockReturnValue({ userId: 999 });
      User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid token. User not found.'
      });
    });
  });

  describe('Admin Stats Endpoint', () => {
    const mockAdminUser = {
      id: 1,
      username: 'admin',
      is_admin: true
    };

    beforeEach(() => {
      // Setup valid admin authentication
      jwt.verify.mockReturnValue({ userId: 1 });
      User.findByPk.mockResolvedValue(mockAdminUser);
    });

    it('should return comprehensive system statistics', async () => {
      // Mock OS module
      const os = require('os');
      os.cpus.mockReturnValue([
        { times: { user: 1000, nice: 0, sys: 500, idle: 8000, irq: 0 } },
        { times: { user: 1200, nice: 0, sys: 600, idle: 7800, irq: 0 } }
      ]);
      os.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      os.freemem.mockReturnValue(8 * 1024 * 1024 * 1024);   // 8GB
      os.uptime.mockReturnValue(86400); // 1 day
      os.networkInterfaces.mockReturnValue({
        eth0: [{ family: 'IPv4', address: '192.168.1.100', internal: false, netmask: '255.255.255.0', mac: '00:11:22:33:44:55' }]
      });
      os.platform.mockReturnValue('linux');
      os.arch.mockReturnValue('x64');
      os.hostname.mockReturnValue('test-server');
      os.loadavg.mockReturnValue([0.5, 0.3, 0.2]);

      // Mock database queries
      User.count.mockResolvedValue(5);
      Stream.count.mockResolvedValue(2);

      // Mock process uptime
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockReturnValue(3600); // 1 hour

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('activeStreams');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('network');
      expect(response.body).toHaveProperty('system');

      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('free');
      expect(response.body.memory).toHaveProperty('percentage');

      expect(response.body.activeUsers).toBe(5);
      expect(response.body.activeStreams).toBe(2);

      // Restore original process.uptime
      process.uptime = originalUptime;
    });

    it('should handle database errors gracefully in stats endpoint', async () => {
      // Mock OS module
      const os = require('os');
      os.cpus.mockReturnValue([{ times: { user: 1000, nice: 0, sys: 500, idle: 8000, irq: 0 } }]);
      os.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024);
      os.freemem.mockReturnValue(8 * 1024 * 1024 * 1024);
      os.uptime.mockReturnValue(86400);
      os.networkInterfaces.mockReturnValue({});
      os.platform.mockReturnValue('linux');
      os.arch.mockReturnValue('x64');
      os.hostname.mockReturnValue('test-server');
      os.loadavg.mockReturnValue([0.5, 0.3, 0.2]);

      // Mock database error
      User.count.mockRejectedValue(new Error('Database connection failed'));
      Stream.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(200);
      expect(response.body.activeUsers).toBe(0); // Should fallback to 0
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full admin authentication flow', async () => {
      const adminUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      };

      // Mock successful token verification
      jwt.verify.mockReturnValue({ userId: 1 });
      User.findByPk.mockResolvedValue(adminUser);

      // Mock system dependencies for stats
      const os = require('os');
      os.cpus.mockReturnValue([{ times: { user: 1000, nice: 0, sys: 500, idle: 8000, irq: 0 } }]);
      os.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      os.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);
      os.uptime.mockReturnValue(3600);
      os.networkInterfaces.mockReturnValue({});
      os.platform.mockReturnValue('linux');
      os.arch.mockReturnValue('x64');
      os.hostname.mockReturnValue('test-server');
      os.loadavg.mockReturnValue([0.1, 0.1, 0.1]);

      User.count.mockResolvedValue(3);
      Stream.count.mockResolvedValue(1);

      // Test admin access to stats endpoint
      const statsResponse = await request(app)
        .get('/admin/stats')
        .set('Authorization', 'Bearer admin-token');

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body).toHaveProperty('memory');
      expect(statsResponse.body).toHaveProperty('activeUsers', 3);
      expect(statsResponse.body).toHaveProperty('activeStreams', 1);

      // Verify authentication was called correctly
      expect(jwt.verify).toHaveBeenCalledWith('admin-token', process.env.JWT_SECRET);
      expect(User.findByPk).toHaveBeenCalledWith(1);
    });
  });
});
