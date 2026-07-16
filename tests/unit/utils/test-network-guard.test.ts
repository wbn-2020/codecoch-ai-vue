import axios, { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

describe('unit-test network guard', () => {
  it('rejects an unmocked request before opening a localhost socket', async () => {
    const error = await axios.get('http://localhost:3000/should-not-connect')
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(AxiosError)
    expect(error).toMatchObject({
      code: AxiosError.ERR_NOT_SUPPORT,
      message: 'Unexpected unit-test network request: GET http://localhost:3000/should-not-connect'
    })
  })
})
