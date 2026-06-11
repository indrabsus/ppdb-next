"use client"

import { useEffect } from "react"
import NProgress from "nprogress"
import { usePathname, useSearchParams } from "next/navigation"

import "nprogress/nprogress.css"

export default function TopLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 100,
    })
  }, [])

  return null
}