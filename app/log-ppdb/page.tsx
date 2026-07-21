"use client"

import { useEffect, useMemo, useState } from "react"
import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"
import { handleUnauthorized } from "@/lib/api"
import Swal from "sweetalert2"
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  ImageIcon,
  Loader2,
  Printer,
} from "lucide-react"

const API_PPDB = process.env.NEXT_PUBLIC_API_URL
const PAGE_SIZE = 25

type JenisLog = "d" | "p" | "l"
type BayarVia = "csh" | "trf" | "sbs"

type MasterPpdb = {
  id_ppdb: string
  daftar: number
  ppdb: number
  tahun: number
  kode_akses: string
}

type SiswaPpdb = {
  id_siswa: string
  nama_lengkap: string | null
  asal_sekolah?: string | null
  tahun?: number | null
}

type LogPpdb = {
  id_log: string
  id_siswa: string
  nominal: string
  no_invoice: string
  jenis: JenisLog
  petugas: string | null
  bukti: string | null
  bayar: BayarVia | null
  created_at: string | null
  updated_at: string | null
  siswa_ppdb?: SiswaPpdb | null
}

type SortKey =
  | "nama"
  | "nominal"
  | "jenis"
  | "created_at"
  | "bayar"
  | "petugas"

type SortDir = "asc" | "desc"

const rupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka)

const toNumber = (value: string | number | null | undefined) => {
  if (!value) return 0
  return Number(String(value).replace(/[^\d]/g, "")) || 0
}

const jenisLabel: Record<JenisLog, string> = {
  d: "Daftar",
  p: "PPDB",
  l: "Mengundurkan diri",
}

const bayarLabel: Record<BayarVia, string> = {
  csh: "Cash",
  trf: "Transfer",
  sbs: "Subsidi",
}

const formatTanggal = (tanggal: string | null) => {
  if (!tanggal) return "-"
  return new Date(tanggal).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const toInputDateTime = (tanggal: string | null) => {
  if (!tanggal) return ""

  const date = new Date(tanggal)
  if (Number.isNaN(date.getTime())) return ""

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 16)
}

const getBuktiUrl = (bukti: string | null) => {
  if (!bukti) return ""
  if (bukti.startsWith("http")) return bukti

  if (bukti.startsWith("/")) {
    return `${API_PPDB}${bukti}`
  }

  return `${API_PPDB}/${bukti}`
}

export default function LogPpdbPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [logs, setLogs] = useState<LogPpdb[]>([])
  const [master, setMaster] = useState<MasterPpdb | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [jenisFilter, setJenisFilter] = useState<"semua" | JenisLog>("semua")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)

  const [selectedLog, setSelectedLog] = useState<LogPpdb | null>(null)
  const [modalEdit, setModalEdit] = useState(false)
  const [modalBukti, setModalBukti] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError("")

      const tahunAktif =
        Number(localStorage.getItem("tahun_ppdb")) || new Date().getFullYear()

      setTahun(tahunAktif)

      const token = localStorage.getItem("token_ppdb")
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      const [logRes, masterRes] = await Promise.all([
        fetch(`${API_PPDB}/ppdb/log/${tahunAktif}`, { headers }),
        fetch(`${API_PPDB}/ppdb/masterppdb?tahun=${tahunAktif}`, { headers }),
      ])

      if (handleUnauthorized(logRes) || handleUnauthorized(masterRes)) return

      const logJson = await logRes.json()
      const masterJson = await masterRes.json()

      if (!logRes.ok) {
        throw new Error(logJson.message || "Gagal mengambil log PPDB")
      }

      setLogs(Array.isArray(logJson.data) ? logJson.data : [])
      setMaster(masterJson.data || null)
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, jenisFilter, startDate, endDate])

  const filteredLogs = useMemo(() => {
    const keyword = search.toLowerCase()

    return logs.filter((item) => {
      const nama = item.siswa_ppdb?.nama_lengkap || ""
      const invoice = item.no_invoice || ""
      const petugas = item.petugas || ""

      const cocokSearch =
        nama.toLowerCase().includes(keyword) ||
        invoice.toLowerCase().includes(keyword) ||
        petugas.toLowerCase().includes(keyword)

      if (!cocokSearch) return false

      if (jenisFilter !== "semua" && item.jenis !== jenisFilter) {
        return false
      }

      if (startDate || endDate) {
        const waktu = item.created_at ? new Date(item.created_at).getTime() : 0

        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime()
          if (waktu < start) return false
        }

        if (endDate) {
          const end = new Date(`${endDate}T23:59:59`).getTime()
          if (waktu > end) return false
        }
      }

      return true
    })
  }, [logs, search, jenisFilter, startDate, endDate])

  const logsTanpaMengundurkan = useMemo(() => {
    return filteredLogs.filter((item) => item.jenis !== "l")
  }, [filteredLogs])

  const sortedLogs = useMemo(() => {
    const data = [...filteredLogs]

    data.sort((a, b) => {
      let valA: string | number = ""
      let valB: string | number = ""

      if (sortKey === "nama") {
        valA = a.siswa_ppdb?.nama_lengkap || ""
        valB = b.siswa_ppdb?.nama_lengkap || ""
      }

      if (sortKey === "nominal") {
        valA = toNumber(a.nominal)
        valB = toNumber(b.nominal)
      }

      if (sortKey === "jenis") {
        valA = jenisLabel[a.jenis] || ""
        valB = jenisLabel[b.jenis] || ""
      }

      if (sortKey === "created_at") {
        valA = a.created_at ? new Date(a.created_at).getTime() : 0
        valB = b.created_at ? new Date(b.created_at).getTime() : 0
      }

      if (sortKey === "bayar") {
        valA = a.bayar ? bayarLabel[a.bayar] : ""
        valB = b.bayar ? bayarLabel[b.bayar] : ""
      }

      if (sortKey === "petugas") {
        valA = a.petugas || ""
        valB = b.petugas || ""
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA
      }

      return sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

    return data
  }, [filteredLogs, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE))

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedLogs.slice(start, start + PAGE_SIZE)
  }, [sortedLogs, page])

  const statistik = useMemo(() => {
    const daftar = logsTanpaMengundurkan.filter((item) => item.jenis === "d")
    const ppdb = logsTanpaMengundurkan.filter((item) => item.jenis === "p")
    const subsidi = logsTanpaMengundurkan.filter((item) => item.bayar === "sbs")

    const totalNominal = logsTanpaMengundurkan
      .filter((item) => item.bayar !== "sbs")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const nominalSubsidi = subsidi.reduce(
      (sum, item) => sum + toNumber(item.nominal),
      0
    )

    return {
      total: logsTanpaMengundurkan.length,
      daftar: daftar.length,
      ppdb: ppdb.length,
      subsidi: subsidi.length,
      totalNominal,
      nominalSubsidi,
    }
  }, [logsTanpaMengundurkan])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortLabel = (key: SortKey) => {
    if (sortKey !== key) return "↕"
    return sortDir === "asc" ? "↑" : "↓"
  }

  const openEdit = (item: LogPpdb) => {
    setSelectedLog(item)
    setModalEdit(true)
  }

  const openBukti = (item: LogPpdb) => {
    setSelectedLog(item)
    setModalBukti(true)
  }

  const printKuitansi = (item: LogPpdb) => {
    const namaSiswa = item.siswa_ppdb?.nama_lengkap || "-"
    const asalSekolah = item.siswa_ppdb?.asal_sekolah || "-"
    const nominal = rupiah(toNumber(item.nominal))
    const status = item.jenis === "d" ? "Pendaftaran" : jenisLabel[item.jenis]
    const via = item.bayar ? bayarLabel[item.bayar] : "-"
    const petugas = item.petugas || "-"
    const noInvoice = item.no_invoice || item.id_log
    const tanggal = formatTanggal(item.created_at)

    const html = `
      <html>
        <head>
          <title>Kuitansi - ${namaSiswa}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #0f172a;
            }

            h1, h2, p {
              margin: 0;
            }

            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
            }

            .header h1 {
              font-size: 18px;
              letter-spacing: 1px;
            }

            .header p {
              font-size: 13px;
              color: #475569;
              margin-top: 4px;
            }

            .meta {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #475569;
              margin-bottom: 16px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-bottom: 24px;
            }

            td {
              padding: 8px 4px;
              border-bottom: 1px solid #e2e8f0;
            }

            td.label {
              width: 40%;
              color: #64748b;
            }

            td.value {
              font-weight: bold;
            }

            .nominal-row td {
              font-size: 16px;
              padding-top: 12px;
            }

            .footer {
              margin-top: 40px;
              display: flex;
              justify-content: flex-end;
            }

            .ttd {
              width: 220px;
              text-align: center;
              font-size: 13px;
            }

            .ttd .space {
              height: 70px;
            }

            .ttd .nama {
              font-weight: bold;
              border-top: 1px solid #0f172a;
              padding-top: 4px;
            }

            @media print {
              body {
                padding: 12px;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>KUITANSI PEMBAYARAN PPDB</h1>
            <p>SMK Sangkuriang 1 Cimahi</p>
          </div>

          <div class="meta">
            <span>No. Invoice: ${noInvoice}</span>
            <span>${tanggal}</span>
          </div>

          <table>
            <tbody>
              <tr>
                <td class="label">Nama Siswa</td>
                <td class="value">${namaSiswa}</td>
              </tr>
              <tr>
                <td class="label">Asal Sekolah</td>
                <td class="value">${asalSekolah}</td>
              </tr>
              <tr>
                <td class="label">Status</td>
                <td class="value">${status}</td>
              </tr>
              <tr>
                <td class="label">Via</td>
                <td class="value">${via}</td>
              </tr>
              <tr class="nominal-row">
                <td class="label">Nominal</td>
                <td class="value">${nominal}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div class="ttd">
              <p>Cimahi, ${new Date().toLocaleDateString("id-ID")}</p>
              <p>Petugas,</p>
              <div class="space"></div>
              <p class="nama">${petugas}</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print()
            }
          </script>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const printRekapInternal = () => {
    const dataPrint = filteredLogs
    const transaksiUang = dataPrint.filter((item) => item.jenis !== "l")

    const jumlahDaftar = dataPrint.filter((item) => item.jenis === "d").length
    const jumlahPpdb = dataPrint.filter((item) => item.jenis === "p").length
    const jumlahMundur = dataPrint.filter((item) => item.jenis === "l").length

    const totalDaftar = dataPrint
      .filter((item) => item.jenis === "d" && item.bayar !== "sbs")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalPpdb = dataPrint
      .filter((item) => item.jenis === "p" && item.bayar !== "sbs")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const jumlahCash = transaksiUang.filter((item) => item.bayar === "csh").length
    const nominalCash = transaksiUang
      .filter((item) => item.bayar === "csh")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const jumlahTransfer = transaksiUang.filter(
      (item) => item.bayar === "trf"
    ).length
    const nominalTransfer = transaksiUang
      .filter((item) => item.bayar === "trf")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalMundur = dataPrint
      .filter((item) => item.jenis === "l")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalNominal = totalDaftar + totalPpdb
    const nominalBersih = totalNominal - totalMundur

    const html = `
      <html>
        <head>
          <title>Rekap PPDB ${tahun}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #0f172a;
            }

            h1, h2, p {
              margin: 0;
            }

            .header {
              text-align: center;
              margin-bottom: 24px;
            }

            .header h1 {
              font-size: 22px;
              margin-bottom: 6px;
            }

            .header p {
              font-size: 13px;
              color: #475569;
            }

            .cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }

            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 12px;
            }

            .card .label {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 6px;
            }

            .card .value {
              font-size: 17px;
              font-weight: bold;
            }

            .card .sub {
              font-size: 12px;
              color: #64748b;
              margin-top: 2px;
            }

            .mundur td {
              color: #dc2626;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
            }

            th {
              background: #f1f5f9;
              text-align: left;
            }

            .right {
              text-align: right;
            }

            .footer {
              margin-top: 30px;
              display: flex;
              justify-content: flex-end;
            }

            .ttd {
              width: 220px;
              text-align: center;
              font-size: 13px;
            }

            @media print {
              body {
                padding: 12px;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>REKAP PEMBAYARAN PPDB ${tahun}</h1>
            <p>SMK Sangkuriang 1 Cimahi</p>
            <p>
              ${
                startDate && endDate
                  ? `Periode ${startDate} s/d ${endDate}`
                  : "Semua data sesuai filter"
              }
            </p>
          </div>

          <div class="cards">
            <div class="card">
              <div class="label">Total Transaksi</div>
              <div class="value">${dataPrint.length}</div>
            </div>

            <div class="card">
              <div class="label">Pendaftaran</div>
              <div class="value">${jumlahDaftar}</div>
              <div class="sub">${rupiah(totalDaftar)}</div>
            </div>

            <div class="card">
              <div class="label">PPDB</div>
              <div class="value">${jumlahPpdb}</div>
              <div class="sub">${rupiah(totalPpdb)}</div>
            </div>

            <div class="card">
              <div class="label">Mengundurkan Diri</div>
              <div class="value" style="color:#dc2626">${jumlahMundur}</div>
              <div class="sub">${rupiah(totalMundur)}</div>
            </div>
          </div>

          <div class="cards">
            <div class="card">
              <div class="label">Cash</div>
              <div class="value">${jumlahCash}</div>
              <div class="sub">${rupiah(nominalCash)}</div>
            </div>

            <div class="card">
              <div class="label">Transfer</div>
              <div class="value">${jumlahTransfer}</div>
              <div class="sub">${rupiah(nominalTransfer)}</div>
            </div>

            <div class="card">
              <div class="label">Total Nominal Masuk</div>
              <div class="value">${rupiah(totalNominal)}</div>
            </div>

            <div class="card">
              <div class="label">Nominal Bersih</div>
              <div class="value">${rupiah(nominalBersih)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Nama Siswa</th>
                <th>Status</th>
                <th>Via</th>
                <th>Petugas</th>
                <th class="right">Nominal</th>
              </tr>
            </thead>

            <tbody>
              ${
                dataPrint.length === 0
                  ? `<tr><td colspan="7" style="text-align:center">Tidak ada data</td></tr>`
                  : dataPrint
                      .map(
                        (item, index) => `
                          <tr class="${item.jenis === "l" ? "mundur" : ""}">
                            <td>${index + 1}</td>
                            <td>${formatTanggal(item.created_at)}</td>
                            <td>${item.siswa_ppdb?.nama_lengkap || "-"}</td>
                            <td>${jenisLabel[item.jenis]}</td>
                            <td>${item.bayar ? bayarLabel[item.bayar] : "-"}</td>
                            <td>${item.petugas || "-"}</td>
                            <td class="right">${rupiah(toNumber(item.nominal))}</td>
                          </tr>
                        `
                      )
                      .join("")
              }
            </tbody>
          </table>

          <div class="footer">
            <div class="ttd">
              <p>Cimahi, ${new Date().toLocaleDateString("id-ID")}</p>
              <p>Panitia PPDB</p>
              <br/><br/><br/>
              <p>________________________</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print()
            }
          </script>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="min-w-0 flex-1">
          <AppHeader />

          <main className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Log PPDB {tahun}
                </h1>
                <p className="text-sm text-slate-500">
                  Data transaksi daftar, PPDB, dan subsidi.
                </p>
              </div>

              <button
                onClick={printRekapInternal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Printer size={16} />
                Print Rekap
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <InfoCard title="Total Log" value={String(statistik.total)} />
                <InfoCard title="Daftar" value={String(statistik.daftar)} />
                <InfoCard title="PPDB" value={String(statistik.ppdb)} />
                <InfoCard title="Subsidi" value={String(statistik.subsidi)} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <InfoCard
                  title="Nominal Subsidi"
                  value={rupiah(statistik.nominalSubsidi)}
                />

                <InfoCard
                  title="Total Nominal"
                  value={rupiah(statistik.totalNominal)}
                />

                <InfoCard
                  title="Total Data Ditampilkan"
                  value={String(statistik.total)}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, invoice, petugas..."
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none"
                  autoComplete="off"
                />

                <select
                  value={jenisFilter}
                  onChange={(e) =>
                    setJenisFilter(e.target.value as "semua" | JenisLog)
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none"
                >
                  <option value="semua">Semua Status</option>
                  <option value="d">Daftar</option>
                  <option value="p">PPDB</option>
                  <option value="l">Mengundurkan</option>
                </select>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
                  <Loader2 className="animate-spin" size={22} />
                  Memuat log PPDB...
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <SortableTh onClick={() => handleSort("nama")}>
                            Nama Siswa {sortLabel("nama")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("nominal")}>
                            Nominal {sortLabel("nominal")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("jenis")}>
                            Status {sortLabel("jenis")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("created_at")}>
                            Waktu {sortLabel("created_at")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("bayar")}>
                            Via {sortLabel("bayar")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("petugas")}>
                            Petugas {sortLabel("petugas")}
                          </SortableTh>

                          <th className="px-4 py-3 text-center">Bukti</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              Data tidak ditemukan
                            </td>
                          </tr>
                        ) : (
                          paginatedLogs.map((item) => (
                            <tr
                              key={item.id_log}
                              className="border-b last:border-0 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">
                                  {item.siswa_ppdb?.nama_lengkap || "-"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.no_invoice || item.id_log}
                                </div>
                              </td>

                              <td className="px-4 py-3 font-semibold">
                                {rupiah(toNumber(item.nominal))}
                              </td>

                              <td className="px-4 py-3">
                                <StatusBadge jenis={item.jenis} />
                              </td>

                              <td className="px-4 py-3">
                                {formatTanggal(item.created_at)}
                              </td>

                              <td className="px-4 py-3">
                                {item.bayar ? (
                                  <BayarBadge bayar={item.bayar} />
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {item.petugas || "-"}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {item.bukti ? (
                                  <button
                                    onClick={() => openBukti(item)}
                                    title="Lihat bukti"
                                    className="mx-auto rounded-lg bg-cyan-100 p-2 text-cyan-700 hover:bg-cyan-200"
                                  >
                                    <ImageIcon size={16} />
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                                  <button
                                    onClick={() => printKuitansi(item)}
                                    title="Print kuitansi"
                                    className="border-r px-3 py-2 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Printer size={16} />
                                  </button>

                                  <button
                                    onClick={() => openEdit(item)}
                                    title="Edit / Hapus log"
                                    className="px-3 py-2 text-amber-600 hover:bg-amber-50"
                                  >
                                    <Edit size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Menampilkan{" "}
                      <b>
                        {sortedLogs.length === 0
                          ? 0
                          : (page - 1) * PAGE_SIZE + 1}
                      </b>{" "}
                      - <b>{Math.min(page * PAGE_SIZE, sortedLogs.length)}</b>{" "}
                      dari <b>{sortedLogs.length}</b> data
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                        Prev
                      </button>

                      <span className="text-sm text-slate-600">
                        Page {page} / {totalPages}
                      </span>

                      <button
                        onClick={() =>
                          setPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={page === totalPages}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </main>
        </div>
      </div>

      {modalEdit && selectedLog && master && (
        <ModalEditLog
          log={selectedLog}
          master={master}
          onClose={() => setModalEdit(false)}
          onSuccess={() => {
            setModalEdit(false)
            fetchLogs()
          }}
        />
      )}

      {modalBukti && selectedLog && (
        <ModalBukti log={selectedLog} onClose={() => setModalBukti(false)} />
      )}
    </ProtectedRoute>
  )
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-xl font-bold text-slate-800">{value}</h2>
    </div>
  )
}

function SortableTh({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <th
      onClick={onClick}
      className="cursor-pointer select-none px-4 py-3 text-left hover:bg-slate-100"
    >
      {children}
    </th>
  )
}

function StatusBadge({ jenis }: { jenis: JenisLog }) {
  if (jenis === "d") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
        Daftar
      </span>
    )
  }

  if (jenis === "p") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        PPDB
      </span>
    )
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
      Mengundurkan
    </span>
  )
}

function BayarBadge({ bayar }: { bayar: BayarVia }) {
  if (bayar === "csh") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Cash
      </span>
    )
  }

  if (bayar === "trf") {
    return (
      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
        Transfer
      </span>
    )
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Subsidi
    </span>
  )
}

function ModalEditLog({
  log,
  master,
  onClose,
  onSuccess,
}: {
  log: LogPpdb
  master: MasterPpdb
  onClose: () => void
  onSuccess: () => void
}) {
  const [nominal, setNominal] = useState(toNumber(log.nominal))
  const [bayar, setBayar] = useState<BayarVia>(log.bayar || "csh")
  const [petugas, setPetugas] = useState(log.petugas || "")
  const [createdAt, setCreatedAt] = useState(toInputDateTime(log.created_at))
  const [jenis, setJenis] = useState<JenisLog>(log.jenis)
  const [bukti, setBukti] = useState<File | null>(null)
  const [kodeAkses, setKodeAkses] = useState("")
  const [loading, setLoading] = useState(false)

  const validasiKode = () => {
    if (kodeAkses !== master.kode_akses) {
      Swal.fire({
        title: "Kode Salah",
        text: "Kode akses tidak sesuai.",
        icon: "error",
        confirmButtonColor: "#dc2626",
      })
      return false
    }

    return true
  }

  const submitEdit = async () => {
    if (!validasiKode()) return

    if (!petugas.trim()) {
      Swal.fire("Petugas wajib diisi", "Masukkan nama petugas.", "warning")
      return
    }

    if (!createdAt) {
      Swal.fire("Waktu wajib diisi", "Masukkan waktu transaksi.", "warning")
      return
    }

    const confirm = await Swal.fire({
      title: "Update Log?",
      text: "Data log PPDB akan diperbarui.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Update",
      cancelButtonText: "Batal",
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#64748b",
    })

    if (!confirm.isConfirmed) return

    try {
      setLoading(true)

      const token = localStorage.getItem("token_ppdb")
      const formData = new FormData()

      formData.append("nominal", String(nominal))
      formData.append("bayar", bayar)
      formData.append("petugas", petugas)
      formData.append("created_at", createdAt)
      formData.append("jenis", jenis)

      if (bukti) {
        formData.append("bukti", bukti)
      }

      const res = await fetch(`${API_PPDB}/ppdb/updatelog/${log.id_log}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (handleUnauthorized(res)) return

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal update log PPDB", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Log PPDB berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      onSuccess()
    } catch (err: any) {
      Swal.fire("Error", err.message || "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  const submitDelete = async () => {
    if (!validasiKode()) return

    const confirm = await Swal.fire({
      title: "Hapus Log?",
      text: "Log PPDB dan bukti pembayaran akan dihapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    })

    if (!confirm.isConfirmed) return

    try {
      setLoading(true)

      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(`${API_PPDB}/ppdb/deletelog/${log.id_log}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jenis: log.jenis,
          id_siswa: log.id_siswa,
        }),
      })

      if (handleUnauthorized(res)) return

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal hapus log PPDB", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Log PPDB berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      onSuccess()
    } catch (err: any) {
      Swal.fire("Error", err.message || "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={`Edit Log - ${log.siswa_ppdb?.nama_lengkap || "-"}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Kode Akses
          </label>
          <input
            type="password"
            value={kodeAkses}
            onChange={(e) => setKodeAkses(e.target.value)}
            placeholder="Masukkan kode akses"
            className="w-full rounded-xl border px-4 py-2"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Waktu</label>
          <input
            type="datetime-local"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Nominal</label>
          <input
            type="number"
            value={nominal}
            onChange={(e) => setNominal(Number(e.target.value))}
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Via</label>
          <select
            value={bayar}
            onChange={(e) => setBayar(e.target.value as BayarVia)}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="csh">Cash</option>
            <option value="trf">Transfer</option>
            <option value="sbs">Subsidi</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Petugas</label>
          <input
            value={petugas}
            onChange={(e) => setPetugas(e.target.value)}
            placeholder="Nama petugas"
            className="w-full rounded-xl border px-4 py-2"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Status</label>
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value as JenisLog)}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="d">Daftar</option>
            <option value="p">PPDB</option>
            <option value="l">Mengundurkan Diri</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Upload Bukti Baru
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setBukti(e.target.files?.[0] || null)}
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={submitEdit}
            disabled={loading || nominal <= 0}
            className="rounded-xl bg-amber-500 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Edit Log"}
          </button>

          <button
            onClick={submitDelete}
            disabled={loading}
            className="rounded-xl bg-red-600 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Hapus Log"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalBukti({
  log,
  onClose,
}: {
  log: LogPpdb
  onClose: () => void
}) {
  const url = getBuktiUrl(log.bukti)

  return (
    <Modal
      title={`Bukti Pembayaran - ${log.siswa_ppdb?.nama_lengkap || "-"}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {url.toLowerCase().endsWith(".pdf") ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-3 text-sm text-slate-600">
              File bukti berupa PDF.
            </p>
            <a
              href={url}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Eye size={16} />
              Buka PDF
            </a>
          </div>
        ) : (
          <img
            src={url}
            alt="Bukti pembayaran"
            className="max-h-[70vh] w-full rounded-xl object-contain"
          />
        )}

        <a
          href={url}
          target="_blank"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Eye size={16} />
          Buka di Tab Baru
        </a>
      </div>
    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
          >
            Tutup
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}