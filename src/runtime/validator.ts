import { debounce } from 'lodash-es'
import type { NestedKeyOf } from './types/utils'
import type { Form, UseFormOptions } from './types/form'
import { requestPrecognitiveHeaders } from './core'
import type { ValidationErrors } from './types/core'
import { useNuxtApp, useRuntimeConfig } from '#imports'

export function makeValidator<TData extends object, TResp>(
  cb: (data: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
) {
  const { $nuxtPrecognition } = useNuxtApp()
  const { backendValidation, validationTimeout } = useRuntimeConfig().public.nuxtPrecognition

  async function validate(form: Form<TData, TResp>, ...keys: NestedKeyOf<TData>[]) {
    const headers = requestPrecognitiveHeaders(options?.validationHeaders, keys)
    const data = form.data()
    try {
      const onBefore = (options?.onBeforeValidation ?? (() => true))(data)

      if (!onBefore)
        return

      if (options?.backendValidation ?? backendValidation)
        await cb(data, headers)

      form.forgetErrors(...keys)

      const onSuccess = (options?.onValidationSuccess ?? (() => Promise.resolve()))
      return onSuccess(data)
    }
    catch (error) {
      if (!(error instanceof Error))
        throw error

      $nuxtPrecognition.parsers.errorParsers.forEach((parser) => {
        const errors = parser(error)
        if (errors)
          form.setErrors(errors)
      })

      const onError = options?.onValidationError ?? (() => Promise.resolve())
      return onError(error, data, keys)
    }
    finally {
      form.validating = false
      form.touch(...keys)
    }
  }

  const validator = debounce(
    validate,
    options?.validationTimeout ?? validationTimeout,
    { leading: true, trailing: false },
  )

  return validator
}
