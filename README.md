Cattr Desktop App
==========

Electron desktop application for Cattr

**This is open experimental version, which is not intended to be used in production**

## Installation
1. Clone this repository
2. Install dependencies via `npm install`
3. Run webpack via `npm run build-watch` (or `npm run build-development` if you don't want to watch files for changes)
4. When build completes, run `npm run dev` to launch client in development mode

## Development mode
There are two major differences between development and production modes:
1. Automatical error reporting disabled in development mode.
2. Development installation uses different keychain service name and application folder path (with "-develop" suffix).

**TL;DR:** Use only dev mode during development and do not launch two instances in production mode simultaneously.

** For VS Code users: **
You can use VS Code debugger with the config within this project

## Build
1. Ensure that all necessary dependencies are installed
2. Ensure that `package.json` and `src/base/config.js` contains right configuration
3. Build application in production mode via `npm run build-production`
4. Build executable for your favourite platform (output directory is /target).

How to build executable?
  - **macOS:** `npm run package-mac` will produce .dmg archive with application
  - **Linux:** `npm run package-linux` will produce .AppImage file
  - **Windows:** `npm run package-windows` will produce .exe file

Compatibility sheet:
  - **Host with macOS:** can produce builds only for macOS
  - **Host with Linux:** can produce builds for Linux and Windows (using Wine)
  - **Host with Windows:** can produce builds only for Windows
