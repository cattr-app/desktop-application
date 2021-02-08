/* eslint-disable import/prefer-default-export */

/**
 * Adding a leading zero
 * @param  {Number} number Input number
 * @return {String}        String with lead zero if neccessary
 */
const leftpad = number => ((number >= 10) ? String(number) : `0${number}`);

/**
 * Converts amount of seconds into HH:mm:ss format
 * @param   {Number}  seconds  Amount of seconds
 * @returns {String}           Formatted amount of seconds
 */
export function formatSeconds(seconds) {

  // Parse input argument and perform type-safety checks
  let secs = Number(seconds);
  if (Number.isNaN(secs))
    throw new TypeError('Incorrect seconds amount');
  else if (secs < 0)
    throw new TypeError('Expect positive number of seconds, but negative is given');
  else if (secs === 0)
    return '00:00:00';

  // Getting amount of hours
  const hours = Math.floor(secs / 3600);
  secs %= 3600;

  // Getting amount of seconds
  const minutes = Math.floor(secs / 60);
  secs %= 60;

  return `${leftpad(hours)}:${leftpad(minutes)}:${leftpad(secs)}`;

}

/**
 * Splits seconds into hours-minutes-seconds
 * @param {Number} seconds
 * @returns {Object}
 */
export function splitSecondsIntoHMS(seconds) {

  let secs = Number(seconds);

  // Getting amount of hours
  const hours = Math.floor(secs / 3600);
  secs %= 3600;

  // Getting amount of seconds
  const minutes = Math.floor(secs / 60);
  secs %= 60;

  return { hours, minutes, seconds: secs };

}
