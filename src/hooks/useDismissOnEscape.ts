import { useEffect } from 'react';

/**
 * Closes an overlay when Escape is pressed.
 *
 * Several dialogs in the app were dismissable only by clicking the backdrop or
 * an X button, which leaves a keyboard user stuck inside them. The listener is
 * attached only while the overlay is open so nested dialogs close innermost
 * first, and it is registered in the capture phase so an input inside the
 * dialog cannot swallow the key.
 */
export function useDismissOnEscape(isOpen: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, onDismiss]);
}
