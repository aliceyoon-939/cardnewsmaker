import Sidebar from '@/components/Sidebar'
import { SaveProvider } from '@/contexts/SaveContext'

export default function DashboardLayout({ children }) {
  return (
    <SaveProvider>
      <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
        <Sidebar />
        <div className="main">
          <div className="content panel-enter">
            {children}
          </div>
        </div>
      </div>
    </SaveProvider>
  )
}
