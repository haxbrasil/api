import { json } from '../support/client';

type ApiErrorResponse = {
  code?: unknown;
  message?: unknown;
};

export async function expectApiError(
  response: Response,
  status: number,
  code: string,
  message?: string,
): Promise<void> {
  expect(response.status).toBe(status);

  const payload = (await json(response)) as ApiErrorResponse;

  expect(payload.code).toBe(code);

  if (message !== undefined) {
    expect(payload.message).toBe(message);
  }
}
