import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assertSuccessfulPrecognitiveResponses, getAllNestedKeys, isFile, resolveDynamicObject, requestPrecognitiveHeaders, resolveValidationErrorData, makeLaravelValidationErrorParser, makeNuxtValidationErrorParser } from '../../src/runtime/core'

import type { LaravelPrecognitiveError, LaravelPrecognitiveErrorResponse, NuxtPrecognitiveError, NuxtPrecognitiveErrorResponse } from './types'

describe('test core functions', () => {
  function makeNuxtPrecognitiveError(errors: Record<string, string | string[]> = {}): NuxtPrecognitiveError {
    const headers = new Headers()
    headers.set('Precognition', 'true')
    const response = new Response(null, { headers, status: 422 }) as NuxtPrecognitiveErrorResponse
    response._data = { data: { message: 'error', errors } }
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response
    return error
  }

  function makeLaravelPrecognitiveError(errors: Record<string, string | string[]> = {}): LaravelPrecognitiveError {
    const headers = new Headers()
    headers.set('Precognition', 'true')
    const response = new Response(null, { headers, status: 422 }) as LaravelPrecognitiveErrorResponse
    response._data = { message: 'error', errors }
    const error = new Error('error') as LaravelPrecognitiveError
    error.response = response
    return error
  }

  beforeEach(() => {
    vi.mock('#imports', () => ({
      createError: (payload: string | { message: string, statusCode?: number }) => {
        if (typeof payload === 'string')
          return new Error(payload)

        return new Error(payload.message)
      },
    }))
  })

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
    const h = requestPrecognitiveHeaders(headers, keys)

    expect(h.get('Precognition')).toBe('true')
    expect(h.get('Precognition-Validate-Only')).toBe(expected)
    expect(h.get('Precognition-Success')).toBe(null)
  })

  it.each([
    { a: 'error', b: ['error', 'error'] },
  ])('resolveValidationErrorData returns errors data when receive Nuxt Precognitive Error', (errors) => {
    const error = makeNuxtPrecognitiveError(errors)

    expect(resolveValidationErrorData(error, [
      makeLaravelValidationErrorParser(),
      makeNuxtValidationErrorParser(),
    ])?.errors).toEqual(errors)
  })

  it.each([
    { a: 'error', b: ['error', 'error'] },
  ])('resolveValidationErrorData returns errors data when receive Laravel Precognitive Error', (errors) => {
    const error = makeLaravelPrecognitiveError(errors)

    expect(resolveValidationErrorData(error, [
      makeLaravelValidationErrorParser(),
      makeNuxtValidationErrorParser(),
    ])?.errors).toEqual(errors)
  })

  it('assertSuccessfulPrecognitiveResponses does not throw when precognition header is set on response and request', () => {
    const ctx = {
      options: { headers: { Precognition: 'true' } },
      response: new Response(
        null,
        {
          headers: { 'Precognition': 'true', 'Precognition-Success': 'true' },
          status: 204,
        },
      ),
    }
    expect(() => {
      assertSuccessfulPrecognitiveResponses(ctx)
    }).not.toThrow()
  })

  it('assertSuccessfulPrecognitiveResponses does not throw when precognition header is set on response and request and response return validation errors with status 422', () => {
    const ctx = {
      options: { headers: { Precognition: 'true' } },
      response: new Response(
        null,
        {
          headers: { 'Precognition': 'true' },
          status: 422,
        },
      ),
    }
    expect(() => {
      assertSuccessfulPrecognitiveResponses(ctx)
    }).not.toThrow()
  })

  it.each([
    new Response(null, { status: 204 }),
    new Response(null, { headers: { Precognition: 'true' }, status: 204 }),
    new Response(null, { headers: { 'Precognition': 'true', 'Precognition-Success': 'true' }, status: 200 }),
  ])('assertSuccessfulPrecognitiveResponses does throw an error if response is not compatible with successfull precognitive requirements', (response) => {
    const ctx = {
      options: { headers: { Precognition: 'true' } },
      response,
    }
    expect(() => {
      assertSuccessfulPrecognitiveResponses(ctx)
    }).toThrow('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route and Precognitive headers have been enabled in config/cors.php.')
  })

  it.each([
    { options: { headers: {} }, response: new Response(null, { status: 204 }) },
    { options: { headers: new Headers([['Accept', 'application/json']]) }, response: new Response(null, { status: 200 }) },
  ])('assertSuccessfulPrecognitiveResponses does not throw when precognition header is not set on request', (ctx) => {
    expect(() => {
      assertSuccessfulPrecognitiveResponses(ctx)
    }).not.toThrow()
  })
})
