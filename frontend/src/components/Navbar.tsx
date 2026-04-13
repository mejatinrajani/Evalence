import { Link } from 'react-router-dom'
import { Button } from './ui/Button'

export function Navbar() {
  return (
    <nav className="w-full border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
          Evalence
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link to="#features" className="hover:text-slate-900 transition-colors">Features</Link>
          <Link to="#how-it-works" className="hover:text-slate-900 transition-colors">How it Works</Link>
          <Link to="/privacy-policy" className="hover:text-slate-900 transition-colors">Privacy</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/auth/login">
            <Button variant="ghost" className="hidden md:flex text-sm">Sign In</Button>
          </Link>
          <Link to="/auth/register">
            <Button className="text-sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
