const path = require('path');

module.exports = {
    mode: 'development',
    target: 'electron-renderer',
    entry: {
        bundle: './renderer.js', 
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
};