import { z } from 'zod'
import { defineZodPrecognitiveEventHandler } from '../utils/precognition'

const LoginSchema = z.object({
  email: z.string().email().refine(value => value !== 'sot@email.it'),
  password: z.string(),
})

export default defineZodPrecognitiveEventHandler({
  onRequest: async (event) => {
    const data = await readBody(event)
    LoginSchema.parse(data)
  },
  handler: () => {
    return {
      data: 'Hello, World!',
    }
  },
})
