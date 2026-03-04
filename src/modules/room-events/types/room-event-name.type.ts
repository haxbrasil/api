export const ROOM_EVENT_NAMES = [
  'onPlayerJoin',
  'onPlayerLeave',
  'onTeamVictory',
  'onPlayerChat',
  'onPlayerBallKick',
  'onTeamGoal',
  'onGameStart',
  'onGameStop',
  'onPlayerAdminChange',
  'onPlayerTeamChange',
  'onPlayerKicked',
  'onGamePause',
  'onGameUnpause',
  'onPositionsReset',
  'onPlayerActivity',
  'onStadiumChange',
  'onRoomLink',
  'onKickRateLimitSet',
  'onTeamsLockChange',
] as const;

export type RoomEventName = (typeof ROOM_EVENT_NAMES)[number];
