interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-sand-200 dark:bg-sand-800 ${className}`}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  )
}
