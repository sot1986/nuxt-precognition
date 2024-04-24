import { z } from 'zod'
import { defineZodPrecognitiveEventHandler, readBody } from '#imports'

const loginSchema = z.object({
  email: z.string().email().refine(email => email !== 'sot@email.it', 'Email cannot be sot@email.it'),
  password: z.string(),
})

export default defineZodPrecognitiveEventHandler({
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
})
