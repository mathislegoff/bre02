#!/bin/sh
# Vérifie que les favoris restent privés sauf partage explicite (crée 2 comptes de test à chaque lancement)
# Serveur lancé avant : php -S localhost:8000 -t back/public   ·   puis : sh back/test.sh
U=${U:-http://localhost:8000}; N=test$$; J='Content-Type: application/json'
A=$(mktemp); B=$(mktemp)
echoue() { echo "ÉCHEC : $1"; exit 1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

curl -s -c "$A" -H "$J" -d "{\"action\":\"inscription\",\"nom\":\"${N}a\",\"mdp\":\"motdepasse\"}" $U/auth.php > /dev/null
curl -s -c "$B" -H "$J" -d "{\"action\":\"inscription\",\"nom\":\"${N}b\",\"mdp\":\"motdepasse\"}" $U/auth.php > /dev/null
ID=$(curl -s -b "$A" -H "$J" -d '{"nom":"Spot secret","lat":48.3,"lon":-4.5}' $U/pins.php | sed 's/.*"id":\([0-9]*\).*/\1/')

[ "$(curl -s -b "$B" $U/pins.php)" = "[]" ] || echoue "B voit le favori privé de A"
[ "$(code -b "$B" -X DELETE "$U/pins.php?id=$ID")" = 404 ] || echoue "B supprime le favori de A"
[ "$(code -b "$B" -H "$J" -d "{\"pin_id\":$ID,\"avec\":\"${N}b\"}" $U/partages.php)" = 404 ] || echoue "B partage le favori de A"
[ "$(code $U/pins.php)" = 401 ] || echoue "favoris lisibles sans connexion"
[ "$(code -b "$A" -H "$J" -d '{"nom":"Marseille","lat":43.3,"lon":5.4}' $U/pins.php)" = 400 ] || echoue "favori hors de la carte accepté"
curl -s -b "$A" $U/pins.php | grep -q "Spot secret" || echoue "A ne voit plus son favori"

# A partage avec B : B le voit, sans pouvoir le supprimer ; A retire le partage : B ne le voit plus
curl -s -b "$A" -H "$J" -d "{\"pin_id\":$ID,\"avec\":\"${N}b\"}" $U/partages.php > /dev/null
curl -s -b "$B" $U/pins.php | grep -q "\"partage_par\":\"${N}a\"" || echoue "B ne voit pas le favori partagé"
[ "$(code -b "$B" -X DELETE "$U/pins.php?id=$ID")" = 404 ] || echoue "B supprime un favori partagé"
[ "$(code -b "$B" -X PATCH -H "$J" -d '{"etoiles":1}' "$U/pins.php?id=$ID")" = 404 ] || echoue "B note le favori de A"
[ "$(code -b "$A" -X PATCH -H "$J" -d '{"etoiles":6}' "$U/pins.php?id=$ID")" = 400 ] || echoue "6 étoiles acceptées"
curl -s -b "$A" -X PATCH -H "$J" -d '{"etoiles":4,"ressenti":"Belle houle"}' "$U/pins.php?id=$ID" > /dev/null
curl -s -b "$B" $U/pins.php | grep -q '"etoiles":4,"ressenti":"Belle houle","note_le":"20' || echoue "B ne voit pas la note datée du favori partagé"
curl -s -b "$A" -X DELETE "$U/partages.php?pin_id=$ID&avec=${N}b" > /dev/null
[ "$(curl -s -b "$B" $U/pins.php)" = "[]" ] || echoue "B voit encore le favori après retrait du partage"
echo OK
