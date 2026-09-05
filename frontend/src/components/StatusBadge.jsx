const COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  RUNNING: 'bg-green-100 text-green-700',
  APPROVED: 'bg-green-100 text-green-700',
  PRESENT: 'bg-green-100 text-green-700',
  PAID: 'bg-green-100 text-green-700',
  VALIDATED: 'bg-blue-100 text-blue-700',
  COMPUTED: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-amber-100 text-amber-700',
  LATE: 'bg-amber-100 text-amber-700',
  ON_LEAVE: 'bg-amber-100 text-amber-700',
  MISSING_CHECKOUT: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  INACTIVE: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUSED: 'bg-red-100 text-red-700',
  ABSENT: 'bg-red-100 text-red-700',
  OVERTIME: 'bg-purple-100 text-purple-700',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const cls = COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`badge ${cls}`}>{String(status).replaceAll('_', ' ')}</span>;
}
