const jsonrpc = require('./')

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
