export const ROOM_JOBS_QUEUE = 'room-jobs';
export const ROOM_JOB_NAME = 'open-room';

export type RoomJobData = {
  tenant: string;
  room_type: string;
  room_properties: unknown;
  token?: string;
};

export type RoomJobOpenCompletion = {
  state: 'open';
  room_uuid?: string;
  roomUuid?: string;
  invite?: string;
};

export type RoomJobFailedCompletion = {
  state: 'failed';
  code: string;
  message?: string;
};

export type RoomJobCompletion = RoomJobOpenCompletion | RoomJobFailedCompletion;

export type RoomJobOpenHttpResult = {
  state: 'open';
  job_id: string;
  room_uuid?: string;
  invite?: string;
};

export type RoomJobFailedHttpResult = {
  state: 'failed';
  job_id: string;
  code: string;
  message?: string;
};

export type RoomJobPendingHttpResult = {
  state: 'pending';
  job_id: string;
};

export type RoomJobHttpResult =
  | RoomJobOpenHttpResult
  | RoomJobFailedHttpResult
  | RoomJobPendingHttpResult;

export type RoomJobQueueError = {
  type: 'room_job_queue_error';
  cause: unknown;
};
