// ==========================================
// Génération d'images "Mei" — remplace chaque membre BTS d'une photo de lieu par
// l'avatar personnalisé "Mei" de l'admin, en conservant pose(s) et décor.
// ==========================================
// Automatise le processus manuel que l'admin fait aujourd'hui à la main via ChatGPT :
// prendre une photo de lieu visité par BTS + l'image de référence fixe de Mei, et générer
// une recréation où Mei remplace chaque membre visible (demande du 16/09/2026).
//
// Règles (spécifiées par l'admin), appliquées via le prompt ci-dessous plutôt qu'en dur
// dans le code : le modèle détecte lui-même le nombre de membres visibles sur la photo.
//   - Un seul membre visible → Mei garde SA tenue originale (image de référence) et
//     reproduit EXACTEMENT la même pose que le membre sur la photo.
//   - Plusieurs membres visibles → Mei apparaît une fois par membre (mêmes poses
//     respectives) : une occurrence dans sa tenue originale, les autres dans des tenues
//     alternatives mais dans la même direction artistique (couleurs pastel, tenues
//     féminines, adaptées à la saison/au contexte visible sur la photo).
//
// Ajoute le résultat au MÊME champ que celui rempli depuis admin.html/le modal crayon
// (locationContent/{id}.recreatedPhotos, un tableau — "Mei's Pictures", galerie multi-photos
// depuis le 18/09/2026 ; voir window.createPhotoGalleryField() dans script.js) via
// arrayUnion(), plutôt que d'écraser un champ unique — aucune nouvelle infrastructure : le
// pipeline d'export existant (voir le bloc d'extraction base64 dans export-locations.js)
// transforme déjà chaque entrée de ce tableau en fichier image statique au prochain export,
// qu'elle soit ajoutée à la main ou par ce script. recreatedPhoto (chaîne, première photo)
// reste écrit en parallèle pour les consommateurs pas encore migrés vers le tableau (voir
// feed.html) — avec des lancements concurrents de ce script, "première photo" n'est
// qu'approximatif, acceptable puisque ce script Node est un chemin secondaire au bouton
// "Generate with Mei" intégré à admin.html.
//
// Pas de Firebase Storage ni de Cloud Function sur ce site (100% statique, voir README.md) —
// même schéma que le reste de admin-scripts/ : ce script tourne en local (ou via GitHub
// Actions comme example-ai-submission.js), et écrit directement dans Firestore avec un
// compte de service (Admin SDK, qui contourne les règles de sécurité — voir
// firestore.rules, locationContent exige normalement un compte admin authentifié côté
// client, non applicable ici).
//
//   cd admin-scripts && npm install
//   node generate-mei-recreation.js <locationId> <chemin-photo-lieu> [chemin-reference-mei]
//
// <chemin-reference-mei> est optionnel : par défaut ./mei-reference.jpg (voir .gitignore —
// jamais commitée, c'est une photo personnelle de l'admin ; place-la à cet emplacement une
// bonne fois pour toutes, ou passe un autre chemin en 3e argument à chaque lancement).
//
// Sécurité : GEMINI_API_KEY lue depuis .env (jamais en clair ici), même précaution que
// example-ai-submission.js.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function loadServiceAccount() {
    const localPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(localPath)) return require(localPath);
    if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    throw new Error(
        "Compte de service introuvable : ni serviceAccountKey.json en local, ni la variable " +
        "d'environnement FIREBASE_SERVICE_ACCOUNT (secret GitHub Actions). Voir README.md."
    );
}

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function readImageAsInlineData(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const data = fs.readFileSync(filePath).toString('base64');
    return { inlineData: { data, mimeType } };
}

const PROMPT = `Tu vas recevoir deux images : la PREMIÈRE est l'image de référence fixe d'un
personnage appelé "Mei" (son visage, sa morphologie, sa tenue originale) ; la SECONDE est une
photo réelle d'un lieu visité par un ou plusieurs membres du groupe BTS.

Ta tâche : régénère la SECONDE image (même lieu, même décor, même cadrage, même éclairage,
même ambiance) en remplaçant CHAQUE membre de BTS visible par le personnage Mei — jamais par
qui que ce soit d'autre, et sans jamais retoucher ou inventer le décor.

Règles à appliquer STRICTEMENT selon le nombre de membres BTS visibles sur la photo :

1. UN SEUL membre visible : remplace-le par Mei, avec EXACTEMENT la même pose, la même
   position et la même orientation que le membre sur la photo originale. Mei porte SA tenue
   originale telle que montrée sur l'image de référence (ne change pas sa tenue).

2. PLUSIEURS membres visibles : remplace CHAQUE membre par une occurrence de Mei, en
   conservant pour chacune la pose et la position exactes du membre qu'elle remplace (autant
   d'occurrences de Mei que de membres sur la photo originale). UNE seule de ces occurrences
   porte la tenue originale de Mei (image de référence). TOUTES les autres occurrences
   portent des tenues DIFFÉRENTES les unes des autres, mais cohérentes avec la même direction
   artistique que la tenue originale de Mei : couleurs pastel, coupes féminines, et adaptées
   au contexte visible sur la photo (tenues chaudes/hiver si la scène est visiblement
   hivernale ou neigeuse, tenues légères si la scène est visiblement estivale, etc.).

Dans tous les cas : garde le visage, les traits et la morphologie de Mei identiques à l'image
de référence sur chaque occurrence — ne les fais jamais varier d'une occurrence à l'autre.
Ne fais apparaître aucune personne réelle, seulement Mei. Renvoie uniquement l'image finale
recomposée, sans texte ni légende.`;

async function generateMeiRecreation(locationId, posePhotoPath, meiReferencePath) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Modèle capable de génération/édition d'image à partir d'images de référence (voir
    // example-ai-submission.js pour le modèle texte équivalent 'gemini-3.6-flash') — vérifie
    // le nom exact du modèle image disponible sur ton compte Google AI Studio au moment de
    // lancer ce script, les identifiants de modèle évoluant avec le temps.
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash-image' });

    const meiReference = readImageAsInlineData(meiReferencePath);
    const posePhoto = readImageAsInlineData(posePhotoPath);

    console.log(`Génération de la recréation Mei pour le lieu ${locationId}...`);
    const result = await model.generateContent([PROMPT, meiReference, posePhoto]);

    const parts = (result.response.candidates && result.response.candidates[0] && result.response.candidates[0].content.parts) || [];
    const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);
    if (!imagePart) {
        let refusalText = '';
        try { refusalText = result.response.text(); } catch (e) { /* pas de texte non plus */ }
        throw new Error("Le modèle n'a renvoyé aucune image" + (refusalText ? ` (réponse : ${refusalText})` : '.'));
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
    const ext = MIME_EXT[mimeType] || 'jpg';
    const dataUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;

    admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
    const db = admin.firestore();

    // Même champ, même format (data URL base64) que celui écrit par admin.html/le modal
    // crayon — le prochain export-locations.js extraira automatiquement chaque entrée du
    // tableau en fichier images/admin-upload-<id>-recreated-<i>.<ext> (voir le bloc
    // d'extraction déjà en place dans export-locations.js).
    await db.collection('locationContent').doc(String(locationId)).set(
        {
            recreatedPhotos: admin.firestore.FieldValue.arrayUnion(dataUrl),
            recreatedPhoto: dataUrl
        },
        { merge: true }
    );

    console.log(`Recréation Mei ajoutée à locationContent/${locationId}.recreatedPhotos (${mimeType}).`);

    // Copie locale pour vérification visuelle rapide avant le prochain export automatique.
    const previewPath = path.join(__dirname, `mei-preview-${locationId}.${ext}`);
    fs.writeFileSync(previewPath, Buffer.from(imagePart.inlineData.data, 'base64'));
    console.log(`Aperçu local enregistré : ${previewPath}`);
}

const [, , locationIdArg, posePhotoArg, meiReferenceArg] = process.argv;
if (!locationIdArg || !posePhotoArg) {
    console.error('Usage : node generate-mei-recreation.js <locationId> <chemin-photo-lieu> [chemin-reference-mei]');
    process.exit(1);
}
const meiReferencePath = meiReferenceArg || path.join(__dirname, 'mei-reference.jpg');
if (!fs.existsSync(meiReferencePath)) {
    console.error(`Image de référence Mei introuvable : ${meiReferencePath}\nPlace ta capture d'écran de Mei à cet emplacement (ou passe un autre chemin en 3e argument). Voir README.md.`);
    process.exit(1);
}
if (!fs.existsSync(posePhotoArg)) {
    console.error(`Photo de lieu introuvable : ${posePhotoArg}`);
    process.exit(1);
}

generateMeiRecreation(locationIdArg, posePhotoArg, meiReferencePath).catch((err) => {
    console.error('Erreur :', err);
    process.exit(1);
});
