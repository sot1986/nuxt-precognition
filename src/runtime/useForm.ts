import { cloneDeep } from 'lodash-es'
import type { Form, UseFormOptions } from './types/form'
import { getAllNestedKeys, resolveDynamicObject, resolveValidationErrorData } from './core'
import { makeValidator } from './validator'
import type { NestedKeyOf } from './types/utils'
import type { ValidationErrorsData } from './types/core'
import { reactive, toRaw } from '#imports'

export function useForm<TData extends object, TResp>(
  init: TData | (() => TData),
  cb: (form: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
): TData & Form<TData, TResp> {
  const keys: (keyof TData)[] = Object.keys(resolveDynamicObject(init)) as (keyof TData)[]

  function getInitialData(): TData {
    return cloneDeep(toRaw(resolveDynamicObject(init)))
  }

  const validator = makeValidator(cb, options)

  const form = reactive<TData & Form<TData, TResp>>({
    ...getInitialData(),
    data: () => {
      const data = cloneDeep(toRaw(form))
      Object.keys(data).forEach((key) => {
        if (keys.includes(key as keyof TData))
          return
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete data[key as keyof typeof data]
      })
      return data
    },
    processing: false,
    validating: false,
    disabled: () => form.processing || form.validating,
    setData: (data) => {
      Object.assign(form, data)
      return form
    },
    validatedKeys: [],
    errors: {},
    error: null,
    validate(...keys: NestedKeyOf<TData>[]) {
      if (form.validating)
        return form
      form.validating = true
      validator.validate(form, ...keys)
      return form
    },
    reset() {
      Object.assign(this, getInitialData())
      form.errors = {}
      form.validatedKeys = []
      return form
    },
    async submit(o) {
      if (form.processing)
        return

      const data = form.data()
      try {
        const onBefore = o?.onBefore ? await o.onBefore(data) : true

        if (!onBefore)
          return

        form.processing = true

        const resp = await cb(data, o?.headers ?? new Headers())

        if (o?.onSuccess)
          await o.onSuccess(resp, data)
      }
      catch (error) {
        const e = error instanceof Error ? error : new Error('Invalid form')

        const errorsData = resolveValidationErrorData(e, validator.errorParsers)

        if (errorsData)
          form.setErrors(errorsData)

        if (o?.onError)
          await o?.onError(e, data)
      }
      finally {
        form.processing = false
      }
    },
    valid: (...keys) => {
      if (keys.length === 0)
        return Object.values(form.errors).reduce<boolean>((acc, error) => acc && !!error, true)

      return keys.reduce((acc, key) => acc && (form.validatedKeys.includes(key) && !form.errors[key]), true)
    },
    invalid: (...keys) => {
      if (keys.length === 0)
        return Object.values(form.errors).reduce<boolean>((acc, error) => acc || !!error, false)

      return keys.reduce((acc, key) => acc || (form.validatedKeys.includes(key) && !!form.errors[key]), false)
    },
    touched: (...keys) => {
      if (keys.length === 0)
        return form.validatedKeys.length > 0

      return keys.reduce((acc, key) => acc && form.validatedKeys.includes(key), true)
    },
    touch(...keys) {
      if (keys.length === 0) {
        getAllNestedKeys(form.data()).forEach(key => form.touch(key))
        return form
      }
      keys.forEach((key) => {
        if (!form.validatedKeys.includes(key))
          form.validatedKeys.push(key)
      })

      return form
    },
    forgetErrors(...keys) {
      if (keys.length === 0) {
        form.errors = {}
        form.error = null
        form.validatedKeys = []
        return form
      }
      keys.forEach((key) => {
        if (key in form.errors)
          form.errors[key] = undefined
        const index = form.validatedKeys.indexOf(key)
        if (index > -1)
          form.validatedKeys.splice(index, 1)
      })
      return form
    },
    setErrors(data: ValidationErrorsData) {
      form.errors = {}
      form.error = new Error(data.message)

      Object.keys(data.errors).forEach((key) => {
        const error = data.errors[key]
        form.errors[key as NestedKeyOf<TData>] = Array.isArray(error) ? error[0] : error
      })
      return form
    },
    validateFiles() {
      validator.setValidateFiles(true)
      return form
    },
  }) as TData & Form<TData, TResp>

  return form
}
