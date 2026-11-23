import { describe, it, expect, vi } from 'vitest'
import precognitionNitroPlugin from '../../src/runtime/server/plugin'

describe('server/plugin (Nitro v2 & v3)', () => {
  function runPluginWithEvent(event: { context: Record<string, unknown>, headers?: Headers, req?: { headers: Headers | object } }) {
    let requestCallback: ((e: typeof event) => void) | undefined
    const nitroApp = {
      hooks: {
        hook: vi.fn((name: string, cb: (e: typeof event) => void) => {
          if (name === 'request')
            requestCallback = cb
        }),
      },
    }

    precognitionNitroPlugin(nitroApp)
    expect(requestCallback).toBeTypeOf('function')
    requestCallback!(event)
  }

  it('reads Precognition header on Nitro v2 (h3 v1: event.headers + Node IncomingMessage req)', () => {
    const event = {
      context: {} as Record<string, unknown>,
      headers: new Headers({ Precognition: 'true' }),
      req: { headers: { precognition: 'true' } },
    }

    runPluginWithEvent(event)

    expect(event.context.$precognition).toEqual({ errorParsers: [], statusHandlers: {} })
    expect(event.context.precognitive).toBe(true)
  })

  it('reads Precognition header on Nitro v3 (h3 v2: event.req as Web Request)', () => {
    const event = {
      context: {} as Record<string, unknown>,
      req: new Request('http://localhost/api/test', {
        headers: { Precognition: 'true' },
      }),
    }

    runPluginWithEvent(event)

    expect(event.context.$precognition).toEqual({ errorParsers: [], statusHandlers: {} })
    expect(event.context.precognitive).toBe(true)
  })

  it('preserves existing $precognition context if already initialized', () => {
    const existing = { errorParsers: [() => null], statusHandlers: {} }
    const event = {
      context: { $precognition: existing } as Record<string, unknown>,
      req: new Request('http://localhost/api/test'),
    }

    runPluginWithEvent(event)

    expect(event.context.$precognition).toBe(existing)
    expect(event.context.precognitive).toBe(false)
  })
})
