import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ConfirmContext = createContext(null);

/**
 * Custom confirmation dialog (replaces window.confirm).
 * const confirm = useConfirm();
 * if (await confirm({ title, message, confirmLabel, tone: 'danger', typeToConfirm: 'DELETE' })) …
 * With `withComment: true` it resolves to { comment } or false.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [typed, setTyped] = useState('');
  const [comment, setComment] = useState('');
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setTyped('');
    setComment('');
    setState({ confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'default', ...options });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  const blocked =
    (state?.typeToConfirm && typed !== state.typeToConfirm) || (state?.commentRequired && !comment.trim());

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel}
            </Button>
            <Button
              variant={state?.tone === 'danger' ? 'danger' : 'primary'}
              disabled={blocked}
              onClick={() => close(state?.withComment ? { comment: comment.trim() } : true)}
            >
              {state?.confirmLabel}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.tone === 'danger' && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-danger/10 text-status-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="flex-1 space-y-4 text-sm text-app-subtle">
            {state?.message && <p>{state.message}</p>}
            {state?.withComment && (
              <div>
                <label className="field-label" htmlFor="confirm-comment">
                  {state.commentLabel || 'Comment'}
                  {state.commentRequired ? '' : ' (optional)'}
                </label>
                <textarea
                  id="confirm-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-app-accent focus:outline-none"
                />
              </div>
            )}
            {state?.typeToConfirm && (
              <Input
                label={`Type ${state.typeToConfirm} to confirm`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            )}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
