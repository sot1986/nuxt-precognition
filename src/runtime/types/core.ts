export type ValidationErrors = Record<string, string | string[]>

export interface ValidationErrorsData {
  message: string
  errors: ValidationErrors
}

export type ValidationErrorParser = (error: Error) => ValidationErrorsData | undefined | null
