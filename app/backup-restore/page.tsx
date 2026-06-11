"use client"

import { useState } from "react"
import Swal from "sweetalert2"
import {
  Download,
  Upload,
  Database,
  Loader2,
} from "lucide-react"

import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"

export default function BackupRestorePage() {
  const [file, setFile] = useState<File | null>(null)
  const [loadingBackup, setLoadingBackup] = useState(false)
  const [loadingRestore, setLoadingRestore] = useState(false)

  const tahun =
    typeof window !== "undefined"
      ? localStorage.getItem("tahun_ppdb") ||
        String(new Date().getFullYear())
      : String(new Date().getFullYear())

  const handleBackup = async () => {
    try {
      setLoadingBackup(true)

      const token = localStorage.getItem("token_ppdb")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ppdb/backup/${tahun}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error("Backup gagal")
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)

      const a = document.createElement("a")

      a.href = url
      a.download = `backup-ppdb-${tahun}.json`

      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)

      Swal.fire({
        icon: "success",
        title: "Backup Berhasil",
        text: `Backup PPDB Tahun ${tahun} berhasil didownload`,
      })
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message,
      })
    } finally {
      setLoadingBackup(false)
    }
  }

  const handleRestore = async () => {
    if (!file) {
      Swal.fire({
        icon: "warning",
        title: "Pilih File",
        text: "Silakan pilih file backup JSON terlebih dahulu.",
      })
      return
    }

    const confirm = await Swal.fire({
      title: "Restore Data?",
      text: "Data tahun yang sama akan ditimpa.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya Restore",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    try {
      setLoadingRestore(true)

      const content = await file.text()
      const json = JSON.parse(content)

      const token = localStorage.getItem("token_ppdb")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ppdb/restore`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(json),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message)
      }

      await Swal.fire({
  icon: "success",
  title: "Restore Selesai",
  html: `
    <div style="text-align:left">
      <p>${result.message}</p>
      <hr style="margin:10px 0" />
      <p><b>Data Masuk:</b> ${result.total.inserted}</p>
      <p><b>Data Skip:</b> ${result.total.skipped}</p>
      <p><b>Data Gagal:</b> ${result.total.failed}</p>
    </div>
  `,
})

      setFile(null)
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Restore Gagal",
        text: error.message,
      })
    } finally {
      setLoadingRestore(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="flex-1">
          <AppHeader />

          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">
                Backup & Restore
              </h1>

              <p className="text-sm text-slate-500">
                Backup dan restore data PPDB tahun {tahun}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Database className="text-blue-600" />
                </div>

                <h2 className="mb-2 text-lg font-bold">
                  Backup Data
                </h2>

                <p className="mb-6 text-sm text-slate-500">
                  Download seluruh data PPDB tahun {tahun}
                  dalam format JSON.
                </p>

                <button
                  onClick={handleBackup}
                  disabled={loadingBackup}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingBackup ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Membackup...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Download Backup
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                  <Upload className="text-red-600" />
                </div>

                <h2 className="mb-2 text-lg font-bold">
                  Restore Data
                </h2>

                <p className="mb-4 text-sm text-slate-500">
                  Restore data dari file backup JSON.
                </p>

                <input
                  type="file"
                  accept=".json"
                  onChange={(e) =>
                    setFile(
                      e.target.files?.[0] || null
                    )
                  }
                  className="mb-4 w-full rounded-xl border p-3"
                />

                {file && (
                  <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">
                    {file.name}
                  </div>
                )}

                <button
                  onClick={handleRestore}
                  disabled={!file || loadingRestore}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loadingRestore ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Merestore...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Restore Data
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <b>Perhatian:</b> Restore akan menimpa data
              PPDB pada tahun yang terdapat di file backup.
              Sebaiknya lakukan backup terlebih dahulu
              sebelum restore.
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}