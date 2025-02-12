const path = require('path');

module.exports = {
    mode: 'development',
    target: 'electron-renderer',
    entry: {
        bundle: './renderer.js', // Main entry point
        settings: './modules/settings/mainSettings.js' // Settings entry point
    },
    output: {
        filename: '[name].js', // Output: bundle.js, settings.js
        path: path.resolve(__dirname, 'dist'),
    },
};
