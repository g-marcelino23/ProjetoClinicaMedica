export const onlyNumbers = (value) => value.replace(/\D/g, '')

export const formatCPF = (value) => {
  const numbers = onlyNumbers(value).slice(0, 11)

  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  }

  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

export const formatPhone = (value) => {
  const numbers = onlyNumbers(value).slice(0, 11)

  if (numbers.length <= 2) return numbers
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}

export const formatCRM = (value) => {
  const text = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')

  if (text.includes('-')) {
    const parts = text.split('-')
    const numbers = parts[0].replace(/\D/g, '').slice(0, 10)
    const state = (parts[1] || '').replace(/[^A-Z]/g, '').slice(0, 2)
    return state ? `${numbers}-${state}` : `${numbers}-`
  }

  return text.replace(/\D/g, '').slice(0, 10)
}
