import { useEffect, useState } from 'react';

let politeListeners: Array<(msg: string) => void> = [];
let assertiveListeners: Array<(msg: string) => void> = [];

export function announceMessage(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const listeners = priority === 'assertive' ? assertiveListeners : politeListeners;
  for (const listener of listeners) {
    listener(message);
  }
}

export function LiveRegion() {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  useEffect(() => {
    const politeHandler = (msg: string) => {
      setPoliteMessage('');
      // Force re-render so screen readers pick up the new text
      requestAnimationFrame(() => setPoliteMessage(msg));
    };

    const assertiveHandler = (msg: string) => {
      setAssertiveMessage('');
      requestAnimationFrame(() => setAssertiveMessage(msg));
    };

    politeListeners.push(politeHandler);
    assertiveListeners.push(assertiveHandler);

    return () => {
      politeListeners = politeListeners.filter((l) => l !== politeHandler);
      assertiveListeners = assertiveListeners.filter((l) => l !== assertiveHandler);
    };
  }, []);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </>
  );
}
