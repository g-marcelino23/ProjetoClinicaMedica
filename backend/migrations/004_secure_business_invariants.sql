CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS hora_fim time without time zone;

UPDATE consultas c
SET hora_fim = a.hora_fim
FROM agendas_medicas a
WHERE c.agenda_id = a.id
  AND c.hora_fim IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM consultas WHERE hora_fim IS NULL) THEN
    RAISE EXCEPTION
      'Não foi possível determinar a hora final de todas as consultas';
  END IF;
END
$$;

ALTER TABLE consultas
  ALTER COLUMN hora_fim SET NOT NULL;

ALTER TABLE prescricoes
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultas_intervalo_valido'
  ) THEN
    ALTER TABLE consultas
      ADD CONSTRAINT consultas_intervalo_valido
      CHECK (hora_fim > hora_consulta);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultas_status_valido'
  ) THEN
    ALTER TABLE consultas
      ADD CONSTRAINT consultas_status_valido
      CHECK (status IN (
        'AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'FALTOU'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exames_status_valido'
  ) THEN
    ALTER TABLE exames
      ADD CONSTRAINT exames_status_valido
      CHECK (status IN (
        'SOLICITADO', 'AGENDADO', 'REALIZADO', 'ENTREGUE', 'CANCELADO'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lista_espera_status_valido'
  ) THEN
    ALTER TABLE lista_espera
      ADD CONSTRAINT lista_espera_status_valido
      CHECK (status IN ('ATIVO', 'CHAMADO', 'ENCERRADO', 'CANCELADO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prescricoes_status_valido'
  ) THEN
    ALTER TABLE prescricoes
      ADD CONSTRAINT prescricoes_status_valido
      CHECK (status IN ('ATIVA', 'CANCELADA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prescricoes_cancelamento_coerente'
  ) THEN
    ALTER TABLE prescricoes
      ADD CONSTRAINT prescricoes_cancelamento_coerente
      CHECK (
        (status = 'ATIVA' AND cancelada_em IS NULL)
        OR (status = 'CANCELADA' AND cancelada_em IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agendas_medicas_sem_sobreposicao'
  ) THEN
    ALTER TABLE agendas_medicas
      ADD CONSTRAINT agendas_medicas_sem_sobreposicao
      EXCLUDE USING gist (
        medico_id WITH =,
        tsrange(
          data_agenda + hora_inicio,
          data_agenda + hora_fim,
          '[)'
        ) WITH &&
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultas_paciente_sem_sobreposicao'
  ) THEN
    ALTER TABLE consultas
      ADD CONSTRAINT consultas_paciente_sem_sobreposicao
      EXCLUDE USING gist (
        paciente_id WITH =,
        tsrange(
          data_consulta + hora_consulta,
          data_consulta + hora_fim,
          '[)'
        ) WITH &&
      )
      WHERE (status IN ('AGENDADA', 'CONFIRMADA'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS lista_espera_entrada_ativa_unica_idx
  ON lista_espera (
    paciente_id,
    COALESCE(medico_id, 0),
    COALESCE(especialidade, '')
  )
  WHERE status IN ('ATIVO', 'CHAMADO');
