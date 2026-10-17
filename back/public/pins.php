<?php
// Favoris de l'utilisateur connecté : privés, sauf ceux qu'il partage (voir partages.php)
// GET → ses favoris + ceux partagés avec lui · POST {nom, lat, lon} → ajoute · DELETE ?id= → supprime
// PATCH ?id= {etoiles, ressenti} → note le favori (1 à 5 étoiles, ou null) et son ressenti, daté (note_le)
// PATCH ?id= {alerte: {houle: [min, max], vent: max, eau: [min, max], actives: [...]} | null} → niveaux d'alerte (m, nds, m)
//   et alertes allumées parmi houle, vent, eau ; null = plus d'alerte
// Lecture : propriétaire ou destinataire d'un partage · Modification : propriétaire seulement
require __DIR__ . '/../db.php';

$moi = $_SESSION['utilisateur']['id'] ?? null;
if ($moi === null) repondre(['erreur' => 'Connexion requise'], 401);

$methode = $_SERVER['REQUEST_METHOD'];

if ($methode === 'GET') {
    // partage_par : propriétaire si le favori vient d'un collègue (null si c'est le mien)
    // partage_avec : collègues avec qui je partage mon favori (null si ce n'est pas le mien)
    $q = $db->prepare('SELECT p.id, p.nom, p.lat, p.lon, p.etoiles, p.ressenti, p.note_le, p.alerte,
            CASE WHEN p.utilisateur_id = :moi THEN NULL ELSE u.nom END AS partage_par,
            CASE WHEN p.utilisateur_id = :moi THEN (
                SELECT json_group_array(d.nom) FROM partages s JOIN utilisateurs d ON d.id = s.utilisateur_id WHERE s.pin_id = p.id
            ) END AS partage_avec
        FROM pins p JOIN utilisateurs u ON u.id = p.utilisateur_id
        WHERE p.utilisateur_id = :moi OR p.id IN (SELECT pin_id FROM partages WHERE utilisateur_id = :moi)
        ORDER BY p.id');
    $q->execute(['moi' => $moi]);
    $pins = $q->fetchAll();
    foreach ($pins as $i => $p) {
        $pins[$i]['partage_avec'] = json_decode($p['partage_avec'] ?? 'null');
        $pins[$i]['alerte'] = json_decode($p['alerte'] ?? 'null');
    }
    repondre($pins);
}

if ($methode === 'POST') {
    $nom = is_string($corps['nom'] ?? null) ? trim($corps['nom']) : '';
    $lat = filter_var($corps['lat'] ?? null, FILTER_VALIDATE_FLOAT);
    $lon = filter_var($corps['lon'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($nom === '' || mb_strlen($nom) > 100 || $lat === false || $lon === false) {
        repondre(['erreur' => 'Nom (100 caractères max), lat et lon requis'], 400);
    }
    // Emprise de la carte, commune au front et aux scripts Python
    $cadre = json_decode(file_get_contents(__DIR__ . '/../../front/src/cadre.json'), true);
    if ($lat < $cadre['sud'] || $lat > $cadre['nord'] || $lon < $cadre['ouest'] || $lon > $cadre['est']) {
        repondre(['erreur' => 'Favori hors de la carte'], 400);
    }
    $db->prepare('INSERT INTO pins (utilisateur_id, nom, lat, lon) VALUES (?, ?, ?, ?)')->execute([$moi, $nom, $lat, $lon]);
    repondre(['id' => (int) $db->lastInsertId(), 'nom' => $nom, 'lat' => $lat, 'lon' => $lon, 'etoiles' => null, 'ressenti' => null, 'note_le' => null, 'alerte' => null, 'partage_par' => null, 'partage_avec' => []], 201);
}

// Alerte : ne touche ni à la note ni à sa date
if ($methode === 'PATCH' && array_key_exists('alerte', $corps)) {
    $a = $corps['alerte'];
    if ($a !== null) {
        $plage = fn($p) => is_array($p) && is_numeric($p[0] ?? null) && is_numeric($p[1] ?? null) && 0 <= $p[0] && $p[0] < $p[1] && $p[1] <= 8;
        $vent = $a['vent'] ?? null;
        $actives = $a['actives'] ?? null;
        if (!is_array($a) || !$plage($a['eau'] ?? null) || !$plage($a['houle'] ?? null) || !is_numeric($vent) || $vent <= 0 || $vent > 60 || !is_array($actives)) {
            repondre(['erreur' => 'Niveaux d’alerte : eau et houle de 0 à 8 m (min < max), vent de 1 à 60 nds, liste des alertes actives'], 400);
        }
        // Réécrit avec les seules clés attendues : rien d'autre du client n'est stocké
        $a = json_encode([
            'houle' => [(float) $a['houle'][0], (float) $a['houle'][1]],
            'vent' => (float) $vent,
            'eau' => [(float) $a['eau'][0], (float) $a['eau'][1]],
            'actives' => array_values(array_filter(['houle', 'vent', 'eau'], fn($c) => in_array($c, $actives, true))),
        ]);
    }
    $q = $db->prepare('UPDATE pins SET alerte = ? WHERE id = ? AND utilisateur_id = ?');
    $q->execute([$a, (int) ($_GET['id'] ?? 0), $moi]);
    if ($q->rowCount() === 0) repondre(['erreur' => 'Favori introuvable'], 404);
    repondre(['ok' => true]);
}

if ($methode === 'PATCH') {
    $etoiles = $corps['etoiles'] ?? null; // null = pas encore noté
    if ($etoiles !== null) $etoiles = filter_var($etoiles, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
    $ressenti = is_string($corps['ressenti'] ?? null) ? trim($corps['ressenti']) : '';
    if ($etoiles === false || mb_strlen($ressenti) > 500) {
        repondre(['erreur' => 'Étoiles de 1 à 5, ressenti de 500 caractères max'], 400);
    }
    $noteLe = $etoiles === null && $ressenti === '' ? null : gmdate('Y-m-d\TH:i:s\Z'); // note effacée → plus de date
    $q = $db->prepare('UPDATE pins SET etoiles = ?, ressenti = ?, note_le = ? WHERE id = ? AND utilisateur_id = ?');
    $q->execute([$etoiles, $ressenti, $noteLe, (int) ($_GET['id'] ?? 0), $moi]);
    if ($q->rowCount() === 0) repondre(['erreur' => 'Favori introuvable'], 404);
    repondre(['note_le' => $noteLe]);
}

if ($methode === 'DELETE') {
    $q = $db->prepare('DELETE FROM pins WHERE id = ? AND utilisateur_id = ?');
    $q->execute([(int) ($_GET['id'] ?? 0), $moi]);
    if ($q->rowCount() === 0) repondre(['erreur' => 'Favori introuvable'], 404);
    repondre(['ok' => true]);
}

repondre(['erreur' => 'Méthode non autorisée'], 405);
