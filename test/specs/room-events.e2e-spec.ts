import * as crypto from 'node:crypto';
import { DatabaseService } from '../../src/modules/database/database.service';
import { RoomEventsService } from '../../src/modules/room-events/room-events.service';
import { del, get, json, post } from '../support/client';
import { tenantFixture } from '../fixtures';
import { getE2ERuntime } from '../support/runtime';

async function insertRoomDirectly(
  tenant: string,
  roomUuid: string,
): Promise<void> {
  const db = getE2ERuntime().app.get(DatabaseService);

  const insertResult = await db.query`
    INSERT INTO rooms (id, tenant, invite, name, active)
    VALUES (${roomUuid}, ${tenant}, ${`INV-${roomUuid.slice(0, 6)}`}, 'Deferred Room', TRUE)
  `;

  expect(insertResult.isErr()).toBe(false);
}

describe('Room Events (e2e)', () => {
  it('rejects requests without a bearer token', async () => {
    const postResponse = await post('/rooms/events', {
      room_uuid: crypto.randomUUID(),
      event_name: 'onPlayerJoin',
      timestamp: new Date().toISOString(),
      payload: { player: 'no-auth' },
    });
    expect(postResponse.status).toBe(401);

    const getResponse = await get(`/rooms/${crypto.randomUUID()}/events`);
    expect(getResponse.status).toBe(401);
  });

  it('stores events for active rooms and lists them paginated in newest-first order', async () => {
    const tenant = tenantFixture('tenant-room-events-list');

    const createRoomResponse = await post(
      '/rooms',
      {
        invite: 'EVENTS01',
        name: 'Events Room',
      },
      tenant.token,
    );
    expect(createRoomResponse.status).toBe(201);
    const room = (await json(createRoomResponse)) as { uuid: string };

    const olderTimestamp = new Date('2026-03-04T10:00:00.000Z').toISOString();
    const newerTimestamp = new Date('2026-03-04T11:00:00.000Z').toISOString();

    const firstEventResponse = await post(
      '/rooms/events',
      {
        room_uuid: room.uuid,
        event_name: 'onPlayerJoin',
        timestamp: olderTimestamp,
        payload: { player_id: 1 },
      },
      tenant.token,
    );
    expect(firstEventResponse.status).toBe(201);

    const secondEventResponse = await post(
      '/rooms/events',
      {
        room_uuid: room.uuid,
        event_name: 'onPlayerLeave',
        timestamp: newerTimestamp,
        payload: { player_id: 1 },
      },
      tenant.token,
    );
    expect(secondEventResponse.status).toBe(201);

    const listResponse = await get(
      `/rooms/${room.uuid}/events?page=1&page_size=1`,
      tenant.token,
    );
    expect(listResponse.status).toBe(200);

    const firstPage = (await json(listResponse)) as {
      items: Array<{ event_name: string }>;
      page_info: { page: number; page_size: number; has_next_page: boolean };
    };

    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0].event_name).toBe('onPlayerLeave');
    expect(firstPage.page_info).toEqual({
      page: 1,
      page_size: 1,
      has_next_page: true,
    });

    const secondPageResponse = await get(
      `/rooms/${room.uuid}/events?page=2&page_size=1`,
      tenant.token,
    );
    expect(secondPageResponse.status).toBe(200);

    const secondPage = (await json(secondPageResponse)) as {
      items: Array<{ event_name: string }>;
      page_info: { page: number; page_size: number; has_next_page: boolean };
    };

    expect(secondPage.items[0].event_name).toBe('onPlayerJoin');
    expect(secondPage.page_info).toEqual({
      page: 2,
      page_size: 1,
      has_next_page: false,
    });
  });

  it('returns deferred state when room does not exist', async () => {
    const tenant = tenantFixture('tenant-room-events-deferred');

    const response = await post(
      '/rooms/events',
      {
        room_uuid: crypto.randomUUID(),
        event_name: 'onPlayerJoin',
        timestamp: new Date().toISOString(),
        payload: { player_id: 2 },
      },
      tenant.token,
    );

    expect(response.status).toBe(202);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        state: 'deferred',
      }),
    );
  });

  it('rejects event creation for inactive rooms', async () => {
    const tenant = tenantFixture('tenant-room-events-inactive');

    const createRoomResponse = await post(
      '/rooms',
      {
        invite: 'INACTIVE1',
        name: 'Inactive Room',
      },
      tenant.token,
    );
    expect(createRoomResponse.status).toBe(201);
    const room = (await json(createRoomResponse)) as { uuid: string };

    const deactivateResponse = await del(`/rooms/${room.uuid}`, tenant.token);
    expect(deactivateResponse.status).toBe(204);

    const eventResponse = await post(
      '/rooms/events',
      {
        room_uuid: room.uuid,
        event_name: 'onPlayerJoin',
        timestamp: new Date().toISOString(),
        payload: { player_id: 3 },
      },
      tenant.token,
    );

    expect(eventResponse.status).toBe(409);
    expect(await json(eventResponse)).toEqual({
      code: 'room_inactive',
      message: 'Room is inactive',
    });
  });

  it('rejects onGameTick event name', async () => {
    const tenant = tenantFixture('tenant-room-events-validation');

    const response = await post(
      '/rooms/events',
      {
        room_uuid: crypto.randomUUID(),
        event_name: 'onGameTick',
        timestamp: new Date().toISOString(),
        payload: {},
      },
      tenant.token,
    );

    expect(response.status).toBe(400);
  });

  it('reconciles deferred events when room appears and expires stale deferred rows', async () => {
    const tenant = tenantFixture('tenant-room-events-reconcile');
    const roomUuid = crypto.randomUUID();

    const deferredResponse = await post(
      '/rooms/events',
      {
        room_uuid: roomUuid,
        event_name: 'onPlayerJoin',
        timestamp: new Date().toISOString(),
        payload: { player_id: 9 },
      },
      tenant.token,
    );
    expect(deferredResponse.status).toBe(202);

    await insertRoomDirectly(tenant.tenant, roomUuid);

    const service = getE2ERuntime().app.get(RoomEventsService);
    const reconcileResult = await service.reconcileDeferredEvents();
    expect(reconcileResult.isErr()).toBe(false);

    const listResponse = await get(`/rooms/${roomUuid}/events`, tenant.token);
    expect(listResponse.status).toBe(200);
    expect(await json(listResponse)).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            event_name: 'onPlayerJoin',
          }),
        ],
      }),
    );

    const staleRoomUuid = crypto.randomUUID();
    const staleDeferredResponse = await post(
      '/rooms/events',
      {
        room_uuid: staleRoomUuid,
        event_name: 'onPlayerJoin',
        timestamp: new Date().toISOString(),
        payload: { player_id: 10 },
      },
      tenant.token,
    );
    expect(staleDeferredResponse.status).toBe(202);

    const expireResult = await service.reconcileDeferredEvents(
      new Date(Date.now() + 6 * 60 * 1000),
    );
    expect(expireResult.isErr()).toBe(false);

    const db = getE2ERuntime().app.get(DatabaseService);
    const countResult = await db.queryOne<{ total: number }>`
      SELECT COUNT(*) AS total
      FROM deferred_room_events
      WHERE tenant = ${tenant.tenant}
      AND room_uuid = ${staleRoomUuid}
    `;

    expect(countResult.isErr()).toBe(false);
    const countRow = countResult.isOk() ? countResult.value : null;
    expect(countRow?.total).toBe(0);
  });
});
