import { defineNuxtPlugin, useNuxtApp } from '#imports'
import { zodPrecognitionErrorParser } from '~/utils/zodErrorParser'

export default defineNuxtPlugin(() => {
  const { $precognition } = useNuxtApp()

  $precognition.errorParsers.push(zodPrecognitionErrorParser)

  $precognition.statusHandlers = {
    401: async (error, form) => {
      form.error = createError('Unauthorized')
      await navigateTo('/login')
    },
    403: async (error, form) => {
      form.error = createError('Forbidden')
    },
  }
})
