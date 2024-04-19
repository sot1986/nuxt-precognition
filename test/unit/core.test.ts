import { describe, expect, it } from 'vitest'
import { getAllNestedKeys, isFile, isLaravelPrecognitiveError, isNuxtPrecognitiveError, resolveDynamicObject, hasPrecognitiveRequestsHeader, requestPrecognitiveHeaders, resolvePrecognitiveErrorData, makeLaravelErrorParser, makeNuxtErrorParser } from '../../src/runtime/core'
import type { NuxtPrecognitiveErrorResponse, NuxtPrecognitiveError, LaravelPrecognitiveErrorResponse, LaravelPrecognitiveError } from '~/src/runtime/types/core'
import type { Config } from '~/src/runtime/types/config'

describe('test core functions', () => {
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
  }

  function makeNuxtPrecognitiveError(errors: Record<string, string | string[]> = {}): NuxtPrecognitiveError {
    const headers = new Headers()
    headers.set(config.precognitiveHeader, 'true')
    const response = new Response(null, { headers, status: config.errorStatusCode }) as NuxtPrecognitiveErrorResponse
    response._data = { data: { message: 'error', errors } }
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response
    return error
  }

  function makeLaravelPrecognitiveError(errors: Record<string, string | string[]> = {}): LaravelPrecognitiveError {
    const headers = new Headers()
    headers.set(config.precognitiveHeader, 'true')
    const response = new Response(null, { headers, status: config.errorStatusCode }) as LaravelPrecognitiveErrorResponse
    response._data = { message: 'error', errors }
    const error = new Error('error') as LaravelPrecognitiveError
    error.response = response
    return error
  }

  it.each([
    [() => ({ a: 1 }), { a: 1 }],
    [{ a: 1 }, { a: 1 }],
  ])('resolveDynamic can return simple objects', (dynamic, base) => {
    expect(resolveDynamicObject(dynamic)).toEqual(base)

    expect(resolveDynamicObject(base)).toEqual(base)
  })

  it.each([
    [{ a: 1 }, ['a']],
    [{ a: { b: 1 } }, ['a', 'a.b']],
    [{ a: { b: 1 }, c: 2 }, ['a', 'a.b', 'c']],
    [{ a: { b: [1, 2, 3] }, c: { d: 2 } }, ['a', 'a.b', 'a.b.0', 'a.b.1', 'a.b.2', 'c', 'c.d']],
  ])('getAllNestedKeys returns all nested keys', (object, keys) => {
    expect(getAllNestedKeys(object)).toEqual(keys)
  })

  it.each([
    [new Blob(), true],
    [null, false],
    [undefined, false],
    [1, false],
    ['string', false],
    [true, false],
    [false, false],
    [() => {}, false],
  ])('isFile returns true for files', (value, is) => {
    expect(isFile(value)).toBe(is)
  })

  it('isNuxtPrecognitiveError returns true if error is precognitive', () => {
    const error = makeNuxtPrecognitiveError()

    expect(isNuxtPrecognitiveError(error, config)).toBe(true)
  })

  it('isLaravelPrecognitiveError returns true if error is precognitive', () => {
    const error = makeLaravelPrecognitiveError()

    expect(isLaravelPrecognitiveError(error, config)).toBe(true)
  })

  it.each([
    isNuxtPrecognitiveError,
    isLaravelPrecognitiveError,
  ]) ('baseErrorParsers returns false if precognitive header is missing or invalid', (errorParser) => {
    const headers = new Headers()
    headers.set(config.precognitiveHeader, 'false')
    const response = new Response(null, { headers, status: config.errorStatusCode }) as NuxtPrecognitiveErrorResponse
    response._data = { data: { message: 'error', errors: {} } }
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response

    expect(errorParser(error, config)).toBe(false)
  })

  it.each([
    isNuxtPrecognitiveError,
    isLaravelPrecognitiveError,
  ]) ('baseErrorParsers returns false if error status code is not correct', (errorParser) => {
    const headers = new Headers()
    headers.set(config.precognitiveHeader, 'true')
    const response = new Response(null, { headers, status: config.errorStatusCode + 1 }) as NuxtPrecognitiveErrorResponse
    response._data = { data: { message: 'error', errors: {} } }
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response

    expect(errorParser(error, config)).toBe(false)
  })

  it.each([
    isNuxtPrecognitiveError,
    isLaravelPrecognitiveError,
  ]) ('baseErrorParsers returns false if response is missing', (errorParser) => {
    const error = new Error('error') as NuxtPrecognitiveError
    expect(errorParser(error, config)).toBe(false)
  })

  it.each([
    isNuxtPrecognitiveError,
    isLaravelPrecognitiveError,
  ]) ('baseErrorParsers returns false if response is not a response', (errorParser) => {
    const error = new Error('error') as NuxtPrecognitiveError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error.response = {} as any
    expect(errorParser(error, config)).toBe(false)
  })

  it.each([
    isNuxtPrecognitiveError,
    isLaravelPrecognitiveError,
  ]) ('baseErrorParsers returns false if response is missing data', (errorParser) => {
    const headers = new Headers()
    headers.set(config.precognitiveHeader, 'true')
    const response = new Response(null, { headers, status: config.errorStatusCode }) as NuxtPrecognitiveErrorResponse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response._data = {} as any
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response

    expect(errorParser(error, config)).toBe(false)
  })

  it.each([
    isNuxtPrecognitiveError,
    isLaravelPrecognitiveError,
  ]) ('baseErrorParsers returns false if headers are missing', (errorParser) => {
    const response = new Response(null, { status: config.errorStatusCode }) as NuxtPrecognitiveErrorResponse
    response._data = { data: { message: 'error', errors: {} } }
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response

    expect(errorParser(error, config)).toBe(false)
  })

  it.each([
    (): HeadersInit => {
      const headers = new Headers()
      headers.set(config.precognitiveHeader, 'true')
      return headers
    },
    (): HeadersInit => ({ [config.precognitiveHeader]: 'true' }),
    (): HeadersInit => ([[config.precognitiveHeader, 'true']]),
  ])('hasPrecognitiveRequestsHeader returns true if precognitive header is present', (headersFactory) => {
    const headers = headersFactory()
    expect(hasPrecognitiveRequestsHeader(headers, config)).toBe(true)
  })

  it.each([
    { headers: undefined, keys: ['a', 'b'], expected: 'a,b' },
  ])('requestPrecognitiveHeaders returns headers with precognitive header but not set successful header', ({ headers, keys, expected }) => {
    const h = requestPrecognitiveHeaders(config, headers, keys)

    expect(h.get(config.precognitiveHeader)).toBe('true')
    expect(h.get(config.validateOnlyHeader)).toBe(expected)
    expect(h.get(config.successfulHeader)).toBe(null)
  })

  it.each([
    { a: 'error', b: ['error', 'error'] },
  ])('resolvePrecognitiveErrorData returns errors data when receive Nuxt Precognitive Error', (errors) => {
    const error = makeNuxtPrecognitiveError(errors)

    expect(resolvePrecognitiveErrorData(error, [
      makeLaravelErrorParser(config),
      makeNuxtErrorParser(config),
    ])?.errors).toEqual(errors)
  })

  it.each([
    { a: 'error', b: ['error', 'error'] },
  ])('resolvePrecognitiveErrorData returns errors data when receive Laravel Precognitive Error', (errors) => {
    const error = makeLaravelPrecognitiveError(errors)

    expect(resolvePrecognitiveErrorData(error, [
      makeLaravelErrorParser(config),
      makeNuxtErrorParser(config),
    ])?.errors).toEqual(errors)
  })
})
