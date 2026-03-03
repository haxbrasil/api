export function normalizePublicBaseUrl(input: string): string {
  return input.replace(/\/+$/, '');
}
