export const API_URL = process.env.NEXT_PUBLIC_API_URL

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
    throw new Error(data?.message || "Terjadi kesalahan")
  }

  return data
}