import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { makeValidator, withoutFiles } from '../../src/runtime/validator'
import type { Config } from '../../src/runtime/types/config'
import { makeLaravelValidationErrorParser, makeNuxtValidationErrorParser } from '../../src/runtime/core'

describe('test validator functions', () => {
  const config: Config = {
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
  }

  const errorParsers = [
    makeLaravelValidationErrorParser(config),
    makeNuxtValidationErrorParser(config),
  ]

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mock('#imports', () => ({
      useNuxtApp: () => ({
        $precognition: {
          parsers: {
            errorParsers: [],
          },
        },
      }),
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

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    {
      input: { a: 1, b: 'string', c: new Blob() },
      output: { a: 1, b: 'string', c: null },
    },
    {
      input: { a: 1, b: 'string', c: [new Blob()] },
      output: { a: 1, b: 'string', c: [null] },
    },
    {
      input: { a: 1, b: ['string1', 'string2'], c: { d: new Blob() } },
      output: { a: 1, b: ['string1', 'string2'], c: { d: null } },
    },
  ])('wihoutFiles removes files from object', ({ input, output }) => {
    const result = withoutFiles(input)

    expect(result).toEqual(output)
  })

  it('validator function executes all interceptors in correct order', async () => {
    const hook: string[] = []
    const cb = () => {
      hook.push('cb')
      return Promise.resolve()
    }

    const validator = makeValidator(cb, {
      onBeforeValidation: () => {
        hook.push('onBeforeValidation')
        return true
      },
      clientValidation: () => {
        hook.push('clientValidation')
        return Promise.resolve()
      },
      backendValidation: true,
      validateFiles: false,
      onValidationSuccess: () => {
        hook.push('onValidationSuccess')
        return Promise.resolve()
      },
      clientErrorParsers: errorParsers,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await validator.validate({ data: () => ({}), touch: () => {}, forgetErrors: () => {} } as any)

    expect(hook).toEqual(['onBeforeValidation', 'clientValidation', 'cb', 'onValidationSuccess'])
  })

  it('validator function intercept error and execute onError', async () => {
    const hook: string[] = []
    const cb = () => {
      hook.push('cb')
      return Promise.reject(new Error('error'))
    }

    const validator = makeValidator(cb, {
      onBeforeValidation: () => {
        hook.push('onBeforeValidation')
        return true
      },
      clientValidation: () => {
        hook.push('clientValidation')
        return Promise.resolve()
      },
      backendValidation: true,
      validateFiles: false,
      validationTimeout: 1000,
      onValidationError: () => {
        hook.push('onValidationError')
        return Promise.resolve()
      },
      clientErrorParsers: errorParsers,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await validator.validate({ data: () => ({}), touch: () => {}, forgetErrors: () => {} } as any)

    expect(hook).toEqual(['onBeforeValidation', 'clientValidation', 'cb', 'onValidationError'])
  })

  it('validator returns a debounce function of validate', async () => {
    let label = ''
    let value = ''

    function updateCounter() {
      label = value
      return Promise.resolve()
    }

    const validator = makeValidator(updateCounter, { clientErrorParsers: errorParsers, validationTimeout: 1000 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeForm = { data: () => ({}), touch: () => {}, forgetErrors: () => {} } as any

    value = 'a'
    await validator.validate(fakeForm)
    expect(label).toBe('a')

    await vi.advanceTimersByTimeAsync(300)
    value = 'b'
    await validator.validate(fakeForm)
    expect(label).toBe('a')

    await vi.advanceTimersByTimeAsync(1200)
    expect(label).toBe('b')

    await vi.advanceTimersByTimeAsync(300)
    expect(label).toBe('b')

    value = 'c'
    await validator.validate(fakeForm)
    expect(label).toBe('c')

    await vi.advanceTimersByTimeAsync(300)
    value = 'd'
    await validator.validate(fakeForm)
    expect(label).toBe('c')

    value = 'e'
    await validator.validate(fakeForm)
    await vi.advanceTimersByTimeAsync(300)
    expect(label).toBe('c')

    await vi.advanceTimersByTimeAsync(1000)
    expect(label).toBe('e')
  })
})
