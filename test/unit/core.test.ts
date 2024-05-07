import { describe, expect, it } from 'vitest'

import { getAllNestedKeys, isFile, resolveDynamicObject, requestPrecognitiveHeaders, resolveValidationErrorData, makeLaravelValidationErrorParser, makeNuxtValidationErrorParser } from '../../src/runtime/core'

import type { LaravelPrecognitiveError, LaravelPrecognitiveErrorResponse, NuxtPrecognitiveError, NuxtPrecognitiveErrorResponse } from './types'
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
    enableClientLaravelErrorParser: true,
    enableClientNuxtErrorParser: true,
    enableServerLaravelErrorParser: true,
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
  ])('resolveValidationErrorData returns errors data when receive Nuxt Precognitive Error', (errors) => {
    const error = makeNuxtPrecognitiveError(errors)

    expect(resolveValidationErrorData(error, [
      makeLaravelValidationErrorParser(config),
      makeNuxtValidationErrorParser(config),
    ])?.errors).toEqual(errors)
  })

  it.each([
    { a: 'error', b: ['error', 'error'] },
  ])('resolveValidationErrorData returns errors data when receive Laravel Precognitive Error', (errors) => {
    const error = makeLaravelPrecognitiveError(errors)

    expect(resolveValidationErrorData(error, [
      makeLaravelValidationErrorParser(config),
      makeNuxtValidationErrorParser(config),
    ])?.errors).toEqual(errors)
  })
})
