'use strict'

const RPC = require('@segment/jsonrpc2')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const RPCTimeoutError = require('./lib/rpc_timeout_error')

const noRetryDefault = { retries: 0 }
const defaultRetryPredicate = () => true

module.exports = Client
module.exports.RPCTimeoutError = RPCTimeoutError

function Client (addr, libraryOptions) {
  if (!(this instanceof Client)) return new Client(addr, libraryOptions)

  libraryOptions = libraryOptions || {}

  const originalRpcClientOptions = {
    timeout: libraryOptions.timeout,
    logger: libraryOptions.logger
  }

  const rpc = new RPC(addr, originalRpcClientOptions)
  const call = rpc.call.bind(rpc)

  rpc.call = function (method, params, options) {
    options = options || {}

    // Allow overriding options at the individual request level.
    // Retries are opt-in and turned off by default.
    const retryOptions = Object.assign({}, noRetryDefault, libraryOptions.retryOptions, options.retryOptions)
    const totalTimeout = options.totalTimeout || libraryOptions.totalTimeout || 1000

    // Decides whether or not we should retry a given request.
    // The client can decide if they want to retry 404s, or just other types
    // of errors such as ECONNREFUSED, ESOCKETTIMEDOUT and other common network errors
    const retryPredicate = libraryOptions.shouldRetry || options.shouldRetry || defaultRetryPredicate

    return new Promise((resolve, reject) => {
      let hasTimedOut = false
      let currentAttempt = 0

      const run = attempts => {
        currentAttempt = attempts

        if (hasTimedOut) {
          return pRetry.AbortError
        }

        return call(method, params, {
          timeout: options.timeout,
          async: options.async
        }).catch(shouldRetry)
      }

      function shouldRetry (err) {
        if (retryPredicate(err)) {
          // Keep retrying
          return Promise.reject(err)
        } else {
          // Abort retry flow
          throw new pRetry.AbortError(err)
        }
      }

      function fallback () {
        const message = `RPC Client Timed out after ${currentAttempt} attempts`

        const error = new RPCTimeoutError(message, {
          attempts: currentAttempt,
          method,
          params
        })

        return Promise.reject(error)
      }

      pTimeout(pRetry(run, retryOptions), totalTimeout, fallback)
        .then(resolve)
        .catch(err => {
          hasTimedOut = true
          reject(err)
        })
    })
  }

  return rpc
}
