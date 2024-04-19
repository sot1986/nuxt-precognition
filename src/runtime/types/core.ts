export type ValidationErrors = Record<string, string | string[]>

export interface ValidationErrorsData {
  message: string
  errors: ValidationErrors
}

export type PrecognitiveValidationErrorStatus = number

export type PrecognitiveValidationSuccessStatus = number

export interface PrecognitveSuccessResponse extends Response {
  headers: Headers
  status: PrecognitiveValidationSuccessStatus
}

export interface NuxtValidationErrorsData {
  data: ValidationErrorsData
}

export interface NuxtPrecognitiveErrorResponse extends Response {
  headers: Headers
  _data: NuxtValidationErrorsData
  status: PrecognitiveValidationErrorStatus
}
export interface NuxtPrecognitiveError extends Error {
  response: NuxtPrecognitiveErrorResponse
}

export interface LaravelPrecognitiveErrorResponse extends Response {
  headers: Headers
  _data: ValidationErrorsData
  status: PrecognitiveValidationErrorStatus
}

export interface LaravelPrecognitiveError extends Error {
  response: LaravelPrecognitiveErrorResponse
}

export type PrecognitiveErrorParser = (error: Error) => ValidationErrorsData | undefined | null
