const fs = require('fs');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');
const autoprefixer = require('autoprefixer');

const projectRoot = __dirname;
const outputPath = path.resolve(projectRoot, 'build');
const isProduction = process.env.NODE_ENV === 'production';
const postCssLoader = {
  loader: 'postcss-loader',
  options: {
    postcssOptions: {
      plugins: [autoprefixer()],
    },
  },
};

class CopyStaticAssetsPlugin {

  // Webpack calls plugin hooks with the compiler instance; no class state is required.
  // eslint-disable-next-line class-methods-use-this
  apply(compiler) {

    compiler.hooks.afterEmit.tap('CopyStaticAssetsPlugin', () => {

      const copyFile = (source, destination) => {

        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);

      };

      const copyDirectory = (source, destination) => {

        fs.mkdirSync(destination, { recursive: true });

        fs.readdirSync(source, { withFileTypes: true }).forEach(entry => {

          const sourceEntry = path.join(source, entry.name);
          const destinationEntry = path.join(destination, entry.name);

          if (entry.isDirectory())
            copyDirectory(sourceEntry, destinationEntry);
          else
            copyFile(sourceEntry, destinationEntry);

        });

      };

      copyFile(
        path.resolve(projectRoot, 'app/renderer/app.html'),
        path.resolve(outputPath, 'app.html'),
      );
      copyFile(
        path.resolve(projectRoot, 'app/renderer/screen-notie.html'),
        path.resolve(outputPath, 'screen-notie.html'),
      );
      copyDirectory(
        path.resolve(projectRoot, 'app/renderer/fonts'),
        path.resolve(outputPath, 'fonts'),
      );
      copyFile(
        path.resolve(projectRoot, 'node_modules/element-ui/packages/theme-chalk/lib/fonts/element-icons.woff'),
        path.resolve(outputPath, 'fonts/element-icons.woff'),
      );

    });

  }

}

const plugins = [
  new VueLoaderPlugin(),
  new MiniCssExtractPlugin({ filename: 'app.css' }),
  new CopyStaticAssetsPlugin(),
];

if (isProduction && process.env.MAKE_RELEASE) {

  // eslint-disable-next-line global-require
  const packageManifest = require('./package.json');

  // eslint-disable-next-line global-require
  const sentryConfiguration = require('./.sentry.json');

  plugins.push(
    new SentryWebpackPlugin({
      include: 'build',
      urlPrefix: 'build/',
      ignore: ['app.css.map'],
      configFile: '.sentry.renderer',
      release: `${packageManifest.name}@${packageManifest.version}`,
      setCommits: { auto: true },
      url: sentryConfiguration.url,
      org: sentryConfiguration.org,
      project: sentryConfiguration.frontend.project,
    }),
    new SentryWebpackPlugin({
      include: 'app/src',
      urlPrefix: 'app/src/',
      configFile: '.sentry.main',
      release: `${packageManifest.name}@${packageManifest.version}`,
      setCommits: { auto: true },
      url: sentryConfiguration.url,
      org: sentryConfiguration.org,
      project: sentryConfiguration.backend.project,
    }),
  );

}

module.exports = {
  mode: isProduction ? 'production' : 'development',
  target: 'electron-renderer',
  devtool: 'source-map',
  entry: {
    app: [
      './app/renderer/js/app.js',
      './app/renderer/scss/app.scss',
    ],
  },
  output: {
    path: outputPath,
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      vue$: 'vue/dist/vue.esm.js',
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { electron: '14' } }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: { url: false },
          },
          postCssLoader,
        ],
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: { url: false },
          },
          postCssLoader,
          'sass-loader',
        ],
      },
    ],
  },
  // vue-loader 15 imports a default value from every style block, although
  // non-module styles are side-effect-only and deliberately export nothing.
  // Keep this narrowly scoped to that known Webpack 5 compatibility warning.
  ignoreWarnings: [
    /export 'default' \(imported as 'style\d+'\) was not found in '.+\.vue\?vue&type=style/,
  ],
  plugins,
};
