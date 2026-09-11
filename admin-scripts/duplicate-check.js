// ==========================================
// ANTI-DOUBLON GÉOGRAPHIQUE — pour un agent (IA ou script) qui propose de nouveaux lieux.
// ==========================================
// Un lieu physique ne change jamais de place : comparer les COORDONNÉES est donc bien
// plus fiable que comparer les noms, qui varient selon la langue/graphie utilisée par
// l'IA (ex: "Cafe Camptong" vs "카페 캠프통" vs une légère variante orthographique).
//
// Ce module combine les DEUX sources de vérité du site pour obtenir la liste complète
// des lieux déjà connus, avec leurs coordonnées :
//   1. Les 184 lieux "historiques" : depuis le 13/09/2026 (voir export-locations.js), ils
//      ne vivent plus dans script.js mais dans historical-locations.json (instantané figé,
//      extrait une fois pour toutes de l'ancien tableau `celebLocations` de script.js) —
//      PAS dans Firestore non plus : la collection `locationContent` ne contient que le
//      texte riche (description, infos pratiques...), jamais lat/lng ni le nom.
//   2. Les lieux approuvés depuis via admin.html : ceux-là sont dans Firestore, collection
//      `newLocations` (lecture publique, voir firebase-init.js), et ONT lat/lng.
//
// Deux façons de récupérer la partie "approuvés" (2) selon le SDK Firebase déjà utilisé
// par votre script :
//   - SDK client (pas de compte de service) : loadApprovedLocations(firebaseConfig) ou
//     loadAllExistingLocations(historicalDataPath, firebaseConfig) font tout en un appel.
//   - SDK Admin (compte de service, ex: un agent qui écrit aussi dans Firestore) :
//     réutilisez votre `db` déjà initialisé — locationsFromSnapshot(await
//     db.collection('newLocations').get()) puis combineExistingLocations(historicalDataPath,
//     ce résultat). Voir example-ai-submission.js pour un exemple complet.
//
//   npm install firebase   // seulement pour loadApprovedLocations / loadAllExistingLocations
//   node duplicate-check.js          // auto-test avec un exemple

const fs = require('fs');

const EARTH_RADIUS_M = 6371000;

function haversineMeters(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Depuis le 13/09/2026, les 184 lieux historiques sont un instantané JSON figé
// (historical-locations.json) plutôt qu'un tableau JS littéral dans script.js — voir
// export-locations.js pour l'explication complète de la nouvelle architecture statique.
function loadStaticLocations(historicalDataPath) {
    return JSON.parse(fs.readFileSync(historicalDataPath, 'utf8'));
}

// Marche avec un QuerySnapshot du SDK Admin (`db.collection('x').get()`) OU du SDK
// client (`getDocs(collection(db, 'x'))`) — les deux exposent `.forEach()` + `doc.data()`.
// Pratique pour un script qui a déjà son propre `db` (ex: initialisé via un compte de
// service) et ne veut pas que ce module ouvre une deuxième connexion Firebase.
function locationsFromSnapshot(snapshot) {
    const result = [];
    snapshot.forEach((d) => result.push(d.data()));
    return result;
}

// Combine les 184 lieux historiques avec une liste déjà récupérée de lieux approuvés
// (typiquement `locationsFromSnapshot(await db.collection('newLocations').get())`).
function combineExistingLocations(historicalDataPath, approvedLocations) {
    return loadStaticLocations(historicalDataPath)
        .concat(approvedLocations || [])
        .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number');
}

async function loadApprovedLocations(firebaseConfig) {
    // require() différé : ce module reste utilisable (loadStaticLocations,
    // findNearbyDuplicate...) même sans le paquet `firebase` installé, tant qu'on n'a pas
    // besoin de lire Firestore.
    const { initializeApp } = require('firebase/app');
    const { getFirestore, collection, getDocs } = require('firebase/firestore');
    // Nom d'app unique : évite un conflit si ce module est require() en même temps qu'un
    // autre script qui a déjà initializeApp()-é l'app Firebase par défaut.
    const app = initializeApp(firebaseConfig, 'duplicate-check-' + Date.now());
    const db = getFirestore(app);
    const snap = await getDocs(collection(db, 'newLocations'));
    const result = [];
    snap.forEach((d) => result.push(d.data()));
    return result;
}

// Liste complète (historiques + approuvés) contre laquelle vérifier une nouvelle proposition.
async function loadAllExistingLocations(historicalDataPath, firebaseConfig) {
    const [staticLocs, approvedLocs] = await Promise.all([
        Promise.resolve(loadStaticLocations(historicalDataPath)),
        loadApprovedLocations(firebaseConfig),
    ]);
    return staticLocs
        .concat(approvedLocs)
        .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number');
}

// Renvoie { location, distanceMeters } pour le lieu existant le plus proche s'il est à
// moins de `thresholdMeters`, sinon null. thresholdMeters=50 par défaut : deux lieux
// distincts (ex: une rue commerçante et une boutique qui s'y trouve) sont rarement à
// moins de 50m l'un de l'autre, mais un même lieu re-proposé par l'IA avec des
// coordonnées légèrement différentes (arrondi, précision GPS) le sera toujours.
function findNearbyDuplicate(lat, lng, existingLocations, thresholdMeters = 50) {
    let closest = null;
    for (const loc of existingLocations) {
        const d = haversineMeters(lat, lng, loc.lat, loc.lng);
        if (d <= thresholdMeters && (!closest || d < closest.distanceMeters)) {
            closest = { location: loc, distanceMeters: Math.round(d) };
        }
    }
    return closest;
}

// Retire les accents, met en minuscules, découpe en mots (ponctuation ignorée) et TRIE
// ces mots — "Cafe Magnate" et "Magnate Cafe" donnent alors exactement la même clé. C'est
// volontairement une égalité STRICTE de l'ensemble des mots, pas une comparaison floue :
// une IA peut réordonner "Cafe Magnate" en "Magnate Cafe" d'une génération à l'autre (même
// lieu), mais une clé stricte évite de rapprocher à tort deux lieux différents qui
// partagent juste un mot générique ("Cafe X" et "Cafe Y" ont des clés différentes).
function normalizedNameKey(name) {
    if (!name) return '';
    return name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .sort()
        .join(' ');
}

// Vérification à deux niveaux : distance GPS (fiable mais inefficace si l'IA ne donne que
// des coordonnées approximatives/génériques pour un lieu qu'elle reformule différemment),
// PUIS mots du nom strictement identiques une fois réordonnés (attrape "Magnate Cafe" vs
// "Cafe Magnate" même quand les coordonnées proposées sont trop éloignées pour matcher).
// Renvoie { location, reason: 'distance'|'name', distanceMeters? } ou null.
function findDuplicate(candidate, existingLocations, thresholdMeters = 50) {
    const distanceDup = findNearbyDuplicate(candidate.lat, candidate.lng, existingLocations, thresholdMeters);
    if (distanceDup) return Object.assign({ reason: 'distance' }, distanceDup);

    const candidateKey = normalizedNameKey(candidate.name);
    if (candidateKey) {
        const nameMatch = existingLocations.find((loc) => normalizedNameKey(loc.name) === candidateKey);
        if (nameMatch) return { location: nameMatch, reason: 'name' };
    }
    return null;
}

module.exports = {
    haversineMeters,
    loadStaticLocations,
    locationsFromSnapshot,
    combineExistingLocations,
    loadApprovedLocations,
    loadAllExistingLocations,
    findNearbyDuplicate,
    normalizedNameKey,
    findDuplicate,
};

// Auto-test quand ce fichier est exécuté directement (`node duplicate-check.js`) : charge
// les lieux existants et vérifie un point qu'on sait être à ~0m de Cafe Camptong (id 1).
if (require.main === module) {
    const path = require('path');
    const firebaseConfig = {
        apiKey: 'AIzaSyBa1e1JhWCxYI3fSWtVN6TsFiOnvxH7i5I',
        authDomain: 'screen-to-street-e29ff.firebaseapp.com',
        projectId: 'screen-to-street-e29ff',
        storageBucket: 'screen-to-street-e29ff.firebasestorage.app',
        messagingSenderId: '48854939735',
        appId: '1:48854939735:web:4f6264a5589ebbf5a70b12',
    };
    const historicalDataPath = path.join(__dirname, 'historical-locations.json');

    loadAllExistingLocations(historicalDataPath, firebaseConfig)
        .then((existing) => {
            console.log(`${existing.length} lieux existants chargés (historiques + approuvés).`);
            const testPoint = { lat: 37.5255, lng: 127.0375 }; // = Cafe Camptong (id 1)
            const dup = findNearbyDuplicate(testPoint.lat, testPoint.lng, existing);
            if (dup) {
                console.log(`OK : doublon détecté à ${dup.distanceMeters}m -> "${dup.location.name}" (id ${dup.location.id}).`);
            } else {
                console.log('ATTENTION : aucun doublon détecté pour un point qui aurait dû en trouver un.');
            }
        })
        .catch((err) => { console.error(err); process.exit(1); });
}
