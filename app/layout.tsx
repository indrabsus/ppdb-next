import type { Metadata } from "next"
import "./globals.css"
import { SidebarProvider } from "@/contexts/sidebar-context"
import TopLoader from "@/components/top-loader"

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
        <TopLoader />
        <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  )
}