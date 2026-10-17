// Date d'une note : « 17 oct., 11:42 », à l'heure locale du navigateur (le serveur stocke en UTC)
const format = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const quand = (iso) => format.format(new Date(iso));
