const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-renderer',
  entry: {
    // Entry key 'bundle' will produce 'build/bundle.js'
    bundle: ['./bridgeConnector.js', './renderer.js'],
  },
  output: {
    filename: '[name].js', // Output will be build/bundle.js
    path: path.resolve(__dirname, 'build'),
    clean: true,
    publicPath: './'
  },
  resolve: {
    extensions: ['.js', '.json'],
    fallback: {
      "path": false,
      "fs": false
    }
  },
  externals: {
    'electron': 'commonjs electron',
    '@electron/remote': 'commonjs @electron/remote',
    // MobX is NOT externalized and will be part of the bundle
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
  },
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  node: {
    __dirname: false,
    __filename: false
  }
};
