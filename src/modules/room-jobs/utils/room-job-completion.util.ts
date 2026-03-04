import {
  getOptionalStringField,
  asObjectRecord,
} from '../../../common/utils/unknown-value.util';
import { RoomJobCompletion, RoomJobHttpResult } from '../types/room-job.type';

function parseFailedCompletion(
  input: Record<string, unknown>,
): RoomJobCompletion {
  return {
    state: 'failed',
    code: getOptionalStringField(input, 'code') ?? 'unknown_failure',
    message: getOptionalStringField(input, 'message'),
  };
}

function parseOpenCompletion(
  input: Record<string, unknown>,
): RoomJobCompletion {
  return {
    state: 'open',
    room_uuid: getOptionalStringField(input, 'room_uuid'),
    roomUuid: getOptionalStringField(input, 'roomUuid'),
    invite: getOptionalStringField(input, 'invite'),
  };
}

export function parseRoomJobCompletion(
  value: unknown,
): RoomJobCompletion | null {
  const input = asObjectRecord(value);

  if (!input) {
    return null;
  }

  const state = getOptionalStringField(input, 'state');

  switch (state) {
    case 'open':
      return parseOpenCompletion(input);
    case 'failed':
      return parseFailedCompletion(input);
    default:
      return null;
  }
}

export function toRoomJobHttpResult(
  jobId: string,
  completion: unknown,
): RoomJobHttpResult {
  const parsed = parseRoomJobCompletion(completion);

  if (!parsed) {
    return {
      state: 'failed',
      job_id: jobId,
      code: 'invalid_completion_payload',
    };
  }

  if (parsed.state === 'failed') {
    return {
      state: 'failed',
      job_id: jobId,
      code: parsed.code,
      message: parsed.message,
    };
  }

  return {
    state: 'open',
    job_id: jobId,
    room_uuid: parsed.room_uuid ?? parsed.roomUuid,
    invite: parsed.invite,
  };
}
