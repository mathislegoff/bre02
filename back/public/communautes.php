<?php
// Communautés locales de surf, réservées aux comptes connectés (les surfeurs gardent leurs spots pour eux). Publiques : on les rejoint
// en un clic. Privées : visibles de leurs membres seulement, on les rejoint avec un code d'invitation.
// GET → communautés visibles · POST {action: creer, nom, secteur, description, prive} · {action: rejoindre, id | code}
// · {action: quitter, id}
require __DIR__ . '/../db.php';

$moi = $_SESSION['utilisateur']['id'] ?? null;
$methode = $_SERVER['REQUEST_METHOD'];
const CODE_CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I : le code se recopie à la main
const MAX_COMMUNAUTES_CREEES = 5;

// Une communauté vue par l'utilisateur : le code d'invitation n'est montré qu'aux membres d'une communauté privée
function communaute(PDO $db, ?int $moi, int $id): ?array
{
    $q = $db->prepare('SELECT c.id, c.nom, c.secteur, c.description, c.prive, c.code,
            (SELECT COUNT(*) FROM membres WHERE communaute_id = c.id) AS membres,
            (SELECT COUNT(*) FROM annonces WHERE communaute_id = c.id AND debut >= :limite) AS sorties,
            (SELECT role FROM membres WHERE communaute_id = c.id AND utilisateur_id = :moi) AS role
        FROM communautes c WHERE c.id = :id');
    $q->execute(['limite' => gmdate('Y-m-d\TH:i:s\Z', time() - 2 * 3600), 'moi' => $moi, 'id' => $id]);
    $c = $q->fetch();
    if (!$c || ($c['prive'] && $c['role'] === null)) return null;
    $c['prive'] = (bool) $c['prive'];
    $c['membres'] = (int) $c['membres'];
    $c['sorties'] = (int) $c['sorties'];
    $c['membre'] = $c['role'] !== null;
    if (!$c['prive'] || !$c['membre']) $c['code'] = null;
    return $c;
}

if ($moi === null) repondre(['erreur' => 'Connexion requise'], 401);

if ($methode === 'GET') {
    $ids = $db->prepare('SELECT c.id FROM communautes c
        WHERE c.prive = 0 OR EXISTS (SELECT 1 FROM membres m WHERE m.communaute_id = c.id AND m.utilisateur_id = ?)
        ORDER BY c.prive, (SELECT COUNT(*) FROM membres WHERE communaute_id = c.id) DESC, c.nom');
    $ids->execute([$moi]);
    repondre(array_values(array_filter(array_map(fn ($r) => communaute($db, $moi, (int) $r['id']), $ids->fetchAll()))));
}

if ($methode !== 'POST') repondre(['erreur' => 'Méthode non prise en charge'], 405);

$action = $corps['action'] ?? '';
$maintenant = gmdate('Y-m-d\TH:i:s\Z');

if ($action === 'creer') {
    $nom = is_string($corps['nom'] ?? null) ? trim($corps['nom']) : '';
    $secteur = is_string($corps['secteur'] ?? null) ? trim($corps['secteur']) : '';
    $description = is_string($corps['description'] ?? null) ? trim($corps['description']) : '';
    $prive = !empty($corps['prive']) ? 1 : 0;
    if (mb_strlen($nom) < 3 || mb_strlen($nom) > 60 || mb_strlen($secteur) > 60 || mb_strlen($description) > 200) {
        repondre(['erreur' => 'Nom de 3 à 60 caractères, secteur 60 max, description 200 max'], 400);
    }
    $n = $db->prepare('SELECT COUNT(*) FROM communautes WHERE cree_par = ?');
    $n->execute([$moi]);
    if ($n->fetchColumn() >= MAX_COMMUNAUTES_CREEES) repondre(['erreur' => 'Tu as déjà créé ' . MAX_COMMUNAUTES_CREEES . ' communautés'], 400);
    $existe = $db->prepare('SELECT 1 FROM communautes WHERE nom = ?');
    $existe->execute([$nom]);
    if ($existe->fetchColumn()) repondre(['erreur' => 'Ce nom est déjà pris'], 409);

    $code = null;
    if ($prive) { $code = ''; for ($i = 0; $i < 6; $i++) $code .= CODE_CARACTERES[random_int(0, strlen(CODE_CARACTERES) - 1)]; }
    $db->prepare('INSERT INTO communautes (nom, secteur, description, prive, code, cree_par, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$nom, $secteur, $description, $prive, $code, $moi, $maintenant]);
    $id = (int) $db->lastInsertId();
    $db->prepare('INSERT INTO membres (communaute_id, utilisateur_id, role, depuis) VALUES (?, ?, \'admin\', ?)')->execute([$id, $moi, $maintenant]);
    repondre(communaute($db, $moi, $id), 201);
}

if ($action === 'rejoindre') {
    $code = is_string($corps['code'] ?? null) ? strtoupper(trim($corps['code'])) : '';
    if ($code !== '') { // privée : par code
        $q = $db->prepare('SELECT id FROM communautes WHERE prive = 1 AND code = ?');
        $q->execute([$code]);
        $id = (int) $q->fetchColumn();
        if (!$id) repondre(['erreur' => 'Code d\'invitation inconnu'], 404);
    } else { // publique : par identifiant
        $id = (int) ($corps['id'] ?? 0);
        $q = $db->prepare('SELECT 1 FROM communautes WHERE id = ? AND prive = 0');
        $q->execute([$id]);
        if (!$q->fetchColumn()) repondre(['erreur' => 'Communauté introuvable'], 404);
    }
    $db->prepare('INSERT OR IGNORE INTO membres (communaute_id, utilisateur_id, role, depuis) VALUES (?, ?, \'membre\', ?)')->execute([$id, $moi, $maintenant]);
    repondre(communaute($db, $moi, $id));
}

if ($action === 'quitter') {
    $id = (int) ($corps['id'] ?? 0);
    $db->prepare('DELETE FROM membres WHERE communaute_id = ? AND utilisateur_id = ?')->execute([$id, $moi]);
    $reste = $db->prepare('SELECT COUNT(*) FROM membres WHERE communaute_id = ?');
    $reste->execute([$id]);
    if ($reste->fetchColumn() == 0) {
        $db->prepare('DELETE FROM communautes WHERE id = ?')->execute([$id]); // plus personne : la communauté et ses sorties disparaissent
    } else { // plus d'admin : le plus ancien membre le devient
        $db->prepare('UPDATE membres SET role = \'admin\' WHERE rowid = (SELECT rowid FROM membres WHERE communaute_id = ? ORDER BY depuis, rowid LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM membres WHERE communaute_id = ? AND role = \'admin\')')->execute([$id, $id]);
    }
    repondre(['ok' => true]);
}

repondre(['erreur' => 'Action inconnue'], 400);
