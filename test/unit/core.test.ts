import { describe, expect, it, vi } from 'vitest'
import { FetchError, FetchResponse } from 'ofetch'
import { getAllNestedKeys, isFile, isPrecognitiveResponseError, resolveDynamicObject } from '../../src/runtime/core'
import type { ValidationErrors, ValidationErrorsData } from '~/src/runtime/types/core'

describe('test core functions', () => {
  vi.mock('#imports', () => ({
    useRuntimeConfig: () => ({
      public: {
        nuxtPrecognition: {
          precognitiveHeader: 'X-Precognitive',
          successfulHeader: 'X-Precognitive-Successful',
          validateOnlyHeader: 'X-Precognitive-Validate-Only',
          errorStatusCode: 422,
        },
      },
    }),
  }))

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

  it('isPrecognitiveResponseError returns true if error is precognitive', () => {
    const error = new FetchError<ValidationErrors>('error')
    const headers = new Headers()
    headers.set('X-Precognitive', 'true')
    headers.set('X-Precognitive-Successful', 'false')
    if (error.response?._data) {
      error.response._data = {
        error: 'error',
        errors: {
          a: 'error',
        } as any,
      }
    }
    expect(isPrecognitiveResponseError(error)).toBe(true)
  })
})
