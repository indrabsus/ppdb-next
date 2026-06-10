export type RoleName = "adminppdb" | "stafppdb"

export type UserLogin = {
  id_user?: number | string
  username: string
  nama_lengkap?: string | null
  role?: RoleName
  nama_role?: RoleName
  roles?: {
    nama_role: RoleName
  }
}