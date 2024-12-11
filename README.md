Cattr Desktop App  
==========
Electron desktop application for Cattr  

Minimum system requirements to build the app
- MacOS: Monterey 12.3.1  
- Windows: 22H2 10.0.19045, 11.0.22621
- Debian: bullseye+kde 11
- Ubuntu: LTS 22.04
- Alt linux: kworkstation 10
- Astra linux: orel 2.12
- CPU: amd64

### For build to work, you need to have following dependencies:
#### MacOS
You need to install xcode from [official website](https://developer.apple.com/xcode/)

#### Linux (apt based)
```bash
apt-get update
apt-get install -y git build-essential git cmake curl python3
```
##### Installl nodejs 14.19.0  
Easiest way to do so is by using nvm, here is the [official guide on how to install it](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script).  

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

#### Windows
##### Installl nodejs 14.19.0
Easiest way to do so is by using nvm for windows, here is the [official guide on how to install it](https://github.com/coreybutler/nvm-windows?tab=readme-ov-file#install-nvm-windows). 
Now we can use it to install nodejs.  
```bash
nvm install 14.19.0
nvm use 14.19.0
```
Install yarn
```bash
npm install -g yarn
```
##### Install python3
Download and install [from official website.](https://www.python.org/downloads/)  
Don't forget to check `Add python.exe to PATH`, or add it manually later.
##### Install Visual Studio
In order to build successfully of Windows, [download and install Visual Studio](https://visualstudio.microsoft.com/downloads/)

## Launch development version
1. Clone this repository
2. Install dependencies via `yarn`
3. Specify version in `package.json` file, for example `"version": "v1.0.0"`,
4. Run webpack via `yarn build-development` for development version
5. When build completes, run `yarn dev` to launch client in development mode

## Development mode
Development installation uses different keychain service name and application folder path (with "-develop" suffix).

## Build production version
1. Clone this repository
2. Specify version in `package.json` file, for example `"version": "v1.0.0"`,
3. Build application in production mode via `yarn build-production`
4. Build executable for your favourite platform (output directory is `/target`).


How to build executable?
  - **macOS:** `yarn package-mac` will produce signed & notarized DMG
  - **Linux:** `yarn package-linux` will produce Tarball, DPKG and AppImage
  - **Windows:** `yarn package-windows` will produce installer and portable executables

Compatibility sheet:
  - **Host with macOS:** can produce builds only for macOS
  - **Host with Linux:** can produce builds for Linux and Windows (using Wine)
  - **Host with Windows:** can produce builds only for Windows
