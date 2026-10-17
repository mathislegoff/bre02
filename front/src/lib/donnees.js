import { useEffect, useState } from 'react';

export async function chargeJSON(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status} (${url})`);
  return r.json();
}

// Octets [debut, fin) d'un fichier binaire, via une requête Range (le fichier entier ferait ~80 Mo)
export async function chargeOctets(url, debut, fin, signal) {
  const r = await fetch(url, { signal, headers: { Range: `bytes=${debut}-${fin - 1}` } });
  if (r.status !== 206) throw new Error(`Requête Range non prise en charge (HTTP ${r.status}, ${url})`);
  // Fichier absent → Vite renvoie index.html (le cache du navigateur en fait un 206 de quelques centaines d'octets)
  const octets = new Uint8Array(await r.arrayBuffer());
  if (octets.length !== fin - debut) throw new Error(`Fichier tronqué ou absent (${octets.length}/${fin - debut} octets, ${url})`);
  return octets;
}

// JSON chargé au montage. null tant qu'il n'est pas là (ou en cas d'erreur, affichée en console)
export function useJSON(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    chargeJSON(url, controller.signal)
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && console.error(`Chargement impossible :`, e));
    return () => controller.abort();
  }, [url]);
  return data;
}
