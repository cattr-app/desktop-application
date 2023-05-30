/* Error suppressed because this warning doesn't make much sense  */
/* eslint-disable max-classes-per-file */
const Sentry = require('./sentry');

class UIError extends Error {

  /**
   * User Interface error
   * @param {String}  code     Error code
   * @param {String}  message  Error description for humans
   * @param {String}  errorId  Error identifier for T-900s
   * @param {Error|null}   error    Error instance
   */
  constructor(code, message, errorId, error = null) {

    // Use behavior from parent Error class
    super(message);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set our error name and code
    this.name = this.constructor.name;
    this.code = code;
    this.errorId = errorId;
    this.error = error;

  }

}

class AppError extends Error {

  /**
   * Application error
   * @param {String}  errorId  Error identifier for T-900s
   * @param {String}  message  Error description for humans
   */
  constructor(errorId, message) {

    // Use behavior from parent Error class
    super(message);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set our error name and code
    this.name = this.constructor.name;
    this.code = errorId;

    // Push to Sentry
    Sentry.captureException(this);

  }

}

module.exports = { UIError, AppError };
