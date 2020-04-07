// In the renderer process.
const { desktopCapturer, remote } = require('electron');

const { screen } = remote;

/**
 * Returns available "display" MediaDevices
 * @return {Promise<Array<MediaDevice>|Error>} Return array of MediaDevice, or error
 */
const getMediaDevices = () => desktopCapturer.getSources({ types: [ 'screen' ] });

/**
 * Captures screen
 * @param  {DOMElement}                  canvas  Canvas element
 * @return {Promise<Array<String>|null>}         Captured screenshots in base64 or null
 */
export default async canvas => {

  // Getting available MediaDevices
  const mediaDevices = await getMediaDevices();

  // Calculate boundaries
  const screens = screen.getAllDisplays();
  const bounds = screens.reduce((bnds, scr) => ({
    width: bnds.width + scr.bounds.width,
    height: bnds.height + scr.bounds.height,
  }), { width: 0, height: 0 });

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
          minWidth: bounds.width,
          minHeight: bounds.height,
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

  // Converting ImageBitmap
  userMediaGrabbers = userMediaGrabbers.map(snap => {

    // Creating canvas with the same image size
    canvas.width = snap.width; // eslint-disable-line no-param-reassign
    canvas.height = snap.height; // eslint-disable-line no-param-reassign

    // Placing ImageBitmap on this canvas using bitmaprenderer context
    canvas.getContext('2d').drawImage(snap, 0, 0);

    // Rendering canvas to JPEG image with 50% quality in DataURL (base64)
    return canvas.toDataURL('image/jpeg', 0.5);

  });

  // Return screenshots array
  return userMediaGrabbers;

};
