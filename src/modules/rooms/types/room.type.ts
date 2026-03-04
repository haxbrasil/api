import { RoomRow } from '../../database/database';
import { RoomGeo } from './room-geo.type';

export type Room = Omit<RoomRow, 'public' | 'geo' | 'noPlayer' | 'active'> & {
  public: boolean | null;
  geo: RoomGeo | null;
  noPlayer: boolean | null;
  active: boolean;
};

export type RoomInputData = {
  id: string;
  tenant: string;
  invite: string;
  name: string;
  playerName?: string | null;
  password?: string | null;
  public?: boolean | null;
  maxPlayers?: number | null;
  geo?: RoomGeo | null;
  token?: string | null;
  noPlayer?: boolean | null;
};

export type RoomUpdateData = {
  invite?: string;
  name?: string;
  playerName?: string | null;
  password?: string | null;
  public?: boolean | null;
  maxPlayers?: number | null;
  geo?: RoomGeo | null;
  token?: string | null;
  noPlayer?: boolean | null;
};
