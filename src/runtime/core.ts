import type { ValidationErrors, ValidationErrorsData, ValidationErrorParser } from './types/core'
import type { NestedKeyOf } from './types/utils'
import { createError } from '#imports'

export function hasResponse(error: Error): error is Error & { response: Response } {
  return 'response' in error && error.response instanceof Response
}

function hasValidationStatusCode(response: Response): boolean {
  return response.status === 422
}

function hasNuxtValidationErrorsData(response: Response): response is Response & { _data: {
  data: ValidationErrorsData
} } {
  return hasResponseData(response) && 'data' in response._data && typeof response._data.data === 'object' && !!response._data.data && hasErrorMessage(response._data.data) && hasValidationErrors(response._data.data)
}

function hasResponseData(response: Response): response is Response & { _data: object } {
  return ('_data' in response) && typeof response._data === 'object' && !!response._data
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

export function requestPrecognitiveHeaders(headers?: HeadersInit, keys?: string[]): Headers {
  const h = new Headers(headers)
  h.set('Precognition', 'true')
  if (keys?.length)
    h.set('Precognition-Validate-Only', keys.join(','))
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

export function isFile(value: unknown): value is Blob | File | FileList {
  if (value instanceof Blob)
    return true
  return import.meta.server
    ? (value instanceof File || value instanceof FileList)
    : false
}

export function resolveValidationErrorData(error: Error, parsers: ValidationErrorParser[]) {
  return parsers.reduce<ValidationErrorsData | undefined | null>(
    (errors, parser) => errors ?? parser(error), null,
  )
}

export function makeNuxtValidationErrorParser(): ValidationErrorParser {
  return error => (hasResponse(error) && hasValidationStatusCode(error.response) && hasNuxtValidationErrorsData(error.response)) ? error.response._data.data : null
}

export function makeLaravelValidationErrorParser(): ValidationErrorParser {
  return error => (hasResponse(error) && hasValidationStatusCode(error.response) && hasLaravelValidationErrorsData(error.response)) ? error.response._data : null
}

export function assertSuccessfulPrecognitiveResponses(
  ctx: { options: { headers?: HeadersInit }, response: Response },
) {
  if ((new Headers(ctx.options.headers)).get('Precognition') !== 'true') {
    return
  }

  const { status, headers } = ctx.response
  const hasPrecognitionHeader = headers.get('Precognition') === 'true'
  const hasPrecognitionSuccessHeader = headers.get('Precognition-Success') === 'true'

  const isSuccess = hasPrecognitionHeader && hasPrecognitionSuccessHeader && status === 204
  const isValidationError = hasPrecognitionHeader && status === 422

  if (!(isSuccess || isValidationError)) {
    throw createError({ message: 'Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route and Precognitive headers have been enabled in config/cors.php.', statusCode: 500 })
  }
}
