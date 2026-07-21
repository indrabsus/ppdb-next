import { logout } from "@/lib/auth"

export const API_URL = process.env.NEXT_PUBLIC_API_URL

// Token expired/invalid: backend membalas 401 - langsung logout & lempar ke
// login daripada membiarkan user terjebak di halaman yang terus gagal fetch.
// Dipakai juga oleh pemanggilan fetch() langsung (bukan lewat apiFetch) yang
// masih banyak dipakai di app ini.
export const handleUnauthorized = (res: Response) => {
  if (res.status === 401 && typeof window !== "undefined") {
    logout()
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
    return true
  }
  return false
}

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token_ppdb")
      : null

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    handleUnauthorized(res)
    throw new Error(data?.message || "Terjadi kesalahan")
  }

  return data
}
