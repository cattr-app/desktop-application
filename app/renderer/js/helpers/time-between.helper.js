/* eslint-disable import/prefer-default-export */

/**
 * Delta between dates in seconds
 * @param {Date} dateA
 * @param {Date} dateB
 * @returns {Number} Delta in seconds
 */
export function secondsBetween(dateA, dateB) {

  return Math.ceil(Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / 1000);

}
