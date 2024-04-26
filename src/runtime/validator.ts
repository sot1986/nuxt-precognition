import { debounce } from 'lodash-es'
import type { DebouncedFuncLeading } from 'lodash'
import defu from 'defu'
import type { NestedKeyOf } from './types/utils'
import type { ValidationErrorParser } from './types/core'
import type { Form, UseFormOptions } from './types/form'
import { isFile, requestPrecognitiveHeaders, resolveValidationErrorData, makeLaravelValidationErrorParser, makeNuxtValidationErrorParser } from './core'
import { useNuxtApp, useRuntimeConfig } from '#imports'

export function makeValidator<TData extends object, TResp>(
  cb: (data: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
): {
    validate: DebouncedFuncLeading<(form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) => Promise<void>>
    errorParsers: ValidationErrorParser[]
    setValidateFiles: (value: boolean) => void
  } {
  const { $precognition } = useNuxtApp()
  const config = useRuntimeConfig().public.nuxtPrecognition
  const validateOptions = defu(options, config)

  const errorParsers = [
    ...$precognition.parsers.errorParsers,
    ...(validateOptions?.clientErrorParsers ?? []),
  ]
  if (validateOptions.enableClientLaravelErrorParser)
    errorParsers.push(makeLaravelValidationErrorParser(validateOptions))
  if (validateOptions.enableClientNuxtErrorParser)
    errorParsers.push(makeNuxtValidationErrorParser(validateOptions))

  const validate = debounce(
    async function (form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) {
      const headers = requestPrecognitiveHeaders(validateOptions, validateOptions.validationHeaders, keys)
      const data = form.data()
      try {
        const onBefore = (validateOptions?.onBeforeValidation ?? (() => true))(data)
        if (!onBefore)
          return

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
        const onSuccess = (validateOptions?.onValidationSuccess ?? (() => Promise.resolve()))
        await onSuccess(data)
      }
      catch (error) {
        const err = error instanceof Error
          ? error
          : new Error('An error occurred while validating the form. Please try again.')

        const errorData = resolveValidationErrorData(err, errorParsers)

        if (errorData)
          form.setErrors(errorData)

        const onError = validateOptions?.onValidationError ?? (() => Promise.resolve())

        await onError(err, data, keys)
      }
      finally {
        form.validating = false
        form.touch(...keys)
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
