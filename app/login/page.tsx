"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { API_URL } from "@/lib/api"
import { isAllowedPpdb } from "@/lib/auth"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()

  const currentYear = new Date().getFullYear()
  const tahunList = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [tahun, setTahun] = useState(currentYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.message || "Login gagal")
        return
      }

      const token = result.token
      const user = result.data || result.user

      if (!token || !user) {
        setError("Response login tidak valid")
        return
      }

      if (!isAllowedPpdb(user)) {
        setError("Akun ini tidak memiliki akses PPDB")
        return
      }

      localStorage.setItem("token_ppdb", token)
      localStorage.setItem("user_ppdb", JSON.stringify(user))
      localStorage.setItem("tahun_ppdb", String(tahun))

      router.push("/dashboard")
    } catch {
      setError("Tidak bisa terhubung ke server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-3xl bg-white p-3 shadow-lg">
  <Image
    src="/logo.png"
    alt="Logo SMK Sangkuriang"
    width={96}
    height={96}
    className="h-full w-full object-contain"
    priority
  />
</div>

          <h1 className="text-3xl font-bold text-white mt-5">
            Login PPDB
          </h1>

          <p className="text-slate-300 text-sm mt-2">
            SMK Sangkuriang 1 Cimahi
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm text-slate-200">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Masukkan username"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Masukkan password"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">Tahun PPDB</label>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="mt-2 w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
            >
              {tahunList.map((item) => (
                <option key={item} value={item} className="text-black">
                  PPDB {item}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 text-white py-3 font-semibold hover:bg-blue-600 disabled:opacity-60 transition"
          >
            {loading ? "Memproses..." : "Masuk Dashboard"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-8">
          Akses khusus Admin PPDB dan Staf PPDB
        </p>
      </div>
    </main>
  )
}