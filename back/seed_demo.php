<?php
// Recrée les données de démonstration (communautés, trajets, passagers) : php back/seed_demo.php
// Relançable : les trajets sont recalculés par rapport à aujourd'hui. Détails dans demo_data.php.
$_SERVER['REQUEST_METHOD'] = 'GET';
require __DIR__ . '/db.php'; // crée aussi la démo si elle manque
require_once __DIR__ . '/demo_data.php';
echo seed_demo($db);
