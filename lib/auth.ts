import { UserLogin } from "@/types/auth"

export const getUserRole = (user: UserLogin | null) => {
  return user?.role || user?.nama_role || user?.roles?.nama_role || null
}

export const saveAuth = (token: string, user: UserLogin) => {
  localStorage.setItem("token_ppdb", token)
  localStorage.setItem("user_ppdb", JSON.stringify(user))
}

export const getToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token_ppdb")
}

export const getUser = (): UserLogin | null => {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem("user_ppdb")
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const logout = () => {
  localStorage.removeItem("token_ppdb")
  localStorage.removeItem("user_ppdb")
}

export const isAllowedPpdb = (user: UserLogin | null) => {
  const role = getUserRole(user)
  return role === "adminppdb" || role === "stafppdb"
}

export const isAdminPpdb = (user: UserLogin | null) => {
  return getUserRole(user) === "adminppdb"
}

export const saveTahunPpdb = (tahun: number) => {
  localStorage.setItem("tahun_ppdb", String(tahun))
}

export const getTahunPpdb = () => {
  if (typeof window === "undefined") return null

  const tahun = localStorage.getItem("tahun_ppdb")

  return tahun ? Number(tahun) : new Date().getFullYear()
}