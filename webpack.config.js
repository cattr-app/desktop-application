const CopyPlugin = require('copy-webpack-plugin');
const SymlinkWebpackPlugin = require('symlink-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const mixConfiguration = require('./node_modules/laravel-mix/setup/webpack.config.js');

const mainConfiguration = {

  mode: (process.env.NODE_ENV === 'production') ? 'production' : 'development',
  target: 'electron-main',
  entry: './src/app.js',
  externals: [
    'pg-hstore',
    'vertx',
    nodeExternals()
  ],
  output: {
    path: `${__dirname}/build`,
    publicPath: '',
    filename: 'app.js',
    sourceMapFilename: 'app.js.map'
  },
  devtool: 'source-maps',
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  plugins: [
    new CopyPlugin([
      { from: './assets', to: 'assets' },
      { from: './src/models', to: 'models' },
      { from: './migrations', to: 'migrations' },
      { from: './translations', to: 'translations' },
    ]),
    new SymlinkWebpackPlugin([
      { origin: '../package.json', symlink: 'package.json' }
    ])
  ]

};

module.exports = [ mainConfiguration, mixConfiguration ];
