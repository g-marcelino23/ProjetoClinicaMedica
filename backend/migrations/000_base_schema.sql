-- Esquema funcional mínimo do ClinicalMed.
-- Esta migração é idempotente para permitir sua adoção por bancos existentes.
-- As migrações seguintes aplicam criptografia, invariantes e autenticação forte.

CREATE TABLE IF NOT EXISTS usuarios (
  id serial PRIMARY KEY,
  nome varchar(150) NOT NULL,
  email varchar(150) NOT NULL UNIQUE,
  senha text NOT NULL,
  perfil varchar(20) NOT NULL
    CHECK (perfil IN ('PACIENTE', 'MEDICO', 'SECRETARIO')),
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secretarios (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL UNIQUE
    REFERENCES usuarios(id) ON DELETE CASCADE,
  telefone varchar(20)
);

CREATE TABLE IF NOT EXISTS medicos (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL UNIQUE
    REFERENCES usuarios(id) ON DELETE CASCADE,
  crm varchar(20) NOT NULL UNIQUE,
  especialidade varchar(100) NOT NULL,
  telefone varchar(20)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL UNIQUE
    REFERENCES usuarios(id) ON DELETE CASCADE,
  cpf varchar(14) NOT NULL UNIQUE,
  data_nascimento date,
  telefone varchar(20),
  endereco text,
  convenio varchar(100),
  numero_convenio varchar(100)
);

CREATE TABLE IF NOT EXISTS agendas_medicas (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL
    REFERENCES medicos(id) ON DELETE CASCADE,
  data_agenda date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fim time without time zone NOT NULL,
  disponivel boolean DEFAULT true,
  observacao text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultas (
  id serial PRIMARY KEY,
  paciente_id integer NOT NULL
    REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id integer NOT NULL
    REFERENCES medicos(id) ON DELETE CASCADE,
  agenda_id integer REFERENCES agendas_medicas(id) ON DELETE SET NULL,
  data_consulta date NOT NULL,
  hora_consulta time without time zone NOT NULL,
  motivo text,
  status varchar(20) NOT NULL DEFAULT 'AGENDADA',
  observacoes text,
  checkin_realizado boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  check_in_realizado boolean DEFAULT false,
  data_check_in timestamp without time zone,
  data_checkin timestamp without time zone
);

CREATE TABLE IF NOT EXISTS prontuarios (
  id serial PRIMARY KEY,
  consulta_id integer NOT NULL UNIQUE
    REFERENCES consultas(id) ON DELETE CASCADE,
  paciente_id integer NOT NULL
    REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id integer NOT NULL
    REFERENCES medicos(id) ON DELETE CASCADE,
  queixa_principal text,
  anamnese text,
  diagnostico text,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exames (
  id serial PRIMARY KEY,
  consulta_id integer NOT NULL
    REFERENCES consultas(id) ON DELETE CASCADE,
  paciente_id integer NOT NULL
    REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id integer NOT NULL
    REFERENCES medicos(id) ON DELETE CASCADE,
  nome_exame text NOT NULL,
  descricao text,
  status varchar(20) NOT NULL DEFAULT 'SOLICITADO',
  data_exame date,
  resultado text,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescricoes (
  id serial PRIMARY KEY,
  consulta_id integer NOT NULL
    REFERENCES consultas(id) ON DELETE CASCADE,
  paciente_id integer NOT NULL
    REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id integer NOT NULL
    REFERENCES medicos(id) ON DELETE CASCADE,
  observacoes text,
  data_prescricao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  medicamento text,
  dosagem text,
  frequencia text,
  duracao text
);

CREATE TABLE IF NOT EXISTS lista_espera (
  id serial PRIMARY KEY,
  paciente_id integer NOT NULL
    REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id integer REFERENCES medicos(id) ON DELETE SET NULL,
  especialidade varchar(100),
  data_desejada date,
  status varchar(20) NOT NULL DEFAULT 'ATIVO',
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL
    REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo varchar(50),
  lida boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs_acesso (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL
    REFERENCES usuarios(id) ON DELETE CASCADE,
  acao varchar(100) NOT NULL,
  descricao text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinicalmed_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      usuarios, secretarios, medicos, pacientes, agendas_medicas, consultas,
      prontuarios, exames, prescricoes, lista_espera, notificacoes, logs_acesso
      TO clinicalmed_app;

    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
      TO clinicalmed_app;
  END IF;
END
$$;
