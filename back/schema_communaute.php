<?php
// Communautés locales de surf et sorties (annonces « je viens »), dans la même base SQLite que les comptes.
// Appelée par db.php à chaque requête : CREATE TABLE IF NOT EXISTS, sans effet une fois les tables créées.
function schema_communaute(PDO $db): void
{
    $db->exec('CREATE TABLE IF NOT EXISTS communautes (
        id INTEGER PRIMARY KEY,
        nom TEXT NOT NULL UNIQUE COLLATE NOCASE,
        secteur TEXT NOT NULL DEFAULT \'\',
        description TEXT NOT NULL DEFAULT \'\',
        prive INTEGER NOT NULL DEFAULT 0 CHECK (prive IN (0, 1)),
        code TEXT,                                  -- code d\'invitation, seulement pour les communautés privées
        cree_par INTEGER NOT NULL REFERENCES utilisateurs(id),
        cree_le TEXT NOT NULL                       -- ISO UTC
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS membres (
        communaute_id INTEGER NOT NULL REFERENCES communautes(id) ON DELETE CASCADE,
        utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
        role TEXT NOT NULL DEFAULT \'membre\' CHECK (role IN (\'admin\', \'membre\')),
        depuis TEXT NOT NULL,
        PRIMARY KEY (communaute_id, utilisateur_id)
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS annonces (
        id INTEGER PRIMARY KEY,
        communaute_id INTEGER NOT NULL REFERENCES communautes(id) ON DELETE CASCADE,
        auteur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
        spot TEXT NOT NULL,
        debut TEXT NOT NULL,                        -- ISO UTC
        places INTEGER NOT NULL DEFAULT 0 CHECK (places BETWEEN 0 AND 8), -- places de voiture proposées
        depart TEXT,                                -- d\'où part la voiture
        niveau TEXT NOT NULL DEFAULT \'tous\' CHECK (niveau IN (\'tous\', \'debutant\', \'intermediaire\', \'confirme\')),
        note TEXT NOT NULL DEFAULT \'\',
        cree_le TEXT NOT NULL
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS reponses (
        annonce_id INTEGER NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
        utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
        place INTEGER NOT NULL DEFAULT 0 CHECK (place IN (0, 1)), -- 1 = a besoin d\'une place en voiture
        PRIMARY KEY (annonce_id, utilisateur_id)
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS annonces_debut ON annonces (debut)');

    // Démo : communautés et covoiturages fictifs, recréés quand il n'y en a plus (voir demo_data.php)
    require_once __DIR__ . '/demo_data.php';
    if (demo_a_rafraichir($db)) seed_demo($db);
}
