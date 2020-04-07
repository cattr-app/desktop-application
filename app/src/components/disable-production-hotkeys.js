/**
 * Disables Chrome hotkeys in production
 */
const hotkey = require('electron-hotkey');

hotkey.register('local', 'CommandOrControl+r', 'reload');
hotkey.register('local', 'CommandOrControl+Shift+r', 'full-reload');
hotkey.register('local', 'CommandOrControl+Shift+i', 'browser-menu');
