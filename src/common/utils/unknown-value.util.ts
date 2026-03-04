export function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function getOptionalStringField(
  input: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = input[key];

  return typeof value === 'string' ? value : undefined;
}
