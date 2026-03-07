import { Transform, TransformFnParams } from 'class-transformer';
import { parseBooleanQueryParam } from '../../data/boolean.util';

function getRawPropertyValue(params: TransformFnParams): unknown {
  const source: unknown = params.obj;
  const key: unknown = params.key;

  if (typeof key !== 'string') {
    return params.value;
  }

  if (typeof source !== 'object' || source === null) {
    return params.value;
  }

  if (!(key in source)) {
    return params.value;
  }

  return (source as Record<string, unknown>)[key];
}

export function TransformBooleanQueryParam(): PropertyDecorator {
  return Transform((params) =>
    parseBooleanQueryParam(getRawPropertyValue(params)),
  );
}
