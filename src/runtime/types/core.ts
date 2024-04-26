export type ValidationErrors = Record<string, string | string[]>

export interface ValidationErrorsData {
  message: string
  errors: ValidationErrors
}

export type ValidationErrorStatus = number

export type PrecognitiveValidationSuccessStatus = number

export interface NuxtValidationErrorsData {
  data: ValidationErrorsData
}

export interface NuxtPrecognitiveErrorResponse extends Response {
  _data: NuxtValidationErrorsData
}
export interface NuxtPrecognitiveError extends Error {
  response: NuxtPrecognitiveErrorResponse
}

export interface LaravelPrecognitiveErrorResponse extends Response {
  _data: ValidationErrorsData
  status: ValidationErrorStatus
}

export interface LaravelPrecognitiveError extends Error {
  response: LaravelPrecognitiveErrorResponse
}

export type ValidationErrorParser = (error: Error) => ValidationErrorsData | undefined | null
