import type { Metadata } from "next"
import "./globals.css"
import { SidebarProvider } from "@/contexts/sidebar-context"

export const metadata: Metadata = {
  title: "PPDB SMK Sangkuriang 1 Cimahi",
  description: "Aplikasi PPDB",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  )
}