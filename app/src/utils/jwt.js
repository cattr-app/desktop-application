/**
 * Ridiculously simple JWT helper for some basic things
 * @version 0.1.0
 */

class JWTHelper {

  /**
   * Validates JWT structure via simple regular expression
   * @param  {String}   token  JsonWebToken
   * @return {Boolean}         Is that token's syntax correct
   */
  static checkStructure(token) {

    // Simply validate token using regular expression
    return /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(token);

  }

  /**
   * Extracts and parse token body
   * @param  {String}       token  JsonWebToken
   * @return {Object|null}         Token body if succeed, or null if not
   */
  static parseBody(token) {

    // Validate token first
    if (!this.checkStructure(token))
      return null;

    // Wrap errors
    try {

      // Extract body and try to parse as JSON
      return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));

    } catch (error) {

      // Always return null instead of error
      return null;

    }

  }

  /**
   * Checks token's nbf and exp claims
   * @param  {String}   token             JsonWebToken
   * @param  {Number}   [timeDifference]  Available time shift before exp in millis
   * @return {Boolean}                    Token's time frame validity
   */
  static checkTimeValidity(token, timeDifference = 0) {

    // Parse token
    const body = this.parseBody(token);

    // Return null if token parsing failed
    if (!body)
      return null;

    // Getting current datetime
    const currentDatetime = new Date();

    // Checking nbf (Not Before) claim if present
    if (typeof body.nbf !== 'undefined' && (currentDatetime < new Date(body.nbf)))
      return false;

    // Checking exp (Expiration Time) claim if present
    if (typeof body.exp !== 'undefined' && (currentDatetime - new Date(body.exp)) <= timeDifference)
      return false;

    // Everything is fine!
    return true;

  }

}

module.exports = JWTHelper;
