export function getErrorMessage(
  error: unknown,
  fallback = 'Unexpected error',
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function errorMessageContains(
  error: unknown,
  fragment: string,
): boolean {
  const message = getErrorMessage(error, '');

  return message.toLowerCase().includes(fragment.toLowerCase());
}
