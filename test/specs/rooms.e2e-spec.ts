import { del, get, json, post, put } from '../support/client';
import { err } from 'neverthrow';
import { persistenceErrorFixture, tenantFixture } from '../fixtures';
import { expectApiError } from '../utils/error-assertions.util';
import { getE2ERuntime } from '../support/runtime';
import { RoomsService } from '../../src/modules/rooms/rooms.service';

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

  it('returns 404 when room uuid does not exist', async () => {
    const tenant = tenantFixture('tenant-rooms-missing-get');

    const response = await get(
      '/rooms/00000000-0000-4000-8000-000000000000',
      tenant.token,
    );

    await expectApiError(response, 404, 'room_not_found', 'Room not found');
  });

  it('returns 404 when updating unknown room uuid', async () => {
    const tenant = tenantFixture('tenant-rooms-missing-update');

    const response = await put(
      '/rooms/00000000-0000-4000-8000-000000000000',
      { name: 'Missing room' },
      tenant.token,
    );

    await expectApiError(response, 404, 'room_not_found', 'Room not found');
  });

  it('returns 404 when deleting a room from another tenant', async () => {
    const tenantA = tenantFixture('tenant-rooms-cross-delete-a');
    const tenantB = tenantFixture('tenant-rooms-cross-delete-b');

    const createResponse = await post(
      '/rooms',
      {
        invite: 'TENANTA1',
        name: 'Tenant A Owned',
      },
      tenantA.token,
    );
    expect(createResponse.status).toBe(201);
    const room = (await json(createResponse)) as { uuid: string };

    const response = await del(`/rooms/${room.uuid}`, tenantB.token);

    await expectApiError(response, 404, 'room_not_found', 'Room not found');
  });

  it('validates geo, include_inactive and page_size query constraints', async () => {
    const tenant = tenantFixture('tenant-rooms-validation');

    const invalidGeoResponse = await post(
      '/rooms',
      {
        invite: 'GEOINV1',
        name: 'Invalid Geo Room',
        geo: {
          code: 'BRA',
          lat: -23.55,
          lon: -46.63,
        },
      },
      tenant.token,
    );
    expect(invalidGeoResponse.status).toBe(400);

    const invalidIncludeInactiveResponse = await get(
      '/rooms?include_inactive=true&include_inactive=false',
      tenant.token,
    );
    expect(invalidIncludeInactiveResponse.status).toBe(400);

    const invalidPageSizeResponse = await get(
      '/rooms?page_size=101',
      tenant.token,
    );
    expect(invalidPageSizeResponse.status).toBe(400);
  });

  it('keeps room unchanged when update body is empty', async () => {
    const tenant = tenantFixture('tenant-rooms-empty-update');

    const createResponse = await post(
      '/rooms',
      {
        invite: 'EMPTYUPD1',
        name: 'Empty Update',
        player_name: 'BeforePlayer',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdRoom = (await json(createResponse)) as {
      uuid: string;
      name: string;
      player_name: string | null;
    };

    const updateResponse = await put(
      `/rooms/${createdRoom.uuid}`,
      {},
      tenant.token,
    );
    expect(updateResponse.status).toBe(200);
    expect(await json(updateResponse)).toEqual(
      expect.objectContaining({
        uuid: createdRoom.uuid,
        name: createdRoom.name,
        player_name: createdRoom.player_name,
      }),
    );
  });

  it('persists nullable fields when they are explicitly set to null', async () => {
    const tenant = tenantFixture('tenant-rooms-nullables');

    const createResponse = await post(
      '/rooms',
      {
        invite: 'NULLABLE1',
        name: 'Nullable Room',
        player_name: 'Host',
        password: 'secret',
        public: true,
        max_players: 16,
        geo: {
          code: 'BR',
          lat: -23.55,
          lon: -46.63,
        },
        token: 'token-x',
        no_player: true,
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdRoom = (await json(createResponse)) as { uuid: string };

    const updateResponse = await put(
      `/rooms/${createdRoom.uuid}`,
      {
        player_name: null,
        password: null,
        public: null,
        max_players: null,
        geo: null,
        token: null,
        no_player: null,
      },
      tenant.token,
    );
    expect(updateResponse.status).toBe(200);
    expect(await json(updateResponse)).toEqual(
      expect.objectContaining({
        player_name: null,
        password: null,
        public: null,
        max_players: null,
        geo: null,
        token: null,
        no_player: null,
      }),
    );
  });

  it('maps create persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-rooms-persistence-create');
    const service = getE2ERuntime().app.get(RoomsService);
    jest
      .spyOn(service, 'create')
      .mockResolvedValueOnce(err(persistenceErrorFixture('rooms')));

    const response = await post(
      '/rooms',
      {
        invite: 'FAIL001',
        name: 'Create Fail',
      },
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps list persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-rooms-persistence-list');
    const service = getE2ERuntime().app.get(RoomsService);
    jest
      .spyOn(service, 'list')
      .mockResolvedValueOnce(err(persistenceErrorFixture('rooms')));

    const response = await get('/rooms', tenant.token);

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps get-by-id persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-rooms-persistence-get');
    const service = getE2ERuntime().app.get(RoomsService);
    jest
      .spyOn(service, 'getById')
      .mockResolvedValueOnce(err(persistenceErrorFixture('rooms')));

    const response = await get(
      '/rooms/00000000-0000-4000-8000-000000000000',
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps update persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-rooms-persistence-update');
    const service = getE2ERuntime().app.get(RoomsService);
    jest
      .spyOn(service, 'update')
      .mockResolvedValueOnce(err(persistenceErrorFixture('rooms')));

    const response = await put(
      '/rooms/00000000-0000-4000-8000-000000000000',
      { name: 'Will Fail' },
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps deactivate persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-rooms-persistence-delete');
    const service = getE2ERuntime().app.get(RoomsService);
    jest
      .spyOn(service, 'deactivate')
      .mockResolvedValueOnce(err(persistenceErrorFixture('rooms')));

    const response = await del(
      '/rooms/00000000-0000-4000-8000-000000000000',
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });
});
