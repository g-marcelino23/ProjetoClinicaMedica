import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

const getApiOrigin = (apiUrl) => {
  if (!apiUrl || apiUrl.startsWith('/')) return null

  try {
    return new URL(apiUrl).origin
  } catch {
    throw new Error('VITE_API_URL precisa ser uma URL válida ou um caminho relativo.')
  }
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = getApiOrigin(
    env.VITE_API_URL || '/api'
  )
  const connectSources = ["'self'"]

  if (apiOrigin) connectSources.push(apiOrigin)

  const isDevelopmentServer = command === 'serve' && !isPreview

  if (isDevelopmentServer) {
    connectSources.push(
      'ws://localhost:5173',
      'ws://127.0.0.1:5173'
    )
  }

  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self'${isDevelopmentServer ? " 'unsafe-inline'" : ''}`,
    `style-src 'self'${isDevelopmentServer ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join('; ')

  const securityHeaders = {
    'Content-Security-Policy': contentSecurityPolicy,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
  const apiProxy = {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: false,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  }

  return {
    plugins: [react()],
    build: {
      sourcemap: false,
    },
    server: {
      headers: securityHeaders,
      proxy: apiProxy,
    },
    preview: {
      headers: securityHeaders,
      proxy: apiProxy,
    },
  }
})
