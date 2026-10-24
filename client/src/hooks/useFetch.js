import { useState, useEffect } from 'react';
import api from '../utils/api';

const useFetch = (url, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    setLoading(true);

    api
      .get(url)
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Error loading resource');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url, ...dependencies]);

  return { data, loading, error, setData };
};

export default useFetch;
