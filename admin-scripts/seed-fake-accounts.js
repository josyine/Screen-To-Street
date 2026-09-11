// ==========================================
// SEED UNIQUE — crée 5 faux comptes ("personas" de fans) qui rédigent des avis et des
// notes sur un sous-ensemble RÉALISTE de lieux (jamais tous les 184 : chaque persona
// visite entre 10 et 28 lieux, avec un biais vers un groupe préféré, comme un vrai fan)
// pour amorcer les statistiques communautaires (locationRatings, avis publics) avant que
// de vrais visiteurs n'existent en nombre. Demandé le 06/09/2026 ; la question de
// transparence (des avis qui se font passer pour ceux de vrais utilisateurs) a été
// explicitement soulevée et écartée par le porteur du projet.
//
// Discrétion interne : chaque compte/avis créé par ce script porte un champ `_seeded:
// true` invisible dans l'interface (aucun écran du site ne l'affiche ni ne le filtre),
// gardé uniquement pour qu'on puisse retrouver et supprimer ce contenu plus tard si
// besoin (voir removeFakeAccounts() en bas de ce fichier).
//
// À exécuter UNE SEULE FOIS, localement (jamais depuis le site) :
//   1. npm install firebase-admin   (une seule fois, dans ce dossier)
//   2. Générez une clé de compte de service : Console Firebase > Paramètres du projet >
//      Comptes de service > "Générer une nouvelle clé privée".
//   3. Placez le fichier téléchargé ici sous le nom serviceAccountKey.json (jamais commité).
//   4. node seed-fake-accounts.js
//      (ou : node seed-fake-accounts.js --remove   pour tout retirer proprement plus tard)
//
// Idempotent : si un compte "persona" existe déjà (retrouvé par son email), il est
// entièrement ignoré (pas de doublon de visites/avis, pas de double incrément des
// agrégats) plutôt que re-seedé.
// ==========================================

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Fichier introuvable : ' + serviceAccountPath);
    console.error('Téléchargez une clé de compte de service depuis la console Firebase et placez-la ici sous ce nom.');
    process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();
const auth = admin.auth();
const increment = admin.firestore.FieldValue.increment;
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// ------------------------------------------------------------------
// Extraction de celebLocations : depuis le 13/09/2026, les 184 lieux historiques vivent
// dans historical-locations.json (instantané figé), plus dans script.js — voir
// export-locations.js pour l'explication complète de la nouvelle architecture statique.
// ------------------------------------------------------------------
function loadCelebLocations() {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'historical-locations.json'), 'utf8'));
}

const FOOD_RELATED_CATEGORIES = ['Cafe', 'Restaurants'];

// ------------------------------------------------------------------
// 5 personas de fans — chacun avec un biais de groupe préféré (comme un vrai compte
// fan aurait tendance à surtout visiter les lieux de SON groupe), un nombre de visites
// réaliste, et un ton de rédaction différent pour ne pas avoir 5 comptes qui sonnent
// pareil.
// ------------------------------------------------------------------
// NOTE : le site n'a quasiment que des lieux BTS (183 sur 184, 1 seul Blackpink au
// moment d'écrire ce script) — biaiser les personas par GROUPE n'aurait donc aucun sens
// (une persona "fan de Blackpink" ne pourrait visiter qu'un seul lieu, ce qui serait
// justement le genre de motif bizarre à éviter). On biaise plutôt par CATÉGORIE, qui a
// une vraie diversité (Concerts, Landmarks, Cafe, Museums...) — voir preferredCategories
// ci-dessous, qui doit rester un sous-ensemble des catégories réellement présentes.
const PERSONAS = [
    { username: 'seoul_army_kate', email: 'seoul.army.kate@example.com', firstName: 'Kate', preferredCategories: ['Concerts', 'Landmarks'], visitCount: 24, publicChance: 0.3 },
    { username: 'minarmy92', email: 'minarmy92@example.com', firstName: 'Min', preferredCategories: ['MV Location', 'Bon Voyage'], visitCount: 16, publicChance: 0.2 },
    { username: 'blink_traveler', email: 'blink.traveler@example.com', firstName: 'Sofia', preferredCategories: ['Cafe', 'Restaurants'], visitCount: 14, publicChance: 0.35 },
    { username: 'pink_venom_jade', email: 'pink.venom.jade@example.com', firstName: 'Jade', preferredCategories: ['Fashion', 'Pop-up Store'], visitCount: 12, publicChance: 0.25 },
    { username: 'kpop_roadtripper', email: 'kpop.roadtripper@example.com', firstName: 'Alex', preferredCategories: null, visitCount: 28, publicChance: 0.2 },
];

// Avis génériques (ressenti/expérience uniquement — jamais un fait précis sur le lieu
// qui pourrait se révéler faux) : mélange EN/FR pour rester crédible sur un site
// multilingue, plusieurs longueurs et tons différents.
const REVIEW_TEMPLATES = [
    "Such a special place for any fan, so worth the trip.",
    "Amazing to finally stand where it all happened — chills!",
    "Un peu difficile à trouver mais ça valait vraiment le détour.",
    "So peaceful early morning, definitely recommend going before it gets crowded.",
    "Loved the atmosphere here, felt so connected watching everything back.",
    "Plus petit que je l'imaginais mais l'ambiance est unique.",
    "Took so many photos, this was a highlight of the whole trip.",
    "Vraiment émouvant d'être enfin ici après l'avoir vu tant de fois en vidéo.",
    "Great stop if you're doing a fan trip through the area.",
    "Le personnel a été adorable quand on a expliqué pourquoi on venait.",
    "Worth planning your day around — don't rush it.",
    "Not much signage but locals were happy to point us in the right direction.",
    "Un incontournable si vous êtes fan, on y retournera avec plaisir.",
    "Quiet when we visited, easy to take it all in.",
    "Better in person than in any photo, honestly.",
];
const NOTES_CHANCE = 0.6; // toutes les visites n'ont pas forcément un commentaire

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
// Note à 5 étoiles biaisée positif (comme la grande majorité des avis de fans réels) :
// 5 le plus fréquent, puis 4, rarement 3, quasiment jamais en dessous.
function biasedStar() {
    const r = Math.random();
    if (r < 0.55) return 5;
    if (r < 0.88) return 4;
    if (r < 0.98) return 3;
    return 2;
}
function randomPastDate() {
    const daysAgo = randInt(10, 730); // jusqu'à 2 ans en arrière
    const d = new Date(Date.now() - daysAgo * 86400000);
    return d.toISOString().split('T')[0];
}

function pickVisitLocations(locations, persona) {
    const cats = persona.preferredCategories;
    const preferred = cats ? locations.filter(l => cats.includes(l.category)) : [];
    const others = cats ? locations.filter(l => !cats.includes(l.category)) : locations.slice();
    const preferredCount = Math.min(preferred.length, Math.round(persona.visitCount * 0.65));
    const shuffledPreferred = preferred.sort(() => Math.random() - 0.5).slice(0, preferredCount);
    const remaining = persona.visitCount - shuffledPreferred.length;
    const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, Math.max(0, remaining));
    return shuffledPreferred.concat(shuffledOthers);
}

async function ensureUsernameReserved(username, uid) {
    const key = username.toLowerCase().trim();
    await db.collection('usernames').doc(key).set({ uid, _seeded: true });
}

async function seedPersona(persona, locations) {
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(persona.email);
        console.log(`  ${persona.username} : compte déjà existant (${userRecord.uid}), seeding ignoré.`);
        return;
    } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
    }

    userRecord = await auth.createUser({
        email: persona.email,
        password: 'Seed-' + Math.random().toString(36).slice(2) + '!A1',
        displayName: persona.username,
    });
    const uid = userRecord.uid;
    console.log(`  ${persona.username} : compte créé (${uid})`);

    const visitLocs = pickVisitLocations(locations, persona);
    const visitedLocsField = [];
    const ratingsBatch = {}; // locId -> deltas à appliquer sur locationRatings
    const reviewWrites = []; // {locId, data}

    visitLocs.forEach(loc => {
        const isFood = FOOD_RELATED_CATEGORIES.includes(loc.category);
        const rating = biasedStar();
        const ratingValue = biasedStar();
        const ratingAccessibility = biasedStar();
        const ratingSiteQuality = biasedStar();
        const ratingFood = isFood ? biasedStar() : null;
        const isPublic = Math.random() < persona.publicChance;
        const notes = Math.random() < NOTES_CHANCE ? pick(REVIEW_TEMPLATES) : '';
        const visit = { date: randomPastDate(), rating, notes, photo: null, isPublic, ratingValue, ratingAccessibility, ratingSiteQuality };
        if (ratingFood != null) visit.ratingFood = ratingFood;

        visitedLocsField.push({ id: loc.id, visits: [visit] });

        const deltas = ratingsBatch[loc.id] || { sum: 0, count: 0, valueSum: 0, valueCount: 0, accessibilitySum: 0, accessibilityCount: 0, siteQualitySum: 0, siteQualityCount: 0, foodSum: 0, foodCount: 0 };
        deltas.sum += rating; deltas.count += 1;
        deltas.valueSum += ratingValue; deltas.valueCount += 1;
        deltas.accessibilitySum += ratingAccessibility; deltas.accessibilityCount += 1;
        deltas.siteQualitySum += ratingSiteQuality; deltas.siteQualityCount += 1;
        if (ratingFood != null) { deltas.foodSum += ratingFood; deltas.foodCount += 1; }
        ratingsBatch[loc.id] = deltas;

        if (isPublic) {
            reviewWrites.push({
                locId: loc.id,
                data: Object.assign({
                    uid, rating, notes, photo: null, ratingValue, ratingAccessibility, ratingSiteQuality,
                    userName: persona.firstName, userPhoto: null,
                    updatedAt: serverTimestamp(), _seeded: true,
                }, ratingFood != null ? { ratingFood } : {}),
            });
        }
    });

    await ensureUsernameReserved(persona.username, uid);

    await db.collection('users').doc(uid).set({
        username: persona.username,
        firstName: persona.firstName,
        lastName: '',
        email: persona.email,
        interestCountry: 'KR',
        reason: '',
        unlockedGroups: [],
        wishlistLocs: [],
        visitedLocs: visitedLocsField,
        myTrips: [],
        createdAt: serverTimestamp(),
        _seeded: true,
    });

    // Agrégats locationRatings, par lots de 400 écritures.
    const locIds = Object.keys(ratingsBatch);
    for (let i = 0; i < locIds.length; i += 400) {
        const batch = db.batch();
        locIds.slice(i, i + 400).forEach(locId => {
            const d = ratingsBatch[locId];
            const payload = {};
            Object.keys(d).forEach(k => { if (d[k]) payload[k] = increment(d[k]); });
            batch.set(db.collection('locationRatings').doc(String(locId)), payload, { merge: true });
        });
        await batch.commit();
    }

    // Avis publics (une petite minorité des visites, voir publicChance).
    for (const { locId, data } of reviewWrites) {
        await db.collection('locationReviews').doc(String(locId)).collection('items').doc(uid).set(data);
    }

    console.log(`  ${persona.username} : ${visitLocs.length} lieux visités, ${reviewWrites.length} avis publics.`);
}

async function main() {
    const locations = loadCelebLocations();
    console.log(`${locations.length} lieux chargés depuis script.js.`);
    const realCategories = new Set(locations.map(l => l.category));
    PERSONAS.forEach(p => {
        (p.preferredCategories || []).forEach(cat => {
            if (!realCategories.has(cat)) {
                throw new Error(`Persona "${p.username}" : preferredCategories contient "${cat}", absente de celebLocations (catégories réelles : ${[...realCategories].join(', ')}). Corrigez PERSONAS avant de continuer.`);
            }
        });
    });
    console.log(`Seeding de ${PERSONAS.length} comptes...`);
    for (const persona of PERSONAS) {
        await seedPersona(persona, locations);
    }
    await db.collection('siteStats').doc('global').set({ totalUsers: increment(PERSONAS.length) }, { merge: true });
    console.log('Terminé.');
}

// ------------------------------------------------------------------
// Retrait complet (node seed-fake-accounts.js --remove) : supprime les 5 comptes Auth,
// leurs documents users/usernames, leurs avis publics, et retire leur contribution des
// agrégats locationRatings — jamais une suppression brutale des documents locationRatings
// eux-mêmes (d'autres vraies notes peuvent s'y être ajoutées entre-temps).
// ------------------------------------------------------------------
async function removeFakeAccounts() {
    const locations = loadCelebLocations();
    for (const persona of PERSONAS) {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(persona.email);
        } catch (e) {
            if (e.code === 'auth/user-not-found') { console.log(`  ${persona.username} : déjà absent.`); continue; }
            throw e;
        }
        const uid = userRecord.uid;
        const userDoc = await db.collection('users').doc(uid).get();
        const visitedLocs = (userDoc.exists && userDoc.data().visitedLocs) || [];

        for (let i = 0; i < visitedLocs.length; i += 400) {
            const batch = db.batch();
            visitedLocs.slice(i, i + 400).forEach(entry => {
                const visit = entry.visits && entry.visits[0];
                if (!visit) return;
                const isFood = visit.ratingFood != null;
                const payload = {
                    sum: increment(-(visit.rating || 0)), count: increment(-1),
                    valueSum: increment(-(visit.ratingValue || 0)), valueCount: increment(-1),
                    accessibilitySum: increment(-(visit.ratingAccessibility || 0)), accessibilityCount: increment(-1),
                    siteQualitySum: increment(-(visit.ratingSiteQuality || 0)), siteQualityCount: increment(-1),
                };
                if (isFood) { payload.foodSum = increment(-visit.ratingFood); payload.foodCount = increment(-1); }
                batch.set(db.collection('locationRatings').doc(String(entry.id)), payload, { merge: true });
                batch.delete(db.collection('locationReviews').doc(String(entry.id)).collection('items').doc(uid));
            });
            await batch.commit();
        }

        await db.collection('users').doc(uid).delete();
        await db.collection('usernames').doc(persona.username.toLowerCase()).delete();
        await auth.deleteUser(uid);
        console.log(`  ${persona.username} : compte et contributions retirés.`);
    }
    await db.collection('siteStats').doc('global').set({ totalUsers: increment(-PERSONAS.length) }, { merge: true });
    console.log('Retrait terminé.');
}

if (process.argv.includes('--remove')) {
    removeFakeAccounts().catch(err => { console.error(err); process.exit(1); });
} else {
    main().catch(err => { console.error(err); process.exit(1); });
}
