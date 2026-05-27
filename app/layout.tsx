import type { Metadata, Viewport } from 'next'
import { Inter, Dancing_Script } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dancing = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-script',
  weight: ['700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Donna', template: '%s · Donna' },
  description: 'Personal cognitive infrastructure.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Donna',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/apple-touch-icon.png',
    apple: '/apple-touch-icon.png',
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,   // prevent accidental zoom in app mode
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7C3AED' },
    { media: '(prefers-color-scheme: dark)',  color: '#8B5CF6' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dancing.variable}`} suppressHydrationWarning>
      <head>
        {/* iOS PWA icon — must be explicit link, metadata API is unreliable for this */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/apple-touch-icon.png" />

        {/* Prevent flash of wrong theme — executes before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){try{var t=localStorage.getItem('donna-theme');` +
          `if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches))` +
          `{document.documentElement.classList.add('dark')}}catch(e){}})()` }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
