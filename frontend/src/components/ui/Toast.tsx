import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import type { ToastTone } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

const toneConfig: Record<ToastTone, { icon: typeof Info; classes: string }> = {
  neutral: { icon: Info, classes: 'border-border text-text-primary' },
  success: { icon: CheckCircle2, classes: 'border-success/30 text-success' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 text-warning' },
  error: { icon: XCircle, classes: 'border-error/30 text-error' },
};

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const { icon: Icon, classes } = toneConfig[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-surface-elevated px-4 py-3 shadow-soft-lg',
              classes
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="text-sm text-text-primary">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="ml-1 text-text-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
