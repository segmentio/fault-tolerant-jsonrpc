const pTimeout = require('p-timeout')

class RPCTimeoutError extends pTimeout.TimeoutError {
  constructor (message, { attempts, method, params }) {
    super(message)
    this.message = message
    this.name = 'RPCTimeoutError'
    this.attempts = attempts
    this.method = method
    this.params = params
  }
}

module.exports = RPCTimeoutError
