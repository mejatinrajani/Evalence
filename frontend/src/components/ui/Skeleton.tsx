// Reusable skeleton block
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

// Skeleton for a stats card
export function StatCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-4 h-4 rounded" />
      </div>
      <Skeleton className="w-20 h-3 rounded" />
      <Skeleton className="w-16 h-7 rounded" />
    </div>
  )
}

// Skeleton for a table row
export function TableRowSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className={`h-4 rounded ${i === 0 ? 'w-36' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  )
}

// Skeleton for an announcement card
export function AnnouncementSkeleton() {
  return (
    <div className="p-4 space-y-2">
      <Skeleton className="w-3/4 h-4 rounded" />
      <Skeleton className="w-full h-3 rounded" />
      <Skeleton className="w-1/2 h-3 rounded" />
    </div>
  )
}
