import { PageTransition } from '../../components/PageTransition'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Link } from 'react-router-dom'

export default function VerifyOtp() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-20 min-h-[80vh]">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Check Your Email</h1>
          <p className="text-neutral-500 font-medium mb-8">We sent a verification code to your email address.</p>
          
          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Input key={i} type="text" maxLength={1} className="w-16 h-16 text-center text-2xl" placeholder="-" />
              ))}
            </div>

            <Link to="/auth/login" className="block">
              <Button fullWidth type="button">Verify Account</Button>
            </Link>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-neutral-500">
            Didn't receive the code? <button className="text-black font-bold border-b border-black hover:opacity-60 pb-0.5 ml-1">Resend</button>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
