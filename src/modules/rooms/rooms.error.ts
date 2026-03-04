export type RoomNotFoundError = {
  type: 'room_not_found';
  roomId: string;
};

export type RoomInactiveError = {
  type: 'room_inactive';
  roomId: string;
};
