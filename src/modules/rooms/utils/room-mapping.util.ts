import { RoomGeo } from '../types/room-geo.type';

function isRoomGeo(value: unknown): value is RoomGeo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'lat' in value &&
    typeof value.lat === 'number' &&
    'lon' in value &&
    typeof value.lon === 'number'
  );
}

export function parseRoomGeo(value: unknown): RoomGeo | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (isRoomGeo(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRoomGeo(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}
