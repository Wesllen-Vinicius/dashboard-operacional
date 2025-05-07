import Skeleton from "./Skeleton";

export default function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md"
        >
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
          </div>
        </li>
      ))}
    </ul>
  );
}
