import { describe, it, expect, beforeEach, vi } from 'vitest'

import { definePrecognitiveEventHandler } from '../../src/runtime/server/definePrecognitiveEventHandler'

describe('test definePrecognitiveEventHandler', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      useRuntimeConfig: () => ({
        public: {
          nuxtPrecognition: {
            precognitiveHeader: 'X-Precognitive',
            successfulHeader: 'X-Precognitive-Successful',
            validateOnlyHeader: 'X-Precognitive-Validate-Only',
            errorStatusCode: 422,
            validatingKeysSeparator: ',',
            validationTimeout: 1000,
            backendValidation: true,
            successValidationStatusCode: 204,
            validateFiles: false,
            enableClientLaravelErrorParser: true,
            enableClientNuxtErrorParser: true,
            enableServerLaravelErrorParser: true,
          },
        },
      }),
    }))
  })

  it('should return a function', () => {
    const handler = definePrecognitiveEventHandler({ onRequest: () => {}, handler: () => {} })
    expect(typeof handler).toBe('function')
  })

  it('should have a create function that returns a function', () => {
    expect(typeof definePrecognitiveEventHandler.create).toBe('function')

    const handler = definePrecognitiveEventHandler.create({})
    expect(typeof handler).toBe('function')
  })
})
