import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/public/Navbar'
import { Footer } from '@/components/public/Footer'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}