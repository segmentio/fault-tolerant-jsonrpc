'use strict'

const RPC = require('@segment/jsonrpc2')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')

const noRetryDefault = { retries: 0 }

module.exports = Client

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

      const run = attempts => {
        if (hasTimedOut) {
          return pRetry.AbortError
        }
        return call(method, params, options)
      }

      pTimeout(pRetry(run, retryOptions), totalTimeout)
        .then(resolve)
        .catch(err => {
          hasTimedOut = true
          reject(err)
        })
    })
  }

  return rpc
}
