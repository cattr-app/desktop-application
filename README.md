Cattr Desktop App
==========
Electron desktop application for Cattr

For build to work, you need to have following dependencies:
#### Linux (apt based)
```bash
apt-get update
apt-get install -y build-essential git cmake curl python3
```
##### Installl nodejs 14.19.0  
Easiest way to do so is by using nvm, here is the [official guid on how to install it](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script).  

Now we can use it to install nodejs.  
```bash
nvm install 14.19.0
nvm use 14.19.0
```
Install yarn
```bash
npm install -g yarn
```

You can verify the installation like so:
```bash
node -v # v14.19.0
yarn -v # 3.2.1
```


## Launch development version
1. Clone this repository
2. Install dependencies via `yarn`
3. Specify version in `package.json` file, for exaple `"version": "v1.0.0"`,
4. Run webpack via `yarn build-development` for development verion
5. When build completes, run `yarn dev` to launch client in development mode

## Development mode
Development installation uses different keychain service name and application folder path (with "-develop" suffix).

## Build production version
1. Clone this repository
2. Specify version in `package.json` file, for example `"version": "v1.0.0"`,
3. Build application in production mode via `yarn build-production`
4. Build executable for your favourite platform (output directory is /target).


How to build executable?
  - **macOS:** `yarn package-mac` will produce signed & notarized DMG
  - **Linux:** `yarn package-linux` will produce Tarball, DPKG and AppImage
  - **Windows:** `yarn package-windows` will produce installer and portable executables

Compatibility sheet:
  - **Host with macOS:** can produce builds only for macOS
  - **Host with Linux:** can produce builds for Linux and Windows (using Wine)
  - **Host with Windows:** can produce builds only for Windows
