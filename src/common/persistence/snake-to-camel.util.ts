const SNAKE_CASE_PART = /_([a-z])/g;

function snakeToCamelKey(key: string): string {
  return key.replace(SNAKE_CASE_PART, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

export function mapSnakeToCamel<TOutput extends Record<string, unknown>>(
  input: Record<string, unknown>,
): TOutput {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    output[snakeToCamelKey(key)] = value;
  }

  return output as TOutput;
}
