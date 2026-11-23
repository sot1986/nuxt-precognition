import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RequestEvent } from 'nuxt/server'

const runtimeConfig = {
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
}

vi.mock('nuxt/server', () => ({
  defineEventHandler: <T>(handler: T) => handler,
  useRuntimeConfig: () => runtimeConfig,
  setResponseStatus: (event: RequestEvent, status: number, statusText?: string) => {
    event.res.status = status
    if (statusText !== undefined)
      event.res.statusText = statusText
  },
  createError: (input: { status?: number, statusCode?: number, message?: string, data?: unknown }) => {
    const err = new Error(input.message ?? 'Error') as Error & { status: number, statusCode: number, data?: unknown }
    const status = input.status ?? input.statusCode ?? 500
    err.status = status
    err.statusCode = status
    err.data = input.data
    return err
  },
}))

// Import after vi.mock so the mock is applied
const { definePrecognitiveEventHandler } = await import('../../src/runtime/server/definePrecognitiveEventHandler')

function createMockEvent(headers?: HeadersInit, context: Record<string, unknown> = {}): RequestEvent {
  const req = new Request('http://localhost/api/test', { method: 'POST', headers })
  return {
    req,
    url: new URL(req.url),
    res: { headers: new Headers() },
    context,
  } as unknown as RequestEvent
}

class FakeValidationError extends Error {
  errors: Record<string, string[]>
  constructor(message: string, errors: Record<string, string[]>) {
    super(message)
    this.errors = errors
  }
}

const fakeErrorParser = (error: Error) => {
  if (error instanceof FakeValidationError)
    return { message: error.message, errors: error.errors }
  return null
}

describe('definePrecognitiveEventHandler (nuxt/server)', () => {
  beforeEach(() => {
    runtimeConfig.public.precognition.enableLaravelServerErrorParser = false
  })

  it('runs onRequest, handler, and preserves onBeforeResponse body mutations for normal requests', async () => {
    const calls: string[] = []
    const handler = definePrecognitiveEventHandler({
      onRequest: () => {
        calls.push('onRequest')
      },
      handler: () => {
        calls.push('handler')
        return { ok: true }
      },
      onBeforeResponse: (_event, response) => {
        calls.push('onBeforeResponse')
        response.body = { ok: false }
      },
    })

    const event = createMockEvent()
    const result = await handler(event)

    expect(calls).toEqual(['onRequest', 'handler', 'onBeforeResponse'])
    expect(result).toEqual({ ok: false })
  })

  it('lazily initializes event.context.$precognition and precognitive when Nitro plugin did not run', async () => {
    let seenContext: Record<string, unknown> | undefined
    const handler = definePrecognitiveEventHandler({
      onRequest: (event) => {
        seenContext = event.context as unknown as Record<string, unknown>
      },
      handler: () => ({ ok: true }),
    })

    const event = createMockEvent({ Precognition: 'true' })
    await handler(event)

    expect(seenContext?.$precognition).toEqual({ errorParsers: [], statusHandlers: {} })
    expect(seenContext?.precognitive).toBe(true)
  })

  it('throws 422 on validation error for non-precognitive requests (including Precognition: false)', async () => {
    const handler = definePrecognitiveEventHandler(
      {
        onRequest: () => {
          throw new FakeValidationError('Invalid', { email: ['Required'] })
        },
        handler: () => ({ ok: true }),
      },
      { errorParsers: [fakeErrorParser] },
    )

    for (const headers of [undefined, { Precognition: 'false' }] as (HeadersInit | undefined)[]) {
      const event = createMockEvent(headers)
      await expect(handler(event)).rejects.toMatchObject({
        status: 422,
        message: 'Invalid',
        data: { message: 'Invalid', errors: { email: ['Required'] } },
      })
      expect(event.res.status).toBe(422)
      expect(event.res.headers.get('Precognition')).toBeNull()
    }
  })

  it('skips handler and returns precognition success headers when Precognition: true passes validation', async () => {
    const mainHandler = vi.fn(() => ({ created: true }))
    const handler = definePrecognitiveEventHandler({
      onRequest: () => {},
      handler: mainHandler,
    })

    const event = createMockEvent({
      'Precognition': 'true',
      'Precognition-Validate-Only': 'email',
    })
    const result = await handler(event)

    expect(mainHandler).not.toHaveBeenCalled()
    expect(result).toBeNull()
    expect(event.res.status).toBe(200)
    expect(event.res.headers.get('Precognition')).toBe('true')
    expect(event.res.headers.get('Precognition-Success')).toBe('true')
    expect(event.res.headers.get('Precognition-Validate-Only')).toBe('email')
  })

  it('filters errors by Precognition-Validate-Only and succeeds when no targeted key fails', async () => {
    const handler = definePrecognitiveEventHandler(
      {
        onRequest: () => {
          throw new FakeValidationError('Invalid', {
            email: ['Invalid email'],
            password: ['Too short'],
          })
        },
        handler: () => ({ ok: true }),
      },
      { errorParsers: [fakeErrorParser] },
    )

    // Matching key -> 422 with only matching key
    const matchingEvent = createMockEvent({
      'Precognition': 'true',
      'Precognition-Validate-Only': 'email',
    })
    await expect(handler(matchingEvent)).rejects.toMatchObject({
      status: 422,
      data: {
        message: 'Invalid',
        errors: { email: ['Invalid email'] },
      },
    })
    expect(matchingEvent.res.headers.get('Precognition')).toBe('true')
    expect(matchingEvent.res.headers.get('Precognition-Validate-Only')).toBe('email')

    // Non-matching key -> passes precognitive validation
    const nonMatchingEvent = createMockEvent({
      'Precognition': 'true',
      'Precognition-Validate-Only': 'name',
    })
    const result = await handler(nonMatchingEvent)
    expect(result).toBeNull()
    expect(nonMatchingEvent.res.status).toBe(200)
    expect(nonMatchingEvent.res.headers.get('Precognition-Success')).toBe('true')
  })

  it('invokes context statusHandlers even when handler options.statusHandlers is omitted', async () => {
    const pluginStatusHandler = vi.fn()
    const handler = definePrecognitiveEventHandler({
      onRequest: () => {
        const err = new Error('Unauthorized') as Error & { response: Response }
        err.response = new Response(null, { status: 401 })
        throw err
      },
      handler: () => ({ ok: true }),
    })

    const event = createMockEvent(undefined, {
      $precognition: {
        errorParsers: [],
        statusHandlers: { 401: pluginStatusHandler },
      },
      precognitive: false,
    })

    await handler(event)
    expect(pluginStatusHandler).toHaveBeenCalledTimes(1)
  })

  it('composes base and per-handler options via definePrecognitiveEventHandler.create', async () => {
    const factory = definePrecognitiveEventHandler.create({
      errorParsers: [fakeErrorParser],
    })
    const handler = factory({
      onRequest: () => {
        throw new FakeValidationError('Invalid', { name: ['Required'] })
      },
      handler: () => ({ ok: true }),
    })

    const event = createMockEvent({ Precognition: 'true' })
    await expect(handler(event)).rejects.toMatchObject({
      status: 422,
      data: { message: 'Invalid', errors: { name: ['Required'] } },
    })
  })

  it('converts non-Error throws in onRequest into 500 errors', async () => {
    const handler = definePrecognitiveEventHandler({
      onRequest: () => {
        throw 'boom'
      },
      handler: () => ({ ok: true }),
    })

    await expect(handler(createMockEvent())).rejects.toMatchObject({
      status: 500,
      message: 'Unknown server error',
    })
  })
})
