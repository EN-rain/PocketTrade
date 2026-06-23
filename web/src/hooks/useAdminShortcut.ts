import { useEffect } from 'react'

const ADMIN_ENTRY_TOKEN_KEY = 'pockettrade-admin-entry-token'

export function useAdminShortcut() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const usesSupportedModifier = event.ctrlKey || event.metaKey
      const isShortcut =
        usesSupportedModifier &&
        event.shiftKey &&
        event.altKey &&
        event.key.toLowerCase() === 'z'

      if (!isShortcut) return

      event.preventDefault()
      const token = crypto.randomUUID()
      sessionStorage.setItem(ADMIN_ENTRY_TOKEN_KEY, token)

      const destination = new URL('/admin', window.location.origin)
      destination.searchParams.set('entry', token)
      window.location.assign(destination.toString())
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
