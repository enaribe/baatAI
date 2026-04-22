interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[rgba(255,255,255,0.04)] ${className}`}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}
