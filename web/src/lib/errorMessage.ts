import axios from 'axios'

export function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message.join('. ')
  if (typeof message === 'string' && message.trim()) return message

  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.'
  }

  if (!error.response) {
    return 'Unable to connect to the server. Check your connection and try again.'
  }

  return fallback
}
