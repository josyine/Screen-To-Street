// ==========================================
// EXPORT STATIQUE DU CATALOGUE DE LIEUX (demande du 13/09/2026 : "je veux que tu mettes
// toutes les données des lieux en brut dans le site directement, je ne veux plus qu'ils
// soient stockés dans Firestore" — tout en gardant l'édition admin (icône crayon) et
// l'agent IA fonctionnels).
// ==========================================
//
// Ce script fusionne TOUTES les sources Firestore qui, avant ce changement, étaient
// relues séparément à CHAQUE visite du site (voir l'ancien bloc de fusion dans
// map.html, "firebase-ready" — retiré, remplacé par ce fichier) :
//   1. Le squelette historique (184 lieux, autrefois codés en dur dans script.js — extraits
//      une fois pour toutes dans historical-locations.json, instantané figé qui ne bouge
//      plus) — voir loadStaticLocations() dans duplicate-check.js.
//   2. `newLocations`      — nouveaux lieux approuvés depuis la file de relecture
//                            (agent IA ou soumission manuelle), voir
//                            approveLocationSubmission() dans firebase-init.js.
//   3. `locationSkeletonOverrides` — corrections Groupe/Membre/Pays/Ville/Année d'un
//                            lieu déjà publié, faites via l'icône crayon.
//   4. `locationContent`   — texte riche (récit, infos pratiques, conseils, liens
//                            réseaux/vidéo) de TOUS les lieux, existants ou nouveaux.
//   5. `siteConfig/hiddenLocations` — lieux "supprimés" depuis admin.html (retirés
//                            du résultat plutôt que vraiment supprimés, un lieu codé
//                            en dur ne pouvant pas l'être).
//
// Le résultat est écrit dans locations-data.js, à la racine du site, sous la forme
// `window.STATIC_LOCATIONS = [...]` — chargé par un <script> AVANT script.js sur
// chaque page (voir index.html et consorts). script.js lit désormais
// `celebLocations` depuis cette variable plutôt que de la coder en dur lui-même.
//
// Firestore reste la SEULE source d'écriture (l'admin édite toujours via l'icône
// crayon, l'agent IA écrit toujours dans locationSubmissions) — ce script ne fait que
// republier un instantané figé pour que les VISITEURS n'aient plus jamais besoin
// d'une lecture Firestore rien que pour afficher le catalogue. Un changement admin
// n'est donc visible publiquement qu'après le prochain export, pas instantanément —
// compromis accepté (voir .github/workflows/export-locations.yml pour l'automatiser).
//
// Usage :
//   npm install                 (une seule fois, dans ce dossier)
//   node export-locations.js
// (compte de service : serviceAccountKey.json local, ou variable d'environnement
// FIREBASE_SERVICE_ACCOUNT — voir README.md, même mécanisme que les autres scripts
// de ce dossier.)

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { loadStaticLocations } = require('./duplicate-check');

function loadServiceAccount() {
    const localPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(localPath)) return require(localPath);
    if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    throw new Error(
        "Compte de service introuvable : ni serviceAccountKey.json en local, ni la variable " +
        "d'environnement FIREBASE_SERVICE_ACCOUNT (secret GitHub Actions). Voir README.md."
    );
}

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();

async function main() {
    const historicalDataPath = path.join(__dirname, 'historical-locations.json');
    const outputPath = path.join(__dirname, '..', 'locations-data.js');

    console.log('Chargement du squelette historique (historical-locations.json)...');
    const staticSkeleton = loadStaticLocations(historicalDataPath);
    console.log(`  ${staticSkeleton.length} lieux.`);

    console.log('Lecture des collections Firestore...');
    const [newLocsSnap, overridesSnap, contentSnap, hiddenDoc] = await Promise.all([
        db.collection('newLocations').get(),
        db.collection('locationSkeletonOverrides').get(),
        db.collection('locationContent').get(),
        db.collection('siteConfig').doc('hiddenLocations').get(),
    ]);

    const newLocs = [];
    newLocsSnap.forEach((d) => newLocs.push(d.data()));
    console.log(`  ${newLocs.length} nouveaux lieux approuvés.`);

    const overrides = {};
    overridesSnap.forEach((d) => { overrides[d.id] = d.data(); });
    console.log(`  ${Object.keys(overrides).length} corrections de squelette.`);

    const content = {};
    contentSnap.forEach((d) => { content[d.id] = d.data(); });
    console.log(`  ${Object.keys(content).length} fiches de contenu riche.`);

    const hiddenIds = new Set((hiddenDoc.exists && Array.isArray(hiddenDoc.data().ids) ? hiddenDoc.data().ids : []).map(String));
    console.log(`  ${hiddenIds.size} lieux masqués.`);

    // Même ordre de fusion que l'ancien bloc de map.html : squelette + nouveaux lieux,
    // PUIS corrections de squelette, PUIS contenu riche, PUIS filtrage des masqués.
    const existingIds = new Set(staticSkeleton.map((l) => String(l.id)));
    const merged = staticSkeleton.slice();
    newLocs.forEach((l) => { if (l && l.id && !existingIds.has(String(l.id))) merged.push(l); });

    merged.forEach((loc) => {
        const idStr = String(loc.id);
        if (overrides[idStr]) Object.assign(loc, overrides[idStr]);
        if (content[idStr]) Object.assign(loc, content[idStr]);
    });

    const published = merged.filter((loc) => !hiddenIds.has(String(loc.id)));
    console.log(`Résultat : ${published.length} lieux publiés (${merged.length - published.length} masqués retirés).`);

    // Tri stable par id (les ids numériques d'abord, dans l'ordre, puis les ids "new-..."
    // par ordre alphabétique) — un fichier généré déterministe est plus facile à relire
    // dans un diff git qu'un ordre qui dépendrait de l'ordre de réponse Firestore.
    published.sort((a, b) => {
        const an = typeof a.id === 'number' ? a.id : Number(a.id);
        const bn = typeof b.id === 'number' ? b.id : Number(b.id);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
        if (!Number.isNaN(an)) return -1;
        if (!Number.isNaN(bn)) return 1;
        return String(a.id).localeCompare(String(b.id));
    });

    const header = `// ==========================================
// AUTO-GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
// ==========================================
// Régénéré par admin-scripts/export-locations.js (voir
// .github/workflows/export-locations.yml pour le lancer depuis GitHub, ou
// "node export-locations.js" en local) à partir de Firestore : squelette historique +
// nouveaux lieux approuvés + corrections + contenu riche, moins les lieux masqués.
// Toute modification manuelle de ce fichier serait silencieusement écrasée au
// prochain export — passez par l'icône crayon sur la carte (admin) ou l'agent IA
// (locationSubmissions) pour changer un lieu, jamais ici directement.
// Généré le ${new Date().toISOString()}.
`;
    const body = `window.STATIC_LOCATIONS = ${JSON.stringify(published, null, 2)};\n`;
    fs.writeFileSync(outputPath, header + body, 'utf8');
    console.log(`Écrit : ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(0)} Ko).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
