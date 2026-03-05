/**
 * Helper to programmatically trigger element states for inspection/screenshot capture.
 * Simulates hover, focus, active, and disabled states via CSS class injection
 * and dispatching synthetic events.
 */

export type ElementState = 'hover' | 'focus' | 'active' | 'focus-visible' | 'disabled';

/**
 * Trigger a pseudo-state on an element by dispatching synthetic events.
 * Returns a cleanup function to restore the original state.
 */
export function triggerState(el: HTMLElement, state: ElementState): () => void {
  const cleanupFns: (() => void)[] = [];

  switch (state) {
    case 'hover': {
      const enterEvent = new MouseEvent('mouseenter', { bubbles: true, cancelable: true });
      const overEvent = new MouseEvent('mouseover', { bubbles: true, cancelable: true });
      el.dispatchEvent(enterEvent);
      el.dispatchEvent(overEvent);
      cleanupFns.push(() => {
        el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }));
      });
      break;
    }
    case 'focus': {
      el.focus();
      cleanupFns.push(() => el.blur());
      break;
    }
    case 'focus-visible': {
      // Simulate keyboard focus by dispatching a keydown first
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      el.focus();
      cleanupFns.push(() => el.blur());
      break;
    }
    case 'active': {
      const downEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      el.dispatchEvent(downEvent);
      cleanupFns.push(() => {
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      });
      break;
    }
    case 'disabled': {
      const wasDisabled = el.hasAttribute('disabled');
      if (!wasDisabled) {
        el.setAttribute('disabled', '');
        cleanupFns.push(() => el.removeAttribute('disabled'));
      }
      break;
    }
  }

  return () => {
    for (const fn of cleanupFns) {
      try {
        fn();
      } catch {
        // Element may have been removed
      }
    }
  };
}

/**
 * Capture the computed style diff between the default state and a triggered state.
 * Returns only the properties that changed.
 */
export function captureStateDiff(
  el: HTMLElement,
  state: ElementState,
  propertiesToCheck: string[]
): Record<string, string> {
  // Capture base styles
  const baseStyles: Record<string, string> = {};
  const baseComputed = window.getComputedStyle(el);
  for (const prop of propertiesToCheck) {
    baseStyles[prop] = baseComputed.getPropertyValue(prop);
  }

  // Trigger state
  const cleanup = triggerState(el, state);

  // Force a style recalc
  void el.offsetHeight;

  // Capture new styles
  const diff: Record<string, string> = {};
  const newComputed = window.getComputedStyle(el);
  for (const prop of propertiesToCheck) {
    const newValue = newComputed.getPropertyValue(prop);
    if (newValue !== baseStyles[prop]) {
      diff[prop] = newValue;
    }
  }

  // Restore
  cleanup();

  return diff;
}

/**
 * Properties commonly affected by state changes.
 */
export const STATE_SENSITIVE_PROPERTIES = [
  'background-color',
  'color',
  'border-color',
  'box-shadow',
  'outline',
  'outline-color',
  'outline-width',
  'outline-offset',
  'opacity',
  'transform',
  'text-decoration',
  'cursor',
  'border-width',
  'border-style',
  'font-weight',
  'background',
  'scale',
];
