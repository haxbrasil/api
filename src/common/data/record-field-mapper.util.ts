export function mapRecordField<K extends string, TIn, TOut>(
  field: K,
  mapper: (value: TIn) => TOut,
) {
  return <TRecord extends Record<K, TIn>>(
    input: TRecord,
  ): Omit<TRecord, K> & Record<K, TOut> =>
    ({
      ...input,
      [field]: mapper(input[field]),
    }) as Omit<TRecord, K> & Record<K, TOut>;
}

type FieldMappers<TRecord extends Record<string, unknown>> = {
  [K in keyof TRecord]?: (value: TRecord[K]) => unknown;
};

type MappedRecord<
  TRecord extends Record<string, unknown>,
  TMappers extends FieldMappers<TRecord>,
> = Omit<TRecord, keyof TMappers> & {
  [K in keyof TMappers & keyof TRecord]: TMappers[K] extends (
    value: TRecord[K],
  ) => infer TOut
    ? TOut
    : never;
};

export function mapRecordFields<
  TRecord extends Record<string, unknown>,
  TMappers extends FieldMappers<TRecord>,
>(input: TRecord, mappers: TMappers): MappedRecord<TRecord, TMappers> {
  let output: Record<string, unknown> = input;

  for (const field of Object.keys(mappers) as Array<
    Extract<keyof TMappers, string>
  >) {
    const mapper = mappers[field];

    if (!mapper) {
      continue;
    }

    output = mapRecordField(
      field,
      mapper as (value: unknown) => unknown,
    )(output);
  }

  return output as MappedRecord<TRecord, TMappers>;
}
