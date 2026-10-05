const { z } = require('zod')
const {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  getPasswordIssue,
} = require('../domain/authenticationPolicy')

const emptyObject = z.object({})
const id = z.coerce.number().int().positive()
const withoutUnsafeControls = (schema) =>
  schema.refine(
    (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
    'O texto contém caracteres de controle não permitidos'
  )
const optionalText = (max) =>
  withoutUnsafeControls(z.string().trim().max(max)).nullish()
const requiredText = (max) =>
  withoutUnsafeControls(z.string().trim().min(1).max(max))
const email = withoutUnsafeControls(z.string().trim().email().max(254))
  .transform((value) => value.toLowerCase())
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH)

const addPasswordIssue = (data, context, field = 'senha') => {
  const issue = getPasswordIssue(data[field], [
    data.nome,
    data.email?.split('@')[0],
    'ClinicalMed',
  ])
  if (issue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [field],
      message: issue,
    })
  }
}

const requestSchema = ({ body = emptyObject, params = emptyObject, query = emptyObject }) =>
  z.object({ body, params, query })

const patientRegistrationBody = z
  .object({
    nome: requiredText(120),
    email,
    senha: password,
    perfil: z.literal('PACIENTE').optional(),
    cpf: requiredText(14),
    telefone: optionalText(20),
    data_nascimento: z.string().date().nullish(),
    endereco: optionalText(300),
  })
  .superRefine((data, context) => addPasswordIssue(data, context))

const staffRegistrationBody = z
  .object({
    nome: requiredText(120),
    email,
    senha: password,
    perfil: z.enum(['MEDICO', 'SECRETARIO']),
    telefone: optionalText(20),
    crm: optionalText(20),
    especialidade: optionalText(120),
  })
  .superRefine((data, context) => {
    addPasswordIssue(data, context)
    if (data.perfil === 'MEDICO' && (!data.crm || !data.especialidade)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['crm'],
        message: 'CRM e especialidade são obrigatórios para médico',
      })
    }
  })

const consultationStatus = z.enum([
  'AGENDADA',
  'CONFIRMADA',
  'REALIZADA',
  'CANCELADA',
  'FALTOU',
])

const examStatus = z.enum(['SOLICITADO', 'AGENDADO', 'REALIZADO', 'ENTREGUE', 'CANCELADO'])
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Horário inválido')
const date = z.string().date()
const cpf = z.string().trim().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido')
const crm = z.string().trim().regex(/^\d{4,10}-[A-Z]{2}$/i, 'CRM inválido')
const dateRangeQuery = (extraFields = {}) =>
  z
    .object({
      data_inicial: date.optional(),
      data_final: date.optional(),
      ...extraFields,
    })
    .refine(
      (data) =>
        !data.data_inicial ||
        !data.data_final ||
        data.data_final >= data.data_inicial,
      {
        path: ['data_final'],
        message: 'A data final deve ser igual ou posterior à data inicial',
      }
    )

module.exports = {
  auth: {
    login: requestSchema({
      body: z.object({
        email,
        senha: z.string().min(1).max(MAX_PASSWORD_LENGTH),
      }),
    }),
    patientRegistration: requestSchema({ body: patientRegistrationBody }),
    staffRegistration: requestSchema({ body: staffRegistrationBody }),
    mfaVerify: requestSchema({
      body: z.object({
        challenge_id: z.string().uuid(),
        codigo: z
          .string()
          .trim()
          .toUpperCase()
          .regex(
            /^(?:\d{6}|[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4})$/,
            'Código de autenticação inválido'
          ),
      }),
    }),
    changePassword: requestSchema({
      body: z
        .object({
          senha_atual: z.string().min(1).max(MAX_PASSWORD_LENGTH),
          nova_senha: password,
        })
        .superRefine((data, context) => {
          const issue = getPasswordIssue(data.nova_senha, ['ClinicalMed'])
          if (issue) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['nova_senha'],
              message: issue,
            })
          }
          if (data.senha_atual === data.nova_senha) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['nova_senha'],
              message: 'A nova senha deve ser diferente da senha atual',
            })
          }
        }),
    }),
  },
  consultations: {
    create: requestSchema({
      body: z.object({
        paciente_id: id.optional(),
        agenda_id: id,
        motivo: optionalText(1000),
        observacoes: optionalText(2000),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
    update: requestSchema({
      params: z.object({ id }),
      body: z.object({
        status: consultationStatus,
        observacoes: optionalText(2000),
      }),
    }),
  },
  exams: {
    create: requestSchema({
      body: z.object({
        consulta_id: id,
        nome_exame: requiredText(160),
        descricao: optionalText(2000),
        status: examStatus.optional(),
        data_exame: z.string().date().nullish(),
        resultado: optionalText(5000),
        observacoes: optionalText(2000),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
    update: requestSchema({
      params: z.object({ id }),
      body: z.object({
        nome_exame: requiredText(160),
        descricao: optionalText(2000),
        status: examStatus,
        data_exame: z.string().date().nullish(),
        resultado: optionalText(5000),
        observacoes: optionalText(2000),
      }),
    }),
  },
  prescriptions: {
    create: requestSchema({
      body: z.object({
        consulta_id: id,
        medicamento: requiredText(200),
        dosagem: requiredText(120),
        frequencia: requiredText(120),
        duracao: requiredText(120),
        observacoes: optionalText(2000),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
    update: requestSchema({
      params: z.object({ id }),
      body: z.object({
        medicamento: requiredText(200),
        dosagem: requiredText(120),
        frequencia: requiredText(120),
        duracao: requiredText(120),
        observacoes: optionalText(2000),
      }),
    }),
  },
  records: {
    create: requestSchema({
      body: z.object({
        consulta_id: id,
        queixa_principal: optionalText(3000),
        anamnese: optionalText(10000),
        diagnostico: optionalText(5000),
        observacoes: optionalText(5000),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
    update: requestSchema({
      params: z.object({ id }),
      body: z.object({
        queixa_principal: optionalText(3000),
        anamnese: optionalText(10000),
        diagnostico: optionalText(5000),
        observacoes: optionalText(5000),
      }),
    }),
  },
  agendas: {
    create: requestSchema({
      body: z
        .object({
          medico_id: id,
          data_agenda: date,
          hora_inicio: time,
          hora_fim: time,
          disponivel: z.boolean().optional(),
          observacao: optionalText(1000),
        })
        .refine((data) => data.hora_fim > data.hora_inicio, {
          path: ['hora_fim'],
          message: 'A hora final deve ser posterior à hora inicial',
        }),
    }),
    update: requestSchema({
      params: z.object({ id }),
      body: z
        .object({
          data_agenda: date,
          hora_inicio: time,
          hora_fim: time,
          disponivel: z.boolean(),
          observacao: optionalText(1000),
        })
        .refine((data) => data.hora_fim > data.hora_inicio, {
          path: ['hora_fim'],
          message: 'A hora final deve ser posterior à hora inicial',
        }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
    doctorId: requestSchema({ params: z.object({ medicoId: id }) }),
  },
  patients: {
    create: requestSchema({
      body: z.object({
        usuario_id: id,
        cpf,
        data_nascimento: date.nullish(),
        telefone: optionalText(20),
        endereco: optionalText(300),
        convenio: optionalText(120),
        numero_convenio: optionalText(80),
      }),
    }),
    update: requestSchema({
      params: z.object({ id }),
      body: z.object({
        cpf,
        data_nascimento: date.nullish(),
        telefone: optionalText(20),
        endereco: optionalText(300),
        convenio: optionalText(120),
        numero_convenio: optionalText(80),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
  },
  doctors: {
    create: requestSchema({
      body: z.object({
        usuario_id: id,
        crm,
        especialidade: requiredText(120),
        telefone: optionalText(20),
      }),
    }),
    update: requestSchema({
      params: z.object({ id }),
      body: z.object({
        crm,
        especialidade: requiredText(120),
        telefone: optionalText(20),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
  },
  notifications: {
    create: requestSchema({
      body: z.object({
        usuario_id: id,
        titulo: requiredText(160),
        mensagem: requiredText(2000),
        tipo: optionalText(50),
      }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
  },
  waitingList: {
    create: requestSchema({
      body: z
        .object({
          paciente_id: id,
          medico_id: id.nullish(),
          especialidade: optionalText(120),
          data_desejada: date.nullish(),
        })
        .refine((data) => data.medico_id || data.especialidade, {
          path: ['especialidade'],
          message: 'Informe um médico ou uma especialidade',
        }),
    }),
    id: requestSchema({ params: z.object({ id }) }),
  },
  checkin: {
    id: requestSchema({ params: z.object({ consultaId: id }) }),
  },
  reports: {
    consultations: requestSchema({
      query: dateRangeQuery({ status: consultationStatus.optional() }),
    }),
    exams: requestSchema({
      query: dateRangeQuery({ status: examStatus.optional() }),
    }),
    doctorAttendance: requestSchema({ query: dateRangeQuery() }),
  },
  indicators: {
    list: requestSchema({ query: dateRangeQuery() }),
  },
}
