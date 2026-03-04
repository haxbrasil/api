type SnakeCaseInner<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Lowercase<Head>
    ? `${Head}${SnakeCaseInner<Tail>}`
    : `_${Lowercase<Head>}${SnakeCaseInner<Tail>}`
  : S;

export type SnakeCase<S extends string> =
  SnakeCaseInner<S> extends `_${infer Rest}` ? Rest : SnakeCaseInner<S>;

export type SnakeCasedProperties<T extends Record<string, unknown>> = {
  [K in keyof T as K extends string ? SnakeCase<K> : never]: T[K];
};
