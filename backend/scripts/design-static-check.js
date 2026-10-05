const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8')

const assertions = [
  {
    description: 'política explícita de transições de negócio',
    valid: read('backend/src/domain/workflowPolicy.js').includes(
      'canTransitionConsultation'
    ),
  },
  {
    description: 'bloqueio de sobreposição da agenda no banco',
    valid: read('backend/migrations/004_secure_business_invariants.sql').includes(
      'agendas_medicas_sem_sobreposicao'
    ),
  },
  {
    description: 'bloqueio de sobreposição de consultas do paciente',
    valid: read('backend/migrations/004_secure_business_invariants.sql').includes(
      'consultas_paciente_sem_sobreposicao'
    ),
  },
  {
    description: 'prescrição usa cancelamento lógico',
    valid:
      !read('backend/src/controllers/prescricaoController.js').includes(
        'DELETE FROM prescricoes'
      ) &&
      read('backend/src/controllers/prescricaoController.js').includes(
        "status = 'CANCELADA'"
      ),
  },
  {
    description: 'janela temporal de check-in',
    valid: read('backend/src/controllers/consultaController.js').includes(
      'dentro_janela_checkin'
    ),
  },
  {
    description: 'casos de abuso documentados',
    valid:
      read('docs/THREAT_MODEL.md').includes('Casos de abuso') &&
      read('docs/SECURE_DESIGN.md').includes('Invariantes'),
  },
]

const failures = assertions.filter((assertion) => !assertion.valid)

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Falha A06: ${failure.description}`)
  }
  process.exitCode = 1
} else {
  console.log(
    `A06 estática: ${assertions.length} controles de design verificados`
  )
}
