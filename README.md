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
