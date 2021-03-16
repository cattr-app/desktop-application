const { router } = require('../routes');
const Log = require('./log');
const { UIError } = require('./errors');
const EMPTY_IMAGE = require('../constants/empty-screenshot');

const log = new Log('Screenshot');

/**
 * Mockup for screenshot capture function
 * @returns {Buffer} White pseudo-screenshot
 */
const makeScreenshotMockup = () => new Promise(resolve => {

  if (process.env.AT_MOCK_SCR_DELAY !== 'yes') {

    resolve(EMPTY_IMAGE);
    return;

  }

  const delay = (Math.random() * Math.random() * 5000);
  log.debug(`Delaying capture for ${Math.round(delay)}ms`);
  setTimeout(() => resolve(EMPTY_IMAGE), delay);

});

/**
 * Makes screenshot
 * @async
 * @returns {Promise<Buffer>} Captured screenshot
 */
const makeScreenshot = () => Promise.resolve()

  // Requesting screenshots
  .then(async () => {

    const timeStart = Date.now();
    const res = await router.request('misc/capture-screenshot', {});

    // Unsuccessful capture status
    if (res.code !== 200) {

      log.error(`ESCR501-${res.code}`, `Error in response from screenshot capture request: ${JSON.stringify(res.body)}`, true);
      throw new UIError(res.code, `Error during screenshot capture request: ${res.body}`, `ESCR501-${res.code}`);

    }

    // Capture request doesn't contain any screenshots
    if (!res.body.screenshot)
      throw new UIError(500, 'No screenshots were captured', 'ESCR502');

    // Checking screenshot header
    if (res.body.screenshot.indexOf('data:image/jpeg;base64,') !== 0) {

      log.error('ESCR503', 'Incorrect screenshot data URL signature received');
      throw new UIError(500, 'Fetched screenshot with incorrect signature', 'ESCR503');

    }

    // Remove Data URL header and create buffer
    const screenshot = Buffer.from(res.body.screenshot.substring(23), 'base64');

    log.debug(`Captured in ${(Date.now() - timeStart)}ms`);
    return screenshot;

  });

/**
 * Screenshot capturing function
 */
module.exports.makeScreenshot = (process.env.AT_MOCK_SCR === 'yes') ? makeScreenshotMockup : makeScreenshot;
