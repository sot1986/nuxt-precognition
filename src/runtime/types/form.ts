import type { ValidationErrorsData } from './core'
import type { NestedKeyOf } from './utils'

interface SubmitOptions<TData extends object, TResp> {
  headers?: Headers
  onError?: (error: Error, data: TData) => Promise<never> | never
  onBefore?: (data: TData) => Promise<boolean> | boolean
  onSuccess?: <T = TResp>(resp: T, data: TData) => Promise<TResp>
}

export interface Form<TData extends object, Tresp> {
  data: () => TData
  setData: (data: TData) => void
  error: Error | null
  errors: Partial<Record<NestedKeyOf<TData>, string>>
  validatedKeys: NestedKeyOf<TData>[]
  processing: boolean
  validating: boolean
  disabled: () => boolean
  validate: (...keys: NestedKeyOf<TData>[]) => void
  reset: () => void
  submit: (options?: SubmitOptions<TData, Tresp>) => Promise<void>
  valid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  invalid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touched: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touch: (...key: (NestedKeyOf<TData>)[]) => void
  forgetErrors: (...keys: (NestedKeyOf<TData>)[]) => void
  setErrors: (errors: ValidationErrorsData) => void
}

export interface UseFormOptions<TData extends object> {
  validationHeaders?: Headers
  validationTimeout?: number
  backendValidation?: boolean
  validateFiles?: boolean
  onBeforeValidation?: (data: TData) => boolean
  clientValidation?: (data: TData) => Promise<void> | void
  onValidationError?: (error: Error, data: TData, keys: NestedKeyOf<TData>[]) => Promise<void> | void
  onValidationSuccess?: (data: TData) => Promise<void> | void
}
