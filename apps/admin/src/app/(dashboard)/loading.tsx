export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 w-32 rounded bg-gray-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="h-6 w-16 rounded bg-gray-200" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 h-5 w-32 rounded bg-gray-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
