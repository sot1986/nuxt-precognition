import { debounce } from 'lodash-es'
import type { DebouncedFuncLeading } from 'lodash'
import type { NestedKeyOf } from './types/utils'
import type { Form, UseFormOptions } from './types/form'
import { isFile, requestPrecognitiveHeaders } from './core'
import { useNuxtApp, useRuntimeConfig } from '#imports'

export function makeValidator<TData extends object, TResp>(
  cb: (data: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
): DebouncedFuncLeading<(form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) => Promise<void>> {
  const { $precognition } = useNuxtApp()
  const config = useRuntimeConfig().public.nuxtPrecognition

  async function validate(form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) {
    const headers = requestPrecognitiveHeaders(config, options?.validationHeaders, keys)
    const data = form.data()
    try {
      const onBefore = (options?.onBeforeValidation ?? (() => true))(data)

      if (!onBefore)
        return

      const clientValidation = options?.clientValidation ?? (() => Promise.resolve())
      await clientValidation(data)

      if (options?.backendValidation ?? config.backendValidation) {
        await cb(
          (options?.validateFiles ?? config.validateFiles) ? data : withoutFiles(data),
          headers,
        )
      }

      form.forgetErrors(...keys)
      const onSuccess = (options?.onValidationSuccess ?? (() => Promise.resolve()))
      await onSuccess(data)
    }
    catch (error) {
      if (!(error instanceof Error))
        throw error

      $precognition.parsers.errorParsers.value.forEach((parser) => {
        const errorData = parser(error)
        if (errorData)
          form.setErrors(errorData)
      })

      const onError = options?.onValidationError ?? (() => Promise.resolve())
      await onError(error, data, keys)
    }
    finally {
      form.validating = false
      form.touch(...keys)
    }
  }

  const validator = debounce(
    validate,
    options?.validationTimeout ?? config.validationTimeout,
    { leading: true, trailing: false },
  )

  return validator
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
