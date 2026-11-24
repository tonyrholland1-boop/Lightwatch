import { useEffect, useRef } from 'react';

/**
 * Reveal-on-scroll without a runtime animation library.
 *
 * One IntersectionObserver is shared by every caller, so adding sections
 * costs one observer callback — not one observer each. Elements are
 * unobserved as soon as they appear, and the whole feature is skipped when
 * the visitor prefers reduced motion or the browser lacks the API.
 */
let sharedObserver = null;
const registry = new WeakMap();

/**
 * Tell CSS that JS is alive before anything is hidden. If this never runs,
 * `.js-motion` is absent and no section is ever set to opacity: 0.
 */
function markMotionReady() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('js-motion');
}

function getObserver() {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        // Reveal once, then stop paying for it.
        sharedObserver.unobserve(entry.target);
        registry.delete(entry.target);
      }
    },
    {
      // Fire a little before the section is fully in view so the motion
      // finishes as it settles, rather than starting late.
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    },
  );
  return sharedObserver;
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns a ref to attach to any element that should reveal on scroll.
 * Elements already in the viewport on load reveal immediately (the observer
 * fires on the first pass), so above-the-fold content is never hidden.
 */
export function useRevealOnScroll({ enabled = true } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (enabled) markMotionReady();
    const node = ref.current;
    if (!node || !enabled) return undefined;

    // Graceful degradation: no observer, or motion reduced -> show at once.
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return undefined;
    }

    const observer = getObserver();
    registry.set(node, true);
    observer.observe(node);

    return () => {
      observer.unobserve(node);
      registry.delete(node);
    };
  }, [enabled]);

  return ref;
}

/**
 * Applies the staggered `.rise` classes to a container's direct children on
 * first paint. Using CSS animations (not JS timers) means the stagger keeps
 * running on the compositor even if the main thread is busy.
 */
export function useStagger(selector, { enabled = true } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || prefersReducedMotion()) return undefined;

    const children = Array.from(node.querySelectorAll(selector));
    children.forEach((child, index) => {
      // Cap the stagger so long lists never drift past the 600ms budget.
      const step = Math.min(index, 5);
      child.classList.add('rise', `rise--${step}`);
    });

    return () => {
      children.forEach((child) => {
        for (let step = 0; step <= 5; step += 1) child.classList.remove(`rise--${step}`);
        child.classList.remove('rise');
      });
    };
  }, [selector, enabled]);

  return ref;
}
