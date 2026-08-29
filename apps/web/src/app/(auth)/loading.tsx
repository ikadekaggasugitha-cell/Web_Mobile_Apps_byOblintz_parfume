export default function AuthLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="mx-auto mb-4 h-8 w-32 rounded bg-gray-200" />
        <div className="mx-auto h-4 w-48 rounded bg-gray-200" />
      </div>
    </div>
  );
}
