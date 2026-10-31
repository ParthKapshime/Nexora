import { cn } from '../../lib/utils.js'

export function Badge({ tone = 'neutral', className, ...props }) {
  return <span className={cn('badge', `badge-${tone}`, className)} {...props} />
}
