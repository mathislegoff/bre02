#!/bin/sh
# Vérifie les règles des communautés et des sorties (crée 2 comptes de test à chaque lancement)
# Serveur lancé avant : php -S localhost:8000 -t back/public   ·   puis : sh back/test_communaute.sh
U=${U:-http://localhost:8000}; N=comm$$; J='Content-Type: application/json'
A=$(mktemp); B=$(mktemp)
echoue() { echo "ÉCHEC : $1"; exit 1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
dans() { date -u -v+"$1"d +%Y-%m-%dT10:00:00Z 2>/dev/null || date -u -d "+$1 day" +%Y-%m-%dT10:00:00Z; }

curl -s -c "$A" -H "$J" -d "{\"action\":\"inscription\",\"nom\":\"${N}a\",\"mdp\":\"motdepasse\"}" $U/auth.php > /dev/null
curl -s -c "$B" -H "$J" -d "{\"action\":\"inscription\",\"nom\":\"${N}b\",\"mdp\":\"motdepasse\"}" $U/auth.php > /dev/null

# Rien n'est visible sans compte (les surfeurs gardent leurs spots pour eux)
[ "$(code $U/communautes.php)" = 401 ] || echoue "communautés lisibles sans connexion"
[ "$(code $U/annonces.php)" = 401 ] || echoue "trajets lisibles sans connexion"
SANS='{"action":"creer","nom":"Sans compte"}'
[ "$(code -H "$J" -d "$SANS" $U/communautes.php)" = 401 ] || echoue "création sans connexion"

# A crée une communauté privée : B ne la voit pas, ne la rejoint pas sans code
C=$(curl -s -b "$A" -H "$J" -d "{\"action\":\"creer\",\"nom\":\"Privée $N\",\"secteur\":\"Test\",\"prive\":true}" $U/communautes.php)
ID=$(echo "$C" | sed 's/.*"id":\([0-9]*\).*/\1/'); CODE=$(echo "$C" | sed 's/.*"code":"\([A-Z0-9]*\)".*/\1/')
[ ${#CODE} = 6 ] || echoue "pas de code d'invitation pour la communauté privée"
curl -s -b "$B" $U/communautes.php | grep -q "Privée $N" && echoue "B voit la communauté privée de A"
REJ="{\"action\":\"rejoindre\",\"id\":$ID}"; MAUVAIS='{"action":"rejoindre","code":"AAAAAA"}'; DOUBLON="{\"action\":\"creer\",\"nom\":\"privée $N\"}"
[ "$(code -b "$B" -H "$J" -d "$REJ" $U/communautes.php)" = 404 ] || echoue "B rejoint une privée sans code"
[ "$(code -b "$B" -H "$J" -d "$MAUVAIS" $U/communautes.php)" = 404 ] || echoue "mauvais code accepté"
[ "$(code -b "$A" -H "$J" -d "$DOUBLON" $U/communautes.php)" = 409 ] || echoue "nom en double accepté"

# Sans être membre : pas de trajet
SORTIE="{\"action\":\"creer\",\"communaute_id\":$ID,\"spot\":\"Torche\",\"debut\":\"$(dans 2)\",\"places\":2,\"depart\":\"Quimper\"}"
[ "$(code -b "$B" -H "$J" -d "$SORTIE" $U/annonces.php)" = 403 ] || echoue "B crée une sortie sans être membre"
PASSE="{\"action\":\"creer\",\"communaute_id\":$ID,\"spot\":\"Torche\",\"debut\":\"2020-01-01T10:00:00Z\"}"
SANSDEPART="{\"action\":\"creer\",\"communaute_id\":$ID,\"spot\":\"Torche\",\"debut\":\"$(dans 2)\",\"places\":2}"
SANSPLACE="{\"action\":\"creer\",\"communaute_id\":$ID,\"spot\":\"Torche\",\"debut\":\"$(dans 2)\",\"places\":0,\"depart\":\"Quimper\"}"
[ "$(code -b "$A" -H "$J" -d "$PASSE" $U/annonces.php)" = 400 ] || echoue "sortie dans le passé acceptée"
[ "$(code -b "$A" -H "$J" -d "$SANSDEPART" $U/annonces.php)" = 400 ] || echoue "voiture sans départ acceptée"
[ "$(code -b "$A" -H "$J" -d "$SANSPLACE" $U/annonces.php)" = 400 ] || echoue "trajet sans place accepté"

# A propose une sortie avec 1 place ; B rejoint avec le code, voit la sortie, prend la place ; une 2e demande est refusée
S=$(curl -s -b "$A" -H "$J" -d "$(echo "$SORTIE" | sed 's/"places":2/"places":1/')" $U/annonces.php)
SID=$(echo "$S" | sed 's/.*"id":\([0-9]*\),"communaute_id.*/\1/')
curl -s -b "$B" -H "$J" -d "{\"action\":\"rejoindre\",\"code\":\"$CODE\"}" $U/communautes.php | grep -q '"membre":true' || echoue "B n'a pas pu rejoindre avec le code"
curl -s -b "$B" -H "$J" -d "{\"action\":\"venir\",\"id\":$SID}" $U/annonces.php | grep -q '"places_prises":1' || echoue "B n'a pas réservé la place"
curl -s -c "$B" -H "$J" -d "{\"action\":\"inscription\",\"nom\":\"${N}c\",\"mdp\":\"motdepasse\"}" $U/auth.php > /dev/null
VENIR="{\"action\":\"venir\",\"id\":$SID}"
[ "$(code -b "$B" -H "$J" -d "$VENIR" $U/annonces.php)" = 404 ] || echoue "C (hors communauté privée) voit ou répond à la sortie"

# Suppression : seul l'auteur
curl -s -c "$B" -H "$J" -d "{\"action\":\"connexion\",\"nom\":\"${N}b\",\"mdp\":\"motdepasse\"}" $U/auth.php > /dev/null
[ "$(code -b "$B" -X DELETE "$U/annonces.php?id=$SID")" = 404 ] || echoue "B supprime la sortie de A"
[ "$(code -b "$A" -X DELETE "$U/annonces.php?id=$SID")" = 200 ] || echoue "A ne peut pas supprimer sa sortie"

# Quitter : dernier membre → la communauté disparaît
curl -s -b "$B" -H "$J" -d "{\"action\":\"quitter\",\"id\":$ID}" $U/communautes.php > /dev/null
curl -s -b "$A" -H "$J" -d "{\"action\":\"quitter\",\"id\":$ID}" $U/communautes.php > /dev/null
curl -s -b "$A" $U/communautes.php | grep -q "Privée $N" && echoue "communauté vide non supprimée"
echo "Communautés et sorties : OK"
