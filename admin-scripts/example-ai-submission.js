// ==========================================
// Agent IA (Gemini) — propose de nouveaux lieux BTS pour relecture dans admin.html.
// ==========================================
// Utilise le SDK Admin (compte de service — voir migrate-location-content.js pour
// comment en générer un) car ce script ne tourne que localement, jamais dans un
// navigateur : il a donc le droit d'écrire directement dans `locationSubmissions`, alors
// qu'un agent utilisant le SDK client public devrait passer par une écriture `create`
// (voir window.submitLocationForReview dans firebase-init.js pour cette autre approche).
//
//   npm install firebase-admin @google/generative-ai dotenv
//   node example-ai-submission.js
//
// Sécurité : la clé API Gemini vit uniquement dans un fichier .env local (jamais commité,
// voir .gitignore) et est lue via process.env.GEMINI_API_KEY — ne JAMAIS l'écrire en
// clair ici. GitHub bloque de toute façon tout push contenant une clé reconnue (secret
// scanning) ; ce fichier reste donc identique partout (ton Mac ou GitHub), sans version
// séparée à synchroniser à la main.
//
// Politique du site (rappel, IMPORTANT) : ne jamais inventer une adresse, une date ou un
// lien — chaque proposition doit venir d'une vraie source vérifiable. Une proposition
// sans source vérifiable est à rejeter en relecture (voir admin.html), pas à publier
// "parce que ça semble plausible".
//
// Anti-doublon : comparer les NOMS n'est pas fiable (l'IA reformule différemment d'une
// génération à l'autre) — et de toute façon, `locationContent` (la seule collection lue
// ci-dessous dans une version antérieure de ce script) ne contient JAMAIS le nom d'un
// lieu, seulement son texte riche : un filtre par nom basé dessus ne peut donc jamais
// rien détecter. Un lieu physique ne bouge jamais : on compare donc la DISTANCE entre
// chaque proposition et les lieux déjà connus (184 lieux historiques de script.js + ceux
// déjà approuvés dans Firestore) — voir duplicate-check.js.

require('dotenv').config(); // Va chercher la clé dans ton fichier .env
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { loadStaticLocations, locationsFromSnapshot, combineExistingLocations, findNearbyDuplicate } = require('./duplicate-check');

const DUPLICATE_THRESHOLD_METERS = 50;

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// L'agent utilise la variable sécurisée, ta vraie clé n'est plus écrite ici !
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runAgent() {
    try {
        console.log('🔍 Chargement des lieux déjà connus (historiques + approuvés)...');
        const scriptJsPath = path.join(__dirname, '..', 'script.js');
        const newLocationsSnapshot = await db.collection('newLocations').get();
        const existingLocations = combineExistingLocations(scriptJsPath, locationsFromSnapshot(newLocationsSnapshot));
        console.log(`   ${existingLocations.length} lieux existants chargés.`);

        console.log("🤖 L'IA génère 5 propositions pour BTS...");
        // Les champs demandés correspondent à ceux attendus par admin.html / la carte
        // (voir window.approveLocationSubmission dans firebase-init.js) : une proposition
        // qui utiliserait d'autres noms de champs serait acceptée dans la file d'attente,
        // mais publierait un pin incomplet une fois approuvée (icône, adresse affichée...).
        const prompt = `Trouve 5 lieux réels, différents et emblématiques liés à BTS.
    Renvoie UNIQUEMENT un tableau JSON (array) valide contenant 5 objets avec cette structure exacte :
    [{ "name": "Nom du lieu", "group": "BTS", "member": "All (ou le nom du membre concerné)", "country": "Pays", "city": "Ville", "category": "Cafe, MV Location, Concerts, Landmarks...", "year": "Année", "address": "Adresse complète et réelle (jamais inventée)", "lat": 0.0, "lng": 0.0, "fullDescription": { "en": "<p>Description</p>" }, "episodeLink": "https://source-verifiable-reelle.com" }]`;

        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const locations = JSON.parse(text);

        console.log('🛡️ Vérification anti-doublon (distance GPS)...');
        let addedCount = 0;

        for (const loc of locations) {
            if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
                console.log(`🚫 Ignoré (coordonnées manquantes ou invalides) : ${loc.name}`);
                continue;
            }

            const duplicate = findNearbyDuplicate(loc.lat, loc.lng, existingLocations, DUPLICATE_THRESHOLD_METERS);
            if (duplicate) {
                console.log(`🚫 Bloqué (à ${duplicate.distanceMeters}m de "${duplicate.location.name}", déjà connu) : ${loc.name}`);
                continue;
            }

            await db.collection('locationSubmissions').add({
                ...loc,
                status: 'pending',
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                submittedBy: 'Gemini-AI-Agent',
            });
            console.log(`✅ Ajouté à la file : ${loc.name}`);
            addedCount++;
        }
        console.log(`🎉 Terminé ! ${addedCount} nouveaux lieux à relire sur admin.html.`);
    } catch (error) {
        console.error('❌ Erreur :', error);
    }
}

runAgent();
