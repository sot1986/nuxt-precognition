<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-precognition/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-precognition

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-precognition.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/nuxt-precognition

[license-src]: https://img.shields.io/npm/l/nuxt-precognition.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-precognition

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com

# Nuxt Precognition

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt Precognition is a validation module for Nuxt that implements the [Precognition protocol](https://laravel.com/docs/10.x/precognition) in a backend-agnostic way. It supports any backend or validation library, and is not tied to Laravel.

## Table of Contents

- [Nuxt Precognition](#nuxt-precognition)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Why Nuxt Precognition?](#why-nuxt-precognition)
  - [Quick Example](#quick-example)
  - [Features](#features)
  - [Installation](#installation)
  - [How It Works](#how-it-works)
    - [Define Zod Error Parser](#define-zod-error-parser)
    - [Client Side Validation](#client-side-validation)
    - [Server Side Validation](#server-side-validation)
  - [Precognition Protocol](#precognition-protocol)
  - [Configuration](#configuration)
    - [Options](#options)
    - [Status Handlers](#status-handlers)
  - [Laravel Integration](#laravel-integration)
  - [Contributing](#contributing)
  - [License](#license)

## Requirements

- Nuxt >= 3.x
- Node.js >= 18

## Why Nuxt Precognition?

- **Backend agnostic:** Works with any backend that supports the Precognition protocol.
- **Validation library agnostic:** Use Zod, Yup, or any other validation library.
- **Client & server side validation:** Seamless validation on both ends.
- **Optimal TypeScript support:** Typesafe forms and error handling.
- **Highly customizable:** Plug in your own error parsers and status handlers.

---

## Quick Example

```ts
interface User {
  email: string
  password: string
}

const form = useForm(
  (): User => ({ email: '', password: '' }),
  (body, headers) => $fetch('/api/login', { method: 'POST', headers, body })
)
```

---

## Features

- Laravel compliant
- Validation library agnostic
- Client and server side validation
- TypeScript support
- Customizable error parsing and status handling

---

## Installation

Install the module in your Nuxt app:

```bash
npx nuxi module add nuxt-precognition
```

---

## How It Works

The core concept is **error parsers**: functions that extract validation errors from thrown errors.

```ts
type ValidationErrors = Record<string, string | string[]>

interface ValidationErrorsData {
  message: string
  errors: ValidationErrors
}

type ValidationErrorParser = (error: Error) => ValidationErrorsData | undefined | null
```

### Define Zod Error Parser

```ts
// app/utils/precognition.ts or shared/utils/precognition.ts
import { ZodError } from 'zod'

export const zodPrecognitionErrorParser: ValidationErrorParser = (error) => {
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const key = issue.path.join('.')
      if (key in errors) {
        errors[key].push(issue.message)
        continue
      }
      errors[key] = [issue.message]
    }
    return { errors, message: error.message }
  }
  return null
}
```

> **Note:**  
> For Server side validation, place this file in `shared/utils` folder.

### Client Side Validation

Add the parser client side globally.

```ts
// app/plugins/precognition.ts
export default defineNuxtPlugin(() => {
  const { $precognition } = useNuxtApp()

  $precognition.errorParsers.push(zodErrorParser)

  // ..
})
```

Use the composable in setup method.
```ts
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const form = useForm(
  (): z.infer<typeof UserSchema> => ({
    email: '',
    password: '',
  }),
  (body, headers) => $fetch('/api/login', {
    method: 'POST',
    headers,
    body,
  }),
  {
    clientValidation(data) {
      UserSchema.parse(data)
    },
  },
)

function login() {
  form.submit()
}

function reset() {
  form.reset()
  document.getElementById('email')?.focus()
}
```

```html
<form
  @submit.prevent="login"
  @reset.prevent="reset"
>
  <div>
    <label for="email">Email address</label>
    <input
      id="email"
      v-model="form.email"
      name="email"
      type="email"
      @change="form.validate('email')"
    >
    <span v-if="form.valid('email')">OK!!</span>
    <span v-if="form.invalid('email')">{{ form.errors.email }}</span>
  </div>

  <div>
    <label for="password">Password</label>
    <input
      id="password"
      v-model="form.password"
      name="password"
      type="password"
      autocomplete="current-password"
      required
      @change="form.validate('password')"
    >
    <span v-if="form.valid('password')">OK!!</span>
    <span v-if="form.invalid('password')">{{ form.errors.password }}</span>
  </div>

  <div>
    <button type="submit">Sign in</button>
    <button type="reset">Reset</button>
  </div>
</form>
```

### Server Side Validation

1.  update the default configuration.
```ts
// nuxt.config.ts

export default defineNuxtConfig({
  modules: [
    'nuxt-precognition'
  ],
  precognition: {
    backendValidation: true, 
    enableNuxtClientErrorParser: true,
  },
})
```
2.  Create a Nitro plugin to parse server errors:
```ts
// server/plugins/precognition.ts
import { ZodError } from 'zod'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.$precognition.errorParsers = [
      zodErrorParser
    ]
  })
})
```

3.  Use `definePrecognitiveEventHandler` in the _object_ way and add validation in the `onRequest` hook.
```ts
// server/api/login.post.ts
import { z } from 'zod'
import { definePrecognitiveEventHandler, readBody } from '#imports'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
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
---

## Precognition Protocol

If you need to define your own backend logic outside Nitro, follow these requirements.

- Precognitive Requests must have:
  1. Precognitive Header `{ 'Precognitive': 'true' }`
- To validate specific variables, each keys must be specified inside the ValidateOnly Header, comma separated and leveraging dot notation `{ 'Precognition-Validate-Only': 'name,age,address.street,address.number' }`
- To validate the full Form the ValidateOnly Header should be omitted or define as an empty string.
- Successful validation response must have:
  1. Precognitive Header `{ 'Precognitive': 'true' }`
  2. Precognitive Successful Header `{ 'Precognition-Success': 'true' }`
  3. Precognitive Successful status code: `204`
- Error validation response must have:
  1. Precognitive Header `{ 'Precognitive': 'true' }`
  2. Precognition-Validate-Only header if needed `{ 'Precognition-Validate-Only': 'name,age,address.street,address.number' }`
  3. Validation Error status code: `422`
  4. Validation Errors and Message will be parsed as per your define logic, or using standard `errorParsers`:
     - NuxtErrorParsers: `NuxtPrecognitiveErrorResponse`: `Response & { _data: { data: ValidationErrorsData }}`
     - LaravelErrorParsers: `LaravelPrecognitiveErrorResponse`: `Response & { _data: ValidationErrorsData }`

---

## Configuration

Add to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-precognition'],
  precognition: {
    backendValidation: true,
    enableNuxtClientErrorParser: true,
    // ...other options
  }
})
```

### Options
| name | type | default | description |
|---|---|---|---|
|validationTimeout|_number_|`1500`|Debounce time, in milliseconds, between two precognitive validation requests.|
|backendValidation|_boolean_|`false`|Flag to enable the precognitive validation.|
|validateFiles|_boolean_|`false`|Flag to enable files validation on precognitive requests.|
|enableNuxtClientErrorParser|_boolean_|`false`|Flag to enable _nuxtErrorParsers_ on client side (in `form.validate` and `form.submit`).|
|enableLaravelClientErrorParser|_boolean_|`false`|Flag to enable _laravelErrorParsers_ on client side (in `form.validate` and `form.submit`).|
|enableLaravelServerErrorParser|_boolean_|`false`|Flag to enable _laravelErrorParsers_ on server side (in `definePrecognitiveEventHandler`).|


---

### Status Handlers
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

---

## Laravel Integration

If you want to use Laravel, you won't need nuxt nitro integration.

1. **Enable Backend Validation and Error Parsers:**

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-precognition'],
  precognition: {
    backendValidation: true,
    enableLaravelClientErrorParser: true,
  }
})
```

2. **Plugin Example:**

Add Sanctum token prefetch and ensure proper handling of all precognitive requests.

```ts
// plugins/laravel.ts
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
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('X-XSRF-TOKEN', token.value)
        options.headers = headers
      }
    },
    onResponse: (context) => {
      // ensure non false positive validations
      $precognition.assertSuccessfulPrecognitiveResponses(context)
    },
  })

  async function fetchSanctumToken() {
    try {
      await api('/sanctum/csrf-cookie')
      token.value = useCookie('XSRF-TOKEN').value
      if (!token.value) throw new Error('Failed to get CSRF token')
    } catch (e) {
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

3. **Laravel CORS Configuration:**

Ensure Precognitive headers will be shared with Nuxt application.

```php
// config/cors.php
return [
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

4. **Enable Precognition Middleware:**

Apply precognitive middleware where needed.

```php
// routes/api.php
Route::middleware('precognitive')->group(function () {
    Route::apiResource('posts', \App\Http\Controllers\PostController::class);
});
```

That's it. Nuxt validation will be in sync with Laravel!!.

---

## Contributing

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

## License

MIT © [sot1986]
