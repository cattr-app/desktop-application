const merge = require('../libs/merge-img');
const { router } = require('../routes');
const Log = require('./log');
const { UIError } = require('./errors');

const log = new Log('Screenshot');

/* eslint-disable-next-line max-len */
const EMPTY_IMAGE = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJjBGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/wgARCAHgAoADAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAACzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8QAFBABAAAAAAAAAAAAAAAAAAAAwP/aAAgBAQABPwAWB//EABQRAQAAAAAAAAAAAAAAAAAAAMD/2gAIAQIBAT8AFgf/xAAUEQEAAAAAAAAAAAAAAAAAAADA/9oACAEDAQE/ABYH/9k=', 'base64');

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
  .then(() => router.request('misc/capture-screenshot', {}))

  // Handling response
  .then(res => {

    // Handle unsuccessfull response
    if (res.code !== 200) {

      const isBodyEmpty = Object.keys(res.body).length === 0;

      // Log error, but submit to error collecting platform only if body is not empty
      log.error(`ESCR501-${res.code}`, `Error in response from screenshot capture request: ${JSON.stringify(res.body)}`, isBodyEmpty);
      throw new UIError(res.code, `Error during screenshot capture request: ${res.body}`, `ESCR501-${res.code}`);

    }

    // Checking amount of screenshots
    if (res.body.screenshots.length === 0) {

      log.error('ESCR502', 'Screenshot capture response doesn\'t contain any screenshots', true);
      throw new UIError(500, 'No screenshots was captured', 'ESCR502');

    }

    // Decode screenshots
    const screenshots = res.body.screenshots.map(screenshot => {

      // Checking dataURL header
      if (screenshot.substring(0, 23) !== 'data:image/jpeg;base64,') {

        log.error('ESCR503', 'Incorrect screenshot data URL signature received');
        throw new UIError(500, 'Fetched screenshot with incorrect signature', 'ESCR503');

      }

      // Remove Data URL header and create buffer
      return Buffer.from(screenshot.substring(23, screenshot.length), 'base64');

    });

    return screenshots;

  })

  // Handle output
  .then(async screenshots => {

    // Check for possible issues
    if (screenshots.length === 0)
      return false;

    // Simply return one screenshot if there is only a single monitor
    if (screenshots.length === 1)
      return screenshots[0];

    // Merge screenshots if there are multiple screens
    const mergedImage = await merge(screenshots);

    // There is strange issue with merge-img or Jimp, so getBufferAsync function is not defined on the merged screenshot
    // util.promisify also doing some strange stuff with "this" context and cause an error with width oarameter
    return new Promise((resolve, reject) => {

      mergedImage.getBuffer('image/jpeg', (error, img) => {

        // Throw error
        if (error)
          return reject(error);

        // Return content
        return resolve(img);

      });

    });

  });

/**
 * Screenshot capturing function
 */
module.exports.makeScreenshot = (process.env.AT_MOCK_SCR === 'yes') ? makeScreenshotMockup : makeScreenshot;
