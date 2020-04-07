const fs = require('fs');
const path = require('path');
const Log = require('./log');

const log = new Log('TranslationsLoader');

const resources = {};
const languages = {};

// Load translation files, then parse them
fs

  // Read directory with translations
  .readdirSync(path.resolve(__dirname, '..', 'translations'))

  // Filter only JSON files
  .filter(f => ((f.indexOf('.') !== 0) && (f.slice(-5) === '.json')))

  // Parse those files
  .forEach(tFileName => {

    // Keeping main execution process in safe
    try {

      // Read translation file
      let tFileContent = fs.readFileSync(path.resolve(__dirname, '..', 'translations', tFileName), 'utf-8');

      // Parse it
      tFileContent = JSON.parse(tFileContent);

      // Check structure
      if (typeof tFileContent.lang !== 'string')
        throw new Error('Translation file does not contain language reference');
      if (typeof tFileContent.title !== 'string')
        throw new Error('Translation file does not contain full language name');
      if (typeof tFileContent.translation !== 'object')
        throw new Error('Translation file does not contain translations');

      // Check for duplicating language entries
      if (typeof resources[tFileContent.lang] !== 'undefined')
        throw new Error(`Duplicating dictionary for language: ${tFileContent.lang}`);

      // Push dictionary into buffers
      resources[tFileContent.lang] = {};
      resources[tFileContent.lang].translation = { ...tFileContent.translation };

      // Update supported languages map
      languages[tFileContent.title] = tFileContent.lang;

    } catch (error) {

      // Simply log the error
      log.error('Error occured translation file parsing', error);

    }

  });

// Check amount of available translations
if (Object.keys(resources).length === 0) {

  // Log issue
  log.error('TRS00', 'No translations available');

  // Stop execution
  throw new Error('No translation available');

}

module.exports = { resources, languages };
