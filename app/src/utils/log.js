/* eslint-disable no-console */
/**
 * Internal logger
 * @version 0.2.0
 */

const fs = require('fs');
const { resolve } = require('path');
const chalk = require('chalk');
const config = require('../base/config');

const { Sentry: { Sentry } } = require('./sentry');
const ApiError = require("@cattr/node/src/errors/api");

// Checkings logs directory availability
if (!fs.existsSync(config.logger.directory))
  fs.mkdirSync(config.logger.directory);

const logFileName = `at.${new Date().toISOString()}.log`.replace(/:/gi, '-');

// Create log file stream
const logStream = fs.createWriteStream(resolve(config.logger.directory, logFileName));

logStream.on('open', () => {

  // Say hi
  console.log(`Hello / ${config.sentry.release} in ${config.isDeveloperModeEnabled ? 'dev' : 'prod'} mode`);

});

/**
 * Simple logger
 */
class Logger {

  /**
   * Logger
   * @param  {String} name Name of logger instance
   */
  constructor(name) {

    this.moduleName = name;

  }

  /**
   * Closes log file stream
   * @param  {Function} [cb]  Callback which will be called when log file stream will be closed
   */
  static _closeLogStream(callback) {

    // Gracefully ending the stream
    logStream.end();

    // Awating till write buffer will be empty
    logStream.once('finish', () => {

      // Destroying the stream
      logStream.destroy();

      // Log this event into stdout
      console.log('[Logger] Closed stream for log file', logStream.path);

      // Should be run our callback?
      if (typeof callback === 'function')
        callback();

    });

  }

  /**
   * Add leading zero if neccesary
   * @param  {Number} inputNumber Number
   * @return {String}             Number with leading zero
   */
  static _leftpad(inputNumber) {

    // If number greater or equal to 10, leading zero isn't neccesary
    if (inputNumber >= 10)
      return `${inputNumber}`;

    // Add it
    return `0${inputNumber}`;

  }


  /**
   * Return current date in format 'DD.MM.YYYY HH:ii:ss'
   * @return {String} Formatted date
   */
  static _getFormattedDateTime() {

    return new Date().toISOString();

  }

  /**
   * Just debugging messages
   * @param  {String} message Debug message
   */
  debug(message) {

    console.log(`[D] ${chalk.dim(`[${Logger._getFormattedDateTime()}]`)} ${chalk.green(`[${this.moduleName}]`)} ${message}`);
    if (logStream.writable)
      logStream.write(`[D] [${Logger._getFormattedDateTime()}] [${this.moduleName}] ${message}\n`);

  }

  /**
   * Warning message
   * @param  {String} message Information message
   */
  warning(message) {

    console.log(`${chalk.yellow('[W]')}  ${chalk.dim(`[${Logger._getFormattedDateTime()}]`)} ${chalk.green(`[${this.moduleName}]`)} ${chalk.yellow(message)}`);
    if (logStream.writable)
      logStream.write(`[W] [${Logger._getFormattedDateTime()}] [${this.moduleName}] ${message}\n`);

  }

  /**
   * Error message
   */
  error(...arguments_) {

    // Checking passed arguments
    if (arguments_.length === 0)
      return;

    // Looks like that object is given as parameter, so it's likely Error instance
    if (

      (typeof arguments_[0] === 'string' && typeof arguments_[1] === 'object')
      || (typeof arguments_[0] === 'string' && typeof arguments_[1] === 'string' && typeof arguments_[2] === 'object')

    ) {

      const message = (arguments_.length === 2) ? arguments_[0] : `(${arguments_[0]}) ${arguments_[1]}`;
      const error = (arguments_.length === 2) ? arguments_[1] : arguments_[2];

      // Handle API errors
      if (error.isApiError) {

        // Obtaining stack trace to logger call - Need to research if this even beneficial
        const stack = error instanceof ApiError ? error.stack
          : new Error(null).stack
            .split('\n')
            .splice(2)
            .join('\n');

        const errorContext = JSON.stringify({
          backend_trace_id: error?.trace_id || null,
          ...error.context
        }, null, 2);

        // Suppress submission of validation errors to Sentry
        if (error.message !== 'Validation error')
          this.constructor.captureApiError(message, error);

        // Log error into stderr
        console.error(`${chalk.red('[E]')} ${chalk.dim(`[${Logger._getFormattedDateTime()}]`)} ${chalk.green(`[${this.moduleName}]`)} ${chalk.red(`(API${error.statusCode}) ${message}: ${error}\n<BEGIN CONTEXT>\n${errorContext}\n<END CONTEXT>\n<BEGIN STACK TRACE>\n${stack}\n<END STACK TRACE>`)}`);

        // Pipe into file
        if (logStream.writable)
          logStream.write(`[E] [${Logger._getFormattedDateTime()}] [${this.moduleName}] (API${error.statusCode}) ${message}: ${error}\n<BEGIN CONTEXT>\n${errorContext}\n<END CONTEXT>\n<BEGIN STACK TRACE>\n${stack}\n<END STACK TRACE>\n`);
        return;

      }

      // Catch operational error
      if (error instanceof Error) {

        const errorContext = error.isNetworkError || error.context ? `\n<BEGIN CONTEXT>\n${JSON.stringify(error.context, null, 2)}\n<END CONTEXT>` : '';

        // Log error into stderr
        console.error(`${chalk.red('[E]')} ${chalk.dim(`[${Logger._getFormattedDateTime()}]`)} ${chalk.green(`[${this.moduleName}]`)} ${chalk.red(`(500) ${message}: ${error.message}${errorContext}\n<BEGIN STACK TRACE>\n${error.stack}\n<END STACK TRACE>`)}`);

        // Pipe into file
        if (logStream.writable)
          logStream.write(`[E] [${Logger._getFormattedDateTime()}] [${this.moduleName}] (500) ${message}: ${error.message}${errorContext}\n<BEGIN STACK TRACE>\n${error.stack}\n<END STACK TRACE>\n`);

      } else {

        // It's likely our custom errors
        // Log error into stderr
        console.error(`${chalk.red('[E]')} ${chalk.dim(`[${Logger._getFormattedDateTime()}]`)} ${chalk.green(`[${this.moduleName}]`)} ${chalk.red(`(${error.code}) ${error.message}\n<BEGIN STACK TRACE>\n${error.stack}\n<END STACK TRACE>`)}`);

        // Pipe into file
        if (logStream.writable)
          logStream.write(`[E] [${Logger._getFormattedDateTime()}] [${this.moduleName}] (${error.code}) ${error.message}\n<BEGIN STACK TRACE>\n${error.stack}\n<END STACK TRACE>\n`);

      }

      // Capture Error in Sentry
      Sentry.captureException(error);
      return;

    }

    // Simple error message
    if (typeof arguments_[0] === 'string' && typeof arguments_[1] === 'string') {

      // Getting error code and message variables from passed arguments
      const [code, message, disableCapture] = arguments_;

      // Obtaining stack trace to logger call
      const errorInstance = new Error(message);
      errorInstance.code = code;

      // Capturing stack trace into log
      const stackTrace = errorInstance.stack.split('\n').slice(2).join('\n');

      // Log error into stderr
      console.error(`${chalk.red('[E]')} ${chalk.dim(`[${Logger._getFormattedDateTime()}]`)} ${chalk.green(`[${this.moduleName}]`)} ${chalk.red(`(${code}) ${message}\n<BEGIN STACK TRACE>\n${stackTrace}\n<END STACK TRACE>`)}`);

      // Pipe into file
      if (logStream.writable)
        logStream.write(`[E] [${Logger._getFormattedDateTime()}] [${this.moduleName}] (${code}) ${message}\n<BEGIN STACK TRACE>\n${stackTrace}\n<END STACK TRACE>\n`);

      // Send to Sentry
      if (!disableCapture)
        Sentry.captureException(errorInstance);

    }

  }

  /**
   * Capture an API error to Sentry
   * @param  {String} message       Message for this error
   * @param  {Object} responseError Axios response error object
   */
  static captureApiError(message, responseError) {

    Sentry.withScope(scope => {

      scope.setLevel('error');
      scope.setTag('api_error', true);
      scope.setTag('api_response_code', responseError.statusCode);
      scope.setTag('api_request_url', responseError.url);
      scope.setExtra('api_response_body', responseError.responseBody);
      scope.setExtra('api_request_body', responseError.requestBody);
      Sentry.captureMessage(message);

    });

  }

}

module.exports = Logger;
