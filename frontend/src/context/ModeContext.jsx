import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getModes } from '../api/client';

const STORAGE_KEY = 'spam-mode';
const ModeContext = createContext(null);

/** Shown only when /api/modes cannot be reached at all. */
const UNAVAILABLE = [
  { mode: 'sms', label: 'SMS', available: false, trained: false, error: 'Mode status unavailable.' },
  { mode: 'email', label: 'Email', available: false, trained: false, error: 'Mode status unavailable.' },
];

function readStoredMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'email' ? 'email' : 'sms';
  } catch (error) {
    return 'sms';
  }
}

/**
 * Holds the selected mode (persisted in localStorage) and the backend
 * availability of each mode, so the switch can disable a broken mode.
 */
export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getModes()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.modes) && data.modes.length > 0 ? data.modes : UNAVAILABLE;
        setStatuses(list);
        setModeState((current) => {
          const currentStatus = list.find((item) => item.mode === current);
          if (currentStatus?.available) return current;
          const firstAvailable = list.find((item) => item.available)?.mode;
          return firstAvailable || data?.default || current;
        });
      })
      .catch((err) => {
        if (!active) return;
        setStatuses(UNAVAILABLE);
        setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const setMode = useCallback((next) => {
    if (next !== 'sms' && next !== 'email') return;
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      /* Storage may be blocked; the in-memory mode still works. */
    }
  }, []);

  const getStatus = useCallback(
    (candidate) =>
      statuses.find((item) => item.mode === candidate) ||
      UNAVAILABLE.find((item) => item.mode === candidate) ||
      UNAVAILABLE[0],
    [statuses],
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      statuses,
      getStatus,
      loading,
      error,
      refresh: () => setReloadToken((token) => token + 1),
    }),
    [mode, setMode, statuses, getStatus, loading, error],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used inside a ModeProvider.');
  }
  return context;
}

export default ModeContext;
