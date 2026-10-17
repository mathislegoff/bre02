// Appel au backend PHP ; une réponse d'erreur devient une exception avec le message du serveur
export async function api(url, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({ erreur: 'Serveur injoignable' }));
  if (!r.ok) throw new Error(data.erreur);
  return data;
}
