const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

const read = (filename = '') => {
  const path = join(__dirname, 'files', filename);

  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8'));
  }
  
  throw Error('File does not exist');
};

module.exports = {
  read,
};
