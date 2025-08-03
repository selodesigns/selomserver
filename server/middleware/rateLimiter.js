/**
 * Rate Limiting Middleware
 * Implements various rate limiting strategies for API endpoints
 */

const { logger } = require('../utils/Logger');

/**
 * In-memory store for rate limiting
 * In production, consider using Redis for distributed rate limiting
 */
class MemoryStore {
  constructor() {
    this.store = new Map();
    this.resetInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get current count for a key
   */
  get(key) {
    const record = this.store.get(key);
    if (!record) return { count: 0, resetTime: Date.now() + 60000 };
    
    // Reset if window has passed
    if (Date.now() > record.resetTime) {
      this.store.delete(key);
      return { count: 0, resetTime: Date.now() + 60000 };
    }
    
    return record;
  }

  /**
   * Increment count for a key
   */
  increment(key, windowMs = 60000) {
    const record = this.get(key);
    const newCount = record.count + 1;
    const resetTime = record.count === 0 ? Date.now() + windowMs : record.resetTime;
    
    this.store.set(key, {
      count: newCount,
      resetTime: resetTime,
      firstRequest: record.count === 0 ? Date.now() : record.firstRequest
    });
    
    return { count: newCount, resetTime };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear() {
    this.store.clear();
  }
}

// Global store instance
const store = new MemoryStore();

/**
 * Create a rate limiter middleware
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    statusCode = 429,
    headers = true,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
    skip = () => false,
    onLimitReached = null
  } = options;

  return async (req, res, next) => {
    try {
      // Skip if condition is met
      if (skip(req, res)) {
        return next();
      }

      const key = keyGenerator(req);
      const record = store.increment(key, windowMs);
      
      // Add rate limit headers
      if (headers) {
        res.set({
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': Math.max(0, max - record.count),
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
        });
      }

      // Check if limit exceeded
      if (record.count > max) {
        // Log rate limit violation
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          count: record.count,
          limit: max
        });

        // Call onLimitReached callback if provided
        if (onLimitReached) {
          onLimitReached(req, res, options);
        }

        return res.status(statusCode).json({
          success: false,
          message: message,
          retryAfter: Math.ceil((record.resetTime - Date.now()) / 1000)
        });
      }

      // Skip counting for certain requests
      const shouldSkip = (
        (skipSuccessfulRequests && res.statusCode < 400) ||
        (skipFailedRequests && res.statusCode >= 400)
      );

      if (!shouldSkip) {
        // Continue to next middleware
        next();
      } else {
        // Decrement count for skipped requests
        const currentRecord = store.get(key);
        if (currentRecord.count > 0) {
          store.store.set(key, {
            ...currentRecord,
            count: currentRecord.count - 1
          });
        }
        next();
      }
    } catch (error) {
      logger.error('Rate limiter error', { error: error.message });
      next(); // Continue on error to avoid blocking requests
    }
  };
}

/**
 * Predefined rate limiters for different use cases
 */

// General API rate limiter
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many API requests, please try again later.'
});

// Strict rate limiter for authentication endpoints
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req) => {
  try {
    if (!req || !req.ip) return 'auth:unknown';
    return `auth:${req.ip}`;
  } catch (e) {
    return 'auth:unknown';
  }
},
  onLimitReached: (req, res, options) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
  }
});

// Media streaming rate limiter
const streamLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 stream requests per minute
  message: 'Too many streaming requests, please try again later.',
  keyGenerator: (req) => {
  try {
    if (!req || !req.ip) return 'stream:unknown';
    return `stream:${req.ip}`;
  } catch (e) {
    return 'stream:unknown';
  }
},
  skipSuccessfulRequests: false
});

// Search rate limiter
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  message: 'Too many search requests, please try again later.',
  keyGenerator: (req) => {
  try {
    if (!req || !req.ip) return 'search:unknown';
    return `search:${req.ip}`;
  } catch (e) {
    return 'search:unknown';
  }
}
});

// Admin endpoints rate limiter
const adminLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin requests per 5 minutes
  message: 'Too many admin requests, please try again later.',
  keyGenerator: (req) => {
  try {
    if (!req) return 'admin:unknown';
    if (req.user && req.user.id) return `admin:${req.user.id}`;
    if (req.ip) return `admin:${req.ip}`;
    return 'admin:unknown';
  } catch (e) {
    return 'admin:unknown';
  }
}
});

// Upload rate limiter
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many upload requests, please try again later.',
  keyGenerator: (req) => {
  try {
    if (!req) return 'upload:unknown';
    if (req.user && req.user.id) return `upload:${req.user.id}`;
    if (req.ip) return `upload:${req.ip}`;
    return 'upload:unknown';
  } catch (e) {
    return 'upload:unknown';
  }
}
});

/**
 * Rate limiter for specific users (requires authentication)
 */
const createUserRateLimiter = (options = {}) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      if (req.user) {
        return `user:${req.user.id}:${options.prefix || 'general'}`;
      }
      return `ip:${req.ip}:${options.prefix || 'general'}`;
    }
  });
};

/**
 * Progressive rate limiter that increases restrictions based on violations
 */
const createProgressiveRateLimiter = (options = {}) => {
  const violations = new Map();
  
  return createRateLimiter({
    ...options,
    max: (req) => {
      const key = options.keyGenerator ? options.keyGenerator(req) : req.ip;
      const violationCount = violations.get(key) || 0;
      
      // Reduce max requests based on violation history
      const baseMax = options.max || 100;
      const reduction = Math.min(violationCount * 10, baseMax * 0.8);
      return Math.max(baseMax - reduction, baseMax * 0.2);
    },
    onLimitReached: (req, res, opts) => {
      const key = options.keyGenerator ? options.keyGenerator(req) : req.ip;
      violations.set(key, (violations.get(key) || 0) + 1);
      
      if (options.onLimitReached) {
        options.onLimitReached(req, res, opts);
      }
    }
  });
};

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  streamLimiter,
  searchLimiter,
  adminLimiter,
  uploadLimiter,
  createUserRateLimiter,
  createProgressiveRateLimiter,
  store // Export for testing
};
