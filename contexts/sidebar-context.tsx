"use client"

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react"

type SidebarContextType = {
  open: boolean
  setOpen: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
})

export function SidebarProvider({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)