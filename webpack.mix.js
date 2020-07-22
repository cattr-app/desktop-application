const path = require('path');
const mix = require('laravel-mix');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

mix.setPublicPath('./build');
mix.disableSuccessNotifications();
mix.webpackConfig({ target: 'electron-renderer', devtool: 'source-map' });

/* Build JS */
if (mix.inProduction)
  mix.js('./app/renderer/js/app.js', 'app.js').sourceMaps();
else
  mix.js('./app/renderer/js/app.js', 'app.js');

/* Build SASS */
mix
  .sass('./app/renderer/scss/app.scss', 'app.css')
  .options({ processCssUrls: false });

/* Copy static assets & templates */
mix
  .copy('./app/renderer/app.html', path.resolve(__dirname, 'build', 'app.html'))
  .copy('./app/renderer/fonts/**/*', path.resolve(__dirname, 'build', 'fonts'))
  .copy('./app/renderer/screen-notie.html', path.resolve(__dirname, 'build', 'screen-notie.html'))
  .copy(
    './node_modules/element-ui/packages/theme-chalk/lib/fonts/element-icons.woff',
    path.resolve(__dirname, 'build', 'fonts', 'element-icons.woff'),
  );

/* If MAKE_RELEASE flag is set, build renderer in production mode, then submit all the code to Sentry */
if (mix.inProduction && process.env.MAKE_RELEASE) {

  // eslint-disable-next-line global-require
  const packageManifest = require('./package.json');

  mix.webpackConfig({
    plugins: [
      new SentryWebpackPlugin({
        include: 'build',
        ignore: ['mix-manifest.json'],
        configFile: path.resolve(__dirname, '.sentry.renderer'),
        release: `${packageManifest.name}@${packageManifest.version}`,
        setCommits: { auto: true },
      }),
      new SentryWebpackPlugin({
        include: 'app/src',
        urlPrefix: 'app/src/',
        configFile: path.resolve(__dirname, '.sentry.main'),
        release: `${packageManifest.name}@${packageManifest.version}`,
        setCommits: { auto: true },
      }),
    ],
  });

}
