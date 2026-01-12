import type { ValidationErrorParser, ValidationErrorsData } from './core'
import type { NestedKeyOf, ErrorStatusCode } from './utils'

interface SubmitOptions<TData extends object, TResp> {
  headers?: Headers
  /**
   * callback triggered when error is captured
   * @param error
   * @param data
   * @returns
   */
  onError?: (error: Error, data: TData) => Promise<void> | void
  /**
   * first lifecycle hook. Useful to prevent request submission.
   * @param data
   * @returns
   */
  onBefore?: (data: TData) => Promise<boolean> | boolean
  /**
   * callback triggered before starting the request.
   * @param data
   * @returns
   */
  onStart?: (data: TData) => Promise<void> | void
  /**
   * callback triggered when no errors.
   * @param resp
   * @param data
   * @returns
   */
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

export interface UseFormOptions<TData extends object, TResp> {
  /**
   * Headers to be sent along with the precognition request (e.g. for authentication purposes).
   */
  validationHeaders?: Headers
  /**
   * Timeout in milliseconds for the validation request.
   */
  validationTimeout?: number
  /**
   * Whether to perform backend validation using a precognition request.
   */
  backendValidation?: boolean
  /**
   * Whether to send files along with the precognition request during precognitive validation.
   */
  validateFiles?: boolean
  /**
   * Called before the precognitive validation request is sent. If it returns `false`, the request is not sent.
   * @param data The form data
   * @returns Whether to proceed with the validation request
   */
  onBeforeValidation?: (data: TData) => boolean
  /**
   * Called when the precognitive validation request is started.
   * @param data The form data
   */
  onValidationStart?: (data: TData) => Promise<void> | void
  /**
   * If present, this function is called to perform client-side validation before sending the precognitive validation request.
   * It is called after `onBeforeValidation` and `onValidationStart`.
   * If it throws an error, the precognitive validation request is not sent, and the error is handled as a validation error.
   * @param data The form data
   * @returns A promise that resolves when client-side validation is complete
   */
  clientValidation?: (data: TData) => Promise<unknown> | unknown
  /**
   * Called when the precognitive validation request returns a validation error (HTTP 422) or any other error.
   * @param error The error object
   * @param data The form data
   * @param keys The keys that failed validation
   */
  onValidationError?: (error: Error, data: TData, keys: NestedKeyOf<TData>[]) => Promise<void> | void
  /**
   * Called when the precognitive validation request is successful (HTTP 204).
   * @param data The form data
   */
  onValidationSuccess?: (data: TData) => Promise<void> | void
  /**
   * Any custom error parser that should specifically be used for this form instance when handling validation errors.
   */
  clientErrorParsers?: ValidationErrorParser<TResp>[]
  /**
   * Handlers for specific client status codes.
   */
  statusHandlers?: ClientStatusHandlers
}

export {}
