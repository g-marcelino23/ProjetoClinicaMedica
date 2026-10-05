ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS credentials_changed_at timestamptz NOT NULL
    DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_secret text,
  ADD COLUMN IF NOT EXISTS mfa_last_counter bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_tentativas_login_validas'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_tentativas_login_validas
      CHECK (failed_login_attempts >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_mfa_coerente'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_mfa_coerente
      CHECK (
        (mfa_enabled = false AND mfa_secret IS NULL)
        OR
        (
          mfa_enabled = true
          AND mfa_secret LIKE 'cmenc.v1.%'
        )
      );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revocation_reason varchar(40),
  user_agent_hash char(64),
  CONSTRAINT auth_sessions_expiracao_valida
    CHECK (expires_at > created_at),
  CONSTRAINT auth_sessions_revogacao_coerente
    CHECK (
      (revoked_at IS NULL AND revocation_reason IS NULL)
      OR
      (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS auth_sessions_usuario_ativas_idx
  ON auth_sessions (usuario_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_mfa_challenges (
  id uuid PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  purpose varchar(20) NOT NULL,
  pending_secret text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT auth_mfa_challenge_purpose
    CHECK (purpose IN ('LOGIN', 'ENROLLMENT')),
  CONSTRAINT auth_mfa_challenge_attempts
    CHECK (attempts BETWEEN 0 AND 5),
  CONSTRAINT auth_mfa_challenge_secret
    CHECK (
      (purpose = 'LOGIN' AND pending_secret IS NULL)
      OR
      (
        purpose = 'ENROLLMENT'
        AND pending_secret LIKE 'cmenc.v1.%'
      )
    )
);

CREATE INDEX IF NOT EXISTS auth_mfa_challenges_active_idx
  ON auth_mfa_challenges (usuario_id, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_mfa_recovery_codes (
  id bigserial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  code_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at timestamptz,
  UNIQUE (usuario_id, code_hash)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinicalmed_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON auth_sessions, auth_mfa_challenges, auth_mfa_recovery_codes
      TO clinicalmed_app;
    GRANT USAGE, SELECT
      ON SEQUENCE auth_mfa_recovery_codes_id_seq
      TO clinicalmed_app;
  END IF;
END
$$;
