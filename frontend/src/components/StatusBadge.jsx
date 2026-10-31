import { Badge } from './ui/Badge.jsx'

const tones = { Applied: 'blue', Screening: 'lavender', Interview: 'peach', Offer: 'green', Rejected: 'muted' }
export function StatusBadge({ status }) { return <Badge tone={tones[status] || 'neutral'}>{status}</Badge> }
