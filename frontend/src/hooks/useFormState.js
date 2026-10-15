import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Set a value at a dotted path immutably: setIn(obj, 'a.b.0.c', v). */
export function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : String(path).split('.');
  const [head, ...rest] = keys;
  const base = obj ?? (/^\d+$/.test(head) ? [] : {});
  const copy = Array.isArray(base) ? [...base] : { ...base };
  copy[head] = rest.length ? setIn(base[head], rest, value) : value;
  return copy;
}

export function getIn(obj, path) {
  return String(path)
    .split('.')
    .reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

/**
 * Editable form state with dirty tracking and "unsaved changes" warning.
 * reset(next) replaces both the value and the saved baseline.
 */
export function useFormState(initial) {
  const [value, setValue] = useState(initial);
  const baseline = useRef(JSON.stringify(initial));
  const [baselineVersion, setBaselineVersion] = useState(0);

  const set = useCallback((path, v) => setValue((cur) => setIn(cur, path, typeof v === 'function' ? v(getIn(cur, path)) : v)), []);
  const patch = useCallback((obj) => setValue((cur) => ({ ...cur, ...obj })), []);
  const reset = useCallback((next) => {
    baseline.current = JSON.stringify(next);
    setValue(next);
    setBaselineVersion((n) => n + 1);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => JSON.stringify(value) !== baseline.current, [value, baselineVersion]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return { value, set, patch, reset, dirty, setValue };
}

/** Bind helper for <Input>: {...bind('title')} */
export const binder = (form, errors = {}) => (path) => ({
  value: getIn(form.value, path) ?? '',
  onChange: (e) => form.set(path, e?.target ? (e.target.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value) : e),
  error: errors[path],
});
