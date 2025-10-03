import { ZodError } from 'zod'
import type { ValidationErrorParser } from '#build/types/nuxt-precognition'

export const zodPrecognitionErrorParser: ValidationErrorParser = (error) => {
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const key = issue.path.join('.')
      if (key in errors) {
        errors[key].push(issue.message)
        continue
      }
      errors[key] = [issue.message]
    }
    return { errors, message: error.message }
  }
  return null
}
