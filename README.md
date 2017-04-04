# fault-tolerant-jsonrpc [![Build Status](https://travis-ci.org/segmentio/fault-tolerant-jsonrpc.svg?branch=master)](https://travis-ci.org/segmentio/fault-tolerant-jsonrpc)

> Fault tolerant jsonrpc with retries and timeouts

This module provides fault-tolerance on top of [@segment/jsonrpc2](github.com/segmentio/jsonrpc2.js).

- [x] Retries via [`p-retry`](https://github.com/sindresorhus/p-retry)
- [x] Timeout via [`p-timeout`](https://github.com/sindresorhus/p-timeout)
- [ ] Circuit Breaking not yet implemented

## Install

```
$ npm install --save @segment/fault-tolerant-jsonrpc
```

## Usage

```js
const jsonrpc = require('@segment/fault-tolerant-jsonrpc')

function Client (addr, opts) {
  const rpc = jsonrpc(addr, opts)

  return {
    getAll (options) {
      return rpc.call('Items.GetAll', null, options)
    },
    getOne (id, options) {
      return rpc.call('Items.GetOne', id, options)
    }
  }
}

const itemService = new Client('http://localhost:3000')

itemService
  .getAll()
  .then(items => console.log(items))

itemService
  .getOne('item-1')
  .then(item => console.log(item))
```

## API

### `const rpc = jsonrpc(addr, [options])`

Returns a jsonrpc client where `client.call` supports retries and timeouts. This
package exposes the same API as [jsonrpc2](https://github.com/segmentio/jsonrpc2.js)
with the addition of the following options:

- `options.retryOptions` is passed to the [`p-retry`](https://github.com/sindresorhus/p-retry#options) module.
- `options.timeout` is passed to the [`p-timeout`](https://github.com/sindresorhus/p-timeout) module.

### `rpc.call(method, params, [options])`

Same API as [jsonrpc2](https://github.com/segmentio/jsonrpc2.js) but global options can be overwritten on a per request basis.
