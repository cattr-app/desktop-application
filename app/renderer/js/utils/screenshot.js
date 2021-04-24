const { desktopCapturer } = require('electron');

/**
 * Returns available "display" MediaDevices
 * @return {Promise<Array<MediaDevice>|Error>} Return array of MediaDevice, or error
 */
const getMediaDevices = () => desktopCapturer.getSources({ types: ['screen'] });

/**
 * Captures screen
 * @param  {DOMElement}                  canvas  Canvas element
 * @return {Promise<Array<String>|null>}         Captured screenshots in base64 or null
 */
export default async canvas => {

  // Getting available MediaDevices
  const mediaDevices = await getMediaDevices();

  // Getting MediaStream from all fetched devices
  let userMediaStreams = mediaDevices.map(device => {

    // Fix
    if (device.stream)
      device.stream.stop();

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: device.id,
        },
      },
    });

  });

  // Filter all unsuccessfull media streams
  userMediaStreams = userMediaStreams.filter(stream => typeof stream !== 'undefined');

  // Resolve all MediaStreams inits
  userMediaStreams = await Promise.all(userMediaStreams);

  // Grabbing frams for all MediaStreams
  let userMediaGrabbers = userMediaStreams.map(mediaStream => {

    const mediaStreamTrack = mediaStream.getVideoTracks()[0];
    return new ImageCapture(mediaStreamTrack).grabFrame();

  });

  // Making screenshots
  userMediaGrabbers = await Promise.all(userMediaGrabbers);

  // Closing MediaStreams
  userMediaStreams.forEach(mediaStream => mediaStream.getVideoTracks()[0].stop());

  // Getting canvas size for splitted screenshots
  const canvasSize = userMediaGrabbers

    // Get W&H for each snap
    .map(snap => ([snap.width, snap.height]))

    // Sum them
    .reduce((dimensions, [width, height]) => {

      // Selecting max height over each screen
      if (height > dimensions.height)
        dimensions.height = height; // eslint-disable-line no-param-reassign

      // Summarize width
      dimensions.width += width; // eslint-disable-line no-param-reassign

      return dimensions;

    }, { width: 0, height: 0 });

  // Creating canvas with the same image size
  canvas.width = canvasSize.width; // eslint-disable-line no-param-reassign
  canvas.height = canvasSize.height; // eslint-disable-line no-param-reassign

  // Obtaining BitmapRenderer context
  const ctx = canvas.getContext('2d');

  // Placing snaps as ImageBitmaps on BitmapRenderer context
  let lastSnapEndedX = 0;
  userMediaGrabbers = userMediaGrabbers.forEach(snap => {

    ctx.drawImage(snap, lastSnapEndedX, 0);
    lastSnapEndedX += snap.width;

  });

  // Return rendered canvas as JPEG image with 50% quality in DataURL (base64)
  return canvas.toDataURL('image/jpeg', 0.5);

};
