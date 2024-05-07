import type { ValidationErrorsData } from '../../src/runtime/types/core'

export interface NuxtPrecognitiveErrorResponse extends Response {
  _data: { data: ValidationErrorsData }
}
export interface NuxtPrecognitiveError extends Error {
  response: NuxtPrecognitiveErrorResponse
}

export interface LaravelPrecognitiveErrorResponse extends Response {
  _data: ValidationErrorsData
}

export interface LaravelPrecognitiveError extends Error {
  response: LaravelPrecognitiveErrorResponse
}
