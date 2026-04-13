import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function Button({ 
  children, 
  onClick, 
  className,
  variant = 'primary',
  type = 'button',
  fullWidth = false,
  disabled = false,
  size = 'md'
}: { 
  children: ReactNode, 
  onClick?: () => void, 
  className?: string,
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'secondary',
  type?: 'button' | 'submit' | 'reset',
  fullWidth?: boolean,
  disabled?: boolean,
  size?: 'sm' | 'md' | 'lg'
}) {
  const baseStyles = "px-5 py-2.5 font-semibold transition-all duration-300 rounded-none hover:rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center gap-2 text-sm shadow-sm"
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  }
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md border border-transparent",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 border border-transparent",
    outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-none border border-transparent",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-100"
  }

  return (
    <motion.button
      type={type}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, sizes[size], variants[variant], fullWidth && "w-full", disabled && "opacity-50 cursor-not-allowed", className)}
    >
      {children}
    </motion.button>
  )
}
