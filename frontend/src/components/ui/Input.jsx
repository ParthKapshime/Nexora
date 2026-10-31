import { forwardRef } from 'react'
import { cn } from '../../lib/utils.js'

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('form-control', className)} {...props} />
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('form-control form-textarea', className)} {...props} />
})
