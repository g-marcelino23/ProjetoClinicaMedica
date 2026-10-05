\set ON_ERROR_STOP on

\prompt 'Informe uma senha forte para clinicalmed_app: ' app_password

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinicalmed_app') THEN
    CREATE ROLE clinicalmed_app;
  END IF;
END
$$;

ALTER ROLE clinicalmed_app
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

SELECT format('ALTER ROLE clinicalmed_app PASSWORD %L', :'app_password') \gexec

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO clinicalmed_app',
  current_database()
) \gexec
GRANT USAGE ON SCHEMA public TO clinicalmed_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinicalmed_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinicalmed_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clinicalmed_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO clinicalmed_app;

DO $$
BEGIN
  IF to_regclass('public.schema_migrations') IS NOT NULL THEN
    EXECUTE
      'REVOKE ALL PRIVILEGES ON TABLE public.schema_migrations FROM clinicalmed_app';
  END IF;

  IF to_regclass('public.security_events') IS NOT NULL THEN
    EXECUTE
      'REVOKE ALL PRIVILEGES ON TABLE public.security_events FROM clinicalmed_app';
    EXECUTE
      'GRANT SELECT, INSERT ON TABLE public.security_events TO clinicalmed_app';
    EXECUTE
      'GRANT USAGE, SELECT ON SEQUENCE public.security_events_id_seq TO clinicalmed_app';
  END IF;

  IF to_regclass('public.security_alerts') IS NOT NULL THEN
    EXECUTE
      'REVOKE ALL PRIVILEGES ON TABLE public.security_alerts FROM clinicalmed_app';
    EXECUTE
      'GRANT SELECT, INSERT ON TABLE public.security_alerts TO clinicalmed_app';
    EXECUTE
      'GRANT UPDATE (first_event_at, last_event_at, event_count, last_notified_at, context, updated_at) ON TABLE public.security_alerts TO clinicalmed_app';
    EXECUTE
      'GRANT USAGE, SELECT ON SEQUENCE public.security_alerts_id_seq TO clinicalmed_app';
  END IF;
END
$$;
