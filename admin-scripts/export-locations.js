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
//   6. `locationSubmissions` — lue UNIQUEMENT pour son champ reviewedAt (demande du
//                            13/09/2026, "classe les locations par ordre d'ajout") : posé
//                            en horodatage `addedAt` sur chaque nouveau lieu correspondant,
//                            pour que renderLocations() dans script.js puisse enfin trier
//                            par vraie date d'ajout plutôt que par id (qui n'est un nombre
//                            que pour les 184 lieux historiques — un id "new-xxxxx" cassait
//                            silencieusement ce tri, `b.id - a.id` valant NaN).
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
    const [newLocsSnap, overridesSnap, contentSnap, hiddenDoc, submissionsSnap] = await Promise.all([
        db.collection('newLocations').get(),
        db.collection('locationSkeletonOverrides').get(),
        db.collection('locationContent').get(),
        db.collection('siteConfig').doc('hiddenLocations').get(),
        db.collection('locationSubmissions').get(),
    ]);

    const newLocs = [];
    newLocsSnap.forEach((d) => newLocs.push(d.data()));
    console.log(`  ${newLocs.length} nouveaux lieux approuvés.`);

    // Horodatage d'approbation (demande du 13/09/2026, "classe les locations par ordre
    // d'ajout, les plus récents en premier") — newLocations/{id} lui-même ne porte aucune
    // date (voir approveLocationSubmission() dans firebase-init.js, qui n'y écrit que les
    // champs "squelette"), donc impossible de savoir quand un lieu a été ajouté à partir de
    // cette seule collection. Mais son id est TOUJOURS 'new-' + l'id du document
    // locationSubmissions d'origine, qui lui a bien reviewedAt (posé par ce même
    // approveLocationSubmission() au moment de l'approbation) — on va donc le rechercher là.
    const approvedAtById = {};
    submissionsSnap.forEach((d) => {
        const data = d.data();
        const ts = data.reviewedAt && typeof data.reviewedAt.toMillis === 'function' ? data.reviewedAt.toMillis() : null;
        if (ts) approvedAtById['new-' + d.id] = ts;
    });

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
    newLocs.forEach((l) => {
        if (!l || !l.id || existingIds.has(String(l.id))) return;
        if (approvedAtById[l.id]) l.addedAt = approvedAtById[l.id];
        merged.push(l);
    });

    merged.forEach((loc) => {
        const idStr = String(loc.id);
        if (overrides[idStr]) Object.assign(loc, overrides[idStr]);
        if (content[idStr]) Object.assign(loc, content[idStr]);
    });

    const published = merged.filter((loc) => !hiddenIds.has(String(loc.id)));
    console.log(`Résultat : ${published.length} lieux publiés (${merged.length - published.length} masqués retirés).`);

    // Extraction des photos en base64 (demande du 16/09/2026, "le temps de chargement de
    // la page feed est extrêmement long") : `img`/`recreatedPhoto` peuvent contenir une
    // data URL base64 quand l'admin a uploadé une photo directement (pencil icon/admin.html)
    // plutôt que de coller une URL externe — ce site n'a pas de Firebase Storage (voir le
    // README), donc c'est la seule façon d'uploader une photo aujourd'hui. Le problème :
    // laissée telle quelle, cette data URL finit copiée verbatim dans locations-data.js,
    // chargé en <script> bloquant sur CHAQUE page du site (même feed.html, qui n'affiche
    // qu'un onglet "Recreate the Photo" et n'a besoin d'aucune des 183 autres images) — un
    // seul lieu avec une grosse photo pouvait à lui seul ajouter plusieurs centaines de Ko à
    // TOUTE page du site. Ici, chaque data URL est décodée UNE FOIS et écrite comme vrai
    // fichier binaire dans images/ (servi normalement par GitHub Pages, mis en cache par le
    // navigateur, chargé en parallèle plutôt qu'en bloquant le script) — remplacée dans le
    // JSON exporté par son chemin relatif. Firestore lui-même garde la data URL (jamais
    // modifié par ce script, lecture seule) : ce n'est qu'une optimisation du fichier
    // EXPORTÉ, ré-appliquée à chaque régénération.
    const imagesDir = path.join(__dirname, '..', 'images');
    const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    let extractedCount = 0;
    published.forEach((loc) => {
        ['img', 'recreatedPhoto'].forEach((field) => {
            const val = loc[field];
            if (typeof val !== 'string' || !val.startsWith('data:image/')) return;
            const m = val.match(/^data:(image\/[a-z]+);base64,(.*)$/s);
            if (!m) return;
            const ext = MIME_EXT[m[1]] || 'jpg';
            const safeId = String(loc.id).replace(/[^a-zA-Z0-9_-]/g, '');
            const fieldSlug = field === 'img' ? 'photo' : 'recreated';
            const filename = `admin-upload-${safeId}-${fieldSlug}.${ext}`;
            fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(m[2], 'base64'));
            loc[field] = `images/${filename}`;
            extractedCount++;
        });
        // "Mei's Pictures" en galerie multi-photos (demande du 18/09/2026) —
        // loc.recreatedPhotos est un tableau, chaque entrée peut être une data URL
        // (upload direct/"Generate with Mei") ou déjà une URL externe/chemin relatif
        // (rien à faire dans ce cas). Même traitement que 'img'/'recreatedPhoto'
        // ci-dessus, appliqué entrée par entrée, sinon un lieu à plusieurs photos
        // uploadées réintroduirait exactement le bug de gonflement corrigé au-dessus.
        if (Array.isArray(loc.recreatedPhotos)) {
            loc.recreatedPhotos = loc.recreatedPhotos.map((val, i) => {
                if (typeof val !== 'string' || !val.startsWith('data:image/')) return val;
                const m = val.match(/^data:(image\/[a-z]+);base64,(.*)$/s);
                if (!m) return val;
                const ext = MIME_EXT[m[1]] || 'jpg';
                const safeId = String(loc.id).replace(/[^a-zA-Z0-9_-]/g, '');
                const filename = `admin-upload-${safeId}-recreated-${i}.${ext}`;
                fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(m[2], 'base64'));
                extractedCount++;
                return `images/${filename}`;
            });
        }
    });
    if (extractedCount) console.log(`  ${extractedCount} photo(s) uploadée(s) en base64 extraite(s) vers images/.`);

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
