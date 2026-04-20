import { createContext, useContext, useState, type ReactNode } from 'react'

interface SiteContextValue {
  siteId: string
  setActiveSite: (siteId: string) => void
}

const SiteContext = createContext<SiteContextValue | null>(null)

export function SiteProvider({
  children,
  initialSiteId = 'tampa',
}: {
  children: ReactNode
  initialSiteId?: string
}) {
  const [siteId, setSiteId] = useState(initialSiteId)

  return (
    <SiteContext.Provider value={{ siteId, setActiveSite: setSiteId }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSiteContext(): SiteContextValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSiteContext must be used within SiteProvider')
  return ctx
}
