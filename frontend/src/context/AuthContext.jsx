import { createContext, useContext, useEffect, useState } from 'react'
import api, { setUnauthorizedHandler } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let active = true
    const markAnonymous = () => {
      if (!active) return
      setUser(null)
      setInitialized(true)
    }
    const removeUnauthorizedHandler = setUnauthorizedHandler(markAnonymous)

    api
      .get('/auth/me')
      .then((response) => {
        if (active) setUser(response.data.usuario)
      })
      .catch(markAnonymous)
      .finally(() => {
        if (active) setInitialized(true)
      })

    return () => {
      active = false
      removeUnauthorizedHandler()
    }
  }, [])

  const login = async (email, senha) => {
    try {
      if (!email || !senha) {
        return {
          success: false,
          message: 'Preencha e-mail e senha',
        }
      }

      const response = await api.post('/auth/login', { email, senha })
      if (
        response.data.mfa_required ||
        response.data.mfa_enrollment_required
      ) {
        return {
          success: false,
          requiresMfa: true,
          enrollmentRequired:
            Boolean(response.data.mfa_enrollment_required),
          challengeId: response.data.challenge_id,
          secret: response.data.secret || null,
          otpAuthUri: response.data.otpauth_uri || null,
          message: response.data.mensagem,
        }
      }
      const usuario = response.data.usuario

      if (!usuario) {
        return {
          success: false,
          message: 'Resposta inválida do servidor',
        }
      }

      setUser(usuario)
      setInitialized(true)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.erro ||
          'E-mail ou senha inválidos',
      }
    }
  }

  const verifyMfa = async (challengeId, codigo) => {
    try {
      const response = await api.post('/auth/mfa/verify', {
        challenge_id: challengeId,
        codigo,
      })
      const usuario = response.data.usuario
      if (!usuario) {
        return {
          success: false,
          message: 'Resposta inválida do servidor',
        }
      }
      setUser(usuario)
      setInitialized(true)
      return {
        success: true,
        recoveryCodes: response.data.recovery_codes || null,
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.erro ||
          'Código de autenticação inválido',
      }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      setInitialized(true)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: initialized && Boolean(user),
        initialized,
        loading: !initialized,
        login,
        verifyMfa,
        logout,
        perfil: user?.perfil || null,
        isPaciente: user?.perfil === 'PACIENTE',
        isMedico: user?.perfil === 'MEDICO',
        isSecretario: user?.perfil === 'SECRETARIO',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
