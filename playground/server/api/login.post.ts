import { z } from 'zod'
import { defineZodPrecognitiveEventHandler, readBody } from '#imports'

const loginSchema = z.object({
  email: z.string().email(),
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
