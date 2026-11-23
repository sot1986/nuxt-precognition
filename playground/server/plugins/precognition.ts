import { ZodError } from 'zod'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.$precognition.errorParsers = [
      (error) => {
        if (error instanceof ZodError) {
          const errors: Record<string, string[]> = {}
          error.issues.forEach((e) => {
            const key = e.path.join('.')
            if (errors[key]) {
              errors[key].push(e.message)
              return
            }
            errors[key] = [e.message]
          })
          const message = error.issues.at(0)?.message ?? 'Validation error'
          return { errors, message }
        }
      },
    ]
  })
})
