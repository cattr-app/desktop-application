# Cattr Desktop App

Cross-platform Electron desktop client for [Cattr](https://cattr.app/). The application uses Electron 14, Vue 2, Webpack 5, SQLite/Sequelize, and electron-builder.

## Build requirements

- x64 macOS, Windows, or Linux
- Node.js `14.21.x`
- npm `9.9.4`
- Python 3.10 and a native C/C++ toolchain for native Node modules
- Git

The current Node.js and Electron versions are compatibility constraints of the existing native dependency stack. Do not assume that a newer host Node.js version is a drop-in replacement.

### Platform prerequisites

#### macOS

Install Xcode from the [Apple Developer website](https://developer.apple.com/xcode/). A signed and notarized package also requires an Apple signing identity and App Store Connect API credentials.

#### Debian/Ubuntu and other apt-based distributions

```bash
sudo apt-get update
sudo apt-get install -y git cmake curl python3 build-essential pkg-config \
  libsecret-1-0 libsecret-1-dev ca-certificates openssh-client dpkg-dev dpkg-sig
```

#### Windows

Install Python 3.10 and Visual Studio 2022 Build Tools with the **Desktop development with C++** workload. Docker is not required for a native Windows build.

### Node.js and npm

Use a version manager such as [nvm](https://github.com/nvm-sh/nvm) or its equivalent to install Node.js `14.21.x`, then install the npm version pinned by this repository:

```bash
npm install --global npm@9.9.4
node --version
npm --version
```

Expected versions are Node.js `v14.21.x` and npm `9.9.4`.

## Development

Install the exact dependency versions from `package-lock.json`:

```bash
npm ci
```

Build the renderer, then start Electron:

```bash
npm run build-development
npm run dev
```

On Windows, use `npm run dev-win` for the second command. The renderer must be built at least once because Electron loads `build/app.html`.

Development mode uses a separate keychain service and application data directory with a `-develop` suffix. Useful variants are:

| Command | Purpose |
| --- | --- |
| `npm run build-watch` | Rebuild the renderer when source files change |
| `npm run dev-vue` | Start development mode with Vue DevTools support enabled |
| `npm run no-scr` | Start without real screenshots |
| `npm run dev-no-scr` | Start development mode without real screenshots |
| `npm run dev-no-scr-no-devtools` | Start development mode without screenshots or DevTools |
| `npm run clean-development` | Remove development-mode application data |
| `npm run lint` | Run ESLint for the project |

## Production builds

Install dependencies, set the application version without creating a Git tag, and build the renderer:

```bash
npm ci
npm --no-git-tag-version version 1.0.0
npm run build-production
```

Package for the current target platform:

| Host | Command | Output |
| --- | --- | --- |
| macOS | `npm run package-mac` | Signed and notarized DMG when signing credentials are configured |
| macOS | `npm run package-mac-unsigned` | DMG without notarization |
| Linux | `npm run package-linux` | AppImage, DEB, and tar.gz |
| Windows | `npm run package-windows` | NSIS installer and portable executable |

Artifacts are written to `target/`. macOS packages can only be built on macOS. Linux can also build Windows packages when Wine is installed; Windows builds Windows packages only.

### macOS notarization

Copy `.env.example` to `.env` and provide the App Store Connect values before running `npm run package-mac`:

```dotenv
APPLE_API_KEY=1234XXXXZZ
APPLE_API_ISSUER=issuer-id-uuid-should-be-here
```

## Releases

Pushing a tag matching `v*` starts `.github/workflows/release.yml`. The workflow uses npm to install dependencies, builds Linux, Windows, and unsigned macOS packages, attests the generated artifacts, uploads them to a draft GitHub release, and publishes the release after every platform build succeeds.

## Project layout

- `app/src/` — Electron main process, local database, tracking, OS integration, and IPC routes
- `app/renderer/` — Vue renderer application, styles, templates, and fonts
- `webpack.config.js` — renderer build configuration
- `electron-builder.json` — platform packaging configuration
- `tools/` — packaging and maintenance helpers
- `build/` — generated renderer bundle
- `target/` — generated installers and archives

## License

[Server Side Public License 1.0](LICENSE)
