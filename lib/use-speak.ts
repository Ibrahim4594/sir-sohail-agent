'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Tiny singleton wrapper around the browser's speechSynthesis API.
 * Only one utterance can play at a time across the whole page — if a
 * second message asks to speak, the first is cancelled. Components
 * subscribe to an external store so they can render a play/stop state
 * that stays in sync without each instance owning its own timers.
 *
 * Uses speechSynthesis directly (no dependency). Falls back cleanly on
 * browsers that don't expose the API: isSupported returns false and
 * the UI hides the control.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let activeKey: string | null = null;

function notify() {
  for (const l of listeners) l();
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot(): string | null {
  return activeKey;
}

function stop() {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  activeKey = null;
  notify();
}

function speak(key: string, text: string) {
  if (typeof window === 'undefined') return;
  // Always cancel first so stale utterances from a previous message
  // don't chain onto the new one.
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  // Clear active key on both completion and abort so the UI flips
  // back to the idle state. If a new speak() call replaces this one,
  // the cancel above fires our onerror — we only reset the key when
  // the callback is still ours.
  const clearIfOwned = () => {
    if (activeKey === key) {
      activeKey = null;
      notify();
    }
  };
  utterance.onend = clearIfOwned;
  utterance.onerror = clearIfOwned;
  activeKey = key;
  notify();
  window.speechSynthesis.speak(utterance);
}

export function useSpeak(key: string) {
  const active = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const isActive = active === key;

  const toggle = useCallback(
    (text: string) => {
      if (isActive) {
        stop();
      } else {
        speak(key, text);
      }
    },
    [isActive, key],
  );

  // If the component unmounts while its utterance is still playing,
  // cancel — otherwise the voice keeps going after the message is
  // gone, which is disorienting.
  useEffect(() => {
    return () => {
      if (activeKey === key) stop();
    };
  }, [key]);

  return { isActive, toggle };
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
