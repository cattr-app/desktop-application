/**
 * Bunch of useful time tools
 */

/**
 * Returns today midnight as Date or ISO 8601 string
 * @param  {Boolean}      [formatted=false]  Should we return date as ISO 8601 string?
 * @return {String|Date}                     Date object or ISO-formatted string
 */
module.exports.todayMidnight = (formatted = false) => {

  // Get current date
  const now = new Date();

  // Set time to midnight
  now.setHours(0, 0, 0, 0);

  // Return as Date or ISO string
  return formatted ? now.toISOString() : now;

};


/**
 * Returns end of today as Date or ISO 8601 String
 * @param  {Boolean}      [formatted=false]  Should we return date as ISO 8601 string?
 * @return {String|Date}                     Date object or ISO-formatted string
 */
module.exports.todayEOD = (formatted = false) => {

  // Get current date
  const now = new Date();

  // Set time to midnight
  now.setHours(23, 59, 59, 999);

  // Return as Date or ISO string
  return formatted ? now.toISOString() : now;

};
