import type { ValidationErrors } from './core'
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
  errors: Map<string, string>
  validatedKeys: NestedKeyOf<TData>[]
  processing: boolean
  validating: boolean
  disabled: () => boolean
  error: (key?: NestedKeyOf<TData>) => string | undefined
  validate: (...keys: NestedKeyOf<TData>[]) => void
  reset: () => void
  submit: (options?: SubmitOptions<TData, Tresp>) => Promise<Tresp>
  valid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  invalid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touched: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touch: (...key: (NestedKeyOf<TData>)[]) => void
  forgetErrors: (...keys: (NestedKeyOf<TData>)[]) => void
  setErrors: (errors: ValidationErrors) => void
}

export interface UseFormOptions<TData extends object> {
  validationHeaders?: Headers
  validationTimeout?: number
  backendValidation?: boolean
  validateFiles?: boolean
  onBeforeValidation?: (data: TData) => boolean
  onValidationError?: (error: Error, data: TData, keys: NestedKeyOf<TData>[]) => Promise<void> | void
  onValidationSuccess?: (data: TData) => Promise<void> | void
}
