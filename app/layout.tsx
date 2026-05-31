import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Wehanda — Restaurant Online Ordering & AI Marketing Software',
  description:
    'Accept online orders with zero commission. AI email campaigns, loyalty programs, and a custom ordering page for your restaurant — from $69/month.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Wehanda' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
