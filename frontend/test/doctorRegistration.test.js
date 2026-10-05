import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDoctorRegistrationPayload,
  getRegistrationErrorMessage,
} from '../src/utils/doctorRegistration.js'

test('payload de médico contém somente os campos aceitos por /auth/staff', () => {
  const payload = buildDoctorRegistrationPayload({
    nome: ' ClinDAST Doctor ',
    email: ' clindast.doctor@clinicalmed.local ',
    senha: 'uma senha sintética longa',
    cpf: 'campo legado que não pode ser enviado',
    telefone: '(85) 99999-0001',
    crm: '123456-ce',
    especialidade: ' Medicina Geral ',
  })

  assert.deepEqual(payload, {
    nome: 'ClinDAST Doctor',
    email: 'clindast.doctor@clinicalmed.local',
    senha: 'uma senha sintética longa',
    perfil: 'MEDICO',
    telefone: '85999990001',
    crm: '123456-CE',
    especialidade: 'Medicina Geral',
  })
  assert.equal('cpf' in payload, false)
})

test('telefone vazio é omitido do payload', () => {
  const payload = buildDoctorRegistrationPayload({
    nome: 'ClinDAST Doctor',
    email: 'clindast.doctor@clinicalmed.local',
    senha: 'uma senha sintética longa',
    telefone: '',
    crm: '123456-CE',
    especialidade: 'Medicina Geral',
  })

  assert.equal('telefone' in payload, false)
})

test('erros seguros por campo são apresentados ao usuário', () => {
  const message = getRegistrationErrorMessage({
    response: {
      data: {
        erro: 'Dados inválidos',
        campos: [{ campo: 'body.senha', mensagem: 'Senha inválida' }],
      },
    },
  })

  assert.equal(message, 'Senha: Senha inválida')
})
