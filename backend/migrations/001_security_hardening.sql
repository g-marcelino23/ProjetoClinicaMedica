REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE UNIQUE INDEX IF NOT EXISTS consultas_agenda_unica_idx
  ON consultas (agenda_id)
  WHERE agenda_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agendas_medicas_horario_unico_idx
  ON agendas_medicas (medico_id, data_agenda, hora_inicio, hora_fim);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agendas_medicas_intervalo_valido'
  ) THEN
    ALTER TABLE agendas_medicas
      ADD CONSTRAINT agendas_medicas_intervalo_valido
      CHECK (hora_fim > hora_inicio);
  END IF;
END
$$;
