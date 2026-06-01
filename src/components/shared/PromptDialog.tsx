import { useEffect, useRef, useCallback } from 'react';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  inputType?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({ open, title, message, placeholder, defaultValue, confirmLabel, inputType, onConfirm, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const submit = useCallback(() => {
    const val = inputRef.current?.value || '';
    onConfirm(val);
  }, [onConfirm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    // Focus input on open
    setTimeout(() => {
      inputRef.current?.focus();
      if (defaultValue) {
        const dot = defaultValue.lastIndexOf('.');
        if (dot > 0) inputRef.current?.setSelectionRange(0, dot);
        else inputRef.current?.select();
      }
    }, 50);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close, defaultValue]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="app-dialog-overlay" id="appDialogOverlay" style={{ display: 'flex' }} aria-hidden="false" onClick={close}>
      <div className="app-dialog" id="appDialog" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogDesc" onClick={e => e.stopPropagation()}>
        <div className="app-dialog-header">
          <div className="app-dialog-title" id="appDialogTitle">{title}</div>
          <button className="app-dialog-close" id="appDialogClose" type="button" aria-label="Close dialog" onClick={close}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {message && <div className="app-dialog-desc" id="appDialogDesc">{message}</div>}
        <input ref={inputRef} className="app-dialog-input" id="appDialogInput" type={inputType || 'text'} placeholder={placeholder || ''} defaultValue={defaultValue || ''} autoComplete="off" spellCheck={false}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <div className="app-dialog-actions">
          <button className="app-dialog-btn" id="appDialogCancel" type="button" onClick={close}>Cancel</button>
          <button className="app-dialog-btn confirm" id="appDialogConfirm" type="button" onClick={submit}>{confirmLabel || 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
