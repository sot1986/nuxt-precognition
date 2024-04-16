import { ZodError } from 'zod'
import { defineNuxtPlugin, useNuxtApp } from '#imports'

export default defineNuxtPlugin(() => {
  const { $precognition } = useNuxtApp()

  $precognition.parsers.addErrorParser(
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
        return { errors, error: 'Validation error' }
      }
      return null
    },
  )
})
