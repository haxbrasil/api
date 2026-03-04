import * as crypto from 'node:crypto';
import { get, post } from '../support/client';
import { signCustomToken, tamperTokenSignature } from '../fixtures';

type TokenRoute = {
  name: string;
  request: (token: string) => Promise<Response>;
};

function tokenRoutes(): TokenRoute[] {
  return [
    {
      name: 'GET /users',
      request: (token) => get('/users', token),
    },
    {
      name: 'GET /recs',
      request: (token) => get('/recs', token),
    },
    {
      name: 'GET /rooms',
      request: (token) => get('/rooms', token),
    },
    {
      name: 'POST /rooms/events',
      request: (token) =>
        post(
          '/rooms/events',
          {
            room_uuid: crypto.randomUUID(),
            event_name: 'onPlayerJoin',
            timestamp: new Date().toISOString(),
            payload: { player_id: 1 },
          },
          token,
        ),
    },
    {
      name: 'POST /room-jobs',
      request: (token) =>
        post(
          '/room-jobs',
          {
            room_type: 'open-success',
            room_properties: {},
          },
          token,
        ),
    },
  ];
}

describe('Auth (e2e)', () => {
  it('returns 401 for malformed JWT across protected routes', async () => {
    for (const route of tokenRoutes()) {
      const response = await route.request('not-a-jwt');
      expect(response.status).toBe(401);
    }
  });

  it('returns 401 for invalid-signature JWT across protected routes', async () => {
    const signed = signCustomToken({
      service: 'e2e-auth',
      tenant: 'tenant-auth-invalid-signature',
    });
    const tampered = tamperTokenSignature(signed);

    for (const route of tokenRoutes()) {
      const response = await route.request(tampered);
      expect(response.status).toBe(401);
    }
  });

  it('returns 401 when tenant claim is missing', async () => {
    const token = signCustomToken({
      service: 'e2e-auth',
    });

    const response = await get('/users', token);
    expect(response.status).toBe(401);
  });

  it('returns 401 when service claim is missing', async () => {
    const token = signCustomToken({
      tenant: 'tenant-auth-missing-service',
    });

    const response = await get('/users', token);
    expect(response.status).toBe(401);
  });
});
