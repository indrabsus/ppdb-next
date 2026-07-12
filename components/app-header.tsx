"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

const API_PPDB = process.env.NEXT_PUBLIC_API_URL
const WA_STATUS_POLL_MS = 15000

type UserLogin = {
  username: string
  nama_lengkap?: string | null
  nama_role?: string
  role?: string
}

type WaStatus = "idle" | "loading" | "qr" | "authenticated" | "ready" | "disconnected"

export default function AppHeader() {
  const router = useRouter()

  const [user, setUser] = useState<UserLogin | null>(null)
  const [tahun, setTahun] = useState<number>()
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)

  useEffect(() => {
    const userStorage = localStorage.getItem("user_ppdb")
    const tahunStorage = localStorage.getItem("tahun_ppdb")

    if (userStorage) {
      setUser(JSON.parse(userStorage))
    }

    if (tahunStorage) {
      setTahun(Number(tahunStorage))
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchWaStatus = async () => {
      try {
        const token = localStorage.getItem("token_ppdb")

        const res = await fetch(`${API_PPDB}/wa/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const json = await res.json()

        if (!cancelled) {
          setWaStatus(res.ok ? json.data?.status : "disconnected")
        }
      } catch {
        if (!cancelled) setWaStatus("disconnected")
      }
    }

    fetchWaStatus()
    const interval = setInterval(fetchWaStatus, WA_STATUS_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const waOnline = waStatus === "ready"
  const waLabel =
    waStatus === null
      ? "Memeriksa WhatsApp..."
      : waOnline
      ? "WhatsApp Online"
      : "WhatsApp Offline"

  const handleLogout = () => {
    localStorage.removeItem("token_ppdb")
    localStorage.removeItem("user_ppdb")
    localStorage.removeItem("tahun_ppdb")

    router.push("/login")
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {waOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              waStatus === null
                ? "bg-slate-300"
                : waOnline
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />
        </span>

        <p className="text-sm font-medium text-slate-700">{waLabel}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-medium text-slate-800">
            {user?.nama_lengkap || user?.username}
          </p>

          <p className="text-xs text-slate-500">
            PPDB {tahun}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  )
}