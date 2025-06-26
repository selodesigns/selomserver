const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const { logger } = require('../utils/Logger');

// Storage for all models
const models = {};

// Read all model files and import them
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== 'index.js' &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize);
    models[model.name] = model;
    logger.debug(`Loaded model: ${model.name}`);
  });

// Set up model associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
    logger.debug(`Set up associations for model: ${modelName}`);
  }
});

// Export models and sequelize instance
module.exports = {
  ...models,
  sequelize
};
