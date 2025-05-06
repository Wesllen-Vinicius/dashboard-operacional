
interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
    className={`animate-pulse rounded-md bg-neutral-800 ${className ?? ''}`}
    />
  )
}
