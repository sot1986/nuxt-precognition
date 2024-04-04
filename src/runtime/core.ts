import type { PrecognitiveError, PrecognitiveErrorResponse, PrecognitiveValidationErrorStatus, ValidationErrors, ValidationErrorsData } from './types/core'

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
  return response.headers.get('precognition') === 'true' && response.headers.get('precognition-success') === 'false'
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
