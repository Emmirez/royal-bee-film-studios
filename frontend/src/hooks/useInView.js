import { useEffect, useRef, useState } from 'react';

/** True once the element has entered the viewport (used for reveal animations and pausing off-screen video). */
export function useInView({ once = true, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once, rootMargin]);
  return [ref, inView];
}
