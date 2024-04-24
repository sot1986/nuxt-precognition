import { debounce } from 'lodash-es'
import type { DebouncedFuncLeading } from 'lodash'
import type { NestedKeyOf } from './types/utils'
import type { PrecognitiveErrorParser } from './types/core'
import type { Form, UseFormOptions } from './types/form'
import { isFile, requestPrecognitiveHeaders, resolvePrecognitiveErrorData, makeLaravelErrorParser, makeNuxtErrorParser } from './core'
import { useNuxtApp, useRuntimeConfig } from '#imports'

export function makeValidator<TData extends object, TResp>(
  cb: (data: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
): DebouncedFuncLeading<(form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) => Promise<void>> {
  const { $precognition } = useNuxtApp()
  const config = useRuntimeConfig().public.nuxtPrecognition

  const baseParsers: PrecognitiveErrorParser[] = []
  if (config.enableClientLaravelErrorParser)
    baseParsers.push(makeLaravelErrorParser(config))
  if (!config.enableClientNuxtErrorParser)
    baseParsers.push(makeNuxtErrorParser(config))

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
      const err = error instanceof Error
        ? error
        : new Error('An error occurred while validating the form. Please try again.')

      const errorData = resolvePrecognitiveErrorData(err, [
        ...baseParsers,
        ...$precognition.parsers.errorParsers,
      ])

      if (errorData)
        form.setErrors(errorData)

      const onError = options?.onValidationError ?? (() => Promise.resolve())

      await onError(err, data, keys)
    }
    finally {
      form.validating = false
      form.touch(...keys)
    }
  }

  const validator = debounce(
    validate,
    options?.validationTimeout ?? config.validationTimeout,
    { leading: true, trailing: true },
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
