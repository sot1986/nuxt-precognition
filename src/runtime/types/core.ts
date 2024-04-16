import type { FetchResponse, IFetchError } from 'ofetch'

export type ValidationErrors = Record<string, string | string[]>

export type PrecognitiveValidationErrorStatus = 422

export interface ValidationErrorsData {
  error: string
  errors: ValidationErrors
}

export interface PrecognitiveErrorResponse extends FetchResponse<unknown> {
  headers: Headers
  status: PrecognitiveValidationErrorStatus
}

export interface PrecognitiveError extends IFetchError {
  response: PrecognitiveErrorResponse
  data: { data: ValidationErrorsData }
}

export type PrecognitiveErrorParser = (error: Error) => ValidationErrorsData | undefined | null
