import { useEffect } from 'react'

export function useAdminShortcut() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'z'
      ) {
        e.preventDefault()
        // Fetch the random admin path that bundle-admin.mjs wrote
        fetch('/admin-path.txt', { cache: 'no-store' })
          .then((r) => r.ok ? r.text() : Promise.reject())
          .then((path) => {
            const trimmed = path.trim()
            if (trimmed) window.location.href = trimmed
          })
          .catch(() => {
            // Admin not bundled — silent fail
          })
      }
      // Mac variant
      if (
        e.metaKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'z'
      ) {
        e.preventDefault()
        fetch('/admin-path.txt', { cache: 'no-store' })
          .then((r) => r.ok ? r.text() : Promise.reject())
          .then((path) => {
            const trimmed = path.trim()
            if (trimmed) window.location.href = trimmed
          })
          .catch(() => {
            // Admin not bundled — silent fail
          })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}