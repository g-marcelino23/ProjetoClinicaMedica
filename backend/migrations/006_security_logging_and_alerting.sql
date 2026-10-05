CREATE TABLE IF NOT EXISTS security_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level varchar(10) NOT NULL
    CHECK (level IN ('info', 'warn', 'error')),
  event_type varchar(100) NOT NULL
    CHECK (event_type ~ '^[a-z][a-z0-9_]{2,99}$'),
  request_id varchar(64),
  actor_user_id integer,
  source_key char(64)
    CHECK (source_key IS NULL OR source_key ~ '^[a-f0-9]{64}$'),
  correlation_key char(64)
    CHECK (
      correlation_key IS NULL OR
      correlation_key ~ '^[a-f0-9]{64}$'
    ),
  method varchar(10),
  route varchar(255),
  status smallint
    CHECK (status IS NULL OR status BETWEEN 100 AND 599),
  context jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(context) = 'object')
);

CREATE INDEX IF NOT EXISTS security_events_type_time_idx
  ON security_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS security_events_correlation_time_idx
  ON security_events (correlation_key, occurred_at DESC)
  WHERE correlation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS security_events_actor_time_idx
  ON security_events (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS security_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_type varchar(100) NOT NULL
    CHECK (alert_type ~ '^[A-Z][A-Z0-9_]{2,99}$'),
  severity varchar(10) NOT NULL
    CHECK (severity IN ('MEDIUM', 'HIGH', 'CRITICAL')),
  correlation_key char(64) NOT NULL
    CHECK (correlation_key ~ '^[a-f0-9]{64}$'),
  first_event_at timestamptz NOT NULL,
  last_event_at timestamptz NOT NULL,
  event_count integer NOT NULL CHECK (event_count > 0),
  status varchar(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  last_notified_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(context) = 'object'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS security_alerts_open_correlation_uidx
  ON security_alerts (alert_type, correlation_key)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS security_alerts_status_severity_idx
  ON security_alerts (status, severity, last_event_at DESC);

CREATE OR REPLACE FUNCTION prevent_security_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'security_events é uma trilha append-only';
END;
$$;

DROP TRIGGER IF EXISTS security_events_append_only
  ON security_events;

CREATE TRIGGER security_events_append_only
BEFORE UPDATE OR DELETE ON security_events
FOR EACH ROW
EXECUTE FUNCTION prevent_security_event_mutation();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinicalmed_app') THEN
    REVOKE ALL PRIVILEGES
      ON TABLE security_events, security_alerts
      FROM clinicalmed_app;

    GRANT SELECT, INSERT
      ON TABLE security_events
      TO clinicalmed_app;

    GRANT SELECT, INSERT
      ON TABLE security_alerts
      TO clinicalmed_app;

    GRANT UPDATE (
      first_event_at,
      last_event_at,
      event_count,
      last_notified_at,
      context,
      updated_at
    )
      ON TABLE security_alerts
      TO clinicalmed_app;

    GRANT USAGE, SELECT
      ON SEQUENCE security_events_id_seq, security_alerts_id_seq
      TO clinicalmed_app;
  END IF;
END
$$;
