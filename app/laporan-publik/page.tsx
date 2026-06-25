"use client"

import { useEffect, useMemo, useState } from "react"
import Swal from "sweetalert2"
import { Loader2, RefreshCw, School, Users } from "lucide-react"

const API_PPDB = process.env.NEXT_PUBLIC_API_URL

type KelasPpdb = {
  id_kelas: string
  nama_kelas: string
  tingkat: number | null
  max: number
  id_jurusan: string
  jurusan_ppdb?: {
    id_jurusan?: string
    nama_jurusan?: string
  }
}

type SiswaKelas = {
  id_siswa_baru: string
  id_siswa: string
  id_kelas: string
  kelas_ppdb?: KelasPpdb
}

type KelasKuota = {
  id_kelas: string
  nama_kelas: string
  jurusan: string
  tingkat: number | null
  kapasitas: number
  terisi: number
  sisa: number
  persen: number
  status: "tersedia" | "hampir_penuh" | "penuh"
}

export default function KetersediaanKelasPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [kelas, setKelas] = useState<KelasPpdb[]>([])
  const [siswaKelas, setSiswaKelas] = useState<SiswaKelas[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)

      const tahunAktif =
        Number(localStorage.getItem("tahun_ppdb")) || new Date().getFullYear()

      setTahun(tahunAktif)

      const token = localStorage.getItem("token_ppdb")
      const headers: HeadersInit = token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}

      const [kelasRes, siswaKelasRes] = await Promise.all([
        fetch(`${API_PPDB}/ppdb/kelas?tahun=${tahunAktif}`, { headers }),
        fetch(`${API_PPDB}/ppdb/siswakelas/${tahunAktif}`, { headers }),
      ])

      const kelasJson = await kelasRes.json()
      const siswaKelasJson = await siswaKelasRes.json()

      setKelas(Array.isArray(kelasJson.data) ? kelasJson.data : [])
      setSiswaKelas(
        Array.isArray(siswaKelasJson.data) ? siswaKelasJson.data : []
      )
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.message || "Gagal mengambil data ketersediaan kelas",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const kelasKuota = useMemo<KelasKuota[]>(() => {
    return kelas
      .map((item) => {
        const terisi = siswaKelas.filter(
          (s) => s.id_kelas === item.id_kelas
        ).length

        const kapasitas = Number(item.max || 0)
        const sisa = Math.max(kapasitas - terisi, 0)
        const persen = kapasitas > 0 ? Math.round((terisi / kapasitas) * 100) : 0

        let status: KelasKuota["status"] = "tersedia"

        if (sisa <= 0) status = "penuh"
        else if (persen >= 80) status = "hampir_penuh"

        return {
          id_kelas: item.id_kelas,
          nama_kelas: item.nama_kelas,
          jurusan: item.jurusan_ppdb?.nama_jurusan || "Tanpa Jurusan",
          tingkat: item.tingkat,
          kapasitas,
          terisi,
          sisa,
          persen,
          status,
        }
      })
      .sort((a, b) => {
        const jurusanCompare = a.jurusan.localeCompare(b.jurusan)
        if (jurusanCompare !== 0) return jurusanCompare
        return a.nama_kelas.localeCompare(b.nama_kelas)
      })
  }, [kelas, siswaKelas])

  const totalKelas = kelasKuota.length
  const totalKapasitas = kelasKuota.reduce((sum, item) => sum + item.kapasitas, 0)
  const totalTerisi = kelasKuota.reduce((sum, item) => sum + item.terisi, 0)
  const totalSisa = kelasKuota.reduce((sum, item) => sum + item.sisa, 0)
  const kelasTersedia = kelasKuota.filter((item) => item.sisa > 0).length

  const getStatusBadge = (status: KelasKuota["status"]) => {
    if (status === "penuh") {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
          Penuh
        </span>
      )
    }

    if (status === "hampir_penuh") {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          Hampir
        </span>
      )
    }

    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
        Tersedia
      </span>
    )
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-100">
      <section className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-5 py-4 text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
              <School size={14} />
              Informasi Ketersediaan Kelas
            </div>

            <h1 className="text-2xl font-bold">
              Ketersediaan Kuota Kelas PPDB {tahun}
            </h1>

            <p className="mt-1 text-xs text-blue-100">
              Data kuota dapat berubah sewaktu-waktu.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-700 shadow hover:bg-blue-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-3 px-5 py-3">
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center gap-3 rounded-2xl bg-white text-slate-600 shadow">
            <Loader2 className="animate-spin" size={24} />
            Memuat ketersediaan kelas...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3">
              <InfoCard title="Total Kelas" value={String(totalKelas)} />
              <InfoCard title="Kapasitas" value={String(totalKapasitas)} />
              <InfoCard title="Terisi" value={String(totalTerisi)} />
              <InfoCard title="Sisa Kuota" value={String(totalSisa)} highlight />
              <InfoCard title="Tersedia" value={String(kelasTersedia)} />
            </div>

            <div className="grid grid-cols-4 gap-3 xl:grid-cols-5 2xl:grid-cols-6">
              {kelasKuota.map((item) => (
                <div
                  key={item.id_kelas}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <School size={18} />
                    </div>

                    {getStatusBadge(item.status)}
                  </div>

                  <h3 className="truncate text-base font-bold text-slate-800">
                    {item.nama_kelas}
                  </h3>

                  <p className="truncate text-[11px] text-slate-500">
                    {item.jurusan}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                    <MiniStat label="Kuota" value={item.kapasitas} />
                    <MiniStat label="Terisi" value={item.terisi} blue />
                    <MiniStat label="Sisa" value={item.sisa} green={item.sisa > 0} />
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>Keterisian</span>
                      <span>{item.persen}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={
                          item.status === "penuh"
                            ? "h-full rounded-full bg-red-500"
                            : item.status === "hampir_penuh"
                            ? "h-full rounded-full bg-amber-500"
                            : "h-full rounded-full bg-green-500"
                        }
                        style={{ width: `${Math.min(item.persen, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-[11px] text-slate-500">
              Informasi ini bersifat sementara dan dapat berubah sesuai proses pendaftaran PPDB.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

function InfoCard({
  title,
  value,
  highlight,
}: {
  title: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border border-green-200 bg-green-50 p-3 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      }
    >
      <p className={highlight ? "text-xs text-green-700" : "text-xs text-slate-500"}>
        {title}
      </p>

      <h2
        className={
          highlight
            ? "mt-1 text-2xl font-bold text-green-800"
            : "mt-1 text-2xl font-bold text-slate-800"
        }
      >
        {value}
      </h2>
    </div>
  )
}

function MiniStat({
  label,
  value,
  blue,
  green,
}: {
  label: string
  value: number
  blue?: boolean
  green?: boolean
}) {
  return (
    <div
      className={
        blue
          ? "rounded-xl bg-blue-50 p-2 text-blue-700"
          : green
          ? "rounded-xl bg-green-50 p-2 text-green-700"
          : "rounded-xl bg-slate-50 p-2 text-slate-800"
      }
    >
      <p className="text-lg font-bold leading-5">{value}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  )
}