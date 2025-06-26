const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');
const { logger } = require('../utils/Logger');

async function createAdminUser() {
  try {
    // Admin user credentials - change these as needed
    const adminUser = {
      username: 'admin',
      email: 'admin@selomserver.com',
      password: 'admin123', // This is only for testing, should be changed in production
      display_name: 'System Administrator',
      is_admin: true,
      is_active: true
    };

    // Check if the admin user already exists
    const existingUser = await User.findOne({
      where: {
        username: adminUser.username
      }
    });

    if (existingUser) {
      logger.info(`Admin user "${adminUser.username}" already exists`);
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);

    // Create the admin user
    const user = await User.create({
      username: adminUser.username,
      email: adminUser.email,
      password_hash: hashedPassword, // Use the correct field name from User model
      display_name: adminUser.display_name,
      is_admin: adminUser.is_admin,
      is_active: adminUser.is_active
    });

    logger.info(`Admin user "${user.username}" created successfully`);
  } catch (error) {
    logger.error(`Error creating admin user: ${error.message}`);
  } finally {
    await sequelize.close();
  }
}

// Execute the function
createAdminUser();
