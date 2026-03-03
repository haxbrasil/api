-- migrate:up
CREATE TABLE recordings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  tenant VARCHAR(100) NOT NULL,
  code CHAR(6) NOT NULL,
  recording_uuid CHAR(36) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recordings_tenant_code (tenant, code),
  UNIQUE KEY uq_recordings_recording_uuid (recording_uuid),
  KEY idx_recordings_tenant_created_at (tenant, created_at)
);

-- migrate:down
DROP TABLE IF EXISTS recordings;
