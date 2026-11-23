import { describe, it, expect, vi } from 'vitest'
import type { H3Event } from 'h3'

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (obj: {
      onRequest?: ((event: H3Event) => unknown) | ((event: H3Event) => unknown)[]
      handler: (event: H3Event) => unknown
    }) => async (event: H3Event) => {
      const hooks = Array.isArray(obj.onRequest) ? obj.onRequest : obj.onRequest ? [obj.onRequest] : []
      for (const hook of hooks)
        await hook(event)
      return obj.handler(event)
    },
  }
})

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    public: {
      precognition: {
        validationTimeout: 1000,
        backendValidation: true,
        validateFiles: false,
        enableLaravelClientErrorParser: true,
        enableNuxtClientErrorParser: true,
        enableLaravelServerErrorParser: false,
      },
    },
  }),
}))

const { definePrecognitiveEventHandler } = await import('../../src/runtime/server/definePrecognitiveEventHandler-legacy')

function createMockH3Event(headers?: HeadersInit, context?: Record<string, unknown>): H3Event {
  const resHeaders: Record<string, string> = {}
  return {
    headers: new Headers(headers),
    context: {
      $precognition: { errorParsers: [], statusHandlers: {} },
      precognitive: new Headers(headers).get('Precognition') === 'true',
      ...context,
    },
    node: {
      res: {
        statusCode: 200,
        statusMessage: '',
        setHeader: (name: string, value: string) => {
          resHeaders[name.toLowerCase()] = value
        },
        getHeader: (name: string) => resHeaders[name.toLowerCase()],
      },
    },
  } as unknown as H3Event
}

describe('definePrecognitiveEventHandler-legacy (Nitro v2 / h3 v1)', () => {
  it('throws 422 on validation error for non-precognitive requests', async () => {
    const handler = definePrecognitiveEventHandler(
      {
        onRequest: () => {
          throw new Error('Validation failed')
        },
        handler: () => ({ ok: true }),
      },
      {
        errorParsers: [() => ({ message: 'Validation failed', errors: { email: ['Required'] } })],
      },
    )

    const event = createMockH3Event()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 422,
      message: 'Validation failed',
      data: { message: 'Validation failed', errors: { email: ['Required'] } },
    })
  })

  it('invokes plugin-registered statusHandlers even when options.statusHandlers is omitted', async () => {
    const statusHandler = vi.fn()
    const handler = definePrecognitiveEventHandler({
      onRequest: () => {
        const err = new Error('Forbidden') as Error & { response: Response }
        err.response = new Response(null, { status: 403 })
        throw err
      },
      handler: () => ({ ok: true }),
    })

    const event = createMockH3Event(undefined, {
      $precognition: {
        errorParsers: [],
        statusHandlers: { 403: statusHandler },
      },
    })

    await handler(event)
    expect(statusHandler).toHaveBeenCalledTimes(1)
  })
})
