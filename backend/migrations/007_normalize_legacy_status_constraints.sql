-- Remove constraints legadas mais restritivas que coexistiam com as invariantes
-- atuais e impediam, por exemplo, o cancelamento de uma entrada na fila.

ALTER TABLE consultas
  DROP CONSTRAINT IF EXISTS consultas_status_check;

ALTER TABLE exames
  DROP CONSTRAINT IF EXISTS exames_status_check;

ALTER TABLE lista_espera
  DROP CONSTRAINT IF EXISTS lista_espera_status_check;

ALTER TABLE consultas
  ALTER COLUMN status SET DEFAULT 'AGENDADA';

ALTER TABLE exames
  ALTER COLUMN status SET DEFAULT 'SOLICITADO';

ALTER TABLE lista_espera
  ALTER COLUMN status SET DEFAULT 'ATIVO';
