import { useLayoutEffect } from 'react';
import './PhonePopupBoundary.css';

// Native dialog top layers and body portals do not inherit the phone's clipping.
// Publish its visible inner rectangle so all resident overlays share that boundary.
export default function PhonePopupBoundary() {
  useLayoutEffect(() => {
    const phone = document.querySelector<HTMLElement>('.phone-app');
    if (!phone) return;
    const root = document.documentElement;
    const keys = ['left','top','right','bottom','width','height','radius'];
    let frame = 0;
    function measure() {
      if (!phone) return;
      const rect = phone.getBoundingClientRect();
      const style = getComputedStyle(phone);
      const scale = phone.offsetWidth ? rect.width / phone.offsetWidth : 1;
      const viewport = window.visualViewport;
      const vx = viewport?.offsetLeft || 0, vy = viewport?.offsetTop || 0;
      const vw = viewport?.width || root.clientWidth, vh = viewport?.height || window.innerHeight;
      const left = Math.max(vx, rect.left + parseFloat(style.borderLeftWidth) * scale);
      const top = Math.max(vy, rect.top + parseFloat(style.borderTopWidth) * scale);
      const right = Math.min(vx + vw, rect.right - parseFloat(style.borderRightWidth) * scale);
      const bottom = Math.min(vy + vh, rect.bottom - parseFloat(style.borderBottomWidth) * scale);
      const values = { left, top, right: root.clientWidth - right, bottom: window.innerHeight - bottom,
        width: Math.max(0,right-left), height: Math.max(0,bottom-top), radius: Math.max(0,parseFloat(style.borderTopLeftRadius)-parseFloat(style.borderLeftWidth)) };
      for (const [key,value] of Object.entries(values)) root.style.setProperty(`--phone-popup-${key}`,`${value}px`);
      root.dataset.phonePopups = 'true';
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
    measure();
    const observer = new ResizeObserver(schedule); observer.observe(phone);
    window.addEventListener('resize',schedule); window.addEventListener('scroll',schedule,true);
    window.visualViewport?.addEventListener('resize',schedule); window.visualViewport?.addEventListener('scroll',schedule);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('resize',schedule); window.removeEventListener('scroll',schedule,true);
      window.visualViewport?.removeEventListener('resize',schedule); window.visualViewport?.removeEventListener('scroll',schedule);
      delete root.dataset.phonePopups;
      keys.forEach(key=>root.style.removeProperty(`--phone-popup-${key}`));
    };
  },[]);
  return null;
}
