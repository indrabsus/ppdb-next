"use client"

import { useEffect, useMemo, useState } from "react"
import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"
import { API_URL } from "@/lib/api"
import {
  Banknote,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react"

type LogPpdb = {
  id_log: string
  id_siswa: string
  nominal: string
  no_invoice: string
  jenis: "d" | "p" | "l"
  petugas: string | null
  bukti: string | null
  bayar: "csh" | "trf" | "sbs" | null
  created_at: string | null
  updated_at: string | null
  siswa_ppdb?: {
    nama_lengkap?: string | null
    asal_sekolah?: string | null
    minat_jurusan1?: string | null
  }
}

const rupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka)
}

const toNumber = (value: string | number | null | undefined) => {
  if (!value) return 0
  return Number(String(value).replace(/[^\d]/g, "")) || 0
}

const formatTanggal = (tanggal: string | null) => {
  if (!tanggal) return "-"
  return new Date(tanggal).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const jenisLabel = {
  d: "Daftar",
  p: "PPDB",
  l: "Lain-lain",
}

const bayarLabel = {
  csh: "Cash",
  trf: "Transfer",
  sbs: "Subsidi",
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<LogPpdb[]>([])
  const [tahun, setTahun] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchLogPpdb = async () => {
    try {
      setLoading(true)
      setError("")

      const tahunStorage = localStorage.getItem("tahun_ppdb")
      const tahunAktif = tahunStorage
        ? Number(tahunStorage)
        : new Date().getFullYear()

      setTahun(tahunAktif)

      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(`${ process.env.NEXT_PUBLIC_API_URL}/ppdb/log/${tahunAktif}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.message || "Gagal mengambil data dashboard")
      }

      const data = result.data || result || []

      setLogs(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogPpdb()
  }, [])

  const summary = useMemo(() => {
    const total = logs.reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalDaftar = logs
      .filter((item) => item.jenis === "d")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalPpdb = logs
      .filter((item) => item.jenis === "p")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalLain = logs
      .filter((item) => item.jenis === "l")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalCash = logs
      .filter((item) => item.bayar === "csh")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalTransfer = logs
      .filter((item) => item.bayar === "trf")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    return {
      total,
      totalDaftar,
      totalPpdb,
      totalLain,
      totalCash,
      totalTransfer,
      jumlahTransaksi: logs.length,
    }
  }, [logs])

  const transaksiTerakhir = logs.slice(0, 10)

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="flex-1">
          <AppHeader />

          <main className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Dashboard PPDB {tahun}
              </h1>
              <p className="text-sm text-slate-500">
                Ringkasan pembayaran berdasarkan log PPDB
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">
                {error}
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-2xl p-10 flex items-center justify-center gap-3">
                <Loader2 className="animate-spin" size={22} />
                Memuat dashboard...
              </div>
            ) : (
              <>
                <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <CardDashboard
                    title="Total Masuk"
                    value={rupiah(summary.total)}
                    icon={<Wallet />}
                  />

                  <CardDashboard
                    title="Jumlah Transaksi"
                    value={String(summary.jumlahTransaksi)}
                    icon={<Receipt />}
                  />

                  <CardDashboard
                    title="Cash"
                    value={rupiah(summary.totalCash)}
                    icon={<Banknote />}
                  />

                  <CardDashboard
                    title="Transfer"
                    value={rupiah(summary.totalTransfer)}
                    icon={<CreditCard />}
                  />
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <CardDashboard
                    title="Daftar"
                    value={rupiah(summary.totalDaftar)}
                    icon={<FileText />}
                  />

                  <CardDashboard
                    title="PPDB"
                    value={rupiah(summary.totalPpdb)}
                    icon={<FileText />}
                  />

                  <CardDashboard
                    title="Lain-lain"
                    value={rupiah(summary.totalLain)}
                    icon={<FileText />}
                  />
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b">
                    <h2 className="font-bold text-slate-800">
                      Transaksi Terakhir
                    </h2>
                    <p className="text-sm text-slate-500">
                      10 log PPDB terbaru tahun {tahun}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Tanggal</th>
                          <th className="px-4 py-3 text-left">Invoice</th>
                          <th className="px-4 py-3 text-left">Siswa</th>
                          <th className="px-4 py-3 text-left">Jenis</th>
                          <th className="px-4 py-3 text-left">Bayar</th>
                          <th className="px-4 py-3 text-right">Nominal</th>
                          <th className="px-4 py-3 text-left">Petugas</th>
                        </tr>
                      </thead>

                      <tbody>
                        {transaksiTerakhir.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              Belum ada log PPDB
                            </td>
                          </tr>
                        ) : (
                          transaksiTerakhir.map((item) => (
                            <tr
                              key={item.id_log}
                              className="border-t hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                {formatTanggal(item.created_at)}
                              </td>

                              <td className="px-4 py-3">
                                {item.no_invoice}
                              </td>

                              <td className="px-4 py-3">
                                {item.siswa_ppdb?.nama_lengkap || item.id_siswa}
                              </td>

                              <td className="px-4 py-3">
                                <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium">
                                  {jenisLabel[item.jenis]}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                {item.bayar ? bayarLabel[item.bayar] : "-"}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold">
                                {rupiah(toNumber(item.nominal))}
                              </td>

                              <td className="px-4 py-3">
                                {item.petugas || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function CardDashboard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-2">
            {value}
          </h2>
        </div>

        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  )
}