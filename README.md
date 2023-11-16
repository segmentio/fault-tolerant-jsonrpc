# fault-tolerant-jsonrpc [![CircleCI](https://circleci.com/gh/segmentio/fault-tolerant-jsonrpc.svg?style=svg&circle-token=9924e7270d858226e8489267037e8d363c6af5ff)](https://circleci.com/gh/segmentio/fault-tolerant-jsonrpc)

> [!NOTE]
> Segment has paused maintenance on this project, but may return it to an active status in the future. Issues and pull requests from external contributors are not being considered, although internal contributions may appear from time to time. The project remains available under its open source license for anyone to use.

> Fault tolerant jsonrpc with retries and timeouts

This module provides fault-tolerance on top of [@segment/jsonrpc2](github.com/segmentio/jsonrpc2.js).

- [x] Retries via [`p-retry`](https://github.com/sindresorhus/p-retry)
- [x] Timeout via [`p-timeout`](https://github.com/sindresorhus/p-timeout)
- [x] Optional retry logic
- [ ] Circuit Breaking not yet implemented


#### Note about retries

Retries are **off by default** and should only be used for idempotent RPC methods.

## Install

```
$ npm install --save @segment/fault-tolerant-jsonrpc
```

## Usage

```js
const jsonrpc = require('@segment/fault-tolerant-jsonrpc')

// This is an example service client,
// implemented using fault-tolerant-jsonrpc
function Client (addr, opts) {
  opts = opts || {}

  // We should only allow retries for idempotent requests
  const idempotentDefaults = Object.assign({
    retryOptions: { retries: 3 },

    // Custom retry function
    // This allows the clients to decide what sorts of errors
    // are worth retrying
    shouldRetry: function(originalError) {
      if (originalError.code === "SYSTEM_ERROR") {
        return true
      }
      return false
    },
    timeout: 500,
    totalTimeout: 2000
  }, opts.idempotentDefaults)

  const rpc = jsonrpc(addr, opts.globalDefaults)

  return {
    getAll () {
      return rpc.call('Items.GetAll', null, idempotentDefaults)
    },
    getOne (id) {
      return rpc.call('Items.GetOne', id, idempotentDefaults)
    },
    createOne (data) {
      // Intentionally not using retries since this
      // RPC method _could_ result in duplicate writes
      return rpc.call('Items.CreateOne', data)
    }
  }
}
```

``` js
const itemService = Client('http://localhost:3000')

itemService
  .getAll()
  .then(console.log)
  .catch(console.log)

itemService
  .getOne('item-1')
  .then(console.log)
  .catch(console.log)

itemService
  .createOne({ some: 'thing' })
  .then(console.log)
  .catch(console.log)
```

## API

### `const rpc = jsonrpc(addr, [options])`

Returns a jsonrpc client where `client.call` supports retries and timeouts. This
package exposes the same API as [jsonrpc2](https://github.com/segmentio/jsonrpc2.js)
with the addition of the following options:

- `options.retryOptions` is passed to the [`p-retry`](https://github.com/sindresorhus/p-retry#options) module.
- `options.totalTimeout` is passed to the [`p-timeout`](https://github.com/sindresorhus/p-timeout) module.

### `rpc.call(method, params, [options])`

Same API as the above but global options can be overwritten on a per request basis.
