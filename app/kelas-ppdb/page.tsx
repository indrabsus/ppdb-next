"use client"

import { useEffect, useMemo, useState } from "react"
import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"
import Swal from "sweetalert2"
import {
  Edit,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"

const API_PPDB = process.env.NEXT_PUBLIC_API_URL

type JurusanPpdb = {
  id_jurusan: string
  nama_jurusan: string
  id_ppdb?: string
  master_ppdb?: {
    id_ppdb: string
    tahun: number
  }
}

type KelasPpdb = {
  id_kelas: string
  tingkat: number | null
  nama_kelas: string
  id_jurusan: string
  max: number
  jurusan_ppdb?: {
    id_jurusan?: string
    nama_jurusan?: string
  }
}

type SiswaKelas = {
  id_siswa_baru: string
  id_siswa: string
  id_kelas: string
  siswa_ppdb?: {
    id_siswa: string
    nama_lengkap: string | null
    asal_sekolah: string | null
    no_hp: string | null
    minat_jurusan1: string | null
    minat_jurusan2: string | null
  }
  kelas_ppdb?: KelasPpdb
}

export default function KelasPpdbPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [kelas, setKelas] = useState<KelasPpdb[]>([])
  const [jurusan, setJurusan] = useState<JurusanPpdb[]>([])
  const [jumlahSiswa, setJumlahSiswa] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [modalSiswa, setModalSiswa] = useState(false)
  const [selectedKelas, setSelectedKelas] = useState<KelasPpdb | null>(null)
  const [siswaKelas, setSiswaKelas] = useState<SiswaKelas[]>([])
  const [loadingSiswa, setLoadingSiswa] = useState(false)

  const [modalFormKelas, setModalFormKelas] = useState(false)
  const [modeForm, setModeForm] = useState<"tambah" | "edit">("tambah")
  const [kelasEdit, setKelasEdit] = useState<KelasPpdb | null>(null)

  const fetchKelas = async () => {
    try {
      setLoading(true)

      const tahunAktif =
        Number(localStorage.getItem("tahun_ppdb")) || new Date().getFullYear()

      setTahun(tahunAktif)

      const token = localStorage.getItem("token_ppdb")

      const [kelasRes, jurusanRes] = await Promise.all([
        fetch(`${API_PPDB}/ppdb/kelas?tahun=${tahunAktif}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_PPDB}/ppdb/jurusan`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ])

      const kelasJson = await kelasRes.json()
      const jurusanJson = await jurusanRes.json()

      if (!kelasRes.ok) {
        Swal.fire("Gagal", kelasJson.message || "Gagal mengambil kelas", "error")
        return
      }

      if (!jurusanRes.ok) {
        Swal.fire("Gagal", jurusanJson.message || "Gagal mengambil jurusan", "error")
        return
      }

      const dataKelas: KelasPpdb[] = Array.isArray(kelasJson.data)
        ? kelasJson.data
        : []

      const dataJurusan: JurusanPpdb[] = Array.isArray(jurusanJson.data)
        ? jurusanJson.data
        : []

      const jurusanTahunAktif = dataJurusan.filter((item) => {
        if (!item.master_ppdb?.tahun) return true
        return Number(item.master_ppdb.tahun) === tahunAktif
      })

      setKelas(dataKelas)
      setJurusan(jurusanTahunAktif)

      const result: Record<string, number> = {}

      await Promise.all(
        dataKelas.map(async (item) => {
          const countRes = await fetch(
            `${API_PPDB}/ppdb/hitungsiswa/${item.id_kelas}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          const countJson = await countRes.json()
          result[item.id_kelas] = Number(countJson.data || 0)
        })
      )

      setJumlahSiswa(result)
    } catch (error: any) {
      Swal.fire("Error", error.message || "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKelas()
  }, [])

  const filteredKelas = useMemo(() => {
    const keyword = search.toLowerCase()

    return kelas.filter((item) => {
      return (
        item.nama_kelas.toLowerCase().includes(keyword) ||
        item.jurusan_ppdb?.nama_jurusan?.toLowerCase().includes(keyword)
      )
    })
  }, [kelas, search])

  const openSiswaKelas = async (item: KelasPpdb) => {
    try {
      setSelectedKelas(item)
      setModalSiswa(true)
      setLoadingSiswa(true)

      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(
        `${API_PPDB}/ppdb/siswakelas/${tahun}/${item.id_kelas}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal mengambil siswa kelas", "error")
        return
      }

      setSiswaKelas(Array.isArray(json.data) ? json.data : [])
    } catch (error: any) {
      Swal.fire("Error", error.message || "Terjadi kesalahan", "error")
    } finally {
      setLoadingSiswa(false)
    }
  }

  const openTambahKelas = () => {
    setModeForm("tambah")
    setKelasEdit(null)
    setModalFormKelas(true)
  }

  const openEditKelas = (item: KelasPpdb) => {
    setModeForm("edit")
    setKelasEdit(item)
    setModalFormKelas(true)
  }

  const deleteKelas = async (item: KelasPpdb) => {
    const confirm = await Swal.fire({
      title: "Hapus Kelas?",
      text: `Kelas ${item.nama_kelas} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    })

    if (!confirm.isConfirmed) return

    try {
      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(`${API_PPDB}/ppdb/deletekelas/${item.id_kelas}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal menghapus kelas", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Kelas berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchKelas()
    } catch (error: any) {
      Swal.fire("Error", error.message || "Terjadi kesalahan", "error")
    }
  }

  const hapusSiswaDariKelas = async (id_siswa: string) => {
    const confirm = await Swal.fire({
      title: "Hapus dari kelas?",
      text: "Siswa hanya dihapus dari kelas, bukan dihapus dari data PPDB.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    })

    if (!confirm.isConfirmed) return

    try {
      const token = localStorage.getItem("token_ppdb")

      const res = await fetch(`${API_PPDB}/ppdb/deletekelassiswa/${id_siswa}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire(
          "Gagal",
          json.message || "Gagal menghapus siswa dari kelas",
          "error"
        )
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Siswa berhasil dihapus dari kelas",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      if (selectedKelas) {
        openSiswaKelas(selectedKelas)
      }

      fetchKelas()
    } catch (error: any) {
      Swal.fire("Error", error.message || "Terjadi kesalahan", "error")
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="flex-1">
          <AppHeader />

          <main className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Kelas PPDB {tahun}
                </h1>
                <p className="text-sm text-slate-500">
                  Kelola kelas, jumlah siswa, kapasitas, dan siswa per kelas.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kelas..."
                  autoComplete="off"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                />

                <button
                  onClick={openTambahKelas}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Tambah
                </button>
              </div>
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoCard title="Total Kelas" value={String(kelas.length)} />

              <InfoCard
                title="Total Siswa Masuk Kelas"
                value={String(
                  Object.values(jumlahSiswa).reduce((a, b) => a + b, 0)
                )}
              />

              <InfoCard
                title="Total Kapasitas"
                value={String(kelas.reduce((sum, item) => sum + item.max, 0))}
              />

              <InfoCard
                title="Sisa Kuota"
                value={String(
                  kelas.reduce((sum, item) => {
                    const isi = jumlahSiswa[item.id_kelas] || 0
                    return sum + Math.max(item.max - isi, 0)
                  }, 0)
                )}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
                  <Loader2 className="animate-spin" size={22} />
                  Memuat kelas...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Nama Kelas</th>
                        <th className="px-4 py-3 text-left">Jurusan</th>
                        <th className="px-4 py-3 text-center">Jumlah Siswa</th>
                        <th className="px-4 py-3 text-center">Maksimal</th>
                        <th className="px-4 py-3 text-center">Sisa</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredKelas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            Data kelas tidak ditemukan
                          </td>
                        </tr>
                      ) : (
                        filteredKelas.map((item) => {
                          const isi = jumlahSiswa[item.id_kelas] || 0
                          const sisa = Math.max(item.max - isi, 0)
                          const penuh = isi >= item.max

                          return (
                            <tr
                              key={item.id_kelas}
                              className="border-b last:border-0 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">
                                  {item.nama_kelas}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Tingkat {item.tingkat || "-"}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                {item.jurusan_ppdb?.nama_jurusan || "-"}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    penuh
                                      ? "bg-red-100 text-red-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {isi}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                {item.max}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {sisa}
                              </td>

                              <td className="px-4 py-3">
                                <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                                  <button
                                    onClick={() => openSiswaKelas(item)}
                                    title="Lihat siswa"
                                    className="border-r px-3 py-2 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Eye size={16} />
                                  </button>

                                  <button
                                    onClick={() => openEditKelas(item)}
                                    title="Edit kelas"
                                    className="border-r px-3 py-2 text-amber-600 hover:bg-amber-50"
                                  >
                                    <Edit size={16} />
                                  </button>

                                  <button
                                    onClick={() => deleteKelas(item)}
                                    title="Hapus kelas"
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
              )}
            </section>
          </main>
        </div>
      </div>

      {modalSiswa && selectedKelas && (
        <Modal
          title={`Siswa Kelas ${selectedKelas.nama_kelas}`}
          onClose={() => setModalSiswa(false)}
        >
          {loadingSiswa ? (
            <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
              <Loader2 className="animate-spin" size={22} />
              Memuat siswa...
            </div>
          ) : siswaKelas.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              Belum ada siswa di kelas ini.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">Asal Sekolah</th>
                    <th className="px-3 py-2 text-left">Jurusan</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {siswaKelas.map((item) => (
                    <tr key={item.id_siswa_baru} className="border-b">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">
                          {item.siswa_ppdb?.nama_lengkap || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.siswa_ppdb?.no_hp || "-"}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        {item.siswa_ppdb?.asal_sekolah || "-"}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {item.siswa_ppdb?.minat_jurusan1 && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                              {item.siswa_ppdb.minat_jurusan1}
                            </span>
                          )}

                          {item.siswa_ppdb?.minat_jurusan2 && (
                            <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs text-cyan-700">
                              {item.siswa_ppdb.minat_jurusan2}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => hapusSiswaDariKelas(item.id_siswa)}
                          className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
                          title="Hapus dari kelas"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {modalFormKelas && (
        <ModalFormKelas
          mode={modeForm}
          kelas={kelasEdit}
          jurusan={jurusan}
          onClose={() => setModalFormKelas(false)}
          onSuccess={() => {
            setModalFormKelas(false)
            fetchKelas()
          }}
        />
      )}
    </ProtectedRoute>
  )
}

function ModalFormKelas({
  mode,
  kelas,
  jurusan,
  onClose,
  onSuccess,
}: {
  mode: "tambah" | "edit"
  kelas: KelasPpdb | null
  jurusan: JurusanPpdb[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [namaKelas, setNamaKelas] = useState(kelas?.nama_kelas || "")
  const [tingkat, setTingkat] = useState(String(kelas?.tingkat || ""))
  const [max, setMax] = useState(String(kelas?.max || ""))
  const [idJurusan, setIdJurusan] = useState(kelas?.id_jurusan || "")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!namaKelas || !tingkat || !max || !idJurusan) {
      Swal.fire("Belum lengkap", "Semua field wajib diisi.", "warning")
      return
    }

    try {
      setLoading(true)

      const token = localStorage.getItem("token_ppdb")

      const url =
        mode === "tambah"
          ? `${API_PPDB}/ppdb/createkelas`
          : `${API_PPDB}/ppdb/updatekelas/${kelas?.id_kelas}`

      const method = mode === "tambah" ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_kelas: namaKelas,
          tingkat: Number(tingkat),
          max: Number(max),
          id_jurusan: idJurusan,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        Swal.fire("Gagal", json.message || "Gagal menyimpan kelas", "error")
        return
      }

      await Swal.fire({
        title: "Berhasil",
        text:
          mode === "tambah"
            ? "Kelas berhasil ditambahkan"
            : "Kelas berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      onSuccess()
    } catch (error: any) {
      Swal.fire("Error", error.message || "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={mode === "tambah" ? "Tambah Kelas" : "Edit Kelas"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Nama Kelas
          </label>
          <input
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            placeholder="Contoh: X PPLG 1"
            autoComplete="off"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Tingkat
          </label>
          <input
            type="number"
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value)}
            placeholder="Contoh: 10"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Maksimal Siswa
          </label>
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Contoh: 36"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Jurusan
          </label>
          <select
            value={idJurusan}
            onChange={(e) => setIdJurusan(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="">Pilih Jurusan</option>
            {jurusan.map((item) => (
              <option key={item.id_jurusan} value={item.id_jurusan}>
                {item.nama_jurusan}
              </option>
            ))}
          </select>

          {jurusan.length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              Data jurusan kosong. Tambahkan jurusan dulu di master PPDB.
            </p>
          )}
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan Kelas"}
        </button>
      </div>
    </Modal>
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
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
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