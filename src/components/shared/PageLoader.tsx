import { Skeleton } from '@/components/ui/skeleton'

export function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex flex-col gap-4 p-6 w-full"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
