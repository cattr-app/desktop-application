const path = require('path');
const mix = require('laravel-mix');

mix.setPublicPath('./build');
mix.disableSuccessNotifications();
mix.webpackConfig({ target: 'electron-renderer' });

/* Build JS */
if (mix.inProduction)
  mix.js('./app/renderer/js/app.js', 'app.js').sourceMaps();
else
  mix.js('./app/renderer/js/app.js', 'app.js');

/* Build Sass */
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
