const CONSULTATION_TRANSITIONS = Object.freeze({
  MEDICO: Object.freeze({
    AGENDADA: new Set(['CONFIRMADA', 'CANCELADA', 'FALTOU']),
    CONFIRMADA: new Set(['REALIZADA', 'CANCELADA', 'FALTOU']),
    REALIZADA: new Set(),
    CANCELADA: new Set(),
    FALTOU: new Set(),
  }),
  SECRETARIO: Object.freeze({
    AGENDADA: new Set(['CONFIRMADA', 'CANCELADA', 'FALTOU']),
    CONFIRMADA: new Set(['CANCELADA', 'FALTOU']),
    REALIZADA: new Set(),
    CANCELADA: new Set(),
    FALTOU: new Set(),
  }),
})

const EXAM_TRANSITIONS = Object.freeze({
  SOLICITADO: new Set(['AGENDADO', 'CANCELADO']),
  AGENDADO: new Set(['REALIZADO', 'CANCELADO']),
  REALIZADO: new Set(['ENTREGUE']),
  ENTREGUE: new Set(),
  CANCELADO: new Set(),
})

const WAITING_LIST_TRANSITIONS = Object.freeze({
  ATIVO: new Set(['CHAMADO', 'CANCELADO']),
  CHAMADO: new Set(['ENCERRADO', 'CANCELADO']),
  ENCERRADO: new Set(),
  CANCELADO: new Set(),
})

const CHECKIN_EARLY_MINUTES = 30
const CHECKIN_LATE_MINUTES = 30

const canTransition = (
  transitions,
  currentStatus,
  nextStatus,
  allowSameStatus = true
) =>
  (allowSameStatus && currentStatus === nextStatus) ||
  Boolean(transitions[currentStatus]?.has(nextStatus))

const canTransitionConsultation = (profile, currentStatus, nextStatus) =>
  currentStatus === nextStatus
    ? profile === 'MEDICO' && ['AGENDADA', 'CONFIRMADA'].includes(currentStatus)
    : canTransition(
        CONSULTATION_TRANSITIONS[profile] || {},
        currentStatus,
        nextStatus,
        false
      )

const canTransitionExam = (currentStatus, nextStatus) =>
  currentStatus === nextStatus
    ? ['SOLICITADO', 'AGENDADO', 'REALIZADO'].includes(currentStatus)
    : canTransition(EXAM_TRANSITIONS, currentStatus, nextStatus, false)

const canTransitionWaitingList = (currentStatus, nextStatus) =>
  canTransition(
    WAITING_LIST_TRANSITIONS,
    currentStatus,
    nextStatus,
    false
  )

const canCreateClinicalArtifact = (consultationStatus) =>
  ['CONFIRMADA', 'REALIZADA'].includes(consultationStatus)

module.exports = {
  CHECKIN_EARLY_MINUTES,
  CHECKIN_LATE_MINUTES,
  canCreateClinicalArtifact,
  canTransitionConsultation,
  canTransitionExam,
  canTransitionWaitingList,
}
