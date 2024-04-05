import type { NestedKeyOf } from './utils'

interface SubmitOptions<TData extends object, TResp> {
  headers?: Headers
  validate?: boolean
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
  validationTimeout: Readonly<number>
  enablePrecognitiveValidation: boolean
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
}

export interface UseFormOptions {
  validationHeaders?: Headers
  validationTimeout?: number
  enablePrecognitiveValidation?: boolean
}
