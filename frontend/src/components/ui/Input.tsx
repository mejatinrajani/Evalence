import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={twMerge(clsx(
        "w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-lg placeholder:text-slate-400 text-sm font-medium transition-all rounded-none hover:rounded-md",
        className
      ))}
      {...props}
    />
  )
})
Input.displayName = 'Input'
