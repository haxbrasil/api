export function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Boolean(value);
}

export function toBoolean(value: unknown): boolean {
  return Boolean(value);
}
