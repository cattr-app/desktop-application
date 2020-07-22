const crypto = require('crypto');

/**
 * Generates a random integer on defined interval
 * @param   {Number}  min  Minimal value of the range
 * @param   {Number}  max  Maximal value of the range
 * @returns {Number}       Random numbers on range [min; max)
 */
module.exports = async (min, max) => {

  // Basic checks for input parameters
  if (typeof min !== 'number')
    throw new TypeError('Range minimum parameter must be a number');
  if (typeof max !== 'number')
    throw new TypeError('Range maximum parameter must be a number');
  if (min < 0)
    throw new Error('Range minimum must be a positive number');

  // Max value for uint32
  if (max > 4294967295)
    throw new Error('Range maximum cannot be greater than 4294967295');

  // Getting four random bytes
  let randomNumber = await crypto.randomBytes(4);

  // Convert Array<Buffer> into string contains HEX value
  randomNumber = randomNumber.reduce((acc, current) => acc + current.toString(16));

  // Parse HEX string as Number, then convert to values in range from 0 to 1
  randomNumber = parseInt(randomNumber, 16) / 10000000000;

  // Perform all the mathematical magic
  return Math.floor((randomNumber * (max - min)) + min);

};
