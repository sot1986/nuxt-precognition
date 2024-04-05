import type { Form, UseFormOptions } from './types/form'
import { getAllNestedKeys, makeValidator, resolveDynamicObject, resolveDynamicValue } from './core'
import type { NestedKeyOf } from './types/utils'

export function useForm<TData extends object, TResp>(
  init: TData | (() => TData),
  cb: (form: TData, precognitiveHeaders: Headers) => Promise<TResp>,
  options?: UseFormOptions,
) {
  const keys: (keyof TData)[] = Object.keys(resolveDynamicObject(init)) as (keyof TData)[]

  function getInitialData(): TData {
    return structuredClone(resolveDynamicObject(init))
  }

  const form = {
    ...getInitialData(),
    data() {
      const data = {} as TData
      keys.forEach((key) => {
        data[key] = form[key as keyof typeof form] as TData[keyof TData]
      })
      return data
    },
    processing: false,
    validating: false,
    validationTimeout: options?.validationTimeout ?? 500,
    enablePrecognitiveValidation: options?.enablePrecognitiveValidation ?? false,
    disabled: () => form.processing || form.validating,
    setData(data) {
      Object.assign(form, data)
    },
    validatedKeys: [],
    errors: new Map<string, string>(),
    error(key) {
      if (key)
        return form.errors.get(key)
      const firstKey = Array.from(form.errors.keys()).at(0)
      if (firstKey)
        return form.errors.get(firstKey)
      return undefined
    },
    validate,
    reset() {
      Object.assign(this, getInitialData())
      form.errors.clear()
      deleteValidatedKeys()
    },
    async submit(o) {
      if (form.disabled())
        return Promise.reject(new Error('Form is currently disabled.'))
      try {
        // await validateForm()

        const onBefore = o?.onBefore ? await o.onBefore(form.data()) : true

        if (!onBefore)
          return Promise.reject(new Error('Submission canceled'))

        form.processing = true

        const resp = await cb(form.data(), o?.headers ?? new Headers())

        if (o?.onSuccess)
          return o.onSuccess(resp, form.data())

        return resp
      }
      catch (error) {
        const e = error instanceof Error ? error : new Error('Invalid form')

        if (o?.onError)
          await o?.onError(e, form.data())

        return Promise.reject(e)
      }
      finally {
        form.processing = false
      }
    },
    valid: (...keys) => {
      if (!form.touched(...keys))
        return false

      if (keys.length === 0)
        return form.errors.size === 0

      return keys.reduce((acc, key) => acc && !form.errors.has(key), true)
    },
    invalid: (...keys) => {
      if (!form.touched(...keys))
        return false

      if (keys.length === 0)
        return form.errors.size > 0

      return keys.reduce((acc, key) => acc || form.errors.has(key), false)
    },
    touched: (...keys) => {
      if (keys.length === 0)
        return form.validatedKeys.length > 0

      return keys.reduce((acc, key) => acc && form.validatedKeys.includes(key), true)
    },
    touch(...keys) {
      if (keys.length === 0) {
        getAllNestedKeys(form.data()).forEach(key => addValidatedKeys(key))
        return
      }

      keys.forEach(key => addValidatedKeys(key))
    },
    forgetErrors(...keys) {
      if (keys.length === 0) {
        form.errors.clear()
        deleteValidatedKeys()
        return
      }
      keys.forEach((key) => {
        form.errors.delete(key)
        deleteValidatedKeys(key)
      })
    },
  } as Form<TData, TResp>

  function addValidatedKeys(...keys: NestedKeyOf<TData>[]) {
    keys.forEach((key) => {
      if (!form.errors.has(key))
        form.validatedKeys.push(key)
    })
  }

  function deleteValidatedKeys(...keys: NestedKeyOf<TData>[]) {
    if (keys.length === 0) {
      form.validatedKeys = []
      return
    }

    keys.forEach((key) => {
      const index = form.validatedKeys.indexOf(key)
      if (index > -1)
        form.validatedKeys.splice(index, 1)
    })
  }

  const validator = makeValidator(form, options)

  function validate(...keys: NestedKeyOf<TData>[]) {
    if (form.validating)
      return
    validator(...keys)
  }
}
