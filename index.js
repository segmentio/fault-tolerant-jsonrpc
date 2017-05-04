'use strict'

const RPC = require('@segment/jsonrpc2')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const RPCTimeoutError = require('./lib/rpc_timeout_error')

const noRetryDefault = { retries: 0 }

module.exports = Client
module.exports.RPCTimeoutError = RPCTimeoutError

function Client (addr, opts) {
  if (!(this instanceof Client)) return new Client(addr, opts)

  opts = opts || {}

  const rpcOptions = {
    timeout: opts.timeout,
    logger: opts.logger
  }

  const rpc = new RPC(addr, rpcOptions)
  const call = rpc.call.bind(rpc)

  rpc.call = function (method, params, options) {
    options = options || {}

    // Allow overriding options at the individual request level.
    // Retries are opt-in and turned off by default.
    const retryOptions = Object.assign({}, noRetryDefault, opts.retryOptions, options.retryOptions)
    const totalTimeout = options.totalTimeout || opts.totalTimeout || 1000

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
        })
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
