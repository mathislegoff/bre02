<?php
// Données de démonstration réalistes : communautés du Finistère, sorties des prochains jours, participants.
// Usage : php back/seed_demo.php   (relançable : les sorties sont recalculées par rapport à aujourd'hui)
//  - spots et communes réels (voir front/public/data/plages.geojson) ; départs de covoiturage plausibles ;
//  - heures du matin le week-end, en fin d'après-midi en semaine, avant la nuit selon la saison ;
//  - équipement conseillé selon la température de l'eau en Bretagne ;
//  - comptes fictifs sans mot de passe utilisable (mdp = « ! ») : personne ne peut s'y connecter.
$_SERVER['REQUEST_METHOD'] = 'GET';
require __DIR__ . '/db.php';

mt_srand(2026); // mêmes participants à chaque lancement
$paris = new DateTimeZone('Europe/Paris');
$maintenant = new DateTimeImmutable('now', $paris);
$mois = (int) $maintenant->format('n');

$NOMS = ['Maëlle', 'Yann', 'Gwenn', 'Erwan', 'Nolwenn', 'Tom', 'Lou', 'Jules', 'Anaïs', 'Ronan', 'Clara', 'Mathieu', 'Soizic', 'Kévin', 'Manon',
    'Pierre-Yves', 'Camille', 'Loïc', 'Élise', 'Hugo', 'Morgane', 'Alan', 'Julie', 'Thibault'];

// Équipement selon la saison (eau de 10-12 °C l'hiver, 16-18 °C l'été)
$equipement = match (true) {
    in_array($mois, [12, 1, 2, 3]) => 'Combi 5/4, cagoule, gants et chaussons.',
    in_array($mois, [4, 5, 11]) => 'Combi 4/3, chaussons conseillés.',
    in_array($mois, [10]) => 'Combi 4/3.',
    default => 'Combi 3/2.',
};
// Heure d'une sortie du soir : avant la nuit
$soir = in_array($mois, [11, 12, 1, 2]) ? '16:30' : (in_array($mois, [3, 10]) ? '17:30' : '18:30');
$matin = in_array($mois, [11, 12, 1, 2]) ? '09:30' : '08:30';

$COMMUNAUTES = [
    'crozon' => ['Surfeurs de Crozon-Camaret', 'Presqu’île de Crozon', 'Sessions autour de Kerloc’h, Veriac’h et Goulien. Tous niveaux : on s’organise la veille selon la houle.', 0, null, 14],
    'torche' => ['La Torche Crew', 'Pays bigouden', 'Les habitués de La Torche et de Penhors : sorties et covoiturage depuis Quimper et Pont-l’Abbé.', 0, null, 18],
    'brest' => ['Brest avant le boulot', 'Brest et rade', 'Départs de Brest vers l’Iroise (Blancs Sablons, Porsmilin, Minou) : sorties courtes, covoiturage depuis Brest.', 0, null, 16],
    'debutants' => ['Débutants Iroise', 'Finistère nord-ouest', 'Apprendre sans pression : petits spots abrités, petites conditions, on se regroupe et on s’entraide.', 0, null, 11],
    'conquet' => ['Les copains du Conquet', 'Le Conquet', 'Groupe privé : on se prévient quand ça marche aux Blancs Sablons.', 1, 'CONQ26', 6],
];

// [communauté, jour, moment, spot, départ, places, niveau, note]   jour : sam | dim | semaine | demain
$SORTIES = [
    ['crozon', 'sam', 'matin', 'Kerloc’h', 'Crozon', 2, 'intermediaire', 'Rendez-vous au parking de la plage 15 min avant.'],
    ['crozon', 'dim', 'matin', 'Veriac’h', '', 0, 'tous', 'On y va chacun de son côté, on se retrouve sur le sable.'],
    ['crozon', 'semaine', 'soir', 'Goulien', 'Camaret-sur-Mer', 2, 'tous', 'Session après le travail, retour avant la nuit.'],
    ['torche', 'sam', 'matin', 'Torche', 'Quimper', 3, 'intermediaire', 'Départ de Quimper (parking de la gare), retour en début d’après-midi.'],
    ['torche', 'dim', 'matin', 'Penhors', 'Pont-l’Abbé', 2, 'tous', 'Plus abrité que La Torche quand ça gonfle.'],
    ['torche', 'semaine', 'soir', 'Torche', '', 0, 'intermediaire', 'Session du soir, on se retrouve à l’eau.'],
    ['brest', 'semaine', 'soir', 'Blancs Sablons', 'Brest', 3, 'intermediaire', 'Départ de Brest, retour avant 20 h.'],
    ['brest', 'sam', 'matin', 'Porsmilin', 'Brest (Saint-Marc)', 2, 'tous', 'Départ 8 h de Saint-Marc.'],
    ['brest', 'dim', 'matin', 'Minou', '', 0, 'confirme', 'Si la houle est trop petite, on se rabat sur Porsmilin.'],
    ['debutants', 'sam', 'matin', 'Trez Hir', 'Brest', 2, 'debutant', 'Planches mousse acceptées, on reste près du bord.'],
    ['debutants', 'dim', 'matin', 'Bertheaume', '', 0, 'debutant', 'Petite session douce, on commence dans le blanc.'],
    ['conquet', 'semaine', 'soir', 'Blancs Sablons', '', 0, 'confirme', 'Message dans le groupe si ça devient trop gros.'],
];

// Comptes fictifs
$ids = [];
$q = $db->prepare('INSERT OR IGNORE INTO utilisateurs (nom, mdp) VALUES (?, \'!\')');
foreach ($NOMS as $nom) {
    $q->execute([$nom]);
    $r = $db->prepare('SELECT id FROM utilisateurs WHERE nom = ?'); $r->execute([$nom]);
    $ids[] = (int) $r->fetchColumn();
}
$demo = implode(',', $ids);

// Repartir de zéro côté sorties (les dates changent chaque jour) ; communautés et membres sont conservés
$db->exec("DELETE FROM annonces WHERE auteur_id IN ($demo)");
$db->exec("DELETE FROM reponses WHERE utilisateur_id IN ($demo)");

$iso = fn (DateTimeImmutable $d) => $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
$comm = [];
foreach ($COMMUNAUTES as $cle => [$nom, $secteur, $description, $prive, $code, $nbMembres]) {
    $q = $db->prepare('SELECT id FROM communautes WHERE nom = ?'); $q->execute([$nom]);
    $id = (int) $q->fetchColumn();
    if (!$id) {
        $db->prepare('INSERT INTO communautes (nom, secteur, description, prive, code, cree_par, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$nom, $secteur, $description, $prive, $code, $ids[0], $iso($maintenant->modify('-90 days'))]);
        $id = (int) $db->lastInsertId();
    }
    // Membres : un administrateur puis des membres tirés parmi les comptes fictifs
    $choisis = $ids; mt_srand(crc32($cle)); shuffle($choisis);
    $choisis = array_slice($choisis, 0, $nbMembres);
    foreach ($choisis as $i => $uid) {
        $db->prepare('INSERT OR IGNORE INTO membres (communaute_id, utilisateur_id, role, depuis) VALUES (?, ?, ?, ?)')
            ->execute([$id, $uid, $i === 0 ? 'admin' : 'membre', $iso($maintenant->modify('-' . (10 + $i * 7) . ' days'))]);
    }
    $comm[$cle] = ['id' => $id, 'membres' => $choisis];
}

// Prochain jour qui convient, à partir de demain
function prochain_jour(DateTimeImmutable $maintenant, string $jour): DateTimeImmutable
{
    for ($i = 1; $i <= 7; $i++) {
        $d = $maintenant->modify("+$i day");
        $n = (int) $d->format('N'); // 1 = lundi … 7 = dimanche
        if (($jour === 'sam' && $n === 6) || ($jour === 'dim' && $n === 7) || ($jour === 'semaine' && $n <= 5) || $jour === 'demain') return $d;
    }
    return $maintenant->modify('+1 day');
}

$total = 0;
foreach ($SORTIES as $k => [$cle, $jour, $moment, $spot, $depart, $places, $niveau, $note]) {
    $jourDate = prochain_jour($maintenant, $jour);
    if ($jour === 'semaine') $jourDate = $jourDate->modify('+' . ($k % 3) . ' day'); // étale un peu les sorties de semaine
    while ((int) $jourDate->format('N') > 5 && $jour === 'semaine') $jourDate = $jourDate->modify('+1 day');
    [$h, $m] = explode(':', $moment === 'soir' ? $soir : $matin);
    $debut = $jourDate->setTime((int) $h, (int) $m);

    $membres = $comm[$cle]['membres'];
    $auteur = $membres[1 + ($k % max(1, count($membres) - 1))] ?? $membres[0];
    $db->prepare('INSERT INTO annonces (communaute_id, auteur_id, spot, debut, places, depart, niveau, note, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$comm[$cle]['id'], $auteur, $spot, $iso($debut), $places, $depart === '' ? null : $depart, $niveau, trim("$note $equipement"), $iso($maintenant->modify('-' . (1 + $k % 4) . ' hours'))]);
    $annonce = (int) $db->lastInsertId();

    // Participants : l'auteur et quelques membres ; des places en voiture prises, sans remplir toutes les voitures sauf une
    $db->prepare('INSERT INTO reponses (annonce_id, utilisateur_id, place) VALUES (?, ?, 0)')->execute([$annonce, $auteur]);
    $autres = array_values(array_diff($membres, [$auteur]));
    mt_srand($k + 7); shuffle($autres);
    $venus = min(count($autres), 2 + ($k * 3) % 5);
    $prises = $places > 0 ? min($venus, $k % 4 === 0 ? $places : max(0, $places - 1)) : 0;
    foreach (array_slice($autres, 0, $venus) as $i => $uid) {
        $db->prepare('INSERT OR IGNORE INTO reponses (annonce_id, utilisateur_id, place) VALUES (?, ?, ?)')->execute([$annonce, $uid, $i < $prises ? 1 : 0]);
    }
    $total++;
}
echo count($NOMS) . " comptes fictifs, " . count($COMMUNAUTES) . " communautés, $total sorties à venir. Groupe privé : code CONQ26 (rejoindre avec un compte).\n";
