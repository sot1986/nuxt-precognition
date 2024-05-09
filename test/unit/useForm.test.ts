import { afterEach, beforeEach, describe, it, vi, expect } from 'vitest'
import { reactive, toRaw } from 'vue'
import { useForm } from '../../src/runtime/useForm'
import type { Config } from '../../src/runtime/types/config'
import type { NuxtPrecognitiveError, NuxtPrecognitiveErrorResponse } from './types'
import type { ClientStatusHandlers } from '~/src/runtime/types/form'

describe ('test useForm composable', () => {
  const initialData = () => ({
    name: 'John Doe',
    email: 'john@email.it',
    age: 30,
    address: {
      street: 'Main St',
      city: 'Springfield',
    },
    skills: ['JS', 'TS'],
    avatar: null as Blob | null,
  })

  function makeNuxtPrecognitiveError(errors: Record<string, string | string[]> = {}): NuxtPrecognitiveError {
    const headers = new Headers()
    headers.set('Precognition', 'true')
    const response = new Response(null, { headers, status: 422 }) as NuxtPrecognitiveErrorResponse
    response._data = { data: { message: 'error', errors } }
    const error = new Error('error') as NuxtPrecognitiveError
    error.response = response
    return error
  }

  beforeEach(() => {
    vi.mock('#imports', () => ({
      useNuxtApp: () => ({
        $precognition: {
          errorParsers: [],
          statusHandlers: {
            401: (error, form) => {
              form.error = error
              form.error.message = 'Unauthorized'
            },
            403: (error, form) => {
              form.error = error
              form.error.message = 'Forbidden'
            },
          } as ClientStatusHandlers,
        },
      }),
      useRuntimeConfig: () => ({
        public: {
          precognition: {
            validationTimeout: 1000,
            backendValidation: true,
            validateFiles: false,
            enableLaravelClientErrorParser: true,
            enableNuxtClientErrorParser: true,
            enableLaravelServerErrorParser: true,
          } as Config,
        },
      }),
      reactive,
      toRaw,
    }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    initialData,
    initialData(),
  ])('create a form with initial data', (init) => {
    const form = useForm(init, () => Promise.resolve())

    expect(form.name).toBe('John Doe')
    expect(form.email).toBe('john@email.it')
    expect(form.age).toBe(30)
    expect(form.address.street).toBe('Main St')
    expect(form.address.city).toBe('Springfield')
    expect(form.skills).toEqual(['JS', 'TS'])
    expect(form.skills.at(0)).toBe('JS')
    expect(form.skills.at(1)).toBe('TS')
    expect(form.avatar).toBe(null)
    expect(form.data()).toEqual({
      name: 'John Doe',
      email: 'john@email.it',
      age: 30,
      address: {
        street: 'Main St',
        city: 'Springfield',
      },
      skills: ['JS', 'TS'],
      avatar: null,
    })
    expect(form.processing).toBe(false)
    expect(form.validating).toBe(false)
    expect(form.error).toBe(null)
    expect(form.errors).toEqual({})
    expect(form.validatedKeys).toEqual([])
  })

  it.each([
    initialData,
    initialData(),
  ])('setData method updates form data', (init) => {
    const form = useForm(init, () => Promise.resolve())

    form.setData({
      name: 'Jane Doe',
      email: 'new-email@gmail.it',
      age: 25,
      address: {
        street: 'Elm St',
        city: 'Springfield',
      },
      skills: ['JS', 'TS', 'CSS'],
      avatar: new Blob(),
    })

    expect(form.name).toBe('Jane Doe')
    expect(form.email).toBe('new-email@gmail.it')
    expect(form.age).toBe(25)
    expect(form.address.street).toBe('Elm St')
    expect(form.address.city).toBe('Springfield')
    expect(form.skills).toEqual(['JS', 'TS', 'CSS'])
    expect(form.skills.at(0)).toBe('JS')
    expect(form.skills.at(1)).toBe('TS')
    expect(form.skills.at(2)).toBe('CSS')
    expect(form.avatar).toBeInstanceOf(Blob)
  })

  it('reset method resets form data', () => {
    const form = useForm(initialData, () => Promise.resolve())

    form.setData({
      name: 'Jane Doe',
      email: 'new-email@gmail.it',
      age: 25,
      address: {
        street: 'Elm St',
        city: 'Springfield',
      },
      skills: ['JS', 'TS', 'CSS'],
      avatar: new Blob(),
    })

    form.reset()
    expect(form.name).toBe('John Doe')
    expect(form.email).toBe('john@email.it')
    expect(form.age).toBe(30)
    expect(form.address.street).toBe('Main St')
    expect(form.address.city).toBe('Springfield')
    expect(form.skills).toEqual(['JS', 'TS'])
    expect(form.avatar).toBe(null)
  })

  it('validate method calls cb with the precognitive headers headers', async () => {
    const initialData: { name: string, age: number, skills: string[], avatar: null | Blob } = {
      name: 'John Doe',
      age: 30,
      skills: ['JS', 'TS'],
      avatar: null,
    }
    const expects = {
      validateOnly: '',
      count: 0,
      data: {
        keys: [] as (keyof typeof initialData)[],
        values: [] as unknown[],
      },
    }

    async function cb(data: typeof initialData, headers: Headers) {
      expect(headers.get('Precognition')).toBe('true')
      expect(headers.get('Precognition-Validate-Only')).toBe(expects.validateOnly)
      expects.data.keys.forEach((key, i) => {
        expect(data[key]).toEqual(expects.data.values[i])
      })
      expects.count++
      return Promise.resolve()
    }
    const form = useForm(initialData, cb)

    expects.count = 0

    form.name = 'Jane Doe'
    expects.validateOnly = 'name'
    expects.data = { keys: ['name'], values: ['Jane Doe'] }
    form.validate('name')
    await vi.runOnlyPendingTimersAsync()

    expect(expects.count).toBe(1)
    expect(form.touched('name')).toBe(true)
    expect(form.touched('age')).toBe(false)
    expect(form.validatedKeys).toEqual(['name'])
    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.valid('age')).toBe(false)
    expect(form.invalid('age')).toBe(false)

    expects.validateOnly = 'name,age'
    form.age = 25
    expects.data = { keys: ['name', 'age'], values: ['Jane Doe', 25] }
    form.validate('name', 'age')
    await vi.runOnlyPendingTimersAsync()
    expect(expects.count).toBe(2)
    expect(form.touched('name')).toBe(true)
    expect(form.touched('age')).toBe(true)
    expect(form.validatedKeys).toEqual(['name', 'age'])
    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.valid('age')).toBe(true)
    expect(form.invalid('age')).toBe(false)

    form.avatar = new Blob()
    form.skills.push('CSS')
    expects.validateOnly = 'skills'
    expects.data = { keys: ['skills', 'avatar'], values: [['JS', 'TS', 'CSS'], null] }
    form.validate('skills')
    await vi.runOnlyPendingTimersAsync()
    expect(expects.count).toBe(3)
  })

  it('can validate all fields', async () => {
    const initialData = {
      name: 'John Doe',
      email: 'john@email.it',
      age: 30,
      address: {
        street: 'Main St',
        city: 'Springfield',
      },
    }

    const expects = {
      validateOnly: '',
      count: 0,
      data: {
        keys: [] as (keyof typeof initialData)[],
        values: [] as unknown[],
      },
    }

    async function cb(data: typeof initialData, headers: Headers) {
      expect(headers.get('Precognition')).toBe('true')
      if (expects.validateOnly)
        expect(headers.get('Precognition-Validate-Only')).toBe(expects.validateOnly)
      expects.data.keys.forEach((key, i) => {
        expect(data[key]).toEqual(expects.data.values[i])
      })
      expects.count++
      return Promise.resolve()
    }

    const form = useForm(initialData, cb)

    expects.count = 0
    form.validate()
    await vi.runOnlyPendingTimersAsync()
    expect(expects.count).toBe(1)
    expect(form.validatedKeys).toEqual(['name', 'email', 'age', 'address', 'address.street', 'address.city'])
    expect(form.valid('name', 'email', 'age', 'address', 'address.street', 'address.city')).toBe(true)
    expect(form.invalid('name', 'email', 'age', 'address', 'address.street', 'address.city')).toBe(false)
    expect(form.touched('name', 'email', 'age', 'address', 'address.street', 'address.city')).toBe(true)
    expect(form.touched('name')).toBe(true)
    expect(form.touched('email')).toBe(true)
    expect(form.touched('age')).toBe(true)
    expect(form.touched('address')).toBe(true)
    expect(form.touched('address.street')).toBe(true)
    expect(form.touched('address.city')).toBe(true)
    expect(form.valid('name')).toBe(true)
    expect(form.valid('email')).toBe(true)
    expect(form.valid('age')).toBe(true)
    expect(form.valid('address')).toBe(true)
    expect(form.valid('address.street')).toBe(true)
    expect(form.valid('address.city')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.invalid('email')).toBe(false)
    expect(form.invalid('age')).toBe(false)
    expect(form.invalid('address')).toBe(false)
    expect(form.invalid('address.street')).toBe(false)
    expect(form.invalid('address.city')).toBe(false)
    expect(form.valid()).toBe(true)
    expect(form.invalid()).toBe(false)
  })

  it('can validate files', async () => {
    const initialData = {
      name: 'John Doe',
      avatar: null as Blob | null,
    }

    const expects = {
      validateOnly: '',
      count: 0,
      expectation: (_value: typeof initialData, _headers: Headers) => undefined,
    }

    async function cb(data: typeof initialData, headers: Headers) {
      expects.expectation(data, headers)
      expects.count++
      return Promise.resolve()
    }

    const form = useForm(initialData, cb, { validateFiles: true })

    expects.expectation = (data, headers) => {
      expect(headers.get('Precognition')).toBe('true')
      expect(headers.get('Precognition-Validate-Only')).toBe('avatar')
      expect(data.name).toBe('John Doe')
      expect(data.avatar).toBeInstanceOf(Blob)
    }

    form.avatar = new Blob()
    form.validate('avatar')
    await vi.runOnlyPendingTimersAsync()
    expect(expects.count).toBe(1)
  })

  it('validate files can be triggered dynamically', async () => {
    const initialData = {
      name: 'John Doe',
      avatar: null as Blob | null,
    }

    const expects = {
      validateOnly: '',
      count: 0,
      expectation: (_value: typeof initialData, _headers: Headers) => undefined,
    }

    async function cb(data: typeof initialData, headers: Headers) {
      expects.expectation(data, headers)
      expects.count++
      return Promise.resolve()
    }

    const form = useForm(initialData, cb, { validateFiles: false })

    expects.expectation = (data, headers) => {
      expect(headers.get('Precognition')).toBe('true')
      expect(headers.get('Precognition-Validate-Only')).toBe('avatar')
      expect(data.name).toBe('John Doe')
      expect(data.avatar).toBeInstanceOf(Blob)
    }

    form.avatar = new Blob()
    form.validateFiles().validate('avatar')
    await vi.runOnlyPendingTimersAsync()
    expect(expects.count).toBe(1)
  })

  it('set errors in case of validation error', async () => {
    const initialData = {
      name: '',
      email: '',
    }
    const precognitiveFullError = makeNuxtPrecognitiveError({
      name: 'The name is required',
      email: 'The email is required',
    })

    const precognitivePartialNameError = makeNuxtPrecognitiveError({
      name: 'The name is required',
    })

    const precognitivePartialEmailError = makeNuxtPrecognitiveError({
      email: 'The email is required',
    })

    async function cb(data: typeof initialData, _headers: Headers) {
      if (!data.name && !data.email)
        return Promise.reject(precognitiveFullError)

      if (!data.name)
        return Promise.reject(precognitivePartialNameError)

      if (!data.email)
        return Promise.reject(precognitivePartialEmailError)

      return Promise.resolve()
    }

    const form = useForm(initialData, cb)

    form.validate()
    await vi.runOnlyPendingTimersAsync()
    expect(form.valid('name')).toBe(false)
    expect(form.invalid('name')).toBe(true)
    expect(form.valid('email')).toBe(false)
    expect(form.invalid('email')).toBe(true)
    expect(form.errors).toEqual({
      name: 'The name is required',
      email: 'The email is required',
    })

    form.name = 'John Doe'
    form.validate()
    await vi.runOnlyPendingTimersAsync()

    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.valid('email')).toBe(false)
    expect(form.invalid('email')).toBe(true)

    form.email = 'some-email@mail.it'

    form.validate()
    await vi.runOnlyPendingTimersAsync()
    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.valid('email')).toBe(true)
    expect(form.invalid('email')).toBe(false)
  })

  it('submit method set errors event without setting precognitive headers', async () => {
    const initialData = {
      name: '',
      email: '',
    }
    const precognitiveFullError = makeNuxtPrecognitiveError({
      name: 'The name is required',
      email: 'The email is required',
    })

    async function cb(data: typeof initialData, _headers: Headers) {
      if (!data.name && !data.email)
        return Promise.reject(precognitiveFullError)

      return Promise.resolve()
    }

    const form = useForm(initialData, cb)

    await form.submit()
    await vi.runOnlyPendingTimersAsync()
    expect(form.processing).toBe(false)
    expect(form.validating).toBe(false)
    expect(form.errors).toEqual({
      name: 'The name is required',
      email: 'The email is required',
    })
  })

  it('triggers submit events in correct order on success', async () => {
    const initialData = {
      name: 'John Doe',
      email: 'john@email.it',
    }

    const hook: string[] = []
    const cb = () => {
      hook.push('cb')
      return Promise.resolve()
    }

    const form = useForm(initialData, cb)

    await form.submit({
      onBefore: () => {
        hook.push('onBefore')
        return true
      },
      onStart: () => {
        hook.push('onStart')
        return Promise.resolve()
      },
      onSuccess: () => {
        hook.push('onSuccess')
        return Promise.resolve()
      },
    })

    expect(hook).toEqual(['onBefore', 'onStart', 'cb', 'onSuccess'])
  })

  it('triggers submit events in correct order on error', async () => {
    const initialData = {
      name: 'John Doe',
      email: 'john@email.it',
    }

    const hook: string[] = []
    const cb = () => {
      hook.push('cb')
      return Promise.reject(new Error('error'))
    }

    const form = useForm(initialData, cb)

    await form.submit({
      onBefore: () => {
        hook.push('onBefore')
        return true
      },
      onStart: () => {
        hook.push('onStart')
        return Promise.resolve()
      },
      onError: () => {
        hook.push('onError')
        return Promise.resolve()
      },
    })

    expect(hook).toEqual(['onBefore', 'onStart', 'cb', 'onError'])
  })

  it.each([
    { status: 401, message: 'Unauthorized' },
    { status: 403, message: 'Forbidden' },
  ])('handles the status code handlers from plugin', async ({ status, message }) => {
    const initialData = {
      name: 'John Doe',
      email: 'john@email.it',
    }

    const error = new Error('error') as Error & { response: Response }
    error.response = new Response(null, { status })

    const cb = () => Promise.reject(error)

    const form = useForm(initialData, cb)

    await form.submit()

    expect(form.error).toBeInstanceOf(Error)
    expect(form.error?.message).toBe(message)
  })

  it.each([
    { status: 401, message: 'Unauthorized Custom' },
    { status: 403, message: 'Forbidden Custom' },
  ])('handles custom status code handlers', async ({ status, message }) => {
    const initialData = {
      name: 'John Doe',
      email: 'john@email.it',
    }

    const error = new Error('error') as Error & { response: Response }

    const statusHandlers: ClientStatusHandlers = {
      401: async (error, form) => {
        form.error = new Error('Unauthorized Custom')
      },
      403: async (error, form) => {
        form.error = new Error('Forbidden Custom')
      },
    }

    const cb = () => Promise.reject(error)

    const form = useForm(initialData, cb, { statusHandlers })

    error.response = new Response(null, { status })

    await form.submit()

    expect(form.error).toBeInstanceOf(Error)
    expect(form.error?.message).toBe(message)
  })
})
