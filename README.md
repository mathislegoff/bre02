# Ocean Hackathon 2026

- projet houle IA

Pour lancer l'interface : se placer dans le dossier `front` et taper `npm start`.

Comptes et favoris : `npm start` lance aussi le backend PHP (`back/`, base SQLite créée au premier appel).
Il faut PHP 8 avec SQLite : `brew install php` sur Mac. Tests du backend : `sh back/test.sh` (serveur lancé).

## Lancer la démo (après un `git pull`)

Prérequis : Node 20+ et PHP 8 avec SQLite (`brew install php` sur Mac).

```
cd front
npm start      # installe les dépendances au premier lancement, lance le site et le serveur PHP
```

Tout est dans git : aucune donnée à télécharger ni à calculer.
- **Carte, frise, graphiques** : les 48 h de démonstration (23-25 déc. 2013) sont dans `front/public/data/` (`champs/demo-48h/`,
  `comparaison-48h.json`). Courbe « Riklañ model » : données fictives de démonstration, indiquées comme telles sur le site.
- **Comptes, favoris, communautés** : la base SQLite se crée au premier appel, avec des communautés et des trajets fictifs
  (`php back/seed_demo.php` les remet à jour ; groupe privé de démo : code `CONQ26`).

Regénérer les données : `front/scripts/` (`marc.py` puis `export_champ_48h.py` pour la carte, `comparaison.py`, `ia_demo.py` puis
`export_48h.py` pour le graphique de l'accueil).
