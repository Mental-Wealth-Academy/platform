import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let prevBodyStyle = {
  overflow: '',
  position: '',
  top: '',
  left: '',
  right: '',
  width: '',
};
let prevHtmlOverflow = '';

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    if (lockCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      prevBodyStyle = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
      };
      prevHtmlOverflow = document.documentElement.style.overflow;

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyStyle.overflow;
        document.body.style.position = prevBodyStyle.position;
        document.body.style.top = prevBodyStyle.top;
        document.body.style.left = prevBodyStyle.left;
        document.body.style.right = prevBodyStyle.right;
        document.body.style.width = prevBodyStyle.width;

        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
