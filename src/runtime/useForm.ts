import { cloneDeep } from 'lodash-es'
import type { Form, UseFormOptions } from './types/form'
import { getAllNestedKeys, resolveDynamicObject } from './core'
import { makeValidator } from './validator'
import type { NestedKeyOf } from './types/utils'
import type { ValidationErrorsData } from './types/core'
import { reactive, toRaw, useNuxtApp } from '#imports'

export function useForm<TData extends object, TResp>(
  init: TData | (() => TData),
  cb: (form: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions<TData>,
): TData & Form<TData, TResp> {
  const keys: (keyof TData)[] = Object.keys(resolveDynamicObject(init)) as (keyof TData)[]

  function getInitialData(): TData {
    return cloneDeep(toRaw(resolveDynamicObject(init)))
  }

  const { $precognition } = useNuxtApp()

  const validator = makeValidator(cb, options)

  const form = reactive({
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
    },
    validatedKeys: [],
    errors: new Map<string, string>(),
    errorMessage: undefined,
    error(key) {
      if (key)
        return form.errors.get(key)
      const firstKey = Array.from(form.errors.keys()).at(0)
      if (firstKey)
        return form.errors.get(firstKey)
      return undefined
    },
    validate(...keys: NestedKeyOf<TData>[]) {
      if (form.validating)
        return
      form.validating = true
      validator(form, ...keys)
    },
    reset() {
      Object.assign(this, getInitialData())
      form.errors.clear()
      form.validatedKeys = []
    },
    async submit(o) {
      if (form.processing)
        return Promise.reject(new Error('Form is currently disabled.'))

      const data = form.data()
      try {
        const onBefore = o?.onBefore ? await o.onBefore(data) : true

        if (!onBefore)
          return Promise.reject(new Error('Submission canceled'))

        form.processing = true

        const resp = await cb(data, o?.headers ?? new Headers())

        if (o?.onSuccess)
          return o.onSuccess(resp, data)

        return resp
      }
      catch (error) {
        const e = error instanceof Error ? error : new Error('Invalid form')

        $precognition.parsers.errorParsers.forEach((parser) => {
          const errorsData = parser(e)
          if (errorsData)
            form.setErrors(errorsData)
        })

        if (o?.onError)
          await o?.onError(e, data)

        return Promise.reject(e)
      }
      finally {
        form.processing = false
      }
    },
    valid: (...keys) => {
      if (keys.length === 0)
        return form.errors.size === 0

      return keys.reduce((acc, key) => acc && (form.validatedKeys.includes(key) && !form.errors.has(key)), true)
    },
    invalid: (...keys) => {
      if (keys.length === 0)
        return form.errors.size > 0

      return keys.reduce((acc, key) => acc || (form.validatedKeys.includes(key) && form.errors.has(key)), false)
    },
    touched: (...keys) => {
      if (keys.length === 0)
        return form.validatedKeys.length > 0

      return keys.reduce((acc, key) => acc && form.validatedKeys.includes(key), true)
    },
    touch(...keys) {
      if (keys.length === 0) {
        getAllNestedKeys(form.data()).forEach(key => form.touch(key))
        return
      }
      keys.forEach((key) => {
        if (!form.validatedKeys.includes(key))
          form.validatedKeys.push(key)
      })
    },
    forgetErrors(...keys) {
      if (keys.length === 0) {
        form.errors.clear()
        form.errorMessage = undefined
        form.validatedKeys = []
        return
      }
      keys.forEach((key) => {
        form.errors.delete(key)
        const index = form.validatedKeys.indexOf(key)
        if (index > -1)
          form.validatedKeys.splice(index, 1)
      })
    },
    setErrors(data: ValidationErrorsData) {
      form.errors.clear()
      form.errorMessage = data.message

      for (const [key, value] of Object.entries(data.errors)) {
        if (form.errors.has(key))
          continue
        form.errors.set(key, Array.isArray(value) ? (value.at(0) ?? data.message) : value)
      }
    },
  }) as TData & Form<TData, TResp>

  return form
}
