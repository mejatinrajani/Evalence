import { PageTransition } from '../../components/PageTransition'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-20 min-h-[80vh]">
        <div className="w-full max-w-md">
          <Link to="/auth/login" className="text-sm font-bold uppercase tracking-wider mb-8 inline-block hover:opacity-60 transition-opacity">
            ← Back to login
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Reset Password</h1>
          <p className="text-neutral-500 font-medium mb-8">Enter your email and we'll send you a recovery link.</p>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider">Email Address</label>
              <Input type="email" placeholder="you@domain.com" />
            </div>

            <Button fullWidth type="submit">Send Reset Link</Button>
          </form>
        </div>
      </div>
    </PageTransition>
  )
}
