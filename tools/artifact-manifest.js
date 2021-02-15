const fs = require('fs');
const path = require('path');
const debug = require('debug');

debug.enable('cattr:artifact-manifest');
const log = debug('cattr:artifact-manifest');

module.exports = () => {

  /**
   * Manifest structure
   * @type {Object}
   */
  const manifest = {
    platform: null,
    version: null,
    artifacts: [],
  };

  // Read contents of the package.json file
  const packageFile = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));

  // Copy release version
  manifest.version = packageFile.version;

  // Get artifacts list
  const artifacts = fs

    // Enumerate files in target/ directory
    .readdirSync(path.resolve(__dirname, '..', 'target'))

    // Filter only artifacts containing package version
    .filter(el => el.toLowerCase().includes(manifest.version));

  // Convert platform naming
  switch (process.platform) {

    case 'win32':
      manifest.platform = 'windows';
      break;

    case 'darwin':
      manifest.platform = 'mac';
      break;

    case 'linux':
      manifest.platform = 'linux';
      break;

    default:
      log('unsupported architecture: %s', process.platform);
      return;

  }

  // Iterate over artifacts, push matching into manifest
  artifacts.forEach(file => {

    const artifact = {
      format: null,
      formatHuman: null,
      link: null,
    };

    // Artifact file extension (like .exe)
    const artifactExtension = path.extname(file.toLowerCase());

    // Collect macOS artifacts
    if (process.platform === 'darwin') {

      // DMG distribution
      if (artifactExtension === '.dmg') {

        artifact.format = 'dmg';
        artifact.formatHuman = 'DMG Package';

      }

    }

    // Collect Windows artifacts
    if (process.platform === 'win32') {

      // MSI installer
      if (artifactExtension === '.msi') {

        artifact.format = 'msi';
        artifact.formatHuman = 'MSI Installer';

      }

      // Executable
      if (artifactExtension === '.exe') {

        if (file.indexOf('Setup') > -1) {

          // NSIS installer
          artifact.format = 'nsis';
          artifact.formatHuman = 'Installer';

        } else {

          // Portable
          artifact.format = 'exe';
          artifact.formatHuman = 'Portable';

        }

      }

    }

    // Collect Linux artifacts
    if (process.platform === 'linux') {

      if (artifactExtension === '.appimage') {

        artifact.format = 'appimage';
        artifact.formatHuman = 'AppImage';

      }

      if (artifactExtension === '.deb') {

        artifact.format = 'deb';
        artifact.formatHuman = 'Deb Package';
        artifact.link = `https://dl.cattr.app/packages/deb/amd64/${file}`;

      }

      if (artifactExtension === '.gz' && file.toLowerCase().includes('.tar.gz')) {

        artifact.format = 'tgz';
        artifact.formatHuman = 'Tarball';

      }

    }

    // Push artifact into manifest
    if (artifact.format !== null && artifact.formatHuman !== null) {

      log('found %s artifact at %s', artifact.format, file);
      if (!artifact.link)
        artifact.link = `https://dl.cattr.app/desktop/${manifest.version}/${file}`;
      manifest.artifacts.push(artifact);

    }

  });

  // Build path to manifest folder
  const manifestDir = path.resolve(__dirname, '..', 'target', 'manifests');

  // Create a manifest directory if it is not exists
  if (!fs.existsSync(manifestDir))
    fs.mkdirSync(manifestDir);

  // Do nothing if there are no matching artifacts are found
  if (manifest.artifacts.length === 0) {

    log('no artifacts found, do not saving manifest');
    return;

  }

  // Saving manifest
  fs.writeFileSync(path.resolve(manifestDir, `release-${manifest.platform}.json`), JSON.stringify(manifest), 'utf8');
  log('manifest successfully saved to %s', path.resolve(manifestDir, `release-${manifest.platform}.json`));

};
