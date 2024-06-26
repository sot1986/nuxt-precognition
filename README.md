<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: Nuxt Precognition
- Package name: nuxt-precognition
- Description: My new Nuxt module
-->

# Nuxt Precognition

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

This is a new version of [nuxt-laravel-precognition](https://www.npmjs.com/package/nuxt-laravel-precognition). It offers same features, but being not dependent on Laravel.

Instead of supporting only _$fetch_ and _Laravel_, it works with simple promises, targeting any backend that implements the base Precognition protocol. These promises will receive the form `payload` and protocol `Headers`.

#### Example
```ts
interface User = {
  email: string
  password: string
}

const form = useForm(
  (): User => ({ email: '', password: '' }),
  (body, headers) => $fetch('/api/login', { method: 'POST', headers, body })
)
```

This module comes with native __Nitro__ integration, but will work with other backend as well, even properly configured _aws lambda_.  
It supports any validation library (_who said [__Zod__](https://zod.dev/)??_) server or client side. You will need only to configure specific `Error parsers`.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-precognition?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

### Features

<!-- Highlight some of the features your module provide here -->
- &nbsp;Laravel compliant
- &nbsp;Validation library agnostic
- &nbsp;Client and server side validation
- &nbsp;Optimal Typescript support
- &nbsp;Highly customizable

### How it works
Everything turns around `errorParsers`(_user defined function to read validation errors from_ `Error` _payload_):
```ts
type ValidationErrors = Record<string, string | string[]>

interface ValidationErrorsData {
  message: string
  errors: ValidationErrors
}

type ValidationErrorParser = (error: Error) => ValidationErrorsData | undefined | null
```

You can define them globally (in `Nuxt Plugin` or custom `eventHandler`), or per `form` instance.

Imagine you are working with [__Zod__](https://zod.dev/).  
Just create a __nuxt plugin__ and define the "_Zod error parser_":

```ts
// plugins/precognition.ts

export default defineNuxtPlugin(() => {
  const { $precognition } = useNuxtApp()

  $precognition.errorParsers.push(
    (error) => {
      if (error instanceof ZodError) {
        const errors = {} as Record<string, string[]>
        error.errors.forEach((e) => {
          const key = e.path.join('.')
          if (key in errors) {
            errors[key].push(e.message)
            return
          }
          errors[key] = [e.message]
        })
        return { errors, message: 'Validation error' }
      }
      return null
    },
  )
})
```
From now on, everytime the `useForm` will catch the error, it will run our parses, and capture and assign any validation errors.

If you want to reuse the same options over multiple pages, you can create your __custom composable__ by `useForm.create` factory function.

### How about server side
Same idea, creating a nitro plugin:

```ts
// server/plugins/precognition.ts

import { ZodError } from 'zod'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.$precognition.errorParsers = [
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
    ]
  })
})
```
If you don't like hooking on every request, you can create your custom eventHandler by `definePrecognitiveEventHandler.create` factory function.

Make your validation logic inside the `onRequest` handler of the `definePrecognitiveEventHandler`.

```ts
// server/api/login.post.ts
import { z } from 'zod'
import { definePrecognitiveEventHandler, readBody } from '#imports'

const loginSchema = z.object({
  email: z.string().email().refine(_email => // Check for email uniqueness
    true, { message: 'Email is already in use' },
  ),
  password: z.string(),
}).refine((_data) => {
  // Check for email and password match
  // ...
  return true
},
{ message: 'invalid credentials', path: ['email'] },
)

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
})
```

This time the error will be converted to `NuxtServerValidationError` and captured client side, if we enable the predefined parsers in the nuxt configuration file:

```ts
// nuxt.config.ts

export default defineNuxtConfig({
  modules: ['nuxt-precognitiion'],
  precognition: {
    backendValidation: true,
    enableNuxtClientErrorParser: true,
  }
})
```
__Remember to throw the `ValidationError` only in the `onRequest` handler (using the `object notation`)__.  
Any logic in the base `handler` won't be process during `precognitiveRequests`.

* Each `event.context` include also a flag (`{ precognitive: boolean }`), indicating if request is precognitive or not, looking at presence of _Precognitive header_.

### Precognition Protocol
In case you need to define your own backend logic outside nitro (_AWS Lamba_), respect following list of requirements.

- Precognitive Requests must have:
  1. Precognitive Header `{ 'Precognitive': 'true' }`
- To validate specific variables, each keys must be specified inside the ValidateOnly Header, comma separated and leveraging dot notation `{ 'Precognition-Validate-Only': 'name,age,address.street,address.number' }`
- To validate the full Form the ValidateOnly Header should be omitted or define as an empty string.
- Successfull validation response must have:
  1. Precognitive Header `{ 'Precognitive': 'true' }`
  2. Precognitive Successfull Header `{ 'Precognition-Success': 'true' }`
  3. Precognitve Successfull status code: `204`
- Error validation response must have:
  1. Precognitive Header `{ 'Precognitive': 'true' }`
  2. ValidationOnly header if needed `{ 'Precognition-Validate-Only': 'name,age,address.street,address.number' }`
  3. Validation Error status code: `422`
  4. Validation Errors and Message will be parsed as per your define logic, or using standard `errorParsers`:
     - NuxtErrorParsers: `NuxtPrecognitiveErrorResponse`: `Response & { _data: { data: ValidationErrorsData }}`
     - LaravelErrorParsers: `LaravelPrecognitiveErrorResponse`: `Response & { _data: ValidationErrorsData }`


## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-precognition
```

### Configure

| name | type | default | description |
|---|---|---|---|
|validationTimeout|_number_|`1500`|Debounce time, in milliseconds, between two precognitive validation requests.|
|backendValidation|_boolean_|`false`|Flag to enable the precognitive validation.|
|validateFiles|_boolean_|`false`|Flag to enable files validation on precognitive requests.|
|enableNuxtClientErrorParser|_boolean_|`false`|Flag to enable _nuxtErrorParsers_ @ client side (in `form.validate` and `form.submit`).|
|enableLaravelClientErrorParser|_boolean_|`false`|Flag to enable _laravelErrorParsers_ @ client side (in `form.validate` and `form.submit`).|
|enableLaravelServerErrorParser|_boolean_|`false`|Flag to enable _laravelErrorParsers_ @ client side (in `definePrecognitiveEventHandler`).|

#### Status Handlers
Like in [official package](https://github.com/laravel/precognition), you can define globally, or @instance level, custom handlers for specific error codes:

```ts
// plugins/precognition.ts

export default defineNuxtPlugin(() => {
  const { $precognition } = useNuxtApp()

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
```

That's it! You can now use Nuxt Precognition in your Nuxt app ✨

#### Working with Laravel

1. Define a plugin like this
```ts
// plugins/api.ts

export default defineNuxtPlugin((app) => {
  const { $precognition } = useNuxtApp()
  const token = useCookie('XSRF-TOKEN')

  const api = $fetch.create({
    baseURL: 'http://localhost',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    onRequest: ({ options }) => {
      // Setup csrf protection for every requests if available
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('X-XSRF-TOKEN', token.value)
        options.headers = headers
      }
    },
    onResponse: (context) => {
      // ensure that all precognitive requests will receive precognitive responses
      $precognition.assertSuccessfulPrecognitiveResponses(context)
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
```
2. Enable backend validation and native Laravel Error parsers client or server side
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-precognition'],
  precognition: {
    backendValidation: true,
    enableLaravelClientErrorParser: true,
  },
  /*
  ...
  */
})
```
\* If you `enableLaravelServerErrorParser`, you must also `enableNuxtClientErrorParser`

3. Setup Laravel Cors configuration file
```php
// config/cors.php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    */

    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [env('FRONTEND_URL', 'http://localhost:3000')],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Precognition', 'Precognition-Success'],

    'max_age' => 0,

    'supports_credentials' => true,

];
```
3. Enable the Precognition Middleware where needed

```php
// routes/api.php

Route::middleware('precognitive')->group(function () {
    Route::apiResource('posts', \App\Http\Controllers\PostController::class);
});
```
## Contribution

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  npm install

  # Generate type stubs
  npm run dev:prepare

  # Develop with the playground
  npm run dev

  # Build the playground
  npm run dev:build

  # Run ESLint
  npm run lint

  # Run Vitest
  npm run test
  npm run test:watch

  # Release new version
  npm run release
  ```

</details>

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-precognition/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-precognition

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-precognition.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/nuxt-precognition

[license-src]: https://img.shields.io/npm/l/nuxt-precognition.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-precognition

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
