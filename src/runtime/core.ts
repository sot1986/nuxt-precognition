import { debounce } from 'lodash-es'
import { useRuntimeConfig } from 'nuxt/app'
import type { PrecognitiveError, PrecognitiveErrorParser, PrecognitiveErrorResponse, PrecognitiveValidationErrorStatus, ValidationErrors, ValidationErrorsData } from './types/core'
import type { NestedKeyOf } from './types/utils'
import type { Form, UseFormOptions } from './types/form'

export function isPrecognitiveResponseError(error: Error): error is PrecognitiveError {
  return hasPrecognitiveResponse(error)
}

function hasPrecognitiveResponse(error: Error): error is Error & { response: PrecognitiveErrorResponse } {
  return hasPrecognitiveReponse(error)
}

function hasPrecognitiveReponse(error: Error): error is Error & { response: PrecognitiveErrorResponse } {
  return hasResponse(error) && hasPrecognitiveValidationStatusCode(error.response) && hasPrecognitiveErrorHeaders(error.response) && hasValidationErrorsData(error.response)
}

function hasResponse(error: Error): error is Error & { response: Response } {
  return 'response' in error && error.response instanceof Response
}

function hasPrecognitiveValidationStatusCode(response: Response): response is Response & { status: PrecognitiveValidationErrorStatus } {
  return response.status === 422
}

function hasPrecognitiveErrorHeaders(response: Response): response is Response & { headers: Headers } {
  const { isPrecognitiveHeader, isSuccessfulHeader } = useRuntimeConfig().public.nuxtPrecognition
  return response.headers.get(isPrecognitiveHeader) === 'true' && response.headers.get(isSuccessfulHeader) === 'false'
}

function hasValidationErrorsData(response: Response): response is Response & { data: ValidationErrorsData } {
  return hasResponseData(response) && hasErrorMessage(response.data) && hasValidationErrors(response.data)
}

function hasResponseData(response: Response): response is Response & { data: NonNullable<object> } {
  return 'data' in response && typeof response.data === 'object' && response.data !== null
}

function hasErrorMessage(data: Partial<ValidationErrorsData>): data is { error: string } {
  return 'error' in data && typeof data.error === 'string'
}

function hasValidationErrors(data: Partial<ValidationErrorsData>): data is Partial<ValidationErrorsData> & { errors: ValidationErrors } {
  if (!('errors' in data) || typeof data.errors !== 'object' || !data.errors)
    return false
  const allObjectKeysAreStrings = Object.keys(data.errors).every(key => typeof key === 'string')
  const allObjectValuesAreStringsOrArrays = Object.values(data.errors).every(value => (typeof value === 'string') || (Array.isArray(value) && value.every(item => typeof item === 'string')))
  return allObjectKeysAreStrings && allObjectValuesAreStringsOrArrays
}

export function resolveDynamicObject<T extends object>(object: T | (() => T)): T {
  return typeof object === 'function' ? object() : object
}

export function resolveDynamicValue<T extends string | number>(value: T | (() => T)): T {
  return typeof value === 'function' ? value() : value
}

export function requestPrecognitiveHeaders(headers?: HeadersInit, keys?: string[]) {
  const { isPrecognitiveHeader, validateOnlyHeader, validatingKeysSeparator } = useRuntimeConfig().public.nuxtPrecognition
  const h = new Headers(headers)
  h.set(isPrecognitiveHeader, 'true')
  if (keys?.length)
    h.set(validateOnlyHeader, keys.join(validatingKeysSeparator))
  return h
}

export function getAllNestedKeys<
  TData extends object,
  TPrefix extends string | undefined = undefined,
>(
  obj: TData,
  prefix?: TPrefix,
  keys: string[] = [],
): TPrefix extends undefined ? NestedKeyOf<TData>[] : string[] {
  Object.keys(obj).forEach((key) => {
    const path = (prefix ? `${prefix}.${key}` : key)
    keys.push(path)

    const value = obj[key as keyof typeof obj]

    if (typeof value === 'object' && value !== null)
      getAllNestedKeys(value, path, keys)
  })

  return keys as TPrefix extends undefined ? NestedKeyOf<TData>[] : string[]
}

/**
 * Determine if the value is a file.
 */
export function isFile(value: unknown): value is Blob | File | FileList {
  if (value instanceof Blob)
    return true

  if (import.meta.server)
    return false

  if (typeof File !== 'undefined' && value instanceof File)
    return true

  if (typeof FileList !== 'undefined' && value instanceof FileList)
    return true

  return false
}

export function withoutFiles<TData extends object>(data: TData): TData {
  const copy = { } as TData
  Object.keys(data).forEach((key) => {
    const value = data[key as keyof TData]
    if (isFile(value)) {
      copy[key as keyof TData] = null as unknown as TData[keyof TData]
      return
    }

    if (typeof value === 'object' && value !== null)
      copy[key as keyof TData] = withoutFiles(value)
    else
      copy[key as keyof TData] = value
  })
  return copy
}
