import type { NestedKeyOf } from '../../src/runtime/types/utils'

interface Model {
  id: string
  name: string
  age: number
  address: {
    street: string
    city: string
  }
  tags: string[]
  websites: [
    {
      url: string
      description: string
      followers: number
    },
  ]
  favorites: { site: string }[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const model: Model = {
  id: '1',
  name: 'John Doe',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'Anytown',
  },
  tags: ['developer', 'blogger'],
  websites: [
    {
      url: 'https://example.com',
      description: 'My personal blog',
      followers: 1000,
    },
  ],
  favorites: [{ site: 'https://favorite.com' }, { site: 'https://another-favorite.com' },
  ],
}

export function getKeyValue<T extends object, K extends NestedKeyOf<T>>(obj: T, key: K) {
  const firstKey = key.split('.')[0] as keyof T

  if (key === firstKey) {
    return obj[firstKey]
  }

  if (typeof firstKey !== 'string') {
    throw new TypeError(`Key must be a string, received: ${typeof firstKey}`)
  }

  if (!(firstKey in obj)) {
    throw new Error(`Key "${firstKey}" does not exist in the object.`)
  }

  if (typeof obj[firstKey] !== 'object') {
    throw new TypeError(`Value at key "${firstKey}" is not an object or is null.`)
  }

  if (!obj[firstKey]) {
    return null
  }

  const restKey = key.slice(firstKey.length + 1) as NestedKeyOf<T[keyof T]>
  return getKeyValue(obj[firstKey], restKey)
}
