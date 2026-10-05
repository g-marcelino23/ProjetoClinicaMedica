const test = require('node:test')
const assert = require('node:assert/strict')

const {
  CHECKIN_EARLY_MINUTES,
  CHECKIN_LATE_MINUTES,
  canCreateClinicalArtifact,
  canTransitionConsultation,
  canTransitionExam,
  canTransitionWaitingList,
} = require('../src/domain/workflowPolicy')

test('somente médico pode concluir uma consulta confirmada', () => {
  assert.equal(
    canTransitionConsultation('MEDICO', 'CONFIRMADA', 'REALIZADA'),
    true
  )
  assert.equal(
    canTransitionConsultation('SECRETARIO', 'CONFIRMADA', 'REALIZADA'),
    false
  )
})

test('estados terminais de consulta não podem ser reabertos', () => {
  for (const terminalStatus of ['REALIZADA', 'CANCELADA', 'FALTOU']) {
    assert.equal(
      canTransitionConsultation('MEDICO', terminalStatus, 'CONFIRMADA'),
      false
    )
    assert.equal(
      canTransitionConsultation('SECRETARIO', terminalStatus, 'AGENDADA'),
      false
    )
    assert.equal(
      canTransitionConsultation('MEDICO', terminalStatus, terminalStatus),
      false
    )
  }
})

test('secretário não altera consulta sem transição e médico preserva edição ativa', () => {
  assert.equal(
    canTransitionConsultation('SECRETARIO', 'CONFIRMADA', 'CONFIRMADA'),
    false
  )
  assert.equal(
    canTransitionConsultation('MEDICO', 'CONFIRMADA', 'CONFIRMADA'),
    true
  )
})

test('fluxo de exame só aceita a sequência clínica prevista', () => {
  assert.equal(canTransitionExam('SOLICITADO', 'AGENDADO'), true)
  assert.equal(canTransitionExam('AGENDADO', 'REALIZADO'), true)
  assert.equal(canTransitionExam('REALIZADO', 'ENTREGUE'), true)
  assert.equal(canTransitionExam('SOLICITADO', 'ENTREGUE'), false)
  assert.equal(canTransitionExam('CANCELADO', 'AGENDADO'), false)
  assert.equal(canTransitionExam('ENTREGUE', 'ENTREGUE'), false)
})

test('fila de espera não permite reabrir item terminal', () => {
  assert.equal(canTransitionWaitingList('ATIVO', 'CHAMADO'), true)
  assert.equal(canTransitionWaitingList('CHAMADO', 'ENCERRADO'), true)
  assert.equal(canTransitionWaitingList('CHAMADO', 'CHAMADO'), false)
  assert.equal(canTransitionWaitingList('ENCERRADO', 'ATIVO'), false)
  assert.equal(canTransitionWaitingList('CANCELADO', 'CHAMADO'), false)
})

test('artefatos clínicos exigem consulta confirmada ou realizada', () => {
  assert.equal(canCreateClinicalArtifact('CONFIRMADA'), true)
  assert.equal(canCreateClinicalArtifact('REALIZADA'), true)
  assert.equal(canCreateClinicalArtifact('AGENDADA'), false)
  assert.equal(canCreateClinicalArtifact('CANCELADA'), false)
  assert.equal(canCreateClinicalArtifact('FALTOU'), false)
})

test('janela de check-in é explicitamente limitada', () => {
  assert.equal(CHECKIN_EARLY_MINUTES, 30)
  assert.equal(CHECKIN_LATE_MINUTES, 30)
})
