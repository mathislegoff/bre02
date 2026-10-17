<?php
// Covoiturages vers les spots, proposés dans une communauté : un départ, un spot, une heure, des places en voiture.
// Pas de messagerie : on réserve une place. Discrétion : les trajets (donc les spots) ne sont visibles que des membres connectés
// de la communauté, même si elle est publique.
// GET [?communaute=] → trajets à venir de mes communautés · POST {action: creer, communaute_id, depart, spot, debut, places, note}
// · {action: venir, id} (réserve une place) · {action: annuler, id} (libère ma place) · DELETE ?id= → supprime (conducteur seulement)
require __DIR__ . '/../db.php';

$moi = $_SESSION['utilisateur']['id'] ?? null;
$methode = $_SERVER['REQUEST_METHOD'];
const MAX_ANNONCES_A_VENIR = 10;
const NIVEAUX = ['tous', 'debutant', 'intermediaire', 'confirme'];

function est_membre(PDO $db, ?int $moi, int $communaute): bool
{
    $q = $db->prepare('SELECT 1 FROM membres WHERE communaute_id = ? AND utilisateur_id = ?');
    $q->execute([$communaute, $moi]);
    return (bool) $q->fetchColumn();
}

// Trajets à venir des communautés dont je suis membre ; les passagers sont les participants qui ont réservé une place
function annonces(PDO $db, ?int $moi, ?int $communaute = null, ?int $id = null): array
{
    $q = $db->prepare('SELECT a.id, a.communaute_id, c.nom AS communaute, a.spot, a.debut, a.places, a.depart, a.niveau, a.note, u.nom AS auteur,
            a.auteur_id = :moi AS mienne,
            EXISTS (SELECT 1 FROM membres m WHERE m.communaute_id = a.communaute_id AND m.utilisateur_id = :moi) AS membre,
            (SELECT COUNT(*) FROM reponses r WHERE r.annonce_id = a.id) AS venus,
            (SELECT COALESCE(SUM(place), 0) FROM reponses r WHERE r.annonce_id = a.id) AS places_prises,
            (SELECT 1 FROM reponses r WHERE r.annonce_id = a.id AND r.utilisateur_id = :moi) AS moi,
            (SELECT place FROM reponses r WHERE r.annonce_id = a.id AND r.utilisateur_id = :moi) AS ma_place
        FROM annonces a JOIN communautes c ON c.id = a.communaute_id JOIN utilisateurs u ON u.id = a.auteur_id
        WHERE (:id IS NULL OR a.id = :id) AND a.debut >= :limite AND (:communaute IS NULL OR a.communaute_id = :communaute)
          AND EXISTS (SELECT 1 FROM membres m WHERE m.communaute_id = c.id AND m.utilisateur_id = :moi)
        ORDER BY a.debut, a.id LIMIT 60');
    $q->execute(['moi' => $moi, 'id' => $id, 'communaute' => $communaute, 'limite' => gmdate('Y-m-d\TH:i:s\Z', time() - 2 * 3600)]);
    $liste = $q->fetchAll();
    if (!$liste) return [];

    $ids = implode(',', array_map(fn ($a) => (int) $a['id'], $liste));
    $noms = [];
    foreach ($db->query("SELECT r.annonce_id, u.nom FROM reponses r JOIN utilisateurs u ON u.id = r.utilisateur_id WHERE r.annonce_id IN ($ids) ORDER BY u.nom") as $r) {
        $noms[$r['annonce_id']][] = $r['nom'];
    }
    foreach ($liste as &$a) {
        foreach (['id', 'communaute_id', 'places', 'venus', 'places_prises'] as $k) $a[$k] = (int) $a[$k];
        foreach (['mienne', 'membre', 'moi', 'ma_place'] as $k) $a[$k] = (bool) $a[$k];
        $a['participants'] = $a['membre'] ? ($noms[$a['id']] ?? []) : null;
    }
    return $liste;
}

if ($moi === null) repondre(['erreur' => 'Connexion requise'], 401);
if ($methode === 'GET') repondre(annonces($db, $moi, isset($_GET['communaute']) ? (int) $_GET['communaute'] : null));
$maintenant = time();

if ($methode === 'DELETE') {
    $q = $db->prepare('DELETE FROM annonces WHERE id = ? AND auteur_id = ?');
    $q->execute([(int) ($_GET['id'] ?? 0), $moi]);
    if ($q->rowCount() === 0) repondre(['erreur' => 'Trajet introuvable'], 404);
    repondre(['ok' => true]);
}

if ($methode !== 'POST') repondre(['erreur' => 'Méthode non prise en charge'], 405);
$action = $corps['action'] ?? '';

if ($action === 'creer') {
    $communaute = (int) ($corps['communaute_id'] ?? 0);
    $spot = is_string($corps['spot'] ?? null) ? trim($corps['spot']) : '';
    $depart = is_string($corps['depart'] ?? null) ? trim($corps['depart']) : '';
    $note = is_string($corps['note'] ?? null) ? trim($corps['note']) : '';
    $places = filter_var($corps['places'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 8]]);
    $niveau = $corps['niveau'] ?? 'tous';
    $debut = is_string($corps['debut'] ?? null) ? $corps['debut'] : '';
    $quand = preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/', $debut) ? strtotime($debut) : false;

    if (!est_membre($db, $moi, $communaute)) repondre(['erreur' => 'Rejoins d\'abord cette communauté'], 403);
    if ($spot === '' || mb_strlen($spot) > 80 || $depart === '' || mb_strlen($depart) > 60 || mb_strlen($note) > 140 || $places === false || $places < 1 || !in_array($niveau, NIVEAUX, true)) {
        repondre(['erreur' => 'Départ (60 caractères max), spot (80 max), de 1 à 8 places, note 140 max'], 400);
    }
    if ($quand === false || $quand <= $maintenant || $quand > $maintenant + 30 * 86400) repondre(['erreur' => 'Date à venir, dans les 30 jours'], 400);
    $n = $db->prepare('SELECT COUNT(*) FROM annonces WHERE auteur_id = ? AND debut >= ?');
    $n->execute([$moi, gmdate('Y-m-d\TH:i:s\Z', $maintenant)]);
    if ($n->fetchColumn() >= MAX_ANNONCES_A_VENIR) repondre(['erreur' => 'Tu as déjà ' . MAX_ANNONCES_A_VENIR . ' trajets à venir'], 400);

    $db->prepare('INSERT INTO annonces (communaute_id, auteur_id, spot, debut, places, depart, niveau, note, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$communaute, $moi, $spot, $debut, $places, $depart, $niveau, $note, gmdate('Y-m-d\TH:i:s\Z', $maintenant)]);
    repondre(annonces($db, $moi, null, (int) $db->lastInsertId())[0], 201);
}

// Les réservations concernent un trajet à venir d'une communauté dont je suis membre
$id = (int) ($corps['id'] ?? 0);
$sortie = annonces($db, $moi, null, $id)[0] ?? null;
if (!$sortie) repondre(['erreur' => 'Trajet introuvable'], 404);
if (!$sortie['membre']) repondre(['erreur' => 'Rejoins d\'abord cette communauté'], 403);

if ($action === 'venir') { // réserver une place
    if ($sortie['mienne']) repondre(['erreur' => 'C\'est ta voiture'], 400);
    if (!$sortie['moi'] && $sortie['places'] - $sortie['places_prises'] <= 0) repondre(['erreur' => 'Voiture complète'], 409);
    $db->prepare('INSERT OR IGNORE INTO reponses (annonce_id, utilisateur_id, place) VALUES (?, ?, 1)')->execute([$id, $moi]);
    repondre(annonces($db, $moi, null, $id)[0]);
}

if ($action === 'annuler') {
    if ($sortie['mienne']) repondre(['erreur' => 'C\'est ton trajet : supprime-le plutôt'], 400);
    $db->prepare('DELETE FROM reponses WHERE annonce_id = ? AND utilisateur_id = ?')->execute([$id, $moi]);
    repondre(annonces($db, $moi, null, $id)[0]);
}

repondre(['erreur' => 'Action inconnue'], 400);
