import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MARKET INTEL // COMMAND DASHBOARD',
  description: 'U.S. Financial Market Intelligence Operating System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ops-black text-ink-primary antialiased">
        {children}
      </body>
    </html>
  )
}
