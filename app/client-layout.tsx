//@ts-nocheck
"use client"

import type React from "react"

import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/context/auth-context"
import { SocketProvider } from "@/context/socket-context"
import { ThemeProvider } from "@/context/theme-context"

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </ThemeProvider>
      <Analytics />
    </>
  )
}

export default ClientLayout;
