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
| macOS | `npm run package-mac` | DMG; signed when signing credentials are available and notarized when notarization credentials are also available |
| Linux | `npm run package-linux` | AppImage, DEB, and tar.gz |
| Windows | `npm run package-windows` | NSIS installer and portable executable |

Artifacts are written to `target/`. macOS packages can only be built on macOS. Linux can also build Windows packages when Wine is installed; Windows builds Windows packages only.

### macOS signing and notarization

Signing is optional. To sign a local build, provide the standard electron-builder code-signing variables:

```dotenv
CSC_LINK=<path, URL, or base64-encoded Developer ID Application .p12>
CSC_KEY_PASSWORD=<p12 password>
```

Notarization is also optional, but Apple requires the application to be signed first. The notarization helper uses App Store Connect API key credentials:

```dotenv
APPLE_API_KEY=/path/to/AuthKey_XXXXXXXXXX.p8
APPLE_API_KEY_ID=XXXXXXXXXX
APPLE_API_ISSUER=issuer-id-uuid
```

The release workflow reads credentials from repository secrets. Configure both signing secrets to enable signing:

- `MACOS_CSC_LINK` — base64-encoded Developer ID Application `.p12` containing the certificate and private key.
- `MACOS_CSC_KEY_PASSWORD` — password protecting the `.p12`.

Configure all three notarization secrets to enable notarization:

- `APPLE_API_KEY_P8` — base64-encoded App Store Connect `.p8` private key.
- `APPLE_API_KEY_ID` — App Store Connect API key ID.
- `APPLE_API_ISSUER` — App Store Connect issuer ID.

If no macOS secrets are configured, the workflow continues to produce an unsigned DMG. If signing secrets are configured, electron-builder signs the application. If notarization secrets are configured as well, the signed application is submitted through `notarytool` and the resulting ticket is stapled before the DMG is created. Partial credential sets fail the release job instead of silently producing a different artifact.

## Releases

Pushing a tag matching `v*` starts `.github/workflows/release.yml`. The workflow uses npm to install dependencies, builds Linux and Windows packages plus a macOS DMG, optionally signs and notarizes the macOS application when the corresponding repository secrets are configured, attests the generated artifacts, uploads them to a draft GitHub release, and publishes the release after every platform build succeeds.

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
