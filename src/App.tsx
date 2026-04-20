import { AuthProvider } from '@/context/AuthContext'
import { SiteProvider } from '@/context/SiteContext'
import { AppRouter } from '@/router'

export default function App() {
  return (
    <AuthProvider>
      <SiteProvider initialSiteId="tampa">
        <AppRouter />
      </SiteProvider>
    </AuthProvider>
  )
}
