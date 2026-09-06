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
// Automatisation (voir .github/workflows/ai-agent.yml) : le compte de service ne peut
// pas non plus être committé (voir .gitignore), donc ce script l'accepte de deux façons —
// `serviceAccountKey.json` en local, ou la variable d'environnement
// FIREBASE_SERVICE_ACCOUNT (son contenu JSON complet, en secret GitHub Actions) quand ce
// fichier n'existe pas, typiquement en CI. Même code, peu importe où il tourne.
//
// Politique du site (rappel, IMPORTANT) : ne jamais inventer une adresse, une date ou un
// lien — chaque proposition doit venir d'une vraie source vérifiable. Une proposition
// sans source vérifiable est à rejeter en relecture (voir admin.html), pas à publier
// "parce que ça semble plausible".
//
// Anti-doublon : comparer les NOMS seuls n'est pas fiable (l'IA reformule différemment
// d'une génération à l'autre) — et de toute façon, `locationContent` (la seule collection
// lue ci-dessous dans une version antérieure de ce script) ne contient JAMAIS le nom d'un
// lieu, seulement son texte riche : un filtre par nom basé dessus ne peut donc jamais rien
// détecter. Un lieu physique ne bouge jamais : on compare donc d'abord la DISTANCE entre
// chaque proposition et les lieux déjà connus (184 lieux historiques de script.js + ceux
// déjà approuvés dans Firestore). Mais la distance seule peut manquer un vrai doublon si
// l'IA ne donne que des coordonnées approximatives pour un lieu qu'elle reformule
// différemment (ex: "Magnate Cafe" proposé alors que la base a déjà "Cafe Magnate", à des
// coordonnées trop éloignées pour matcher) — findDuplicate() ajoute donc une deuxième
// vérification stricte : mêmes mots que le nom d'un lieu connu, juste dans un ordre
// différent. Voir duplicate-check.js pour le détail des deux vérifications.

require('dotenv').config(); // Va chercher la clé dans ton fichier .env (no-op si absent, comme en CI)
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { locationsFromSnapshot, combineExistingLocations, findDuplicate } = require('./duplicate-check');

const DUPLICATE_THRESHOLD_METERS = 50;

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
        // La liste des noms déjà connus est donnée à l'IA pour limiter d'emblée les
        // propositions redondantes (moins d'appels gaspillés) — findDuplicate() reste le
        // vrai filet de sécurité après coup, l'IA peut très bien se tromper ou reformuler
        // malgré cette liste.
        const existingNames = existingLocations.map((l) => l.name).filter(Boolean);

        // Les champs demandés correspondent à ceux attendus par admin.html / la carte (voir
        // window.approveLocationSubmission dans firebase-init.js) : une proposition qui
        // utiliserait d'autres noms de champs serait acceptée dans la file d'attente, mais
        // publierait un pin incomplet une fois approuvée (icône, adresse affichée...).
        // Contenu complet demandé (récit + infos pratiques + astuce) pour correspondre à la
        // qualité des fiches déjà publiées, PAS pour remplacer la relecture humaine : chaque
        // proposition reste en attente sur admin.html tant qu'elle n'est pas approuvée.
        const prompt = `Tu es un expert en tourisme K-pop spécialisé dans BTS.

Lieux déjà connus (NE PROPOSE AUCUN de ceux-ci, même reformulé différemment) :
${existingNames.join(', ')}

Trouve 5 lieux réels, différents et emblématiques liés à BTS, absents de la liste ci-dessus.
Pour chacun, rédige un contenu complet et soigné, dans le même esprit que les fiches déjà
publiées sur le site (récit narratif sur 2 paragraphes minimum, infos pratiques concrètes,
une astuce de visite). Règle absolue : ne jamais inventer une adresse, un lien ou une URL
de photo — si tu n'es pas certain à 100% qu'une information est réelle et vérifiable,
laisse le champ correspondant vide ("") plutôt que d'en inventer une.

Renvoie UNIQUEMENT un tableau JSON (array) valide contenant 5 objets avec cette structure exacte :
[{
  "name": "Nom du lieu",
  "group": "BTS",
  "member": "All (ou le nom du membre concerné)",
  "country": "Pays",
  "city": "Ville",
  "category": "Cafe, MV Location, Concerts, Landmarks...",
  "year": "Année",
  "address": "Adresse complète et réelle (jamais inventée)",
  "lat": 0.0, "lng": 0.0,
  "fullDescription": { "en": "<p>Premier paragraphe : le lieu lui-même, son contexte, son histoire.</p><p>Deuxième paragraphe : son lien concret avec BTS/le membre (tournage, évènement, visite...).</p>" },
  "practicalInfo": [ { "title": { "en": "How to get there" }, "text": { "en": "Indications concrètes pour s'y rendre." } } ],
  "tipsList": [ { "title": { "en": "Astuce" }, "text": { "en": "Un conseil concret et utile pour la visite." } } ],
  "img": "URL réelle d'une photo (Wikimedia Commons ou site officiel) — laisse vide (\\"\\") si tu n'es pas certain qu'elle existe",
  "episodeLink": "https://source-verifiable-reelle.com (laisse vide si aucune source certaine)"
}]`;

        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const locations = JSON.parse(text);

        console.log('🛡️ Vérification anti-doublon (distance GPS + mots du nom)...');
        let addedCount = 0;

        for (const loc of locations) {
            if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
                console.log(`🚫 Ignoré (coordonnées manquantes ou invalides) : ${loc.name}`);
                continue;
            }

            const duplicate = findDuplicate(loc, existingLocations, DUPLICATE_THRESHOLD_METERS);
            if (duplicate) {
                const why = duplicate.reason === 'distance'
                    ? `à ${duplicate.distanceMeters}m de "${duplicate.location.name}"`
                    : `mêmes mots que "${duplicate.location.name}"`;
                console.log(`🚫 Bloqué (${why}, déjà connu) : ${loc.name}`);
                continue;
            }

            if (!loc.img) console.log(`⚠️  Pas de photo fournie pour "${loc.name}" — à ajouter manuellement avant d'approuver.`);

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
