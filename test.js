
import test from 'ava'
import delay from 'delay'
import nock from 'nock'
import jsonrpc from './'

const rpc = jsonrpc('http://test.rpc/rpc')

test.serial('success', async t => {
  nock('http://test.rpc')
    .post('/rpc', {
      method: 'Items.GetOne',
      params: [1],
      id: /.+/,
      jsonrpc: '2.0'
    })
    .reply(200, {
      result: { el: 'duderino' }
    })

  const result = await rpc.call('Items.GetOne', 1)
  const expected = { el: 'duderino' }

  t.deepEqual(result, expected)
})

test.serial('retry', async t => {
  let i = 0
  nock('http://test.rpc')
    .filteringRequestBody(() => '*')
    .post('/rpc', '*')
    .times(3)
    .reply(200, () => {
      i++
      return { error: 'failed' }
    })

  const options = {
    retryOptions: {
      retries: 2,
      minTimeout: 10
    }
  }

  const error = await t.throws(rpc.call('Items.GetAll', null, options))

  t.is(i, 3)
  t.is(error.message, 'failed')
})

test.serial('timeout', async t => {
  let i = 0
  nock('http://test.rpc')
    .filteringRequestBody(() => '*')
    .post('/rpc', '*')
    .times(10)
    .reply(200, () => {
      i++
      return { error: 'failed' }
    })

  const options = {
    retryOptions: {
      retries: 10,
      minTimeout: 10
    },
    timeout: 200
  }

  const error = await t.throws(rpc.call('Items.GetAll', null, options))

  await delay(200)

  t.is(i, 5)
  t.truthy(error.message.match(/timed out/))
})
