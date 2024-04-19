import { describe, expect, it, vi } from 'vitest'
import { makeValidator, withoutFiles } from '../../src/runtime/validator'

describe('test validator functions', () => {
  vi.mock('#imports', () => ({
    useRuntimeConfig: () => ({
      public: {
        nuxtPrecognition: {
          precognitiveHeader: 'X-Precognitive',
          successfulHeader: 'X-Precognitive-Successful',
          validateOnlyHeader: 'X-Precognitive-Validate-Only',
          errorStatusCode: 422,
          validatingKeysSeparator: '.',
          validationTimeout: 1000,
          backendValidation: true,
        },
      },
    }),
    useNuxtApp: () => ({
      $precognition: {
        parsers: {
          errorParsers: [],
        },
      },
    }),
  }))

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
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await validator({ data: () => ({}), touch: () => {}, forgetErrors: () => {} } as any)

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
      onValidationError: () => {
        hook.push('onValidationError')
        return Promise.resolve()
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await validator({ data: () => ({}), touch: () => {}, forgetErrors: () => {} } as any)

    expect(hook).toEqual(['onBeforeValidation', 'clientValidation', 'cb', 'onValidationError'])
  })
})
