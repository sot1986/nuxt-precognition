import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineEventHandler, setResponseHeader, createError, setResponseStatus } from 'h3'

import { definePrecognitiveEventHandler } from '../../src/runtime/server/definePrecognitiveEventHandler'

describe('test definePrecognitiveEventHandler', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      useRuntimeConfig: () => ({
        public: {
          precognition: {
            precognitiveHeader: 'Precognition',
            successfulHeader: 'Precognition-Successful',
            validateOnlyHeader: 'Precognition-Validate-Only',
            errorStatusCode: 422,
            validationTimeout: 1000,
            backendValidation: true,
            successValidationStatusCode: 204,
            validateFiles: false,
            enableLaravelClientErrorParser: true,
            enableNuxtClientErrorParser: true,
            enableLaravelServerErrorParser: true,
          },
        },
      }),
      defineEventHandler,
      setResponseHeader,
      createError,
      setResponseStatus,
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
