
import test from 'ava'
import nock from 'nock'
import jsonrpc, { RPCTimeoutError } from './'

const HOST = 'http://test.rpc'
const rpc = jsonrpc(`${HOST}/rpc`)

test.serial('success', async t => {
  nock(HOST)
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
  nock(HOST)
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

test.serial('retry off by default', async t => {
  let i = 0
  nock(HOST)
    .filteringRequestBody(() => '*')
    .post('/rpc', '*')
    .reply(200, () => {
      i++
      return { error: 'failed' }
    })

  const error = await t.throws(rpc.call('Items.GetAll'))

  t.is(i, 1)
  t.is(error.message, 'failed')
})

test.serial('timeout', async t => {
  const timeout = 10
  const retries = 100
  let i = 0

  nock(HOST)
    .filteringRequestBody(() => '*')
    .post('/rpc', '*')
    .times(retries * 2)
    .socketDelay(100)
    .reply(200, () => {
      i++
      return { result: { el: 'duderino' } }
    })

  const options = {
    retryOptions: {
      retries,
      factor: 1,
      minTimeout: timeout,
      maxTimeout: timeout
    },
    timeout: timeout - 5,
    totalTimeout: 10000
  }

  const start = Date.now()
  const error = await t.throws(rpc.call('Items.GetTimeout', null, options))
  const duration = Date.now() - start
  const expectedDuration = (timeout + 3) * retries

  t.truthy(duration > expectedDuration * 0.85)
  t.truthy(duration < expectedDuration * 1.15)
  t.is(i, retries + 1)
  t.is(error.message, 'ESOCKETTIMEDOUT')
})

test.serial('totalTimeout', async t => {
  nock(HOST)
    .filteringRequestBody(() => '*')
    .post('/rpc', '*')
    .times(10)
    .socketDelay(100)
    .reply(200, {
      result: {
        el: 'duderino'
      }
    })

  const options = {
    retryOptions: {
      retries: 20,
      factor: 1,
      minTimeout: 15,
      maxTimeout: 15
    },
    timeout: 10,
    totalTimeout: 100
  }

  const start = Date.now()
  const error = await t.throws(rpc.call('Items.GetTotalTimeout', null, options))
  const duration = Date.now() - start

  t.truthy(duration < 110 && duration > 90)
  t.truthy(error.message.match(/RPC Client Timed out after \d* attempts/))
  t.truthy(error instanceof RPCTimeoutError)
})
