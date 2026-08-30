export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory">
      <div className="animate-pulse text-center">
        <div className="mx-auto mb-4 h-8 w-32 rounded bg-sand" />
        <div className="mx-auto h-4 w-48 rounded bg-sand" />
      </div>
    </div>
  );
}
