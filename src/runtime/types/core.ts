export type ValidationErrors = Record<string, string | string[]>

export interface ValidationErrorsData {
  message: string
  errors: ValidationErrors
}

export type ValidationErrorParser<TResp = unknown> = ((error: Error) => ValidationErrorsData | undefined | null) | {
  errorParser: (error: Error) => ValidationErrorsData | undefined | null
  responseParser: (resp: TResp) => unknown
}

export {}
