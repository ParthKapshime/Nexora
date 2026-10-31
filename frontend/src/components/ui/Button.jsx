import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils.js'

const buttonStyles = cva('button', {
  variants: {
    variant: { primary: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost', danger: 'button-danger' },
    size: { default: 'button-default', sm: 'button-small', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

export function Button({ asChild = false, variant, size, className, ...props }) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonStyles({ variant, size }), className)} {...props} />
}
