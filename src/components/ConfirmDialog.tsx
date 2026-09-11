import { useEffect, useId, useRef } from 'react';

const spinnerClass =
  'inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const headingId = useId();
  const bodyId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-[toast-in_0.15s_ease]"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-[#241c33] p-6 shadow-2xl shadow-black/50 animate-[card-in_0.2s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <h2 id={headingId} className="m-0 mb-2 text-lg font-semibold text-[#f0eaf8]">
          {title}
        </h2>
        <p id={bodyId} className="m-0 text-sm text-[#f0eaf8]/70">
          {message}
        </p>

        {error && (
          <p
            className="mt-3 rounded-lg border border-[#e07a7a]/35 bg-[#e07a7a]/12 px-3 py-2 text-sm text-[#e07a7a]"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm text-[#c8b8e8] transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
              destructive
                ? 'bg-[#e07a7a] hover:bg-[#e58f8f]'
                : 'bg-[#c8a96e] hover:bg-[#d9bc82] text-[#1a1525]'
            }`}
          >
            {loading && <span className={spinnerClass} aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
