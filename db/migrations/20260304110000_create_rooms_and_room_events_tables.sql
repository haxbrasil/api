-- migrate:up
CREATE TABLE rooms (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant VARCHAR(100) NOT NULL,
  invite VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  player_name VARCHAR(100) NULL,
  password VARCHAR(255) NULL,
  public TINYINT(1) NULL,
  max_players INT NULL,
  geo JSON NULL,
  token VARCHAR(1024) NULL,
  no_player TINYINT(1) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  inactivated_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rooms_tenant_active_created_at (tenant, active, created_at),
  KEY idx_rooms_tenant_name_created_at (tenant, name, created_at)
);

CREATE TABLE room_events (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  room_uuid CHAR(36) NOT NULL,
  event_name VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_room_events_room_uuid_occurred_at (room_uuid, occurred_at, created_at),
  CONSTRAINT fk_room_events_room_uuid
    FOREIGN KEY (room_uuid) REFERENCES rooms(id)
    ON DELETE CASCADE
);

CREATE TABLE deferred_room_events (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant VARCHAR(100) NOT NULL,
  room_uuid CHAR(36) NOT NULL,
  event_name VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_deferred_room_events_tenant_room_uuid (tenant, room_uuid),
  KEY idx_deferred_room_events_expires_at (expires_at),
  KEY idx_deferred_room_events_created_at (created_at)
);

-- migrate:down
DROP TABLE IF EXISTS deferred_room_events;
DROP TABLE IF EXISTS room_events;
DROP TABLE IF EXISTS rooms;
