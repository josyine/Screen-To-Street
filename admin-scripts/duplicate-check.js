// ==========================================
// ANTI-DOUBLON GÉOGRAPHIQUE — pour un agent (IA ou script) qui propose de nouveaux lieux.
// ==========================================
// Un lieu physique ne change jamais de place : comparer les COORDONNÉES est donc bien
// plus fiable que comparer les noms, qui varient selon la langue/graphie utilisée par
// l'IA (ex: "Cafe Camptong" vs "카페 캠프통" vs une légère variante orthographique).
//
// Ce module combine les DEUX sources de vérité du site pour obtenir la liste complète
// des lieux déjà connus, avec leurs coordonnées :
//   1. Les 184 lieux "historiques" : ils vivent dans script.js (tableau celebLocations),
//      PAS dans Firestore — la collection `locationContent` ne contient que le texte
//      riche (description, infos pratiques...), jamais lat/lng ni le nom.
//   2. Les lieux approuvés depuis via admin.html : ceux-là sont dans Firestore, collection
//      `newLocations` (lecture publique, voir firebase-init.js), et ONT lat/lng.
//
//   npm install firebase
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

// script.js n'est pas du JSON (c'est un fichier de navigateur avec `let celebLocations =
// [...]`) : on isole juste le texte du littéral tableau (en comptant la profondeur des
// crochets pour trouver son `]` fermant), puis on l'évalue en scope global isolé
// (indirect eval — pas d'accès aux variables locales de ce fichier).
function loadStaticLocations(scriptJsPath) {
    const src = fs.readFileSync(scriptJsPath, 'utf8');
    const marker = 'let celebLocations = [';
    const start = src.indexOf(marker);
    if (start === -1) throw new Error(`"${marker}" introuvable dans ${scriptJsPath}`);
    let i = start + marker.length - 1;
    let depth = 0;
    let end = -1;
    for (; i < src.length; i++) {
        if (src[i] === '[') depth++;
        else if (src[i] === ']') {
            depth--;
            if (depth === 0) { end = i; break; }
        }
    }
    if (end === -1) throw new Error('Crochet fermant introuvable (script.js a-t-il changé de structure ?)');
    const arrayLiteral = src.slice(start + marker.length - 1, end + 1);
    return (0, eval)(arrayLiteral); // eslint-disable-line no-eval
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
async function loadAllExistingLocations(scriptJsPath, firebaseConfig) {
    const [staticLocs, approvedLocs] = await Promise.all([
        Promise.resolve(loadStaticLocations(scriptJsPath)),
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

module.exports = {
    haversineMeters,
    loadStaticLocations,
    loadApprovedLocations,
    loadAllExistingLocations,
    findNearbyDuplicate,
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
    const scriptJsPath = path.join(__dirname, '..', 'script.js');

    loadAllExistingLocations(scriptJsPath, firebaseConfig)
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
