'use client'

import { useEffect } from 'react'

/** Client redirect so /macro (etc.) lands on the dashboard with the right scroll target. */
export function NavRedirect({ hash }: { hash: string }) {
  useEffect(() => {
    const h = hash.startsWith('#') ? hash.slice(1) : hash
    window.location.replace(`/#${h}`)
  }, [hash])

  return (
    <div className="min-h-screen bg-ops-black flex items-center justify-center font-mono text-sm text-ink-secondary">
      Opening dashboard…
    </div>
  )
}
