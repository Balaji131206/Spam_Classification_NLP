import { useCallback, useState } from 'react';

const STORAGE_KEY = 'spam-history';
const LIMIT = 10;

function readHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.message === 'string').slice(0, LIMIT);
  } catch (error) {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    /* Ignore unavailable storage. */
  }
}

/** Keeps the last ten predictions locally so they survive a refresh. */
export default function useHistory() {
  const [items, setItems] = useState(readHistory);

  const add = useCallback((entry) => {
    setItems((previous) => {
      const next = [
        {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
        },
        ...previous,
      ].slice(0, LIMIT);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, []);

  return { items, add, clear };
}
