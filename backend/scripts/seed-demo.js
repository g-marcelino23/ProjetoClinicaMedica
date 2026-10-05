const path = require('path')

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
  quiet: true
})

const bcrypt = require('bcrypt')
const { fakerPT_BR: faker } = require('@faker-js/faker')
const {
  createBlindIndex,
  encryptField,
} = require('../src/utils/dataProtection')

const DEMO_SEED = 20260716
const DEMO_PASSWORD = process.env.DEMO_PASSWORD
const DEMO_EMAIL_DOMAIN = 'clinicalmed.local'
const DEMO_EMAIL_PREFIX = 'demo.seed.'
const DEMO_EMAIL_PATTERN = `${DEMO_EMAIL_PREFIX}%@${DEMO_EMAIL_DOMAIN}`
const DEMO_CREATED_AT = '2026-01-01 12:00:00'
const DEMO_DATE_ANCHOR = new Date('2026-07-16T12:00:00.000Z')

const DEFAULTS = {
  secretaries: 3,
  doctors: 20,
  patients: 200,
  appointments: 600
}

const VALID_PROFILES = ['PACIENTE', 'MEDICO', 'SECRETARIO']
const VALID_APPOINTMENT_STATUSES = [
  'AGENDADA',
  'CONFIRMADA',
  'CANCELADA',
  'REALIZADA',
  'FALTOU'
]
const VALID_EXAM_STATUSES = [
  'SOLICITADO',
  'AGENDADO',
  'REALIZADO',
  'ENTREGUE',
  'CANCELADO'
]

const SPECIALTIES = [
  'Cardiologia',
  'Clínica Médica',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Geriatria',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Urologia'
]

const HEALTH_PLANS = [
  'Unimed',
  'Hapvida',
  'Amil',
  'Bradesco Saúde',
  'SulAmérica Saúde'
]

const APPOINTMENT_REASONS = [
  'Consulta de rotina',
  'Avaliação de sintomas recentes',
  'Acompanhamento de tratamento',
  'Retorno para análise de exames',
  'Avaliação preventiva',
  'Renovação de prescrição'
]

const DIAGNOSES = [
  'Quadro clínico estável',
  'Hipertensão arterial em acompanhamento',
  'Infecção de vias aéreas superiores',
  'Dor musculoesquelética inespecífica',
  'Dislipidemia em acompanhamento',
  'Cefaleia tensional'
]

const EXAM_NAMES = [
  'Hemograma completo',
  'Glicemia em jejum',
  'Perfil lipídico',
  'Eletrocardiograma',
  'Ultrassonografia abdominal',
  'Radiografia de tórax',
  'Dosagem de TSH',
  'Creatinina sérica'
]

const REQUIRED_SCHEMA = {
  usuarios: ['id', 'nome', 'email', 'senha', 'perfil', 'ativo', 'created_at', 'updated_at'],
  secretarios: ['id', 'usuario_id', 'telefone'],
  medicos: ['id', 'usuario_id', 'crm', 'especialidade', 'telefone'],
  pacientes: [
    'id',
    'usuario_id',
    'cpf',
    'data_nascimento',
    'telefone',
    'endereco',
    'convenio',
    'numero_convenio'
  ],
  agendas_medicas: [
    'id',
    'medico_id',
    'data_agenda',
    'hora_inicio',
    'hora_fim',
    'disponivel',
    'observacao',
    'created_at'
  ],
  consultas: [
    'id',
    'paciente_id',
    'medico_id',
    'agenda_id',
    'data_consulta',
    'hora_consulta',
    'motivo',
    'status',
    'observacoes',
    'checkin_realizado',
    'data_checkin',
    'check_in_realizado',
    'data_check_in',
    'created_at',
    'updated_at'
  ],
  prontuarios: [
    'id',
    'consulta_id',
    'paciente_id',
    'medico_id',
    'queixa_principal',
    'anamnese',
    'diagnostico',
    'observacoes',
    'created_at',
    'updated_at'
  ],
  exames: [
    'id',
    'consulta_id',
    'paciente_id',
    'medico_id',
    'nome_exame',
    'descricao',
    'status',
    'data_exame',
    'resultado',
    'observacoes',
    'created_at',
    'updated_at'
  ],
  prescricoes: ['consulta_id', 'paciente_id', 'medico_id'],
  lista_espera: ['paciente_id', 'medico_id'],
  notificacoes: ['usuario_id'],
  logs_acesso: ['usuario_id']
}

function printHelp() {
  console.log(`
Uso:
  npm run seed:demo -- [opções]

Opções:
  --secretaries=<n>   Secretários e usuários (padrão: ${DEFAULTS.secretaries})
  --doctors=<n>       Médicos e usuários (padrão: ${DEFAULTS.doctors})
  --patients=<n>      Pacientes e usuários (padrão: ${DEFAULTS.patients})
  --appointments=<n>  Agendas e consultas (padrão: ${DEFAULTS.appointments})
  --records=<n>       Prontuários (padrão: 35% das consultas)
  --exams=<n>         Exames (padrão: 50% das consultas)
  --reset             Remove somente dados marcados como demonstração antes de gerar
  --help              Exibe esta ajuda

Exemplo:
  npm run seed:demo -- --secretaries=3 --doctors=20 --patients=200 --appointments=600

Seed fixa do gerador: ${DEMO_SEED}
Senha dos usuários fictícios: definida exclusivamente por DEMO_PASSWORD.
`)
}

function parseNonNegativeInteger(name, rawValue) {
  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`A opção --${name} deve ser um número inteiro não negativo.`)
  }

  const value = Number(rawValue)

  if (!Number.isSafeInteger(value)) {
    throw new Error(`A opção --${name} excede o limite de inteiro suportado.`)
  }

  return value
}

function parseArguments(argv) {
  const options = {
    ...DEFAULTS,
    records: null,
    exams: null,
    reset: false,
    help: false
  }
  const numericOptions = new Set([
    'secretaries',
    'doctors',
    'patients',
    'appointments',
    'records',
    'exams'
  ])

  for (const argument of argv) {
    if (argument === '--reset') {
      options.reset = true
      continue
    }

    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }

    const match = argument.match(/^--([a-z-]+)=(.+)$/)

    if (!match || !numericOptions.has(match[1])) {
      throw new Error(`Opção desconhecida: ${argument}`)
    }

    options[match[1]] = parseNonNegativeInteger(match[1], match[2])
  }

  options.records =
    options.records ??
    (options.appointments > 0
      ? Math.max(1, Math.floor(options.appointments * 0.35))
      : 0)
  options.exams =
    options.exams ??
    (options.appointments > 0
      ? Math.max(1, Math.floor(options.appointments * 0.5))
      : 0)

  if (options.appointments > 0 && (options.doctors === 0 || options.patients === 0)) {
    throw new Error(
      'Para gerar consultas, --doctors e --patients devem ser maiores que zero.'
    )
  }

  if (options.records > options.appointments) {
    throw new Error('--records não pode ser maior que --appointments.')
  }

  if (options.appointments === 0 && options.exams > 0) {
    throw new Error('Para gerar exames, --appointments deve ser maior que zero.')
  }

  return options
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + amount)
  return result
}

function toSqlDate(date) {
  return date.toISOString().slice(0, 10)
}

function birthDate() {
  const years = faker.number.int({ min: 1, max: 95 })
  const days = faker.number.int({ min: 0, max: 364 })
  return toSqlDate(addDays(DEMO_DATE_ANCHOR, -(years * 365 + days)))
}

function phone(index) {
  const number = String(900000000 + (index % 99999999)).padStart(9, '0')
  return `(85) ${number.slice(0, 5)}-${number.slice(5)}`
}

function calculateCpfDigit(digits, initialWeight) {
  const total = digits.reduce(
    (sum, digit, index) => sum + Number(digit) * (initialWeight - index),
    0
  )
  const remainder = total % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function validCpf(index) {
  const baseNumber = 100000000 + ((index * 7919 + 1234567) % 899999999)
  const base = String(baseNumber).padStart(9, '0').split('')
  const firstDigit = calculateCpfDigit(base, 10)
  const secondDigit = calculateCpfDigit([...base, firstDigit], 11)
  return `${base.join('')}${firstDigit}${secondDigit}`
}

function createUniqueValueFactory(existingValues, formatter, normalizer = (value) => value) {
  let index = 1

  return () => {
    while (true) {
      const value = formatter(index)
      index += 1
      const normalized = normalizer(value)

      if (!existingValues.has(normalized)) {
        existingValues.add(normalized)
        return { value, index: index - 1 }
      }
    }
  }
}

function createEmailFactory(role, existingEmails) {
  return createUniqueValueFactory(
    existingEmails,
    (index) =>
      `${DEMO_EMAIL_PREFIX}${DEMO_SEED}.${role}.${String(index).padStart(6, '0')}@${DEMO_EMAIL_DOMAIN}`,
    (value) => value.toLowerCase()
  )
}

function crm(index) {
  return `${String(100000 + index).padStart(6, '0')}-CE`
}

function appointmentStatus(index, recordCount) {
  if (index < recordCount) {
    return 'REALIZADA'
  }

  const statuses = ['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'FALTOU']
  return statuses[(index - recordCount) % statuses.length]
}

function appointmentSlot(index, status, doctorSlotCounters, doctorId) {
  const isPast = ['REALIZADA', 'CANCELADA', 'FALTOU'].includes(status)
  const counterKey = `${doctorId}:${isPast ? 'past' : 'future'}`
  const slotIndex = doctorSlotCounters.get(counterKey) || 0
  doctorSlotCounters.set(counterKey, slotIndex + 1)

  const hours = [8, 9, 10, 11, 13, 14, 15, 16]
  const hour = hours[slotIndex % hours.length]
  const dayDistance = Math.floor(slotIndex / hours.length) + 1
  const date = addDays(DEMO_DATE_ANCHOR, isPast ? -dayDistance : dayDistance)

  return {
    date: toSqlDate(date),
    startTime: `${String(hour).padStart(2, '0')}:00:00`,
    endTime: `${String(hour).padStart(2, '0')}:45:00`,
    index
  }
}

async function validateDatabaseSchema(client) {
  const tableNames = Object.keys(REQUIRED_SCHEMA)
  const result = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [tableNames]
  )

  const actualColumns = new Map()

  for (const row of result.rows) {
    if (!actualColumns.has(row.table_name)) {
      actualColumns.set(row.table_name, new Set())
    }
    actualColumns.get(row.table_name).add(row.column_name)
  }

  const missing = []

  for (const [tableName, columns] of Object.entries(REQUIRED_SCHEMA)) {
    const tableColumns = actualColumns.get(tableName) || new Set()

    for (const columnName of columns) {
      if (!tableColumns.has(columnName)) {
        missing.push(`${tableName}.${columnName}`)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Schema incompatível. Campos ausentes: ${missing.join(', ')}`)
  }

  const constraintsResult = await client.query(`
    SELECT c.relname AS table_name, pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND con.contype = 'c'
       AND c.relname = ANY(ARRAY['usuarios', 'consultas', 'exames'])
  `)

  const definitionsByTable = new Map()

  for (const row of constraintsResult.rows) {
    const current = definitionsByTable.get(row.table_name) || ''
    definitionsByTable.set(row.table_name, `${current} ${row.definition}`)
  }

  const expectedValues = {
    usuarios: VALID_PROFILES,
    consultas: VALID_APPOINTMENT_STATUSES,
    exames: VALID_EXAM_STATUSES
  }

  for (const [tableName, values] of Object.entries(expectedValues)) {
    const definition = definitionsByTable.get(tableName) || ''
    const missingValues = values.filter((value) => !definition.includes(`'${value}'`))

    if (missingValues.length > 0) {
      throw new Error(
        `Constraint de ${tableName} incompatível. Valores ausentes: ${missingValues.join(', ')}`
      )
    }
  }
}

async function loadExistingUniqueValues(client) {
  const emailResult = await client.query(
    'SELECT lower(email) AS value FROM usuarios'
  )
  const cpfResult = await client.query(
    "SELECT regexp_replace(cpf, '[^0-9]', '', 'g') AS value FROM pacientes"
  )
  const crmResult = await client.query(
    'SELECT upper(crm) AS value FROM medicos'
  )

  return {
    emails: new Set(emailResult.rows.map((row) => row.value)),
    cpfs: new Set(cpfResult.rows.map((row) => row.value)),
    crms: new Set(crmResult.rows.map((row) => row.value))
  }
}

async function deleteAndCount(client, query, params) {
  const result = await client.query(query, params)
  return result.rowCount
}

async function resetDemoData(client) {
  const usersResult = await client.query(
    'SELECT id FROM usuarios WHERE lower(email) LIKE $1',
    [DEMO_EMAIL_PATTERN]
  )
  const userIds = usersResult.rows.map((row) => row.id)

  if (userIds.length === 0) {
    return {
      usuarios: 0,
      secretarios: 0,
      medicos: 0,
      pacientes: 0,
      agendas_medicas: 0,
      consultas: 0,
      prontuarios: 0,
      exames: 0,
      prescricoes: 0,
      lista_espera: 0,
      notificacoes: 0,
      logs_acesso: 0
    }
  }

  const patientsResult = await client.query(
    'SELECT id FROM pacientes WHERE usuario_id = ANY($1::int[])',
    [userIds]
  )
  const doctorsResult = await client.query(
    'SELECT id FROM medicos WHERE usuario_id = ANY($1::int[])',
    [userIds]
  )
  const patientIds = patientsResult.rows.map((row) => row.id)
  const doctorIds = doctorsResult.rows.map((row) => row.id)
  const consultationsResult = await client.query(
    `SELECT id
       FROM consultas
      WHERE paciente_id = ANY($1::int[])
         OR medico_id = ANY($2::int[])`,
    [patientIds, doctorIds]
  )
  const consultationIds = consultationsResult.rows.map((row) => row.id)
  const summary = {}

  summary.exames = await deleteAndCount(
    client,
    `DELETE FROM exames
      WHERE consulta_id = ANY($1::int[])
         OR paciente_id = ANY($2::int[])
         OR medico_id = ANY($3::int[])`,
    [consultationIds, patientIds, doctorIds]
  )
  summary.prontuarios = await deleteAndCount(
    client,
    `DELETE FROM prontuarios
      WHERE consulta_id = ANY($1::int[])
         OR paciente_id = ANY($2::int[])
         OR medico_id = ANY($3::int[])`,
    [consultationIds, patientIds, doctorIds]
  )
  summary.prescricoes = await deleteAndCount(
    client,
    `DELETE FROM prescricoes
      WHERE consulta_id = ANY($1::int[])
         OR paciente_id = ANY($2::int[])
         OR medico_id = ANY($3::int[])`,
    [consultationIds, patientIds, doctorIds]
  )
  summary.consultas = await deleteAndCount(
    client,
    'DELETE FROM consultas WHERE id = ANY($1::int[])',
    [consultationIds]
  )
  summary.lista_espera = await deleteAndCount(
    client,
    `DELETE FROM lista_espera
      WHERE paciente_id = ANY($1::int[])
         OR medico_id = ANY($2::int[])`,
    [patientIds, doctorIds]
  )
  summary.agendas_medicas = await deleteAndCount(
    client,
    'DELETE FROM agendas_medicas WHERE medico_id = ANY($1::int[])',
    [doctorIds]
  )
  summary.notificacoes = await deleteAndCount(
    client,
    'DELETE FROM notificacoes WHERE usuario_id = ANY($1::int[])',
    [userIds]
  )
  summary.logs_acesso = await deleteAndCount(
    client,
    'DELETE FROM logs_acesso WHERE usuario_id = ANY($1::int[])',
    [userIds]
  )
  summary.secretarios = await deleteAndCount(
    client,
    'DELETE FROM secretarios WHERE usuario_id = ANY($1::int[])',
    [userIds]
  )
  summary.pacientes = await deleteAndCount(
    client,
    'DELETE FROM pacientes WHERE id = ANY($1::int[])',
    [patientIds]
  )
  summary.medicos = await deleteAndCount(
    client,
    'DELETE FROM medicos WHERE id = ANY($1::int[])',
    [doctorIds]
  )
  summary.usuarios = await deleteAndCount(
    client,
    'DELETE FROM usuarios WHERE id = ANY($1::int[])',
    [userIds]
  )

  return summary
}

async function insertUser(client, { name, email, passwordHash, profile }) {
  const result = await client.query(
    `INSERT INTO usuarios
       (nome, email, senha, perfil, ativo, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, $5, $5)
     RETURNING id`,
    [name, email, passwordHash, profile, DEMO_CREATED_AT]
  )

  return result.rows[0].id
}

async function seedSecretaries(client, quantity, passwordHash, existingEmails) {
  const nextEmail = createEmailFactory('secretary', existingEmails)
  const secretaries = []

  for (let index = 0; index < quantity; index += 1) {
    const emailData = nextEmail()
    const userId = await insertUser(client, {
      name: faker.person.fullName(),
      email: emailData.value,
      passwordHash,
      profile: 'SECRETARIO'
    })
    const result = await client.query(
      `INSERT INTO secretarios (usuario_id, telefone)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, encryptField('telefone', phone(emailData.index))]
    )

    secretaries.push({
      id: result.rows[0].id,
      userId,
      email: emailData.value
    })
  }

  return secretaries
}

async function seedDoctors(
  client,
  quantity,
  passwordHash,
  existingEmails,
  existingCrms
) {
  const nextEmail = createEmailFactory('doctor', existingEmails)
  const nextCrm = createUniqueValueFactory(
    existingCrms,
    crm,
    (value) => value.toUpperCase()
  )
  const doctors = []

  for (let index = 0; index < quantity; index += 1) {
    const emailData = nextEmail()
    const crmData = nextCrm()
    const userId = await insertUser(client, {
      name: faker.person.fullName(),
      email: emailData.value,
      passwordHash,
      profile: 'MEDICO'
    })
    const result = await client.query(
      `INSERT INTO medicos (usuario_id, crm, especialidade, telefone)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        userId,
        crmData.value,
        faker.helpers.arrayElement(SPECIALTIES),
        encryptField('telefone', phone(emailData.index + 1000))
      ]
    )

    doctors.push({
      id: result.rows[0].id,
      userId,
      email: emailData.value
    })
  }

  return doctors
}

async function seedPatients(
  client,
  quantity,
  passwordHash,
  existingEmails,
  existingCpfs
) {
  const nextEmail = createEmailFactory('patient', existingEmails)
  const nextCpf = createUniqueValueFactory(existingCpfs, validCpf)
  const patients = []

  for (let index = 0; index < quantity; index += 1) {
    const emailData = nextEmail()
    const cpfData = nextCpf()
    const healthPlan = index % 4 === 0 ? null : faker.helpers.arrayElement(HEALTH_PLANS)
    const userId = await insertUser(client, {
      name: faker.person.fullName(),
      email: emailData.value,
      passwordHash,
      profile: 'PACIENTE'
    })
    const result = await client.query(
      `INSERT INTO pacientes
       (usuario_id, cpf, cpf_lookup, data_nascimento, telefone, endereco, convenio, numero_convenio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        encryptField('cpf', cpfData.value),
        createBlindIndex('cpf', cpfData.value),
        encryptField('data_nascimento', birthDate()),
        encryptField('telefone', phone(emailData.index + 2000)),
        encryptField(
          'endereco',
          `${faker.location.streetAddress()}, ${faker.location.city()}`
        ),
        encryptField('convenio', healthPlan),
        encryptField(
          'numero_convenio',
          healthPlan ? `DEM${String(cpfData.index).padStart(10, '0')}` : null
        )
      ]
    )

    patients.push({
      id: result.rows[0].id,
      userId,
      email: emailData.value
    })
  }

  return patients
}

async function seedAppointments(client, quantity, recordCount, doctors, patients) {
  const appointments = []
  const doctorSlotCounters = new Map()

  for (let index = 0; index < quantity; index += 1) {
    const doctor = doctors[index % doctors.length]
    const patient = patients[index % patients.length]
    const status = appointmentStatus(index, recordCount)
    const slot = appointmentSlot(index, status, doctorSlotCounters, doctor.id)
    const available = status === 'CANCELADA' || status === 'FALTOU'
    const agendaResult = await client.query(
      `INSERT INTO agendas_medicas
       (medico_id, data_agenda, hora_inicio, hora_fim, disponivel, observacao, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        doctor.id,
        slot.date,
        slot.startTime,
        slot.endTime,
        available,
        encryptField('observacao', 'Agenda criada pelo seed de demonstração.'),
        DEMO_CREATED_AT
      ]
    )
    const checkinCompleted = status === 'CONFIRMADA' || status === 'REALIZADA'
    const checkinDate = checkinCompleted
      ? `${slot.date} ${slot.startTime}`
      : null
    const appointmentResult = await client.query(
      `INSERT INTO consultas
       (
         paciente_id,
         medico_id,
         agenda_id,
         data_consulta,
         hora_consulta,
         hora_fim,
         motivo,
         status,
         observacoes,
         checkin_realizado,
         data_checkin,
         check_in_realizado,
         data_check_in,
         created_at,
         updated_at
       )
       VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $10, $11, $12, $12)
       RETURNING id`,
      [
        patient.id,
        doctor.id,
        agendaResult.rows[0].id,
        slot.date,
        slot.startTime,
        slot.endTime,
        encryptField(
          'motivo',
          faker.helpers.arrayElement(APPOINTMENT_REASONS)
        ),
        status,
        encryptField(
          'observacoes',
          'Consulta criada pelo seed de demonstração.'
        ),
        checkinCompleted,
        checkinDate,
        DEMO_CREATED_AT
      ]
    )

    appointments.push({
      id: appointmentResult.rows[0].id,
      patientId: patient.id,
      doctorId: doctor.id,
      date: slot.date,
      status
    })
  }

  return appointments
}

async function seedMedicalRecords(client, quantity, appointments) {
  const completedAppointments = appointments.filter(
    (appointment) => appointment.status === 'REALIZADA'
  )

  if (completedAppointments.length < quantity) {
    throw new Error(
      `Há somente ${completedAppointments.length} consultas REALIZADA para ${quantity} prontuários.`
    )
  }

  for (let index = 0; index < quantity; index += 1) {
    const appointment = completedAppointments[index]

    await client.query(
      `INSERT INTO prontuarios
       (
         consulta_id,
         paciente_id,
         medico_id,
         queixa_principal,
         anamnese,
         diagnostico,
         observacoes,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [
        appointment.id,
        appointment.patientId,
        appointment.doctorId,
        encryptField(
          'queixa_principal',
          faker.helpers.arrayElement(APPOINTMENT_REASONS)
        ),
        encryptField(
          'anamnese',
          faker.lorem.sentences({ min: 2, max: 4 })
        ),
        encryptField('diagnostico', faker.helpers.arrayElement(DIAGNOSES)),
        encryptField(
          'observacoes',
          'Prontuário fictício criado para demonstração.'
        ),
        DEMO_CREATED_AT
      ]
    )
  }
}

async function seedExams(client, quantity, appointments) {
  const eligibleAppointments = appointments.filter(
    (appointment) =>
      appointment.status !== 'CANCELADA' && appointment.status !== 'FALTOU'
  )

  if (quantity > 0 && eligibleAppointments.length === 0) {
    throw new Error('Não há consultas elegíveis para vincular os exames.')
  }

  for (let index = 0; index < quantity; index += 1) {
    const appointment = eligibleAppointments[index % eligibleAppointments.length]
    const status = VALID_EXAM_STATUSES[index % VALID_EXAM_STATUSES.length]
    const hasResult = status === 'REALIZADO' || status === 'ENTREGUE'
    const hasDate = status !== 'SOLICITADO'
    const examDate = hasDate
      ? toSqlDate(addDays(new Date(`${appointment.date}T12:00:00.000Z`), 2))
      : null

    await client.query(
      `INSERT INTO exames
       (
         consulta_id,
         paciente_id,
         medico_id,
         nome_exame,
         descricao,
         status,
         data_exame,
         resultado,
         observacoes,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        appointment.id,
        appointment.patientId,
        appointment.doctorId,
        encryptField('nome_exame', faker.helpers.arrayElement(EXAM_NAMES)),
        encryptField(
          'descricao',
          'Exame fictício solicitado para fins de demonstração.'
        ),
        status,
        examDate,
        encryptField(
          'resultado',
          hasResult ? 'Resultado fictício sem alterações relevantes.' : null
        ),
        encryptField(
          'observacoes',
          'Não utilizar estes dados para finalidade clínica.'
        ),
        DEMO_CREATED_AT
      ]
    )
  }
}

function printSummary(options, created, resetSummary) {
  if (options.reset) {
    const removedTotal = Object.values(resetSummary).reduce(
      (total, quantity) => total + quantity,
      0
    )
    console.log(`\nReset de demonstração concluído: ${removedTotal} registro(s) removido(s).`)

    for (const [tableName, quantity] of Object.entries(resetSummary)) {
      if (quantity > 0) {
        console.log(`  ${tableName}: ${quantity}`)
      }
    }
  }

  console.log('\nSeed de demonstração concluído com sucesso:')
  console.log(`  usuários: ${created.users}`)
  console.log(`  secretários: ${created.secretaries}`)
  console.log(`  médicos: ${created.doctors}`)
  console.log(`  pacientes: ${created.patients}`)
  console.log(`  agendas médicas: ${created.agendas}`)
  console.log(`  consultas: ${created.appointments}`)
  console.log(`  prontuários: ${created.records}`)
  console.log(`  exames: ${created.exams}`)
  console.log(`  seed: ${DEMO_SEED}`)
  console.log('  senha: configurada por DEMO_PASSWORD')
}

async function main(options) {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('O seed de demonstração não pode ser executado em production.')
  }
  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
    throw new Error(
      'DEMO_PASSWORD é obrigatória e deve possuir ao menos 12 caracteres.'
    )
  }

  const pool = require('../src/config/db')
  const client = await pool.connect()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('clinicalmed:seed-demo'))"
    )
    await validateDatabaseSchema(client)

    const resetSummary = options.reset
      ? await resetDemoData(client)
      : {}
    const existingValues = await loadExistingUniqueValues(client)

    faker.seed(DEMO_SEED)
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
    const secretaries = await seedSecretaries(
      client,
      options.secretaries,
      passwordHash,
      existingValues.emails
    )
    const doctors = await seedDoctors(
      client,
      options.doctors,
      passwordHash,
      existingValues.emails,
      existingValues.crms
    )
    const patients = await seedPatients(
      client,
      options.patients,
      passwordHash,
      existingValues.emails,
      existingValues.cpfs
    )
    const appointments = await seedAppointments(
      client,
      options.appointments,
      options.records,
      doctors,
      patients
    )

    await seedMedicalRecords(client, options.records, appointments)
    await seedExams(client, options.exams, appointments)
    await client.query('COMMIT')
    transactionStarted = false

    printSummary(
      options,
      {
        users: secretaries.length + doctors.length + patients.length,
        secretaries: secretaries.length,
        doctors: doctors.length,
        patients: patients.length,
        agendas: appointments.length,
        appointments: appointments.length,
        records: options.records,
        exams: options.exams
      },
      resetSummary
    )
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Falha adicional ao executar rollback:', rollbackError.message)
      }
    }

    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

if (require.main === module) {
  let options

  try {
    options = parseArguments(process.argv.slice(2))
  } catch (error) {
    console.error(`Erro: ${error.message}`)
    printHelp()
    process.exitCode = 1
  }

  if (options?.help) {
    printHelp()
  } else if (options) {
    main(options).catch((error) => {
      console.error(`Seed cancelado; nenhuma alteração foi persistida: ${error.message}`)
      process.exitCode = 1
    })
  }
}

module.exports = {
  parseArguments,
  validCpf
}
