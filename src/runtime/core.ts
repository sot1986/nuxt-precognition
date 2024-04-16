import { FetchError } from 'ofetch'
import type { FetchResponse, IFetchError } from 'ofetch'
import type { PrecognitiveError, PrecognitiveValidationErrorStatus, ValidationErrors, ValidationErrorsData } from './types/core'
import type { NestedKeyOf } from './types/utils'
import type { Config } from './types/config'

export function isPrecognitiveResponseError(error: Error, config: Config): error is PrecognitiveError {
  return isFetchError(error) && hasPrecognitiveResponse(error, config) && hasValidationErrorsData(error)
}

function isFetchError(error: Error): error is IFetchError {
  return error instanceof FetchError
}

function hasPrecognitiveResponse(error: IFetchError, config: Config): error is PrecognitiveError {
  return hasFetchErrorResponse(error) && hasPrecognitiveValidationStatusCode(error.response, config) && hasPrecognitiveErrorHeaders(error.response, config)
}

function hasFetchErrorResponse(error: IFetchError): error is IFetchError & { response: FetchResponse<unknown> } {
  return 'response' in error && !!error.response
}

function hasPrecognitiveValidationStatusCode(response: FetchResponse<unknown>, config: Config): response is FetchResponse<unknown> & { status: PrecognitiveValidationErrorStatus } {
  return response.status === config.errorStatusCode
}

function hasPrecognitiveErrorHeaders(response: FetchResponse<unknown>, config: Config): response is FetchResponse<unknown> & { headers: Headers } {
  return response.headers.get(config.precognitiveHeader) === 'true' && response.headers.get(config.successfulHeader) === 'false'
}

function hasValidationErrorsData(error: IFetchError): error is IFetchError<{ data: ValidationErrorsData }> {
  return hasErrorData(error) && hasErrorMessage(error.data.data) && hasValidationErrors(error.data.data)
}

function hasErrorData(error: IFetchError): error is IFetchError & { data: { data: Partial<ValidationErrorsData> } } {
  return typeof error.data.data === 'object' && !!error.data.data
}

function hasErrorMessage(data: Partial<ValidationErrorsData>): data is { error: string } {
  return typeof data.error === 'string'
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

export function hasPrecognitiveRequestsHeader(headers: HeadersInit, config: Config): boolean {
  return new Headers(headers).get(config.precognitiveHeader) === 'true'
}

export function requestPrecognitiveHeaders(config: Config, headers?: HeadersInit, keys?: string[]): Headers {
  const h = new Headers(headers)
  h.set(config.precognitiveHeader, 'true')
  if (keys?.length)
    h.set(config.validateOnlyHeader, keys.join(config.validatingKeysSeparator))
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
