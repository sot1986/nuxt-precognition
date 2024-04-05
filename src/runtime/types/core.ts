export type ValidationErrors = Record<string, string | string[]>

export type PrecognitiveValidationErrorStatus = 422

export interface ValidationErrorsData {
  error: string
  errors: ValidationErrors
}

export interface PrecognitiveErrorResponse extends Response {
  headers: Headers
  status: PrecognitiveValidationErrorStatus
  data: ValidationErrorsData
}

export interface PrecognitiveError extends Error {
  response: PrecognitiveErrorResponse
}

export type ErrorParser = (error: Error) => ValidationErrors | undefined
