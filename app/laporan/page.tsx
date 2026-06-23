"use client"

import { useEffect, useMemo, useState } from "react"
import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"
import Swal from "sweetalert2"
import { Loader2, Printer, Users, Wallet, School } from "lucide-react"

const API_PPDB = process.env.NEXT_PUBLIC_API_URL

type LogPpdb = {
  id_log: string
  nominal: string
  jenis: "d" | "p" | "l"
}

type SiswaPpdb = {
  id_siswa: string
  nama_lengkap: string | null
  asal_sekolah: string | null
  minat_jurusan1: string | null
  minat_jurusan2: string | null
  bayar_daftar: "n" | "y" | "l" | null
  tahun: number | null
  log_ppdb?: LogPpdb[]
}

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
  siswa_ppdb?: SiswaPpdb
  kelas_ppdb?: KelasPpdb
}

type MasterPpdb = {
  daftar: number
  ppdb: number
  tahun: number
}

const rupiahShort = (angka: number) => {
  if (angka >= 1_000_000_000) {
    return `${(angka / 1_000_000_000).toFixed(1).replace(".0", "")} M`
  }

  if (angka >= 1_000_000) {
    return `${(angka / 1_000_000).toFixed(1).replace(".0", "")} juta`
  }

  if (angka >= 1_000) {
    return `${(angka / 1_000).toFixed(0)} ribu`
  }

  return String(angka)
}

const toNumber = (value: string | number | null | undefined) => {
  if (!value) return 0
  return Number(String(value).replace(/[^\d]/g, "")) || 0
}

const sumLog = (siswa: SiswaPpdb, jenis: "d" | "p" | "l") => {
  return (siswa.log_ppdb || [])
    .filter((log) => log.jenis === jenis)
    .reduce((sum, log) => sum + toNumber(log.nominal), 0)
}

export default function LaporanPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [siswa, setSiswa] = useState<SiswaPpdb[]>([])
  const [kelas, setKelas] = useState<KelasPpdb[]>([])
  const [siswaKelas, setSiswaKelas] = useState<SiswaKelas[]>([])
  const [master, setMaster] = useState<MasterPpdb | null>(null)
  const [loading, setLoading] = useState(true)
  const [printMode, setPrintMode] = useState<"all" | "keuangan" | "siswa">(
    "all"
  )

  const fetchData = async () => {
    try {
      setLoading(true)

      const tahunAktif =
        Number(localStorage.getItem("tahun_ppdb")) || new Date().getFullYear()

      setTahun(tahunAktif)

      const token = localStorage.getItem("token_ppdb")
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      const [resN, resY, resL, kelasRes, siswaKelasRes, masterRes] =
        await Promise.all([
          fetch(`${API_PPDB}/ppdb/siswa/${tahunAktif}/n`, { headers }),
          fetch(`${API_PPDB}/ppdb/siswa/${tahunAktif}/y`, { headers }),
          fetch(`${API_PPDB}/ppdb/siswa/${tahunAktif}/l`, { headers }),
          fetch(`${API_PPDB}/ppdb/kelas?tahun=${tahunAktif}`, { headers }),
          fetch(`${API_PPDB}/ppdb/siswakelas/${tahunAktif}`, { headers }),
          fetch(`${API_PPDB}/ppdb/masterppdb?tahun=${tahunAktif}`, { headers }),
        ])

      const jsonN = await resN.json()
      const jsonY = await resY.json()
      const jsonL = await resL.json()
      const kelasJson = await kelasRes.json()
      const siswaKelasJson = await siswaKelasRes.json()
      const masterJson = await masterRes.json()

      setSiswa([
        ...(Array.isArray(jsonN.data) ? jsonN.data : []),
        ...(Array.isArray(jsonY.data) ? jsonY.data : []),
        ...(Array.isArray(jsonL.data) ? jsonL.data : []),
      ])

      setKelas(Array.isArray(kelasJson.data) ? kelasJson.data : [])
      setSiswaKelas(
        Array.isArray(siswaKelasJson.data) ? siswaKelasJson.data : []
      )
      setMaster(masterJson.data || null)
    } catch (error: any) {
      Swal.fire("Error", error.message || "Gagal mengambil laporan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const laporan = useMemo(() => {
    const totalPendaftar = siswa.length

    const belumBayar = siswa.filter((item) => item.bayar_daftar === "n").length

    const mengundurkan = siswa.filter(
      (item) => item.bayar_daftar === "l"
    ).length

    const baruBayarPendaftaran = siswa.filter((item) => {
      return sumLog(item, "d") > 0 && sumLog(item, "p") === 0
    }).length

    const ppdbDibawah1Juta = siswa.filter((item) => {
      const totalPpdb = sumLog(item, "p")
      return totalPpdb > 0 && totalPpdb < 1000000
    }).length

    const bayarLebih1JutaBelumLunas = siswa.filter((item) => {
      const totalPpdb = sumLog(item, "p")
      return master?.ppdb
        ? totalPpdb >= 1000000 && totalPpdb < master.ppdb
        : false
    }).length

    const lunas = siswa.filter((item) => {
      const totalPpdb = sumLog(item, "p")
      return master?.ppdb ? totalPpdb >= master.ppdb : false
    }).length

    const uangDaftar = siswa.reduce((sum, item) => {
      return sum + sumLog(item, "d")
    }, 0)

    const uangPpdbDibawah1Juta = siswa
      .filter((item) => {
        const totalPpdb = sumLog(item, "p")
        return totalPpdb > 0 && totalPpdb < 1000000
      })
      .reduce((sum, item) => sum + sumLog(item, "p"), 0)

    const uangLebih1JutaBelumLunas = siswa
      .filter((item) => {
        const totalPpdb = sumLog(item, "p")
        return master?.ppdb
          ? totalPpdb >= 1000000 && totalPpdb < master.ppdb
          : false
      })
      .reduce((sum, item) => sum + sumLog(item, "p"), 0)

    const uangLunas = siswa
      .filter((item) => {
        const totalPpdb = sumLog(item, "p")
        return master?.ppdb ? totalPpdb >= master.ppdb : false
      })
      .reduce((sum, item) => sum + sumLog(item, "p"), 0)

    const uangPpdb =
      uangPpdbDibawah1Juta + uangLebih1JutaBelumLunas + uangLunas

    const uangMengundurkan = siswa.reduce((sum, item) => {
      return sum + sumLog(item, "l")
    }, 0)

    const totalKelas = kelas.length
    const siswaMasukKelas = siswaKelas.length
    const kapasitas = kelas.reduce((sum, item) => {
      return sum + Number(item.max || 0)
    }, 0)

    return {
      totalPendaftar,
      belumBayar,
      baruBayarPendaftaran,
      hanyaDaftar: baruBayarPendaftaran,

      ppdbDibawah1Juta,
      bayarLebih1JutaBelumLunas,
      lunas,
      mengundurkan,

      sudahBayarPpdb:
        ppdbDibawah1Juta + bayarLebih1JutaBelumLunas + lunas,

      uangDaftar,
      uangPpdbDibawah1Juta,
      uangLebih1JutaBelumLunas,
      uangLunas,
      uangPpdb,
      uangMengundurkan,

      totalKeuangan: uangDaftar + uangPpdb,

      totalKelas,
      siswaMasukKelas,
      kapasitas,
      sisaKapasitas: Math.max(kapasitas - siswaMasukKelas, 0),
    }
  }, [siswa, kelas, siswaKelas, master])

  const handlePrint = (mode: "keuangan" | "siswa") => {
    setPrintMode(mode)

    setTimeout(() => {
      window.print()
      setPrintMode("all")
    }, 100)
  }

  const keuanganData = [
    { label: "Pendaftaran", value: laporan.uangDaftar },
    { label: "PPDB < 1 juta", value: laporan.uangPpdbDibawah1Juta },
    {
      label: "PPDB ≥ 1 juta belum lunas",
      value: laporan.uangLebih1JutaBelumLunas,
    },
    { label: "PPDB lunas", value: laporan.uangLunas },
    { label: "Status Undur", value: laporan.uangMengundurkan },
  ]

  const statusData = [
    { label: "Belum bayar", value: laporan.belumBayar },
    { label: "Baru bayar daftar", value: laporan.baruBayarPendaftaran },
    { label: "PPDB < 1 juta", value: laporan.ppdbDibawah1Juta },
    {
      label: "PPDB ≥ 1 juta belum lunas",
      value: laporan.bayarLebih1JutaBelumLunas,
    },
    { label: "PPDB lunas", value: laporan.lunas },
    { label: "Mengundurkan diri", value: laporan.mengundurkan },
  ]

  const jurusanMasukData = useMemo(() => {
    const map = new Map<string, number>()

    siswaKelas.forEach((item) => {
      const nama =
        item.kelas_ppdb?.jurusan_ppdb?.nama_jurusan ||
        item.siswa_ppdb?.minat_jurusan1 ||
        "Tanpa Jurusan"

      map.set(nama, (map.get(nama) || 0) + 1)
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [siswaKelas])

  const minatJurusanData = useMemo(() => {
  const map = new Map<string, number>()

  siswa
    .filter((item) => item.bayar_daftar === "y")
    .forEach((item) => {
      const jurusan = item.minat_jurusan1 || "Belum Memilih"

      map.set(
        jurusan,
        (map.get(jurusan) || 0) + 1
      )
    })

  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}, [siswa])

  const kelasData = useMemo(() => {
    return kelas.map((item) => {
      const jumlah = siswaKelas.filter(
        (s) => s.id_kelas === item.id_kelas
      ).length

      return {
        label: item.nama_kelas,
        value: jumlah,
        max: item.max,
      }
    })
  }, [kelas, siswaKelas])

  return (
    <ProtectedRoute>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          aside,
          header,
          .no-print {
            display: none !important;
          }

          .hidden-print {
            display: none !important;
          }

          .print-area {
            padding: 0 !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            break-inside: avoid;
          }

          .compact-card {
            padding: 8px !important;
          }

          .compact-title {
            font-size: 10px !important;
          }

          .compact-value {
            font-size: 16px !important;
          }

          .chart-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .chart-card {
            padding: 10px !important;
            break-inside: avoid;
          }

          .chart-title {
            font-size: 12px !important;
            margin-bottom: 8px !important;
          }

          .pie-wrap {
            height: 155px !important;
          }

          .bar-row {
            margin-bottom: 6px !important;
          }

          .bar-label {
            font-size: 10px !important;
          }

          .bar-track {
            height: 7px !important;
          }
        }
      `}</style>

      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="min-w-0 flex-1">
          <AppHeader />

          <main className="print-area space-y-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Laporan PPDB {tahun}
                </h1>
                <p className="text-xs text-slate-500">
                  Keuangan, siswa, kelas, jurusan, dan minat jurusan.
                </p>
              </div>

              <div className="no-print flex flex-wrap gap-2">
                <button
                  onClick={() => handlePrint("keuangan")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Printer size={16} />
                  Print Keuangan
                </button>

                <button
                  onClick={() => handlePrint("siswa")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Printer size={16} />
                  Print Siswa
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-10 text-slate-600">
                <Loader2 className="animate-spin" size={22} />
                Memuat laporan...
              </div>
            ) : (
              <>
                <section
                  className={printMode === "siswa" ? "hidden-print" : ""}
                >
                  <h2 className="mb-2 text-sm font-bold text-slate-700">
                    Laporan Keuangan
                  </h2>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    <InfoCard
                      icon={<Wallet size={18} />}
                      title="Total Masuk"
                      value={rupiahShort(laporan.totalKeuangan)}
                    />
                    <InfoCard
                      title="Uang Daftar"
                      value={rupiahShort(laporan.uangDaftar)}
                    />
                    <InfoCard
                      title="PPDB < 1 Juta"
                      value={rupiahShort(laporan.uangPpdbDibawah1Juta)}
                    />
                    <InfoCard
                      title="PPDB ≥ 1jt Belum Lunas"
                      value={rupiahShort(laporan.uangLebih1JutaBelumLunas)}
                    />
                    <InfoCard
                      title="PPDB Lunas"
                      value={rupiahShort(laporan.uangLunas)}
                    />
                    <InfoCard
                      title="Total PPDB"
                      value={rupiahShort(laporan.uangPpdb)}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    <InfoCard
                      title="Baru Bayar Daftar"
                      value={String(laporan.baruBayarPendaftaran)}
                    />
                    <InfoCard
                      title="PPDB < 1 Juta"
                      value={String(laporan.ppdbDibawah1Juta)}
                    />
                    <InfoCard
                      title="PPDB ≥ 1jt Belum Lunas"
                      value={String(laporan.bayarLebih1JutaBelumLunas)}
                    />
                    <InfoCard
                      title="PPDB Lunas"
                      value={String(laporan.lunas)}
                    />
                    <InfoCard
                      title="Mengundurkan Diri"
                      value={String(laporan.mengundurkan)}
                    />
                    <InfoCard
                      title="Uang Status Undur"
                      value={rupiahShort(laporan.uangMengundurkan)}
                    />
                  </div>

                  <div className="chart-grid mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <PieChartCard
                      title="Komposisi Keuangan"
                      data={keuanganData}
                      valueFormatter={rupiahShort}
                    />

                    <PieChartCard title="Status Keuangan Siswa" data={statusData} />

                    <SummaryCard
                      title="Ringkasan Keuangan"
                      rows={[
                        ["Uang daftar", rupiahShort(laporan.uangDaftar)],
                        ["PPDB < 1 juta", rupiahShort(laporan.uangPpdbDibawah1Juta)],
                        [
                          "PPDB ≥ 1jt belum lunas",
                          rupiahShort(laporan.uangLebih1JutaBelumLunas),
                        ],
                        ["PPDB lunas", rupiahShort(laporan.uangLunas)],
                        ["Total PPDB", rupiahShort(laporan.uangPpdb)],
                        ["Status Undur", rupiahShort(laporan.uangMengundurkan)],
                        ["Total masuk", rupiahShort(laporan.totalKeuangan)],
                      ]}
                    />
                  </div>
                </section>

                <section
                  className={printMode === "keuangan" ? "hidden-print" : ""}
                >
                  <h2 className="mb-2 text-sm font-bold text-slate-700">
                    Laporan Siswa dan Kelas
                  </h2>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    <InfoCard
                      icon={<Users size={18} />}
                      title="Pendaftar"
                      value={String(laporan.totalPendaftar)}
                    />
                    <InfoCard
                      title="Belum Bayar"
                      value={String(laporan.belumBayar)}
                    />
                    <InfoCard
                      title="Hanya Daftar"
                      value={String(laporan.hanyaDaftar)}
                    />
                    <InfoCard
                      title="Bayar PPDB"
                      value={String(laporan.sudahBayarPpdb)}
                    />
                    <InfoCard
                      icon={<School size={18} />}
                      title="Masuk Kelas"
                      value={String(laporan.siswaMasukKelas)}
                    />
                    <InfoCard
                      title="Sisa Kuota"
                      value={String(laporan.sisaKapasitas)}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <InfoCard
                      title="Total Kelas"
                      value={String(laporan.totalKelas)}
                    />
                    <InfoCard
                      title="Kapasitas"
                      value={String(laporan.kapasitas)}
                    />
                    <InfoCard title="Lunas" value={String(laporan.lunas)} />
                    <InfoCard
                      title="Undur"
                      value={String(laporan.mengundurkan)}
                    />
                  </div>

                  <div className="chart-grid mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <PieChartCard title="Status Siswa" data={statusData} />

                    <PieChartCard
                      title="Siswa Masuk per Jurusan"
                      data={jurusanMasukData}
                    />

                    <BarChartCard title="Minat Jurusan 1" data={minatJurusanData} />

                    <BarChartCard title="Siswa per Kelas" data={kelasData} />
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

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="compact-card print-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="compact-title truncate text-xs text-slate-500">
            {title}
          </p>
          <h2 className="compact-value mt-1 truncate text-xl font-bold text-slate-800">
            {value}
          </h2>
        </div>

        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

function PieChartCard({
  title,
  data,
  valueFormatter,
}: {
  title: string
  data: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulative = 0

  const colors = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#ea580c",
    "#475569",
  ]

  const segments = data
    .filter((item) => item.value > 0)
    .map((item, index) => {
      const start = total ? (cumulative / total) * 100 : 0
      cumulative += item.value
      const end = total ? (cumulative / total) * 100 : 0

      return {
        ...item,
        color: colors[index % colors.length],
        dash: `${end - start} ${100 - (end - start)}`,
        offset: 25 - start,
      }
    })

  return (
    <div className="chart-card print-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="chart-title mb-3 text-sm font-bold text-slate-800">
        {title}
      </h2>

      {total === 0 ? (
        <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
          Belum ada data
        </div>
      ) : (
        <div className="pie-wrap flex h-56 items-center gap-4">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 42 42" className="h-36 w-36 -rotate-90">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#e5e7eb"
                strokeWidth="7"
              />

              {segments.map((item) => (
                <circle
                  key={item.label}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="7"
                  strokeDasharray={item.dash}
                  strokeDashoffset={item.offset}
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-slate-800">{total}</span>
              <span className="text-[10px] text-slate-500">Total</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {segments.slice(0, 7).map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-slate-600">{item.label}</span>
                </div>

                <span className="shrink-0 font-semibold text-slate-800">
                  {valueFormatter ? valueFormatter(item.value) : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BarChartCard({
  title,
  data,
}: {
  title: string
  data: { label: string; value: number; max?: number }[]
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="chart-card print-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="chart-title mb-3 text-sm font-bold text-slate-800">
        {title}
      </h2>

      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
            Belum ada data
          </div>
        ) : (
          data.slice(0, 10).map((item) => {
            const width = Math.max((item.value / maxValue) * 100, 3)

            return (
              <div key={item.label} className="bar-row">
                <div className="bar-label mb-1 flex justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-700">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {item.max ? `${item.value}/${item.max}` : item.value}
                  </span>
                </div>

                <div className="bar-track h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  rows,
}: {
  title: string
  rows: [string, string][]
}) {
  return (
    <div className="chart-card print-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="chart-title mb-3 text-sm font-bold text-slate-800">
        {title}
      </h2>

      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
          >
            <span className="text-slate-600">{label}</span>
            <span className="font-bold text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}