// Runtime-agnostic helpers shared by the app and by every server variant.
// This file must not import from `#imports`, `h3`, `nitropack` or `nuxt/server`,
// so it can be safely bundled with any server builder.
import type { ValidationErrors, ValidationErrorsData, ValidationErrorParser } from './types/core'

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

export function resolveValidationErrorData<TResp>(error: Error, parsers: ValidationErrorParser<TResp>[]) {
  return parsers.reduce<ValidationErrorsData | undefined | null>(
    (errors, parser) => errors ?? (
      typeof parser === 'function'
        ? parser(error)
        : parser.errorParser(error)
    ), null)
}

export function makeNuxtValidationErrorParser(): ValidationErrorParser {
  return error => (hasResponse(error) && hasValidationStatusCode(error.response) && hasNuxtValidationErrorsData(error.response)) ? error.response._data.data : null
}

export function makeLaravelValidationErrorParser(): ValidationErrorParser {
  return error => (hasResponse(error) && hasValidationStatusCode(error.response) && hasLaravelValidationErrorsData(error.response)) ? error.response._data : null
}
