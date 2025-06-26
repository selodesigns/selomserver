const { sequelize, User } = require('../models');
const { logger } = require('../utils/Logger');

async function checkUsers() {
  try {
    // Check all users in database
    const users = await User.findAll();
    
    logger.info(`Found ${users.length} users in database`);
    
    // Log each user (except password)
    users.forEach(user => {
      logger.info(`User #${user.id}: ${user.username} (${user.email}) - Admin: ${user.is_admin}`);
      logger.info(`Fields: ${Object.keys(user.toJSON()).join(', ')}`);
    });
    
  } catch (error) {
    logger.info(`Error checking users: ${error.message}`);
  } finally {
    await sequelize.close();
  }
}

// Execute the function
checkUsers();
