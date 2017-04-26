const jsonrpc = require('./')

// This is an example service client,
// implemented using fault-tolerant-jsonrpc
function Client (addr, opts) {
  opts = opts || {}

  // We should only allow retries for idempotent requests
  const idempotentDefaults = Object.assign({
    retryOptions: { retries: 3 },
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
