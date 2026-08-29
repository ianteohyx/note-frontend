interface FullScreenLoaderProps {
  /** Screen-reader label for the busy region. */
  label?: string;
}

/**
 * Full-viewport branded loading state, shown while the app resolves auth on
 * startup (silent refresh) so routes don't flash the login page or content
 * before we know whether the user is signed in.
 */
export default function FullScreenLoader({ label = 'Loading' }: FullScreenLoaderProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#1a1525]"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block w-8 h-8 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="text-sm text-[#f0eaf8]/55">{label}…</span>
    </div>
  );
}
