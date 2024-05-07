import { ZodError } from 'zod'
import { defineNuxtPlugin, useNuxtApp } from '#imports'

export default defineNuxtPlugin(() => {
  const { $precognition } = useNuxtApp()

  $precognition.parsers.errorParsers.push(
    (error) => {
      if (error instanceof ZodError) {
        const errors = {} as Record<string, string[]>
        error.errors.forEach((e) => {
          const key = e.path.join('.')
          if (key in errors) {
            errors[key].push(e.message)
            return
          }
          errors[key] = [e.message]
        })
        return { errors, message: 'Validation error' }
      }
      return null
    },
  )

  $precognition.statusHandlers = {
    401: async (error, form) => {
      form.error = createError('Unauthorized')
      await navigateTo('/login')
    },
    403: async (error, form) => {
      form.error = createError('Forbidden')
    },
  }
})
