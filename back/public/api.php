<?php
// API des prévisions de vagues du modèle IA
// Lit data/predictions.csv, sortie du modèle au format d'entrée de front/scripts/champs.py
// (une ligne par point de grille et par heure, time en ISO UTC sur la période de front/src/cadre.json) :
//   time,lon,lat,hs,tp,dir
//   2013-01-01T00:00:00Z,-4.5,48.25,1.84,9.6,282
// hs : hauteur significative (m), tp : période pic (s), dir : direction de provenance (°)
// Les colonnes en plus (vent, confiance…) sont renvoyées telles quelles.
//
// GET api.php?lat=48.38&lon=-4.49 → prévisions du point de grille le plus proche
// Lancer : php -S localhost:8000 -t back/public   ·   Auto-test : php back/public/api.php

// Renvoie la ligne dont le point de grille est le plus proche de ($lat, $lon), ou null si aucun n'est assez proche
function plusProche(array $lignes, float $lat, float $lon): ?array
{
    // TODO(human)
    return null;
}

// Test dans le terminal des coordonnées
if (PHP_SAPI === 'cli') {
    // A est à ~22 km, B à ~28 km : en degrés bruts (0.3 contre 0.25) on choisirait B à tort
    $grille = [['lat' => 48.0, 'lon' => -4.3], ['lat' => 48.25, 'lon' => -4.0]];
    $ok = plusProche($grille, 48.0, -4.0) === $grille[0]
        && plusProche($grille, 43.3, 5.4) === null; // Marseille, hors grille
    echo $ok ? "OK\n" : "ÉCHEC\n";
    exit($ok ? 0 : 1);
}

//Renvoie du PHP au JS
header('Content-Type: application/json; charset=utf-8');

//Vérification des coordonnées
$lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
$lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
if ($lat === false || $lon === false) {
    http_response_code(400);
    exit(json_encode(['erreur' => 'Paramètres lat et lon requis']));
}

// CSV relu à chaque requête, ok jusqu'à ~100k lignes ; au-delà, cache APCu ou SQLite
$f = fopen(__DIR__ . '/../data/predictions.csv', 'r');
$colonnes = fgetcsv($f);
$lignes = [];
while (($r = fgetcsv($f)) !== false) {
    if ($r !== [null]) $lignes[] = array_combine($colonnes, $r); // saute les lignes vides
}
fclose($f);

$point = plusProche($lignes, $lat, $lon);
if ($point === null) {
    http_response_code(404);
    exit(json_encode(['erreur' => 'Aucune prévision pour ce point']));
}

//Envoie en json des prévisions
$previsions = array_filter($lignes, fn($l) => $l['lat'] === $point['lat'] && $l['lon'] === $point['lon']);
echo json_encode(array_values($previsions), JSON_NUMERIC_CHECK);
