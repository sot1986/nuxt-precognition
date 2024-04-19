export default defineNuxtPlugin((app) => {
  const token = useCookie('XSRF-TOKEN')

  const api = $fetch.create({
    baseURL: 'http://localhost',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    onRequest: ({ options }) => {
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('X-XSRF-TOKEN', token.value)
        options.headers = headers
      }
    },

  })

  async function fetchSanctumToken() {
    try {
      await api('/sanctum/csrf-cookie')
      token.value = useCookie('XSRF-TOKEN').value

      if (!token.value) {
        throw new Error('Failed to get CSRF token')
      }
    }
    catch (e) {
      console.error(e)
    }
  }

  app.hook('app:mounted', fetchSanctumToken)

  return {
    provide: {
      api,
      sanctum: {
        fetchToken: fetchSanctumToken,
        token,
      },
    },
  }
})
