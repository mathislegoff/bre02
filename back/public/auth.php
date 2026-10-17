<?php
// Comptes : le navigateur garde un cookie de session, le serveur sait qui est connecté
// GET → utilisateur connecté (ou null) · POST {action: inscription | connexion | deconnexion, nom, mdp}
require __DIR__ . '/../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') repondre(['utilisateur' => $_SESSION['utilisateur'] ?? null]);

$action = $corps['action'] ?? '';
$nom = is_string($corps['nom'] ?? null) ? trim($corps['nom']) : '';
$mdp = is_string($corps['mdp'] ?? null) ? $corps['mdp'] : '';

if ($action === 'deconnexion') {
    session_destroy();
    repondre(['utilisateur' => null]);
}

if ($action === 'inscription') {
    if ($nom === '' || strlen($nom) > 50 || strlen($mdp) < 8) {
        repondre(['erreur' => 'Nom requis (50 caractères max), mot de passe de 8 caractères minimum'], 400);
    }
    $q = $db->prepare('INSERT OR IGNORE INTO utilisateurs (nom, mdp) VALUES (?, ?)');
    $q->execute([$nom, password_hash($mdp, PASSWORD_DEFAULT)]);
    if ($q->rowCount() === 0) repondre(['erreur' => 'Ce nom est déjà pris'], 409);
    $utilisateur = ['id' => (int) $db->lastInsertId(), 'nom' => $nom];
} elseif ($action === 'connexion') {
    // Pas de limite de tentatives : à ajouter avant une mise en ligne publique
    $q = $db->prepare('SELECT id, nom, mdp FROM utilisateurs WHERE nom = ?');
    $q->execute([$nom]);
    $u = $q->fetch();
    if (!$u || !password_verify($mdp, $u['mdp'])) repondre(['erreur' => 'Nom ou mot de passe incorrect'], 401);
    $utilisateur = ['id' => $u['id'], 'nom' => $u['nom']];
} else {
    repondre(['erreur' => 'Action inconnue'], 400);
}

session_regenerate_id(true); // nouvel identifiant à la connexion : un identifiant volé avant ne sert plus
$_SESSION['utilisateur'] = $utilisateur;
repondre(['utilisateur' => $utilisateur]);
