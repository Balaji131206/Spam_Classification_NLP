import { useCallback, useEffect, useState } from 'react';
import { getMetrics } from '../api/client';

/** Loads the saved metrics for a mode, with loading/error state and reload. */
export default function useMetrics(mode) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setMetrics(null);

    getMetrics(mode)
      .then((data) => {
        if (active) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mode, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { metrics, dataset: metrics?.dataset ?? null, loading, error, reload };
}
