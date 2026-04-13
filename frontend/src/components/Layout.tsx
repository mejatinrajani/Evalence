import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white">
      <Navbar />
      <main className="flex-grow flex flex-col relative w-full">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
    </div>
  )
}
