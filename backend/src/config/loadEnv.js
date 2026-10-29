const path = require('node:path');
const dotenv = require('dotenv');

module.exports = (directory = path.resolve(__dirname, '../..')) => {
  // Environment variables take priority, followed by private local settings.
  dotenv.config({ path: path.join(directory, '.env.local') });
  dotenv.config({ path: path.join(directory, '.env') });
};
