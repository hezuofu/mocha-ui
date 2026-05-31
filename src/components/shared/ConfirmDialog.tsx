import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(7,12,19,.62)', backdropFilter: 'blur(6px)', padding: 24,
    }} onClick={onCancel}>
      <div style={{
        width: 'min(460px, 100%)', background: 'var(--surface)', border: '1px solid var(--accent-bg-strong)',
        borderRadius: 18, boxShadow: '0 18px 60px rgba(0,0,0,.45)', padding: '18px 18px 16px', color: 'var(--text)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.01em' }}>{title}</div>
          <button onClick={onCancel} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
            border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--muted)',
            cursor: 'pointer', transition: 'background .15s',
          }}>✕</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none',
            background: danger ? 'var(--error)' : 'var(--accent)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
