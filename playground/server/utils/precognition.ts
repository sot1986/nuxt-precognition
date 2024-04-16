import { ZodError } from 'zod'
import { createPrecognitiveEventHandler } from '#imports'

export const defineZodPrecognitiveEventHandler = createPrecognitiveEventHandler([
  (error) => {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {}
      error.errors.forEach((e) => {
        const key = e.path.join('.')
        if (key in errors) {
          errors[key].push(e.message)
          return
        }
        errors[key] = [e.message]
      })
      const message = error.errors.at(0)?.message ?? 'Validation error'
      return { errors, error: message }
    }
  },
])
