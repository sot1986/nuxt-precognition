import type { NuxtPrecognitiveError, PrecognitiveValidationErrorStatus, ValidationErrors, ValidationErrorsData, NuxtPrecognitiveErrorResponse, PrecognitiveValidationSuccessStatus, PrecognitveSuccessResponse, LaravelPrecognitiveErrorResponse, NuxtValidationErrorsData, PrecognitiveErrorParser } from './types/core'
import type { NestedKeyOf } from './types/utils'
import type { Config } from './types/config'

export function isPrecognitiveSuccessResponse(response: Response, config: Config): response is PrecognitveSuccessResponse {
  return hasPrecognitiveSuccessStatusCode(response, config) && hasPrecognitiveHeader(response, config) && hasPrecognitiveSuccessHeaders(response, config)
}

function hasPrecognitiveSuccessStatusCode(response: Response, config: Config): response is Response & { status: PrecognitiveValidationSuccessStatus } {
  return response.status === config.successValidationStatusCode
}

function hasPrecognitiveSuccessHeaders(response: Response, config: Config): response is Response & { headers: Headers } {
  return response.headers.get(config.successfulHeader) === 'true'
}

export function isNuxtPrecognitiveError(error: Error, config: Config): error is NuxtPrecognitiveError {
  return hasNuxtPrecognitiveResponse(error, config)
}

function hasNuxtPrecognitiveResponse(error: Error, config: Config): error is Error & { response: NuxtPrecognitiveErrorResponse } {
  return hasResponse(error) && hasPrecognitiveValidationStatusCode(error.response, config) && hasPrecognitiveHeader(error.response, config) && hasNuxtValidationErrorsData(error.response)
}

function hasResponse(error: Error): error is Error & { response: Response } {
  return 'response' in error && error.response instanceof Response
}

function hasPrecognitiveValidationStatusCode(response: Response, config: Config): response is Response & { status: PrecognitiveValidationErrorStatus } {
  return response.status === config.errorStatusCode
}

function hasPrecognitiveHeader(response: Response, config: Config): response is Response & { headers: Headers } {
  return response.headers.get(config.precognitiveHeader) === 'true'
}

function hasNuxtValidationErrorsData(response: Response): response is Response & { _data: NuxtValidationErrorsData } {
  return hasResponseData(response) && 'data' in response._data && typeof response._data.data === 'object' && !!response._data.data && hasErrorMessage(response._data.data) && hasValidationErrors(response._data.data)
}

function hasResponseData(response: Response): response is Response & { _data: object } {
  return ('_data' in response) && typeof response._data === 'object' && !!response._data
}

export function isLaravelPrecognitiveError(error: Error, config: Config): error is Error & { response: LaravelPrecognitiveErrorResponse } {
  return hasLaravelPrecognitiveResponse(error, config)
}

function hasLaravelPrecognitiveResponse(error: Error, config: Config): error is Error & { response: LaravelPrecognitiveErrorResponse } {
  return hasResponse(error) && hasPrecognitiveValidationStatusCode(error.response, config) && hasPrecognitiveHeader(error.response, config) && hasLaravelValidationErrorsData(error.response)
}

function hasLaravelValidationErrorsData(response: Response): response is Response & { _data: ValidationErrorsData } {
  return hasResponseData(response) && hasErrorMessage(response._data) && hasValidationErrors(response._data)
}

function hasErrorMessage(data: object): data is { message: string } {
  return 'message' in data && typeof data.message === 'string'
}

function hasValidationErrors(data: object): data is Partial<ValidationErrorsData> & { errors: ValidationErrors } {
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
  return import.meta.server
    ? (value instanceof File || value instanceof FileList)
    : false
}

export function resolvePrecognitiveErrorData(error: Error, parsers: PrecognitiveErrorParser[]) {
  return parsers.reduce<ValidationErrorsData | undefined | null>((errors, parser) => errors ?? parser(error), null)
}

export function makeNuxtErrorParser(config: Config): PrecognitiveErrorParser {
  return error => isNuxtPrecognitiveError(error, config) ? error.response._data.data : null
}

export function makeLaravelErrorParser(config: Config): PrecognitiveErrorParser {
  return error => isLaravelPrecognitiveError(error, config) ? error.response._data : null
}
