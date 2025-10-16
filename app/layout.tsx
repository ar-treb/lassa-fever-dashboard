import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AppNavigation } from "@/components/app-navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Lassa Fever Dashboard - Nigeria",
  description: "Weekly surveillance data visualization for Lassa fever across Nigerian states",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b bg-background/95 py-4">
              <div className="container mx-auto max-w-6xl px-4">
                <AppNavigation />
              </div>
            </header>
            <main className="flex-1 bg-muted/40">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
