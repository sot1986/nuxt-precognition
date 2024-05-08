import { debounce } from 'lodash-es'
import type { DebouncedFuncLeading } from 'lodash'
import defu from 'defu'
import type { NestedKeyOf, ErrorStatusCode } from './types/utils'
import type { ValidationErrorParser } from './types/core'
import type { ClientStatusHandlers, Form, UseFormOptions } from './types/form'
import { isFile, requestPrecognitiveHeaders, resolveValidationErrorData, makeLaravelValidationErrorParser, makeNuxtValidationErrorParser, hasResponse } from './core'
import { useNuxtApp, useRuntimeConfig } from '#imports'

export function makeValidator<TData extends object, TResp>(
  cb: (data: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
): {
    validate: DebouncedFuncLeading<(form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) => Promise<void>>
    errorParsers: ValidationErrorParser[]
    setValidateFiles: (value: boolean) => void
    statusHandlers: ClientStatusHandlers
  } {
  const { $precognition } = useNuxtApp()
  const config = useRuntimeConfig().public.precognition
  const validateOptions = defu(options, config)

  const errorParsers = [
    ...$precognition.errorParsers,
    ...(validateOptions?.clientErrorParsers ?? []),
  ]
  if (validateOptions.enableLaravelClientErrorParser)
    errorParsers.push(makeLaravelValidationErrorParser(validateOptions))
  if (validateOptions.enableNuxtClientErrorParser)
    errorParsers.push(makeNuxtValidationErrorParser(validateOptions))

  const statusHandlers = { ...$precognition.statusHandlers, ...options?.statusHandlers }
  const validate = debounce(
    async function (form: TData & Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) {
      const headers = requestPrecognitiveHeaders(validateOptions, validateOptions.validationHeaders, keys)
      const data = form.data()
      try {
        const onBefore = (validateOptions?.onBeforeValidation ?? (() => true))(data)
        if (!onBefore)
          return

        form.validating = true
        form.error = null

        const onValidationStart = validateOptions.onValidationStart ?? (() => Promise.resolve())
        await onValidationStart(data)

        const clientValidation = validateOptions?.clientValidation ?? (() => Promise.resolve())
        await clientValidation(data)

        const backendValidation = validateOptions.backendValidation
          ? cb
          : () => Promise.resolve()
        await backendValidation(
          (validateOptions.validateFiles) ? data : withoutFiles(data),
          headers,
        )

        form.forgetErrors(...keys)
        form.touch(...keys)
        const onSuccess = (validateOptions?.onValidationSuccess ?? (() => undefined))
        return onSuccess(data)
      }
      catch (error) {
        const err = error instanceof Error
          ? error
          : new Error('An error occurred while validating the form. Please try again.')

        const statusHandler = hasResponse(err) && statusHandlers
          ? statusHandlers[`${err.response.status}` as ErrorStatusCode]
          : undefined

        if (statusHandler)
          return statusHandler(err as Error & { response: Response }, form)

        form.error = err

        const errorData = resolveValidationErrorData(err, errorParsers)

        if (errorData) {
          form.setErrors(errorData)
          form.touch(...keys)
        }

        const onError = validateOptions?.onValidationError ?? (() => undefined)
        return onError(err, data, keys)
      }
      finally {
        form.validating = false
      }
    },
    validateOptions.validationTimeout,
    { leading: true, trailing: true },
  )

  function setValidateFiles(value: boolean) {
    validateOptions.validateFiles = value
  }

  return {
    validate,
    errorParsers,
    statusHandlers,
    setValidateFiles,
  }
}

export function withoutFiles<TData extends object>(data: TData): TData {
  const copy = (Array.isArray(data) ? [] : {}) as TData
  Object.keys(data).forEach((key) => {
    const value = data[key as keyof TData]
    if (isFile(value)) {
      copy[key as keyof TData] = null as unknown as TData[keyof TData]
      return
    }

    if (typeof value === 'object' && value !== null) {
      copy[key as keyof TData] = withoutFiles(value)
      return
    }

    copy[key as keyof TData] = value
  })
  return copy
}
