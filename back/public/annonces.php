<?php
// Sorties de surf proposées dans une communauté, façon covoiturage : un spot, une heure, éventuellement des places en voiture.
// Pas de messagerie : les autres répondent « je viens » (avec ou sans besoin d'une place).
// GET [?communaute=] → sorties à venir des communautés visibles · POST {action: creer, communaute_id, spot, debut, places, depart,
// niveau, note} · {action: venir, id, place} · {action: annuler, id} · DELETE ?id= → supprime (auteur seulement)
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

// Sorties visibles (communauté publique, ou dont je suis membre), à venir ; les noms des participants ne sont donnés qu'aux membres
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
          AND (c.prive = 0 OR EXISTS (SELECT 1 FROM membres m WHERE m.communaute_id = c.id AND m.utilisateur_id = :moi))
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

if ($methode === 'GET') repondre(annonces($db, $moi, isset($_GET['communaute']) ? (int) $_GET['communaute'] : null));

if ($moi === null) repondre(['erreur' => 'Connexion requise'], 401);
$maintenant = time();

if ($methode === 'DELETE') {
    $q = $db->prepare('DELETE FROM annonces WHERE id = ? AND auteur_id = ?');
    $q->execute([(int) ($_GET['id'] ?? 0), $moi]);
    if ($q->rowCount() === 0) repondre(['erreur' => 'Sortie introuvable'], 404);
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
    if ($spot === '' || mb_strlen($spot) > 80 || mb_strlen($depart) > 60 || mb_strlen($note) > 140 || $places === false || !in_array($niveau, NIVEAUX, true)) {
        repondre(['erreur' => 'Spot requis (80 caractères max), départ 60 max, note 140 max, 0 à 8 places'], 400);
    }
    if ($quand === false || $quand <= $maintenant || $quand > $maintenant + 30 * 86400) repondre(['erreur' => 'Date à venir, dans les 30 jours'], 400);
    if ($places > 0 && $depart === '') repondre(['erreur' => 'Indique d\'où part la voiture'], 400);
    $n = $db->prepare('SELECT COUNT(*) FROM annonces WHERE auteur_id = ? AND debut >= ?');
    $n->execute([$moi, gmdate('Y-m-d\TH:i:s\Z', $maintenant)]);
    if ($n->fetchColumn() >= MAX_ANNONCES_A_VENIR) repondre(['erreur' => 'Tu as déjà ' . MAX_ANNONCES_A_VENIR . ' sorties à venir'], 400);

    $db->prepare('INSERT INTO annonces (communaute_id, auteur_id, spot, debut, places, depart, niveau, note, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$communaute, $moi, $spot, $debut, $places, $depart === '' ? null : $depart, $niveau, $note, gmdate('Y-m-d\TH:i:s\Z', $maintenant)]);
    $id = (int) $db->lastInsertId();
    $db->prepare('INSERT INTO reponses (annonce_id, utilisateur_id, place) VALUES (?, ?, 0)')->execute([$id, $moi]); // l'auteur y va
    repondre(annonces($db, $moi, null, $id)[0], 201);
}

// Les réponses concernent une sortie visible, à venir, d'une communauté dont je suis membre
$id = (int) ($corps['id'] ?? 0);
$sortie = annonces($db, $moi, null, $id)[0] ?? null;
if (!$sortie) repondre(['erreur' => 'Sortie introuvable'], 404);
if (!$sortie['membre']) repondre(['erreur' => 'Rejoins d\'abord cette communauté'], 403);

if ($action === 'venir') {
    $place = !empty($corps['place']) ? 1 : 0;
    if ($place) {
        if ($sortie['mienne']) repondre(['erreur' => 'C\'est ta voiture'], 400);
        $reste = $sortie['places'] - $sortie['places_prises'] + ($sortie['ma_place'] ? 1 : 0); // ma propre place ne compte pas contre moi
        if ($sortie['places'] === 0 || $reste <= 0) repondre(['erreur' => 'Plus de place en voiture'], 409);
    }
    $db->prepare('INSERT INTO reponses (annonce_id, utilisateur_id, place) VALUES (?, ?, ?)
        ON CONFLICT (annonce_id, utilisateur_id) DO UPDATE SET place = excluded.place')->execute([$id, $moi, $place]);
    repondre(annonces($db, $moi, null, $id)[0]);
}

if ($action === 'annuler') {
    if ($sortie['mienne']) repondre(['erreur' => 'Tu as proposé cette sortie : supprime-la plutôt'], 400);
    $db->prepare('DELETE FROM reponses WHERE annonce_id = ? AND utilisateur_id = ?')->execute([$id, $moi]);
    repondre(annonces($db, $moi, null, $id)[0]);
}

repondre(['erreur' => 'Action inconnue'], 400);
