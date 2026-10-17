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
  return new Uint8Array(await r.arrayBuffer());
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
