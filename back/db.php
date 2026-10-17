<?php
// Commun à auth.php et pins.php : session, base SQLite (créée au premier appel), corps et réponse JSON
// Hors de public/ : ni ce fichier ni data/app.sqlite ne sont accessibles depuis le navigateur

//Création de la session
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax', 'use_strict_mode' => true]);
header('Content-Type: application/json; charset=utf-8');

// Création de la DB
$db = new PDO('sqlite:' . __DIR__ . '/data/app.sqlite', null, null, [PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$db->exec('PRAGMA foreign_keys = ON');

//Création table Utilisateurs
$db->exec('CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL UNIQUE COLLATE NOCASE,
    mdp TEXT NOT NULL -- hash de password_hash(), jamais le mot de passe en clair
)');

//Création Table pins
$db->exec('CREATE TABLE IF NOT EXISTS pins (
    id INTEGER PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    nom TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL
)');


//Création Tables partages
$db->exec('CREATE TABLE IF NOT EXISTS partages (
    pin_id INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE, -- favori supprimé → ses partages aussi
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),   -- le collègue qui le voit
    PRIMARY KEY (pin_id, utilisateur_id)
)');

// Migrations : ajoute les colonnes aux bases déjà créées, une seule fois
// user_version = numéro de version du schéma, rangé dans le fichier SQLite lui-même
$version = $db->query('PRAGMA user_version')->fetchColumn();
if ($version < 1) {
    $db->exec('ALTER TABLE pins ADD COLUMN etoiles INTEGER CHECK (etoiles BETWEEN 1 AND 5)'); // ressenti noté de 1 à 5
    $db->exec('ALTER TABLE pins ADD COLUMN ressenti TEXT');
    $db->exec('PRAGMA user_version = 1');
}
if ($version < 2) {
    $db->exec('ALTER TABLE pins ADD COLUMN note_le TEXT'); // date de la dernière note, ISO en UTC
    // Notes données avant cette colonne : datées du jour de la migration (approximatif)
    $db->exec("UPDATE pins SET note_le = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE etoiles IS NOT NULL OR ressenti <> ''");
    $db->exec('PRAGMA user_version = 2');
}

// Communautés et sorties
require __DIR__ . '/schema_communaute.php';
schema_communaute($db);

// POST en JSON seulement : un formulaire d'un autre site ne peut envoyer ni ce type, ni PATCH/DELETE, sans autorisation (CSRF)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
    http_response_code(415);
    exit(json_encode(['erreur' => 'Corps JSON attendu']));
}

// Corps JSON envoyé par le front ; tableau vide s'il est absent ou invalide
$corps = json_decode(file_get_contents('php://input'), true);
if (!is_array($corps)) $corps = [];

function repondre($donnees, int $code = 200)
{
    http_response_code($code);
    exit(json_encode($donnees, JSON_UNESCAPED_UNICODE));
}
