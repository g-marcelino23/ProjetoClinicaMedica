import assert from 'node:assert/strict'
import test from 'node:test'
import { ROUTE_ROLES, canAccessRoute } from '../src/routes/roleAccess.js'

test('secretário não recebe acesso visual a prontuários e prescrições', () => {
  assert.equal(canAccessRoute('SECRETARIO', '/prontuarios'), false)
  assert.equal(canAccessRoute('SECRETARIO', '/prescricoes'), false)
})

test('médico e paciente preservam acesso aos módulos clínicos próprios', () => {
  for (const profile of ['MEDICO', 'PACIENTE']) {
    assert.equal(canAccessRoute(profile, '/prontuarios'), true)
    assert.equal(canAccessRoute(profile, '/prescricoes'), true)
  }
})

test('matriz administrativa permanece restrita ao secretário', () => {
  for (const path of ['/pacientes', '/medicos', '/lista-espera', '/indicadores', '/relatorios']) {
    assert.deepEqual(ROUTE_ROLES[path], ['SECRETARIO'])
  }
})
