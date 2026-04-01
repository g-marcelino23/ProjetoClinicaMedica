import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)

        setUser({
          ...parsedUser,
          paciente_id: parsedUser?.paciente_id || null,
          medico_id: parsedUser?.medico_id || null
        })
      } catch (error) {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        setUser(null)
      }
    } else {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      setUser(null)
    }

    setLoading(false)
  }, [])

  const login = async (email, senha) => {
    try {
      if (!email || !senha) {
        return {
          success: false,
          message: 'Preencha e-mail e senha',
        }
      }

      const response = await api.post('/auth/login', {
        email,
        senha,
      })

      const data = response.data
      const token = data.token
      const usuario = data.usuario || data.user

      if (!token || !usuario) {
        return {
          success: false,
          message: 'Resposta inválida do servidor',
        }
      }

      const usuarioFormatado = {
        ...usuario,
        paciente_id: usuario?.paciente_id || null,
        medico_id: usuario?.medico_id || null
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(usuarioFormatado))
      setUser(usuarioFormatado)

      return { success: true }
    } catch (error) {
      console.error('Erro no login:', error)

      const mensagem =
        error.response?.data?.erro ||
        error.response?.data?.message ||
        'E-mail ou senha inválidos'

      return {
        success: false,
        message: mensagem,
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: !!user,
        loading,
        login,
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

export function useAuth() {
  return useContext(AuthContext)
}