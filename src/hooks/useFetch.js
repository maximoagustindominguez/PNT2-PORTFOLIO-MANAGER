import { useEffect, useState } from 'react';

const useFetch = (url, nombreKey) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.statusText}`);
        }
        
        const data = await response.json();
        const result = nombreKey ? data[nombreKey] : data;
        
        setDatos(result);
        setError(null);
      } catch (err) {
        console.error('Error al consumir el endpoint:', err);
        setError(err.message);
        setDatos(null);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [url, nombreKey]);

  return { datos, error, loading };
};

export default useFetch;

