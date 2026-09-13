// ==========================================
// MIGRATION UNIQUE — normalise les valeurs de "category" au singulier (demande du
// 13/09/2026, "parfois... 'Museums' et d'autres fois 'Museum'... je veux que tu
// gardes la version sans s").
//
// Le squelette historique (historical-locations.json, ~184 lieux) et le fichier
// publié (locations-data.js) ont déjà été corrigés directement dans ce commit. Mais
// deux collections Firestore peuvent ENCORE contenir l'ancienne version au pluriel,
// et la RÉINTRODUIRAIENT silencieusement au prochain export
// (admin-scripts/export-locations.js) si on ne les corrige pas aussi :
//   - `newLocations`             (lieux approuvés depuis la file de soumissions —
//                                  voir approveLocationSubmission() dans firebase-init.js)
//   - `locationSkeletonOverrides` (corrections faites via l'icône crayon / "Existing
//                                  locations", qui ont priorité sur le squelette au
//                                  prochain export — voir export-locations.js)
//
// Ce script les corrige toutes les deux. Sans accès à un compte de service Firebase
// dans cet environnement, il n'a pas pu être exécuté automatiquement — à lancer une
// fois, localement, comme les autres scripts de ce dossier :
//   1. npm install   (une seule fois, dans ce dossier)
//   2. Générez une clé de compte de service (Console Firebase > Paramètres du
//      projet > Comptes de service > "Générer une nouvelle clé privée") et placez-la
//      ici sous serviceAccountKey.json (jamais commit — voir .gitignore), ou passez
//      FIREBASE_SERVICE_ACCOUNT en variable d'environnement (même mécanisme que
//      export-locations.js).
//   3. node fix-category-names.js
//
// Sûr à relancer : ne touche que les documents dont "category" est encore au
// pluriel, ne fait rien sur les autres.
// ==========================================

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

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

// Même liste que le nettoyage déjà appliqué à historical-locations.json/locations-data.js.
const SINGULARIZE = {
    'Concerts': 'Concert',
    'Landmarks': 'Landmark',
    'Museums': 'Museum',
    'Restaurants': 'Restaurant',
    'Art & Murals': 'Art & Mural',
};

async function fixCollection(collectionName) {
    const snap = await db.collection(collectionName).get();
    let fixed = 0;
    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const singular = SINGULARIZE[data.category];
        if (singular) {
            await docSnap.ref.set({ category: singular }, { merge: true });
            console.log(`  ${collectionName}/${docSnap.id}: "${data.category}" -> "${singular}"`);
            fixed++;
        }
    }
    console.log(`${collectionName} : ${fixed} document(s) corrigé(s) sur ${snap.size}.`);
    return fixed;
}

async function main() {
    console.log('Correction de newLocations...');
    const a = await fixCollection('newLocations');
    console.log('Correction de locationSkeletonOverrides...');
    const b = await fixCollection('locationSkeletonOverrides');
    console.log(`Terminé : ${a + b} document(s) corrigé(s) au total.`);
    console.log('Pensez à relancer "node export-locations.js" (ou le workflow GitHub Actions correspondant) pour republier locations-data.js avec ces corrections.');
}

main().catch((err) => { console.error(err); process.exit(1); });
