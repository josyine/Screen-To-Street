// ==========================================
// AUDIT — vérifie que les lieux en attente dans "Location submissions" (admin.html) ne
// sont pas déjà des lieux existants du site (demande du 23/09/2026, "vérifie que les
// lieux de 'Location submissions' n'existent pas déjà dans mon site").
// ==========================================
// Réutilise exactement la même logique anti-doublon que l'agent IA au moment de PROPOSER
// un lieu (distance GPS < 50m OU mêmes mots du nom réordonnés — voir duplicate-check.js) :
// utile ici en AUDIT PONCTUEL de la file déjà en attente, par exemple après une longue
// pause de l'agent (voir la note dans .github/workflows/ai-agent.yml sur sa pause du
// 23/09/2026) ou pour repasser un coup de propre après un import manuel massif.
//
// Seules les propositions de NOUVEAU lieu sont vérifiées (pas de `matchedLocId`) : une
// proposition avec `matchedLocId` est une CORRECTION délibérée d'un lieu déjà existant
// (voir renderCard() dans admin.html, badge "Correction to existing location #X") — la
// retenir comme "doublon" n'aurait aucun sens, elle est censée pointer sur ce lieu.
//
// Sans accès à un compte de service Firebase dans cet environnement Claude Code, ce script
// n'a pas pu être exécuté automatiquement — à lancer une fois, localement, comme les
// autres scripts de ce dossier :
//   1. npm install   (une seule fois, dans ce dossier)
//   2. Générez une clé de compte de service (Console Firebase > Paramètres du projet >
//      Comptes de service > "Générer une nouvelle clé privée") et placez-la ici sous
//      serviceAccountKey.json (jamais commit — voir .gitignore), ou passez
//      FIREBASE_SERVICE_ACCOUNT en variable d'environnement (même mécanisme que
//      example-ai-submission.js).
//   3. node check-submission-duplicates.js            (rapport seul, ne modifie rien)
//      node check-submission-duplicates.js --reject    (rejette aussi les doublons trouvés,
//                                                        même effet qu'un clic "Reject" sur
//                                                        chacun d'eux dans admin.html)
// ==========================================

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { locationsFromSnapshot, combineExistingLocations, findDuplicate } = require('./duplicate-check');

function loadServiceAccount() {
    const localPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(localPath)) return require(localPath);
    if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    throw new Error(
        "Compte de service introuvable : ni serviceAccountKey.json en local, ni la variable " +
        "d'environnement FIREBASE_SERVICE_ACCOUNT. Voir le commentaire en haut de ce fichier."
    );
}

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();

const DUPLICATE_THRESHOLD_METERS = 50;
const shouldReject = process.argv.includes('--reject');

async function main() {
    const historicalDataPath = path.join(__dirname, 'historical-locations.json');
    const newLocationsSnap = await db.collection('newLocations').get();
    const existing = combineExistingLocations(historicalDataPath, locationsFromSnapshot(newLocationsSnap));
    console.log(`${existing.length} lieux déjà publiés (historiques + approuvés) chargés pour comparaison.`);

    const submissionsSnap = await db.collection('locationSubmissions').where('status', '==', 'pending').get();
    console.log(`${submissionsSnap.size} proposition(s) en attente dans locationSubmissions.\n`);

    const newLocationCandidates = [];
    submissionsSnap.forEach((docSnap) => {
        const sub = docSnap.data();
        if (sub.matchedLocId) return; // correction délibérée d'un lieu existant, pas un doublon
        if (typeof sub.lat !== 'number' || typeof sub.lng !== 'number') return; // pas assez d'info pour comparer
        newLocationCandidates.push({ id: docSnap.id, data: sub });
    });

    let duplicateCount = 0;
    for (const { id, data: sub } of newLocationCandidates) {
        const dup = findDuplicate({ lat: sub.lat, lng: sub.lng, name: sub.name }, existing, DUPLICATE_THRESHOLD_METERS);
        if (!dup) continue;
        duplicateCount++;
        const reasonText = dup.reason === 'distance'
            ? `à ${dup.distanceMeters}m de`
            : 'même nom (mots réordonnés) que';
        console.log(`DOUBLON — submission "${sub.name}" (${id}) ${reasonText} "${dup.location.name}" (id ${dup.location.id}).`);
        if (shouldReject) {
            await db.collection('locationSubmissions').doc(id).set({ status: 'rejected' }, { merge: true });
            console.log(`  -> rejetée.`);
        }
    }

    console.log(`\n${duplicateCount} doublon(s) trouvé(s) sur ${newLocationCandidates.length} proposition(s) de nouveau lieu vérifiée(s)` +
        `${shouldReject ? ' (rejetés)' : ' (relancez avec --reject pour les rejeter automatiquement)'}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
