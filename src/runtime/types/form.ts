import type { ValidationErrorParser, ValidationErrorsData } from './core'
import type { NestedKeyOf, ErrorStatusCode } from './utils'

interface SubmitOptions<TData extends object, TResp> {
  headers?: Headers
  onError?: (error: Error, data: TData) => Promise<void> | void
  onBefore?: (data: TData) => Promise<boolean> | boolean
  onStart?: (data: TData) => Promise<void> | void
  onSuccess?: (resp: TResp, data: TData) => Promise<void> | void
}

export interface Form<TData extends object, Tresp> {
  data: () => TData
  setData: (data: TData) => TData & Form<TData, Tresp>
  error: Error | null
  errors: Partial<Record<NestedKeyOf<TData>, string>>
  validatedKeys: NestedKeyOf<TData>[]
  processing: boolean
  validating: boolean
  disabled: () => boolean
  validate: (...keys: NestedKeyOf<TData>[]) => TData & Form<TData, Tresp>
  reset: () => TData & Form<TData, Tresp>
  submit: (options?: SubmitOptions<TData, Tresp>) => Promise<void>
  valid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  invalid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touched: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touch: (...key: (NestedKeyOf<TData>)[]) => TData & Form<TData, Tresp>
  forgetErrors: (...keys: (NestedKeyOf<TData>)[]) => TData & Form<TData, Tresp>
  setErrors: (errors: ValidationErrorsData) => TData & Form<TData, Tresp>
  validateFiles(): TData & Form<TData, Tresp>
}

export type ClientStatusHandlers = Partial<Record<ErrorStatusCode, <TData extends object, TResp>(error: Error & { response: Response }, form: TData & Form<TData, TResp>) => void | Promise<void>>>

export interface UseFormOptions<TData extends object> {
  validationHeaders?: Headers
  validationTimeout?: number
  backendValidation?: boolean
  validateFiles?: boolean
  onBeforeValidation?: (data: TData) => boolean
  onValidationStart?: (data: TData) => Promise<void> | void
  clientValidation?: (data: TData) => Promise<void> | void
  onValidationError?: (error: Error, data: TData, keys: NestedKeyOf<TData>[]) => Promise<void> | void
  onValidationSuccess?: (data: TData) => Promise<void> | void
  clientErrorParsers?: ValidationErrorParser[]
  statusHandlers?: ClientStatusHandlers
}

export {}
