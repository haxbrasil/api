export type UserRoleValue = 'admin' | 'mod' | 'default';

export type UserRow<TRole extends string = UserRoleValue> = {
  id: string;
  tenant: string;
  provider: string;
  providerUserId: string;
  username: string;
  role: TRole;
  password: string | null;
  createdAt: Date;
};

export type UserPublicRow<TRole extends string = UserRoleValue> = Omit<
  UserRow<TRole>,
  'password'
>;

export type UserCredentialsRow = Pick<UserRow, 'providerUserId' | 'password'>;

export type RecordingRow = {
  id: string;
  tenant: string;
  code: string;
  recordingUuid: string;
  url: string;
  createdAt: Date;
};

export type RecordingCodeRow = Pick<RecordingRow, 'code'>;

export type RoomRow = {
  id: string;
  tenant: string;
  invite: string;
  name: string;
  playerName: string | null;
  password: string | null;
  public: boolean | number | null;
  maxPlayers: number | null;
  geo: unknown;
  token: string | null;
  noPlayer: boolean | number | null;
  active: boolean | number;
  inactivatedAt: Date | null;
  createdAt: Date;
};

export type RoomEventRow<TEventName extends string = string> = {
  id: string;
  roomUuid: string;
  eventName: TEventName;
  payload: unknown;
  occurredAt: Date;
  createdAt: Date;
};

export type DeferredRoomEventRow<TEventName extends string = string> = {
  id: string;
  tenant: string;
  roomUuid: string;
  eventName: TEventName;
  payload: unknown;
  occurredAt: Date;
  expiresAt: Date;
  createdAt: Date;
};
