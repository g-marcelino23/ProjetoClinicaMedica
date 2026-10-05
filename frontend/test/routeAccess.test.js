import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAnonymousOnlyRouteDecision,
  getProtectedRouteDecision,
} from '../src/routes/routeAccess.js'

test('guard aguarda a inicialização da sessão', () => {
  assert.equal(
    getProtectedRouteDecision({ initialized: false, user: null, allowedRoles: [] }),
    'WAIT'
  )
})

test('rota protegida diferencia anônimo, autorizado e role incorreta', () => {
  const allowedRoles = ['SECRETARIO']
  assert.equal(
    getProtectedRouteDecision({ initialized: true, user: null, allowedRoles }),
    'LOGIN'
  )
  assert.equal(
    getProtectedRouteDecision({
      initialized: true,
      user: { perfil: 'SECRETARIO' },
      allowedRoles,
    }),
    'ALLOW'
  )
  assert.equal(
    getProtectedRouteDecision({
      initialized: true,
      user: { perfil: 'PACIENTE' },
      allowedRoles,
    }),
    'DASHBOARD'
  )
})

test('/login redireciona usuário autenticado sem encerrar a sessão', () => {
  assert.equal(
    getAnonymousOnlyRouteDecision({
      initialized: true,
      user: { perfil: 'SECRETARIO' },
    }),
    'DASHBOARD'
  )
  assert.equal(
    getAnonymousOnlyRouteDecision({ initialized: true, user: null }),
    'ALLOW'
  )
})
