import { debounce } from 'lodash-es'
import { ZodError } from 'zod'
import type { ErrorParser, PrecognitiveError, PrecognitiveErrorResponse, PrecognitiveValidationErrorStatus, ValidationErrors, ValidationErrorsData } from './types/core'
import type { NestedKeyOf } from './types/utils'
import type { Form, UseFormOptions } from './types/form'

export function isPrecognitiveResponseError(error: Error): error is PrecognitiveError {
  return hasPrecognitiveResponse(error)
}

function hasPrecognitiveResponse(error: Error): error is Error & { response: PrecognitiveErrorResponse } {
  return hasPrecognitiveReponse(error)
}

function hasPrecognitiveReponse(error: Error): error is Error & { response: PrecognitiveErrorResponse } {
  return hasResponse(error) && hasPrecognitiveValidationStatusCode(error.response) && hasPrecognitiveErrorHeaders(error.response) && hasValidationErrorsData(error.response)
}

function hasResponse(error: Error): error is Error & { response: Response } {
  return 'response' in error && error.response instanceof Response
}

function hasPrecognitiveValidationStatusCode(response: Response): response is Response & { status: PrecognitiveValidationErrorStatus } {
  return response.status === 422
}

function hasPrecognitiveErrorHeaders(response: Response): response is Response & { headers: Headers } {
  return response.headers.get('precognition') === 'true' && response.headers.get('precognition-success') === 'false'
}

function hasValidationErrorsData(response: Response): response is Response & { data: ValidationErrorsData } {
  return hasResponseData(response) && hasErrorMessage(response.data) && hasValidationErrors(response.data)
}

function hasResponseData(response: Response): response is Response & { data: NonNullable<object> } {
  return 'data' in response && typeof response.data === 'object' && response.data !== null
}

function hasErrorMessage(data: Partial<ValidationErrorsData>): data is { error: string } {
  return 'error' in data && typeof data.error === 'string'
}

function hasValidationErrors(data: Partial<ValidationErrorsData>): data is Partial<ValidationErrorsData> & { errors: ValidationErrors } {
  if (!('errors' in data) || typeof data.errors !== 'object' || !data.errors)
    return false
  const allObjectKeysAreStrings = Object.keys(data.errors).every(key => typeof key === 'string')
  const allObjectValuesAreStringsOrArrays = Object.values(data.errors).every(value => (typeof value === 'string') || (Array.isArray(value) && value.every(item => typeof item === 'string')))
  return allObjectKeysAreStrings && allObjectValuesAreStringsOrArrays
}

export function resolveDynamicObject<T extends object>(object: T | (() => T)): T {
  return typeof object === 'function' ? object() : object
}

export function resolveDynamicValue<T extends string | number>(value: T | (() => T)): T {
  return typeof value === 'function' ? value() : value
}

function requestPrecognitiveHeaders(headers?: HeadersInit, keys?: string[]) {
  const h = new Headers(headers)
  h.set('Precognition', 'true')
  if (keys?.length)
    h.set('Precognition-Validate-Only', keys.join(','))
  return h
}

export function makeValidator<TData extends object, TResp>(
  form: Form<TData, TResp>,
  options?: UseFormOptions | (() => UseFormOptions),
) {
  const errorParsers: ErrorParser[] = [
    (error) => {
      if (isPrecognitiveResponseError(error))
        return error.response.data.errors
    },
    (error) => {
      if (!(error instanceof ZodError))
        return
      const errors: ValidationErrors = {}
      for (const issue of error.issues) {
        const path = issue.path.join('.')
        errors[path] = issue.message
      }
      return errors
    },
  ]

  async function validate(...keys: NestedKeyOf<TData>[]) {
    try {
      form.validating = true
      const validationHeaders = typeof options === 'function' ? options().validationHeaders : options?.validationHeaders
      const headers = requestPrecognitiveHeaders(validationHeaders, keys)
      await form.submit({ headers, validate: true })
      form.forgetErrors()
    }
    catch (error) {
      if (!(error instanceof Error))
        throw error

      errorParsers.forEach((parser) => {
        const errors = parser(error)
        if (errors)
          assignFormErrors(errors)
      })
    }
    finally {
      form.validating = false
      form.touch(...keys)
    }
  }

  function assignFormErrors(errors: ValidationErrors) {
    form.errors.clear()
    for (const [key, value] of Object.entries(errors))
      form.errors.set(key, Array.isArray(value) ? (value.at(0) ?? 'Validation error') : value)
  }

  const validator = debounce(validate, form.validationTimeout, { leading: true, trailing: false })
  return validator
}

export function getAllNestedKeys<
  TData extends object,
  TPrefix extends string | undefined = undefined,
>(
  obj: TData,
  prefix?: TPrefix,
  keys: string[] = [],
): TPrefix extends undefined ? NestedKeyOf<TData>[] : string[] {
  Object.keys(obj).forEach((key) => {
    const path = (prefix ? `${prefix}.${key}` : key)
    keys.push(path)

    const value = obj[key as keyof typeof obj]

    if (typeof value === 'object' && value !== null)
      getAllNestedKeys(value, path, keys)
  })

  return keys as TPrefix extends undefined ? NestedKeyOf<TData>[] : string[]
}
