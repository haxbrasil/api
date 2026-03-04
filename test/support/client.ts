import { getE2ERuntime } from './runtime';
import { AuthService } from '../../src/modules/auth/auth.service';

function resolvePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function authHeaders(token?: string): HeadersInit {
  if (!token) {
    return {};
  }

  return { authorization: `Bearer ${token}` };
}

export async function get(path: string, token?: string): Promise<Response> {
  const { baseUrl } = getE2ERuntime();
  return fetch(`${baseUrl}${resolvePath(path)}`, {
    headers: authHeaders(token),
  });
}

export async function getNoRedirect(
  path: string,
  token?: string,
): Promise<Response> {
  const { baseUrl } = getE2ERuntime();

  return fetch(`${baseUrl}${resolvePath(path)}`, {
    headers: authHeaders(token),
    redirect: 'manual',
  });
}

export async function post(
  path: string,
  payload: unknown,
  token?: string,
): Promise<Response> {
  const { baseUrl } = getE2ERuntime();
  return fetch(`${baseUrl}${resolvePath(path)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });
}

export async function put(
  path: string,
  payload: unknown,
  token?: string,
): Promise<Response> {
  const { baseUrl } = getE2ERuntime();
  return fetch(`${baseUrl}${resolvePath(path)}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });
}

export async function del(path: string, token?: string): Promise<Response> {
  const { baseUrl } = getE2ERuntime();
  return fetch(`${baseUrl}${resolvePath(path)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function postMultipart(
  path: string,
  payload: FormData,
  token?: string,
): Promise<Response> {
  const { baseUrl } = getE2ERuntime();

  return fetch(`${baseUrl}${resolvePath(path)}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: payload,
  });
}

export async function json(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

export function serviceToken(tenant: string, service = 'e2e-suite'): string {
  return getE2ERuntime().app.get(AuthService).signServiceToken(service, tenant);
}
