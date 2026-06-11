import type { Metadata } from "next"
import "./globals.css"
import TopLoader from "@/components/top-loader"

export const metadata: Metadata = {
  title: "PPDB",
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
        {children}
      </body>
    </html>
  )
}