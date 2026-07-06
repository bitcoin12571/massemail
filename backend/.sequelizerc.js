const path = require('path');

module.exports = {
  'config': path.resolve(__dirname, './config/config.json'),
  'migrations-path': path.resolve(__dirname, './src/migrations'),
  'seeders-path': path.resolve(__dirname, './src/seeders')
};
