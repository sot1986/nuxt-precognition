import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  createdAt: z.string().date(),
  updatedAt: z.string().date(),
})

export type User = z.infer<typeof userSchema>
