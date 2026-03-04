import { DatabaseService } from '../../src/modules/database/database.service';
import { getE2ERuntime } from '../support/runtime';

export async function insertRoomDirectly(
  tenant: string,
  roomUuid: string,
  active = true,
): Promise<void> {
  const db = getE2ERuntime().app.get(DatabaseService);

  const insertResult = await db.query`
    INSERT INTO rooms (id, tenant, invite, name, active)
    VALUES (${roomUuid}, ${tenant}, ${`INV-${roomUuid.slice(0, 6)}`}, 'Deferred Room', ${active})
  `;

  expect(insertResult.isErr()).toBe(false);
}
