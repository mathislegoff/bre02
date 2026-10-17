<?php
// Partage d'un favori avec un collègue, qui le voit en lecture seule
// POST {pin_id, avec} → partage · DELETE ?pin_id=&avec= → retire le partage (avec = nom du collègue)
// Seul le propriétaire du favori peut le partager ou retirer un partage
require __DIR__ . '/../db.php';

$moi = $_SESSION['utilisateur']['id'] ?? null;
if ($moi === null) repondre(['erreur' => 'Connexion requise'], 401);

$methode = $_SERVER['REQUEST_METHOD'];
$params = $methode === 'DELETE' ? $_GET : $corps;
$pin = (int) ($params['pin_id'] ?? 0);
$avec = is_string($params['avec'] ?? null) ? trim($params['avec']) : '';

// Favori à moi ? Sinon 404, qu'il existe ou non : on ne révèle rien des favoris des autres
$q = $db->prepare('SELECT 1 FROM pins WHERE id = ? AND utilisateur_id = ?');
$q->execute([$pin, $moi]);
if (!$q->fetch()) repondre(['erreur' => 'Favori introuvable'], 404);

$q = $db->prepare('SELECT id FROM utilisateurs WHERE nom = ?');
$q->execute([$avec]);
$collegue = $q->fetchColumn();
if ($collegue === false) repondre(['erreur' => "Aucun compte « $avec »"], 404);
if ($collegue === $moi) repondre(['erreur' => 'Ce favori est déjà le vôtre'], 400);

if ($methode === 'POST') {
    $db->prepare('INSERT OR IGNORE INTO partages (pin_id, utilisateur_id) VALUES (?, ?)')->execute([$pin, $collegue]);
    repondre(['ok' => true], 201);
}

if ($methode === 'DELETE') {
    $db->prepare('DELETE FROM partages WHERE pin_id = ? AND utilisateur_id = ?')->execute([$pin, $collegue]);
    repondre(['ok' => true]);
}

repondre(['erreur' => 'Méthode non autorisée'], 405);
