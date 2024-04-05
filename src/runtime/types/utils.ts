type ArrayKeys<T extends unknown[]> =
T extends [unknown, ...unknown[]]
  ? T extends Record<infer Index, unknown>
    ? Index extends `${number}`
      ? Index
      : never
    : never
  : `${number}`

type ObjectKeys<T extends object> =
T extends unknown[]
  ? ArrayKeys<T>
  : keyof T & string

interface HasConstructor {
  new (...args: any[]): any
}

export type NestedKeyOf<T> = T extends Record<infer Key, unknown>
  ? T extends HasConstructor
    ? never
    : T extends CallableFunction
      ? never
      : Key extends string | number
        ? ObjectKeys<T> | (T[Key] extends object
          ? `${ObjectKeys<Pick<T, Key>>}.${NestedKeyOf<T[Key]>}`
          : T extends unknown[]
            ? T extends [unknown, ...unknown[]]
              ? never
              : T[number] extends object
                ? `${number}.${NestedKeyOf<T[number]>}`
                : never
            : never
        )
        : never
  : never
