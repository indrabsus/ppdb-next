"use client"

import { useEffect, useMemo, useState } from "react"
import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit,
  Loader2,
  MessageCircle,
  Printer,
  Trash2,
  UserX,
  Users,
} from "lucide-react"

const MySwal = withReactContent(Swal)
const API_PPDB = process.env.NEXT_PUBLIC_API_URL
const API_WA = process.env.NEXT_PUBLIC_API_WA
const PAGE_SIZE = 10

type LogPpdb = {
  id_log: string
  id_siswa: string
  nominal: string
  jenis: "d" | "p" | "l"
  bayar: "csh" | "trf" | "sbs" | null
}

type KelasPpdb = {
  id_kelas: string
  tingkat: number | null
  nama_kelas: string
  id_jurusan: string
  max: number
}

type SiswaBaru = {
  id_siswa_baru: string
  id_siswa: string
  id_kelas: string
  kelas_ppdb?: KelasPpdb | null
}

type SiswaPpdb = {
  id_siswa: string
  nama_lengkap: string | null
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenkel: "l" | "p" | null
  no_hp: string | null
  agama: string | null
  alamat: string | null
  nisn: string | null
  nik_siswa: string | null
  nama_ayah: string | null
  nama_ibu: string | null
  asal_sekolah: string | null
  minat_jurusan1: string | null
  minat_jurusan2: string | null
  no_hp_ortu: string | null
  bayar_daftar: "n" | "y" | "l" | null
  tahun: number | null
  status: string | null
  created_at: string | null
  log_ppdb?: LogPpdb[]
  siswa_baru?: SiswaBaru | SiswaBaru[] | null
}

type MasterPpdb = {
  id_ppdb: string
  daftar: number
  ppdb: number
  tahun: number
  kode_akses: string
}

type SortKey =
  | "created_at"
  | "nama_lengkap"
  | "nisn"
  | "asal_sekolah"
  | "pembayaran"
  | "minat_jurusan1"
  | "kelas"

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

const getKelasSiswa = (siswaBaru: SiswaPpdb["siswa_baru"]) => {
  if (!siswaBaru) return "-"

  if (Array.isArray(siswaBaru)) {
    return siswaBaru[0]?.kelas_ppdb?.nama_kelas || "-"
  }

  return siswaBaru.kelas_ppdb?.nama_kelas || "-"
}

const isNisnValid = (nisn: string | null) => {
  if (!nisn) return false

  const value = nisn.trim()
  if (!/^\d{10}$/.test(value)) return false

  const isAsalAsalan = /^(\d)\1{9}$/.test(value) || value === "1234567890"
  return !isAsalAsalan
}

export default function PendaftarPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [filter, setFilter] = useState("semua")
  const [siswa, setSiswa] = useState<SiswaPpdb[]>([])
  const [kelas, setKelas] = useState<KelasPpdb[]>([])
  const [master, setMaster] = useState<MasterPpdb | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sendingWa, setSendingWa] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)

  const [selectedSiswa, setSelectedSiswa] = useState<SiswaPpdb | null>(null)
  const [modalBayar, setModalBayar] = useState(false)
  const [modalKelas, setModalKelas] = useState(false)
  const [modalEdit, setModalEdit] = useState(false)
  const [modalHapus, setModalHapus] = useState(false)

  const getLogs = (item: SiswaPpdb) => item.log_ppdb || []

  const hitungDaftar = (item: SiswaPpdb) =>
    getLogs(item)
      .filter((log) => log.jenis === "d")
      .reduce((sum, log) => sum + toNumber(log.nominal), 0)

  const hitungPpdb = (item: SiswaPpdb) =>
    getLogs(item)
      .filter((log) => log.jenis === "p")
      .reduce((sum, log) => sum + toNumber(log.nominal), 0)

  const sudahDaftar = (item: SiswaPpdb) =>
    item.bayar_daftar === "y" ||
    item.bayar_daftar === "l" ||
    hitungDaftar(item) > 0

  const isLunas = (item: SiswaPpdb) => {
    const biayaPpdb = master?.ppdb || 0
    return biayaPpdb > 0 && hitungPpdb(item) >= biayaPpdb
  }

  const fetchData = async () => {
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

      const [resN, resY, resL, kelasRes, masterRes] = await Promise.all([
        fetch(`${API_PPDB}/ppdb/siswa/${tahunAktif}/n`, { headers }),
        fetch(`${API_PPDB}/ppdb/siswa/${tahunAktif}/y`, { headers }),
        fetch(`${API_PPDB}/ppdb/siswa/${tahunAktif}/l`, { headers }),
        fetch(`${API_PPDB}/ppdb/kelas?tahun=${tahunAktif}`, { headers }),
        fetch(`${API_PPDB}/ppdb/masterppdb?tahun=${tahunAktif}`, { headers }),
      ])

      const jsonN = await resN.json()
      const jsonY = await resY.json()
      const jsonL = await resL.json()
      const kelasJson = await kelasRes.json()
      const masterJson = await masterRes.json()

      const allSiswa = [
        ...(Array.isArray(jsonN.data) ? jsonN.data : []),
        ...(Array.isArray(jsonY.data) ? jsonY.data : []),
        ...(Array.isArray(jsonL.data) ? jsonL.data : []),
      ]

      setSiswa(allSiswa)
      setKelas(Array.isArray(kelasJson.data) ? kelasJson.data : [])
      setMaster(masterJson.data || null)
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [filter, search])

  const statistik = useMemo(() => {
    return {
      total: siswa.length,
      belumDaftar: siswa.filter((item) => item.bayar_daftar === "n").length,
      sudahDaftar: siswa.filter((item) => item.bayar_daftar === "y").length,
      mengundurkan: siswa.filter((item) => item.bayar_daftar === "l").length,
      ppdb1jt: siswa.filter((item) => hitungPpdb(item) >= 1000000).length,
      lunas: siswa.filter((item) => isLunas(item)).length,
      nisnInvalid: siswa.filter((item) => !isNisnValid(item.nisn)).length,
    }
  }, [siswa, master])

  const cardUtama = useMemo(() => {
    if (filter === "n") {
      return { title: "Belum Bayar Daftar", value: statistik.belumDaftar }
    }

    if (filter === "y") {
      return { title: "Sudah Bayar Daftar", value: statistik.sudahDaftar }
    }

    if (filter === "l") {
      return { title: "Mengundurkan Diri", value: statistik.mengundurkan }
    }

    if (filter === "ppdb_1jt") {
      return { title: "PPDB ≥ 1 Juta", value: statistik.ppdb1jt }
    }

    if (filter === "lunas") {
      return { title: "PPDB Lunas", value: statistik.lunas }
    }

    if (filter === "nisn_invalid") {
      return { title: "NISN Tidak Valid", value: statistik.nisnInvalid }
    }

    return { title: "Semua Pendaftar", value: statistik.total }
  }, [filter, statistik])

  const filteredSiswa = useMemo(() => {
    const keyword = search.toLowerCase()

    return siswa.filter((item) => {
      const totalPpdb = hitungPpdb(item)

      const cocokSearch =
        item.nama_lengkap?.toLowerCase().includes(keyword) ||
        item.asal_sekolah?.toLowerCase().includes(keyword) ||
        item.minat_jurusan1?.toLowerCase().includes(keyword) ||
        item.minat_jurusan2?.toLowerCase().includes(keyword) ||
        item.no_hp?.toLowerCase().includes(keyword)

      if (!cocokSearch) return false

      if (filter === "n") return item.bayar_daftar === "n"
      if (filter === "y") return item.bayar_daftar === "y"
      if (filter === "l") return item.bayar_daftar === "l"
      if (filter === "ppdb_1jt") return totalPpdb >= 1000000
      if (filter === "lunas") return isLunas(item)
      if (filter === "nisn_invalid") return !isNisnValid(item.nisn)

      return true
    })
  }, [siswa, search, filter, master])

  const sortedSiswa = useMemo(() => {
    const data = [...filteredSiswa]

    data.sort((a, b) => {
      let valA: string | number = ""
      let valB: string | number = ""

      if (sortKey === "created_at") {
        valA = a.created_at ? new Date(a.created_at).getTime() : 0
        valB = b.created_at ? new Date(b.created_at).getTime() : 0
      }

      if (sortKey === "nama_lengkap") {
        valA = a.nama_lengkap || ""
        valB = b.nama_lengkap || ""
      }

      if (sortKey === "nisn") {
        valA = a.nisn || ""
        valB = b.nisn || ""
      }

      if (sortKey === "asal_sekolah") {
        valA = a.asal_sekolah || ""
        valB = b.asal_sekolah || ""
      }

      if (sortKey === "pembayaran") {
        valA = hitungPpdb(a)
        valB = hitungPpdb(b)
      }

      if (sortKey === "minat_jurusan1") {
        valA = a.minat_jurusan1 || ""
        valB = b.minat_jurusan1 || ""
      }

      if (sortKey === "kelas") {
        valA = getKelasSiswa(a.siswa_baru)
        valB = getKelasSiswa(b.siswa_baru)
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA
      }

      return sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

    return data
  }, [filteredSiswa, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedSiswa.length / PAGE_SIZE))

  const paginatedSiswa = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedSiswa.slice(start, start + PAGE_SIZE)
  }, [sortedSiswa, page])

  const selectedSiswaList = useMemo(() => {
    return siswa.filter((item) => selectedIds.includes(item.id_siswa))
  }, [siswa, selectedIds])

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

  const toggleAllPage = () => {
    const pageIds = paginatedSiswa.map((item) => item.id_siswa)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const kirimWaMasal = async () => {
    if (selectedSiswaList.length === 0) return

    const pilihTarget = await Swal.fire({
      title: "Kirim WhatsApp Ke Siapa?",
      text: "Pilih nomor tujuan pengiriman pesan.",
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Ke Siswa",
      denyButtonText: "Ke Orang Tua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a",
      denyButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
    })

    if (!pilihTarget.isConfirmed && !pilihTarget.isDenied) return

    const target: "siswa" | "ortu" = pilihTarget.isConfirmed ? "siswa" : "ortu"
    const labelTarget = target === "siswa" ? "siswa" : "orang tua"
    const getNomor = (item: SiswaPpdb) =>
      target === "siswa" ? item.no_hp : item.no_hp_ortu

    const defaultPesan = `Assalamualaikum, Bapak/Ibu.

Kami dari Panitia PPDB SMK Sangkuriang 1 Cimahi ingin menginformasikan terkait pendaftaran PPDB tahun ${tahun}.

Terima kasih.`

    const result = await MySwal.fire({
      title: "Kirim WhatsApp",
      html: `
        <div style="text-align:left">
          <p style="font-size:14px;margin-bottom:10px;color:#64748b">
            Pesan akan dikirim ke <b>${selectedSiswaList.length}</b> nomor WhatsApp ${labelTarget} terpilih.
          </p>
          <textarea id="pesan-wa" class="swal2-textarea" style="height:180px;resize:none">${defaultPesan}</textarea>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Kirim Sekarang",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      preConfirm: () => {
        const textarea = document.getElementById(
          "pesan-wa"
        ) as HTMLTextAreaElement | null

        const pesan = textarea?.value?.trim()

        if (!pesan) {
          Swal.showValidationMessage("Pesan tidak boleh kosong")
          return false
        }

        return pesan
      },
    })

    if (!result.isConfirmed || !result.value) return

    const pesan = result.value as string

    const confirm = await MySwal.fire({
      title: "Konfirmasi Pengiriman",
      html: `Yakin ingin mengirim pesan ke <b>${selectedSiswaList.length}</b> ${labelTarget}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
    })

    if (!confirm.isConfirmed) return

    try {
      setSendingWa(true)

      Swal.fire({
        title: "Mengirim WhatsApp...",
        html: "Mohon tunggu, pesan sedang dikirim.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      })

      let sukses = 0
      let gagal = 0
      const gagalList: string[] = []

      for (const item of selectedSiswaList) {
        const nomor = getNomor(item)

        if (!nomor) {
          gagal++
          gagalList.push(`${item.nama_lengkap || "-"}: nomor kosong`)
          continue
        }

        try {
          const res = await fetch(`${API_WA}/notifuser`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nomor,
              pesan,
            }),
          })

          if (res.ok) {
            sukses++
          } else {
            gagal++
            gagalList.push(`${item.nama_lengkap || "-"}: gagal kirim`)
          }
        } catch {
          gagal++
          gagalList.push(`${item.nama_lengkap || "-"}: error koneksi`)
        }
      }

      await MySwal.fire({
        title: "Pengiriman Selesai",
        html: `
          <div style="text-align:left">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
              <div style="background:#dcfce7;padding:12px;border-radius:12px;text-align:center">
                <div style="font-size:24px;font-weight:700;color:#15803d">${sukses}</div>
                <div style="font-size:12px;color:#166534">Berhasil</div>
              </div>
              <div style="background:#fee2e2;padding:12px;border-radius:12px;text-align:center">
                <div style="font-size:24px;font-weight:700;color:#b91c1c">${gagal}</div>
                <div style="font-size:12px;color:#991b1b">Gagal</div>
              </div>
            </div>
            ${
              gagalList.length
                ? `<details><summary>Detail gagal</summary><ul>${gagalList
                    .map((item) => `<li>${item}</li>`)
                    .join("")}</ul></details>`
                : ""
            }
          </div>
        `,
        icon: gagal > 0 ? "warning" : "success",
        confirmButtonColor: "#2563eb",
      })

      setSelectedIds([])
    } finally {
      setSendingWa(false)
    }
  }

  const statusLabel = (item: SiswaPpdb) => {
    const totalPpdb = hitungPpdb(item)
    const biayaPpdb = master?.ppdb || 0

    if (!sudahDaftar(item)) return "Belum Daftar"
    if (item.bayar_daftar === "l") return "Mengundurkan Diri"
    if (isLunas(item)) return "Lunas"

    return `${rupiah(totalPpdb)} / ${rupiah(biayaPpdb)}`
  }

  const printPdf = () => {
    const dataPrint = sortedSiswa

    const html = `
      <html>
        <head>
          <title>Data Pendaftar ${cardUtama.title} - PPDB ${tahun}</title>
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

            .mundur td {
              color: #dc2626;
            }

            .invalid {
              color: #dc2626;
              font-weight: bold;
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
            <h1>DATA PENDAFTAR PPDB ${tahun}</h1>
            <p>SMK Sangkuriang 1 Cimahi</p>
            <p>
              ${cardUtama.title}${search ? ` &mdash; pencarian "${search}"` : ""}
            </p>
          </div>

          <div class="cards">
            <div class="card">
              <div class="label">Total Data</div>
              <div class="value">${dataPrint.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>NISN</th>
                <th>Asal Sekolah</th>
                <th>No HP Orang Tua</th>
                <th>Status</th>
                <th>Minat Jurusan</th>
                <th>Kelas</th>
              </tr>
            </thead>

            <tbody>
              ${
                dataPrint.length === 0
                  ? `<tr><td colspan="8" style="text-align:center">Tidak ada data</td></tr>`
                  : dataPrint
                      .map((item, index) => {
                        const minat = [item.minat_jurusan1, item.minat_jurusan2]
                          .filter(Boolean)
                          .join(", ")

                        return `
                          <tr class="${item.bayar_daftar === "l" ? "mundur" : ""}">
                            <td>${index + 1}</td>
                            <td>${item.nama_lengkap || "-"}</td>
                            <td class="${isNisnValid(item.nisn) ? "" : "invalid"}">${
                          item.nisn || "Kosong"
                        }</td>
                            <td>${item.asal_sekolah || "-"}</td>
                            <td>${item.no_hp_ortu || "-"}</td>
                            <td>${statusLabel(item)}</td>
                            <td>${minat || "-"}</td>
                            <td>${getKelasSiswa(item.siswa_baru)}</td>
                          </tr>
                        `
                      })
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

  const openBayar = (item: SiswaPpdb) => {
    setSelectedSiswa(item)
    setModalBayar(true)
  }

  const openKelas = (item: SiswaPpdb) => {
    setSelectedSiswa(item)
    setModalKelas(true)
  }

  const openEdit = (item: SiswaPpdb) => {
    setSelectedSiswa(item)
    setModalEdit(true)
  }

  const openHapus = (item: SiswaPpdb) => {
    setSelectedSiswa(item)
    setModalHapus(true)
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="flex-1">
          <AppHeader />

          <main className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Data Pendaftar PPDB {tahun}
                </h1>
                <p className="text-sm text-slate-500">
                  Pagination 10 data, sorting tiap kolom, pembayaran, kelas,
                  WA massal, hapus, dan mengundurkan diri.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={kirimWaMasal}
                  disabled={selectedIds.length === 0 || sendingWa}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageCircle size={16} />
                  {sendingWa
                    ? "Mengirim..."
                    : `Kirim WA (${selectedIds.length})`}
                </button>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                >
                  <option value="semua">Semua Data</option>
                  <option value="n">Belum Bayar Daftar</option>
                  <option value="y">Sudah Bayar Daftar</option>
                  <option value="l">Mengundurkan Diri</option>
                  <option value="ppdb_1jt">PPDB ≥ 1 Juta</option>
                  <option value="lunas">PPDB Lunas</option>
                  <option value="nisn_invalid">NISN Tidak Valid</option>
                </select>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, sekolah, jurusan..."
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                />

                <button
                  onClick={printPdf}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Printer size={16} />
                  Print PDF
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoCard title={cardUtama.title} value={String(cardUtama.value)} />
              <InfoCard
                title="Belum Bayar Daftar"
                value={String(statistik.belumDaftar)}
              />
              <InfoCard title="PPDB ≥ 1 Juta" value={String(statistik.ppdb1jt)} />
              <InfoCard title="PPDB Lunas" value={String(statistik.lunas)} />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
                  <Loader2 className="animate-spin" size={22} />
                  Memuat data pendaftar...
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                paginatedSiswa.length > 0 &&
                                paginatedSiswa.every((item) =>
                                  selectedIds.includes(item.id_siswa)
                                )
                              }
                              onChange={toggleAllPage}
                            />
                          </th>

                          <SortableTh onClick={() => handleSort("nama_lengkap")}>
                            Nama {sortLabel("nama_lengkap")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("nisn")}>
                            NISN {sortLabel("nisn")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("asal_sekolah")}>
                            Asal Sekolah {sortLabel("asal_sekolah")}
                          </SortableTh>

                          <th className="px-4 py-3 text-left">
                            No HP Orang Tua
                          </th>

                          <SortableTh onClick={() => handleSort("pembayaran")}>
                            Pembayaran {sortLabel("pembayaran")}
                          </SortableTh>

                          <SortableTh
                            onClick={() => handleSort("minat_jurusan1")}
                          >
                            Minat Jurusan {sortLabel("minat_jurusan1")}
                          </SortableTh>

                          <SortableTh onClick={() => handleSort("kelas")}>
                            Kelas {sortLabel("kelas")}
                          </SortableTh>

                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedSiswa.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              Data tidak ditemukan
                            </td>
                          </tr>
                        ) : (
                          paginatedSiswa.map((item) => {
                            const totalPpdb = hitungPpdb(item)
                            const biayaPpdb = master?.ppdb || 0
                            const daftar = sudahDaftar(item)
                            const lunas = isLunas(item)

                            return (
                              <tr
                                key={item.id_siswa}
                                className="border-b last:border-0 hover:bg-slate-50"
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id_siswa)}
                                    onChange={() => toggleOne(item.id_siswa)}
                                  />
                                </td>

                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800">
                                    {item.nama_lengkap || "-"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.no_hp || "-"}
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  {isNisnValid(item.nisn) ? (
                                    <span>{item.nisn}</span>
                                  ) : (
                                    <span
                                      title={
                                        item.nisn
                                          ? "NISN tidak valid (harus 10 digit angka)"
                                          : "NISN kosong"
                                      }
                                      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700"
                                    >
                                      <AlertTriangle size={12} />
                                      {item.nisn || "Kosong"}
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {item.asal_sekolah || "-"}
                                </td>

                                <td className="px-4 py-3">
                                  {item.no_hp_ortu || "-"}
                                </td>

                                <td className="px-4 py-3">
                                  {!daftar ? (
                                    <button
                                      onClick={() => openBayar(item)}
                                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                    >
                                      Daftar
                                    </button>
                                  ) : item.bayar_daftar === "l" ? (
                                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                      Mengundurkan Diri
                                    </span>
                                  ) : lunas ? (
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                      Lunas
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => openBayar(item)}
                                      className="rounded-lg bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-200"
                                    >
                                      {rupiah(totalPpdb)} / {rupiah(biayaPpdb)}
                                    </button>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {item.minat_jurusan1 && (
                                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                        {item.minat_jurusan1}
                                      </span>
                                    )}

                                    {item.minat_jurusan2 && (
                                      <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700">
                                        {item.minat_jurusan2}
                                      </span>
                                    )}

                                    {!item.minat_jurusan1 &&
                                      !item.minat_jurusan2 &&
                                      "-"}
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  {getKelasSiswa(item.siswa_baru)}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                                    <button
                                      onClick={() => openKelas(item)}
                                      title="Masuk kelas"
                                      className="border-r px-3 py-2 text-indigo-600 hover:bg-indigo-50"
                                    >
                                      <Users size={16} />
                                    </button>

                                    <button
                                      onClick={() => openEdit(item)}
                                      title="Edit siswa"
                                      className="border-r px-3 py-2 text-amber-600 hover:bg-amber-50"
                                    >
                                      <Edit size={16} />
                                    </button>

                                    <button
                                      onClick={() => openHapus(item)}
                                      title="Hapus / Mengundurkan diri"
                                      className="px-3 py-2 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Menampilkan{" "}
                      <b>
                        {sortedSiswa.length === 0
                          ? 0
                          : (page - 1) * PAGE_SIZE + 1}
                      </b>{" "}
                      -{" "}
                      <b>{Math.min(page * PAGE_SIZE, sortedSiswa.length)}</b>{" "}
                      dari <b>{sortedSiswa.length}</b> data
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

      {modalBayar && selectedSiswa && master && (
        <ModalBayar
          siswa={selectedSiswa}
          master={master}
          totalPpdb={hitungPpdb(selectedSiswa)}
          sudahDaftar={sudahDaftar(selectedSiswa)}
          onClose={() => setModalBayar(false)}
          onSuccess={() => {
            setModalBayar(false)
            fetchData()
          }}
        />
      )}

      {modalKelas && selectedSiswa && (
        <ModalKelas
          siswa={selectedSiswa}
          kelas={kelas}
          onClose={() => setModalKelas(false)}
          onSuccess={() => {
            setModalKelas(false)
            fetchData()
          }}
        />
      )}

      {modalEdit && selectedSiswa && (
        <ModalEdit
          siswa={selectedSiswa}
          onClose={() => setModalEdit(false)}
          onSuccess={() => {
            setModalEdit(false)
            fetchData()
          }}
        />
      )}

      {modalHapus && selectedSiswa && master && (
        <ModalHapus
          siswa={selectedSiswa}
          master={master}
          onClose={() => setModalHapus(false)}
          onSuccess={() => {
            setModalHapus(false)
            fetchData()
          }}
        />
      )}
    </ProtectedRoute>
  )
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-800">{value}</h2>
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

function ModalBayar({
  siswa,
  master,
  totalPpdb,
  sudahDaftar,
  onClose,
  onSuccess,
}: {
  siswa: SiswaPpdb
  master: MasterPpdb
  totalPpdb: number
  sudahDaftar: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const jenis: "d" | "p" = sudahDaftar ? "p" : "d"

  const [nominal, setNominal] = useState(
    sudahDaftar ? Math.max(master.ppdb - totalPpdb, 0) : master.daftar
  )
  const [bayar, setBayar] = useState<"csh" | "trf" | "sbs">("csh")
  const [petugas, setPetugas] = useState("")
  const [bukti, setBukti] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!petugas.trim()) {
      Swal.fire("Petugas wajib diisi", "Masukkan nama petugas pembayaran.", "warning")
      return
    }

    try {
      setLoading(true)

      const token = localStorage.getItem("token_ppdb")

      const formData = new FormData()
      formData.append("id_siswa", siswa.id_siswa)
      formData.append("nominal", String(nominal))
      formData.append("bayar", bayar)
      formData.append("petugas", petugas)

      if (bukti) {
        formData.append("bukti", bukti)
      }

      const endpoint = jenis === "d" ? "/ppdb/bayardaftar" : "/ppdb/bayarppdb"

      const res = await fetch(`${API_PPDB}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || json.error || "Gagal menyimpan pembayaran", "error")
        return
      }

      if (jenis === "d" && siswa.no_hp) {
  const idLog =
    json?.data?.id_log ||
    json?.id_log ||
    ""

//   const pesanWa = `
// Halo ${siswa.nama_lengkap}

// Pendaftaran PPDB berhasil ✅

// Bukti Bayar:
// https://sakuci.id/${idLog}/ppdbLog

// Silahkan akses link berikut untuk bergabung di grup Gelombang 2 SPMB SMK Sangkuriang 1 Cimahi

// https://chat.whatsapp.com/CPaKRKAOkcL3oAeeP1Q8VA

// Note:
// Diharapkan untuk tidak menyebarkan link tersebut ke pihak manapun.

// Terima Kasih

// Panitia SPMB SMK Sangkuriang 1 Cimahi

// Note:
// Jika link tidak bisa diklik, silakan simpan terlebih dahulu nomor ini.
// `

//   try {
//     await fetch(`${API_WA}/notifuser`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         nomor: siswa.no_hp,
//         pesan: pesanWa,
//       }),
//     })
//   } catch (err) {
//     console.error("WA gagal dikirim", err)
//   }
}

      await Swal.fire({
        title: "Berhasil",
        text:
          jenis === "d"
            ? "Pembayaran daftar berhasil disimpan"
            : "Pembayaran PPDB berhasil disimpan",
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
      title={
        jenis === "d"
          ? `Bayar Daftar - ${siswa.nama_lengkap}`
          : `Bayar PPDB - ${siswa.nama_lengkap}`
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-800">
            {jenis === "d" ? "Pembayaran Daftar" : "Pembayaran PPDB"}
          </p>

          <p className="text-slate-500">
            {jenis === "d"
              ? "Siswa harus membayar daftar terlebih dahulu sebelum bisa membayar PPDB."
              : `Sudah bayar PPDB: ${rupiah(totalPpdb)} dari ${rupiah(master.ppdb)}`}
          </p>
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
          <label className="mb-1 block text-sm text-slate-600">Petugas</label>
          <input
            value={petugas}
            onChange={(e) => setPetugas(e.target.value)}
            placeholder="Contoh: IB"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Metode Bayar
          </label>
          <select
            value={bayar}
            onChange={(e) => setBayar(e.target.value as "csh" | "trf" | "sbs")}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="csh">Cash</option>
            <option value="trf">Transfer</option>
            <option value="sbs">Subsidi</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Upload Bukti
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setBukti(e.target.files?.[0] || null)}
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading || nominal <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <CreditCard size={16} />
          {loading ? "Menyimpan..." : "Simpan Pembayaran"}
        </button>
      </div>
    </Modal>
  )
}

function ModalKelas({
  siswa,
  kelas,
  onClose,
  onSuccess,
}: {
  siswa: SiswaPpdb
  kelas: KelasPpdb[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [idKelas, setIdKelas] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    try {
      setLoading(true)

      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(`${API_PPDB}/ppdb/postkelas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_siswa: siswa.id_siswa,
          id_kelas: idKelas,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal memasukkan kelas", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Kelas berhasil disimpan",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Masuk Kelas - ${siswa.nama_lengkap}`} onClose={onClose}>
      <div className="space-y-4">
        <select
          value={idKelas}
          onChange={(e) => setIdKelas(e.target.value)}
          className="w-full rounded-xl border px-4 py-2"
        >
          <option value="">Pilih kelas</option>
          {kelas.map((item) => (
            <option key={item.id_kelas} value={item.id_kelas}>
              {item.nama_kelas}
            </option>
          ))}
        </select>

        <button
          onClick={submit}
          disabled={loading || !idKelas}
          className="w-full rounded-xl bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan Kelas"}
        </button>
      </div>
    </Modal>
  )
}

const LABEL_EDIT_SISWA: Record<string, string> = {
  nama_lengkap: "Nama Lengkap",
  tempat_lahir: "Tempat Lahir",
  tanggal_lahir: "Tanggal Lahir",
  jenkel: "Jenis Kelamin",
  agama: "Agama",
  alamat: "Alamat",
  nisn: "NISN",
  nik_siswa: "NIK Siswa",
  nama_ayah: "Nama Ayah",
  nama_ibu: "Nama Ibu",
  asal_sekolah: "Asal Sekolah",
  minat_jurusan1: "Minat Jurusan 1",
  minat_jurusan2: "Minat Jurusan 2",
  no_hp: "No HP Siswa",
  no_hp_ortu: "No HP Orang Tua",
}

function ModalEdit({
  siswa,
  onClose,
  onSuccess,
}: {
  siswa: SiswaPpdb
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    id_siswa: siswa.id_siswa,
    nama_lengkap: siswa.nama_lengkap || "",
    tempat_lahir: siswa.tempat_lahir || "",
    tanggal_lahir: siswa.tanggal_lahir || "",
    jenkel: siswa.jenkel || "",
    agama: siswa.agama || "",
    alamat: siswa.alamat || "",
    nisn: siswa.nisn || "",
    nik_siswa: siswa.nik_siswa || "",
    nama_ayah: siswa.nama_ayah || "",
    nama_ibu: siswa.nama_ibu || "",
    asal_sekolah: siswa.asal_sekolah || "",
    minat_jurusan1: siswa.minat_jurusan1 || "",
    minat_jurusan2: siswa.minat_jurusan2 || "",
    no_hp: siswa.no_hp || "",
    no_hp_ortu: siswa.no_hp_ortu || "",
  })

  const submit = async () => {
    const token = localStorage.getItem("token_ppdb")

    const res = await fetch(`${API_PPDB}/ppdb/updatesiswa`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok) {
      Swal.fire("Gagal", json.message || "Gagal update siswa", "error")
      return
    }

    await Swal.fire({
      title: "Berhasil",
      text: "Data siswa berhasil diperbarui",
      icon: "success",
      timer: 1200,
      showConfirmButton: false,
    })

    onSuccess()
  }

  return (
    <Modal title={`Edit Siswa - ${siswa.nama_lengkap}`} onClose={onClose}>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        {Object.entries(form)
          .filter(([key]) => key !== "id_siswa")
          .map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-sm text-slate-600">
                {LABEL_EDIT_SISWA[key] || key}
              </label>
              <input
                value={value}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]: e.target.value,
                  })
                }
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>
          ))}

        <button
          onClick={submit}
          className="w-full rounded-xl bg-amber-500 py-2 font-semibold text-white hover:bg-amber-600"
        >
          Update Siswa
        </button>
      </div>
    </Modal>
  )
}

function ModalHapus({
  siswa,
  master,
  onClose,
  onSuccess,
}: {
  siswa: SiswaPpdb
  master: MasterPpdb
  onClose: () => void
  onSuccess: () => void
}) {
  const [kode, setKode] = useState("")
  const [loading, setLoading] = useState(false)

  const validasiKode = () => {
    if (kode !== master.kode_akses) {
      Swal.fire("Kode Salah", "Kode akses yang dimasukkan tidak sesuai.", "error")
      return false
    }

    return true
  }

  const mengundurkanDiri = async () => {
    if (!validasiKode()) return

    const confirm = await Swal.fire({
      title: "Mengundurkan Diri?",
      text: `Data ${siswa.nama_lengkap} akan ditandai mengundurkan diri.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Undurkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ea580c",
      cancelButtonColor: "#64748b",
    })

    if (!confirm.isConfirmed) return

    try {
      setLoading(true)

      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(`${API_PPDB}/ppdb/undursiswa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_siswa: siswa.id_siswa,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal mengundurkan siswa", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Siswa berhasil ditandai mengundurkan diri",
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

  const hapusPermanen = async () => {
    if (!validasiKode()) return

    const confirm = await Swal.fire({
      title: "Hapus Permanen?",
      text: `Data ${siswa.nama_lengkap} akan dihapus permanen.`,
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

      const res = await fetch(`${API_PPDB}/ppdb/deletesiswa`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_siswa: siswa.id_siswa,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal hapus siswa", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Data siswa berhasil dihapus",
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
    <Modal title={`Kelola Status - ${siswa.nama_lengkap}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Masukkan kode akses master PPDB, lalu pilih aksi.
        </p>

        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="Kode akses"
          className="w-full rounded-xl border px-4 py-2"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={mengundurkanDiri}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            <UserX size={16} />
            Mengundurkan Diri
          </button>

          <button
            onClick={hapusPermanen}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 size={16} />
            Hapus Permanen
          </button>
        </div>
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