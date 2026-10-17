<?php
// Données de démonstration réalistes : communautés du Finistère, covoiturages des prochains jours, passagers.
//  - volontairement peu d'exemples ; spots et communes réels (voir front/public/data/plages.geojson) ;
//  - heures du matin le week-end, en fin d'après-midi en semaine, avant la nuit selon la saison ;
//  - équipement conseillé selon la température de l'eau en Bretagne ;
//  - comptes fictifs sans mot de passe utilisable (mdp = « ! ») : personne ne peut s'y connecter.
// schema_communaute.php les (re)crée tout seul quand la base n'a aucune communauté ou plus aucun trajet à venir :
// la démo n'est jamais vide. À la main : php back/seed_demo.php

// Vrai quand la démo est à (re)faire : aucune communauté, ou des comptes fictifs mais plus un seul trajet à venir
function demo_a_rafraichir(PDO $db): bool
{
    if ((int) $db->query('SELECT COUNT(*) FROM communautes')->fetchColumn() === 0) return true;
    $q = $db->prepare('SELECT COUNT(*) FROM annonces WHERE debut >= ?');
    $q->execute([gmdate('Y-m-d\TH:i:s\Z')]);
    $demo = (int) $db->query("SELECT COUNT(*) FROM utilisateurs WHERE mdp = '!'")->fetchColumn();
    return $demo > 0 && (int) $q->fetchColumn() === 0;
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

function seed_demo(PDO $db): string
{
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
        'crozon' => ['Surfeurs de Crozon-Camaret', 'Presqu’île de Crozon', 'Covoiturage autour de Kerloc’h, Veriac’h et Goulien.', 0, null, 12],
        'brest' => ['Brest avant le boulot', 'Brest et rade', 'Covoiturage depuis Brest vers l’Iroise : Blancs Sablons, Porsmilin, Minou.', 0, null, 16],
        'conquet' => ['Les copains du Conquet', 'Le Conquet', 'Groupe privé : sur invitation.', 1, 'CONQ26', 6],
    ];
    
    // [communauté, jour, moment, départ, spot, places, note]   jour : sam | dim | semaine
    $SORTIES = [
        ['crozon', 'sam', 'matin', 'Crozon', 'Kerloc’h', 3, 'Rendez-vous au parking de la plage 15 min avant.'],
        ['crozon', 'semaine', 'soir', 'Camaret-sur-Mer', 'Goulien', 2, 'Retour avant la nuit.'],
        ['brest', 'semaine', 'soir', 'Brest', 'Blancs Sablons', 3, 'Retour avant 20 h.'],
        ['brest', 'sam', 'matin', 'Brest (Saint-Marc)', 'Porsmilin', 2, 'Départ de Saint-Marc.'],
        ['brest', 'dim', 'matin', 'Brest', 'Minou', 3, ''],
        ['conquet', 'semaine', 'soir', 'Brest', 'Blancs Sablons', 2, ''],
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
    
    $noms = implode(',', array_map(fn ($c) => $db->quote($c[0]), $COMMUNAUTES));
    $db->exec("DELETE FROM communautes WHERE cree_par IN ($demo) AND nom NOT IN ($noms)"); // anciennes communautés de démonstration
    
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
    
    $total = 0;
    foreach ($SORTIES as $k => [$cle, $jour, $moment, $depart, $spot, $places, $note]) {
        $jourDate = prochain_jour($maintenant, $jour);
        if ($jour === 'semaine') $jourDate = $jourDate->modify('+' . ($k % 3) . ' day'); // étale un peu les trajets de semaine
        while ((int) $jourDate->format('N') > 5 && $jour === 'semaine') $jourDate = $jourDate->modify('+1 day');
        [$h, $m] = explode(':', $moment === 'soir' ? $soir : $matin);
        $debut = $jourDate->setTime((int) $h, (int) $m);
    
        $membres = $comm[$cle]['membres'];
        $conducteur = $membres[1 + ($k % max(1, count($membres) - 1))] ?? $membres[0];
        $db->prepare('INSERT INTO annonces (communaute_id, auteur_id, spot, debut, places, depart, niveau, note, cree_le) VALUES (?, ?, ?, ?, ?, ?, \'tous\', ?, ?)')
            ->execute([$comm[$cle]['id'], $conducteur, $spot, $iso($debut), $places, $depart, trim("$note $equipement"), $iso($maintenant->modify('-' . (1 + $k % 4) . ' hours'))]);
        $annonce = (int) $db->lastInsertId();
    
        // Passagers : des places réservées, sans remplir la voiture (sauf pour un trajet)
        $autres = array_values(array_diff($membres, [$conducteur]));
        mt_srand($k + 7); shuffle($autres);
        $prises = min(count($autres), $k === 0 ? $places : max(0, $places - 1 - ($k % 2)));
        foreach (array_slice($autres, 0, $prises) as $uid) {
            $db->prepare('INSERT OR IGNORE INTO reponses (annonce_id, utilisateur_id, place) VALUES (?, ?, 1)')->execute([$annonce, $uid]);
        }
        $total++;
    }
    return count($NOMS) . " comptes fictifs, " . count($COMMUNAUTES) . " communautés, $total trajets à venir. Groupe privé : code CONQ26 (rejoindre avec un compte).\n";
}
