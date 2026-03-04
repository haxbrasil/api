import { del, get, json, post, put } from '../support/client';
import { tenantFixture } from '../fixtures';

describe('Rooms (e2e)', () => {
  it('rejects requests without a bearer token', async () => {
    const getResponse = await get('/rooms');
    expect(getResponse.status).toBe(401);

    const postResponse = await post('/rooms', {
      invite: 'ABC123',
      name: 'NoAuthRoom',
    });
    expect(postResponse.status).toBe(401);
  });

  it('creates a room and returns detail shape', async () => {
    const tenant = tenantFixture('tenant-rooms-create');

    const response = await post(
      '/rooms',
      {
        invite: 'DDWvwykDyiI',
        name: 'Hax Brasil #1',
      },
      tenant.token,
    );

    expect(response.status).toBe(201);
    const payload = (await json(response)) as Record<string, unknown>;
    expect(payload).toHaveProperty(
      'uuid',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    );
    expect(payload).toMatchObject({
      invite: 'DDWvwykDyiI',
      name: 'Hax Brasil #1',
      active: true,
    });
  });

  it('omits password/token in list and includes them in detail', async () => {
    const tenant = tenantFixture('tenant-rooms-secrets');

    const createResponse = await post(
      '/rooms',
      {
        invite: 'SECRETS1',
        name: 'Secret Room',
        password: 'secret-password',
        token: 'headless-token',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);

    const createdRoom = (await json(createResponse)) as {
      uuid: string;
    };

    const listResponse = await get('/rooms', tenant.token);
    expect(listResponse.status).toBe(200);

    const listPayload = (await json(listResponse)) as {
      items: Array<Record<string, unknown>>;
    };

    expect(listPayload.items[0]).not.toHaveProperty('password');
    expect(listPayload.items[0]).not.toHaveProperty('token');

    const getResponse = await get(`/rooms/${createdRoom.uuid}`, tenant.token);
    expect(getResponse.status).toBe(200);
    expect(await json(getResponse)).toEqual(
      expect.objectContaining({
        password: 'secret-password',
        token: 'headless-token',
      }),
    );
  });

  it('updates room while active and blocks updates when inactive', async () => {
    const tenant = tenantFixture('tenant-rooms-update');

    const createResponse = await post(
      '/rooms',
      {
        invite: 'ROOMUPD1',
        name: 'Room Before',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdRoom = (await json(createResponse)) as { uuid: string };

    const updateResponse = await put(
      `/rooms/${createdRoom.uuid}`,
      {
        name: 'Room After',
        player_name: 'HostUser',
        public: true,
        max_players: 16,
        no_player: true,
      },
      tenant.token,
    );

    expect(updateResponse.status).toBe(200);
    expect(await json(updateResponse)).toEqual(
      expect.objectContaining({
        name: 'Room After',
        player_name: 'HostUser',
        public: true,
        max_players: 16,
        no_player: true,
      }),
    );

    const deactivateResponse = await del(
      `/rooms/${createdRoom.uuid}`,
      tenant.token,
    );
    expect(deactivateResponse.status).toBe(204);

    const inactiveUpdateResponse = await put(
      `/rooms/${createdRoom.uuid}`,
      { name: 'Should Fail' },
      tenant.token,
    );
    expect(inactiveUpdateResponse.status).toBe(409);
    expect(await json(inactiveUpdateResponse)).toEqual({
      code: 'room_inactive',
      message: 'Room is inactive',
    });
  });

  it('deactivates idempotently and returns inactive rooms by uuid', async () => {
    const tenant = tenantFixture('tenant-rooms-delete');

    const createResponse = await post(
      '/rooms',
      {
        invite: 'ROOMDEL1',
        name: 'Delete Room',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdRoom = (await json(createResponse)) as { uuid: string };

    const firstDeleteResponse = await del(
      `/rooms/${createdRoom.uuid}`,
      tenant.token,
    );
    expect(firstDeleteResponse.status).toBe(204);

    const secondDeleteResponse = await del(
      `/rooms/${createdRoom.uuid}`,
      tenant.token,
    );
    expect(secondDeleteResponse.status).toBe(204);

    const getResponse = await get(`/rooms/${createdRoom.uuid}`, tenant.token);
    expect(getResponse.status).toBe(200);
    expect(await json(getResponse)).toEqual(
      expect.objectContaining({
        uuid: createdRoom.uuid,
        active: false,
      }),
    );

    const missingDeleteResponse = await del(
      '/rooms/00000000-0000-4000-8000-000000000000',
      tenant.token,
    );
    expect(missingDeleteResponse.status).toBe(404);
  });

  it('filters and paginates with snake_case query params', async () => {
    const tenant = tenantFixture('tenant-rooms-list');

    await post(
      '/rooms',
      {
        invite: 'AAA001',
        name: 'League Alpha',
      },
      tenant.token,
    );

    await post(
      '/rooms',
      {
        invite: 'BBB001',
        name: 'League Beta',
      },
      tenant.token,
    );

    const firstPageResponse = await get(
      '/rooms?page=1&page_size=1',
      tenant.token,
    );
    expect(firstPageResponse.status).toBe(200);
    const firstPagePayload = (await json(firstPageResponse)) as {
      items: Array<{ uuid: string }>;
      page_info: { page: number; page_size: number; has_next_page: boolean };
    };

    expect(firstPagePayload.items).toHaveLength(1);
    expect(firstPagePayload.page_info).toEqual({
      page: 1,
      page_size: 1,
      has_next_page: true,
    });

    const filterResponse = await get(
      `/rooms?name=${encodeURIComponent('alpha')}`,
      tenant.token,
    );
    expect(filterResponse.status).toBe(200);
    expect(await json(filterResponse)).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            name: 'League Alpha',
          }),
        ],
      }),
    );

    const invalidPageSizeResponse = await get(
      '/rooms?page_size=0',
      tenant.token,
    );
    expect(invalidPageSizeResponse.status).toBe(400);
  });

  it('supports include_inactive and tenant isolation', async () => {
    const tenantA = tenantFixture('tenant-rooms-a');
    const tenantB = tenantFixture('tenant-rooms-b');

    const createAResponse = await post(
      '/rooms',
      {
        invite: 'ROOMA1',
        name: 'Tenant A Room',
      },
      tenantA.token,
    );
    expect(createAResponse.status).toBe(201);
    const roomA = (await json(createAResponse)) as { uuid: string };

    const createBResponse = await post(
      '/rooms',
      {
        invite: 'ROOMB1',
        name: 'Tenant B Room',
      },
      tenantB.token,
    );
    expect(createBResponse.status).toBe(201);

    const deactivateAResponse = await del(
      `/rooms/${roomA.uuid}`,
      tenantA.token,
    );
    expect(deactivateAResponse.status).toBe(204);

    const tenantAActiveResponse = await get('/rooms', tenantA.token);
    expect(tenantAActiveResponse.status).toBe(200);
    expect(await json(tenantAActiveResponse)).toEqual(
      expect.objectContaining({
        items: [],
      }),
    );

    const tenantAAllResponse = await get(
      '/rooms?include_inactive=true',
      tenantA.token,
    );
    expect(tenantAAllResponse.status).toBe(200);
    expect(await json(tenantAAllResponse)).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            uuid: roomA.uuid,
            active: false,
          }),
        ],
      }),
    );

    const tenantBCrossGet = await get(`/rooms/${roomA.uuid}`, tenantB.token);
    expect(tenantBCrossGet.status).toBe(404);
  });
});
