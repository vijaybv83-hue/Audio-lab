import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(prevHistory => {
      const current = prevHistory[currentIndex];
      // Check if newState is a function, if so apply it to the current state
      const resolvedState = newState instanceof Function ? newState(current) : (newState as T);
      const newHistory = prevHistory.slice(0, currentIndex + 1);
      return [...newHistory, resolvedState];
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
        setCurrentIndex(curr => Math.min(prev.length - 1, curr + 1));
        return prev;
    });
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetSelection = useCallback((newState: T) => {
      setHistory([newState]);
      setCurrentIndex(0);
  }, []);

  return {
    state: history[currentIndex],
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetSelection,
  };
}
