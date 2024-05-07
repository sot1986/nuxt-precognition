import { ZodError } from 'zod'
import { userSchema } from '../../schemas/user'
import type { User } from '../../schemas/user'
import { definePrecognitiveEventHandler, readBody } from '#imports'

export default definePrecognitiveEventHandler({
  onRequest: async (event) => {
    console.log('onRequest')
    const data = await readBody(event)
    userSchema.pick({ name: true, email: true }).parse(data)
  },
  handler: async (event) => {
    const data = await readBody<Pick<User, 'name' | 'email'>>(event)
    const message = `Hello, ${data.name}! This is your email: ${data.email}`
    return { message }
  },
}, {
  errorParsers: [
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
        return { errors, message }
      }
    },
  ],
})
