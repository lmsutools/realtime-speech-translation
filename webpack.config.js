const path = require('path');
module.exports = {
  mode: 'development',
  target: 'electron-renderer',
  entry: './renderer.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
