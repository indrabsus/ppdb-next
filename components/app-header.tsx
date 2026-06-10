"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

type UserLogin = {
  username: string
  nama_lengkap?: string | null
  nama_role?: string
  role?: string
}

export default function AppHeader() {
  const router = useRouter()

  const [user, setUser] = useState<UserLogin | null>(null)
  const [tahun, setTahun] = useState<number>()

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

  const handleLogout = () => {
    localStorage.removeItem("token_ppdb")
    localStorage.removeItem("user_ppdb")
    localStorage.removeItem("tahun_ppdb")

    router.push("/login")
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-slate-800">
          Sistem PPDB
        </h1>

        <p className="text-xs text-slate-500">
          Penerimaan Peserta Didik Baru
        </p>
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