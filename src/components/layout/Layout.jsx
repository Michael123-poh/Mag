import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function Layout() {
  return (
    <div className="flex h-screen gap-5 bg-white p-5 text-gaia-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
