const mix = require('laravel-mix');

mix.setPublicPath('build/');
mix.disableSuccessNotifications();
mix.webpackConfig({ target: 'electron-renderer' });

// Build sourcemaps only in production mode
if (mix.inProduction)
  mix.js('./renderer/js/app.js', `${__dirname}/build/renderer/app.js`).sourceMaps();
else
  mix.js('./renderer/js/app.js', `${__dirname}/build/renderer/app.js`);

mix
  .copy('./renderer/app.html', `${__dirname}/build/renderer/app.html`)
  .copy('./node_modules/element-ui/packages/theme-chalk/lib/fonts/element-icons.woff', `${__dirname}/build/renderer/fonts/element-icons.woff`)
  .copy('./renderer/fonts/**/*', `${__dirname}/build/renderer/fonts`)
  .copy('./renderer/assets/**/*', `${__dirname}/build/renderer/assets`)
  .copy('./renderer/screen-notie.html', `${__dirname}/build/renderer/screen-notie.html`);

mix.sass('./renderer/scss/app.scss', `${__dirname}/build/renderer/app.css`).options({ processCssUrls: false });
