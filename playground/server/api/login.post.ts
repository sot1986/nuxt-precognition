import { z } from 'zod'
import { definePrecognitiveEventHandler, readBody } from '#imports'

const loginSchema = z.object({
  email: z.string().email().refine(email => email !== 'sot@email.it', 'Email cannot be sot@email.it'),
  password: z.string(),
})

export default definePrecognitiveEventHandler({
  async onRequest(event) {
    const body = await readBody(event)
    loginSchema.parse(body)
  },
  handler: () => {
    return {
      status: 200,
      body: {
        message: 'Success',
      },
    }
  },
}, {
  errorParsers: [
    (error) => {
      if (error instanceof z.ZodError) {
        return {
          message: 'Invalid data',
          errors: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }
      }
    },
  ],
})
