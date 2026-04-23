import { AuthProvider } from '@/context/AuthContext'
import { SiteProvider, SiteSync } from '@/context/SiteContext'
import { AppRouter } from '@/router'

export default function App() {
  return (
    <AuthProvider>
      <SiteProvider initialSiteId="tampa">
        <SiteSync />
        <AppRouter />
      </SiteProvider>
    </AuthProvider>
  )
}
