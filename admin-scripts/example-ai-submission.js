// ==========================================
// EXEMPLE — comment un agent (IA ou script) propose un nouveau lieu pour relecture.
// ==========================================
// Contrairement à migrate-location-content.js, celui-ci N'A PAS besoin d'un compte de
// service : la règle Firestore de locationSubmissions autorise `create` à tout le monde
// (voir le commentaire au-dessus de window.submitLocationForReview dans
// firebase-init.js) — seule la LECTURE et l'APPROBATION sont réservées aux
// administrateurs. Un agent peut donc utiliser le SDK Firebase "client" normal (celui
// déjà utilisé par le site), avec les mêmes identifiants publics (une clé API Firebase
// côté client n'est pas un secret — la sécurité vient des règles, pas de la clé).
//
//   npm install firebase
//   node example-ai-submission.js
//
// Politique du site (rappel, IMPORTANT) : ne jamais inventer une adresse, une date ou un
// lien — `sourceNote`/`episodeLink` doivent toujours pointer vers une vraie source
// vérifiable. Une proposition sans source vérifiable est à rejeter en relecture, pas à
// publier "parce que ça semble plausible".
//
// Anti-doublon : le nom seul n'est PAS fiable pour détecter qu'un lieu existe déjà (une
// IA peut le formuler différemment d'une génération à l'autre). Ce script vérifie donc
// la DISTANCE entre la proposition et les lieux déjà connus (historiques + déjà
// approuvés) avant tout envoi — voir duplicate-check.js.

const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, collection, setDoc, serverTimestamp } = require('firebase/firestore');
const { loadAllExistingLocations, findNearbyDuplicate } = require('./duplicate-check');

const DUPLICATE_THRESHOLD_METERS = 50;

const firebaseConfig = {
    apiKey: "AIzaSyBa1e1JhWCxYI3fSWtVN6TsFiOnvxH7i5I",
    authDomain: "screen-to-street-e29ff.firebaseapp.com",
    projectId: "screen-to-street-e29ff",
    storageBucket: "screen-to-street-e29ff.firebasestorage.app",
    messagingSenderId: "48854939735",
    appId: "1:48854939735:web:4f6264a5589ebbf5a70b12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function submitLocationForReview(data, submittedBy) {
    const ref = doc(collection(db, 'locationSubmissions'));
    await setDoc(ref, Object.assign({}, data, {
        status: 'pending',
        submittedBy: submittedBy || 'unknown',
        submittedAt: serverTimestamp()
    }));
    return ref.id;
}

// A NEW location: omit matchedLocId. To propose a CORRECTION to an existing one instead,
// set matchedLocId to that location's numeric id (e.g. 44) — the reviewer will then see
// it tagged "Correction to existing location #44" and approving it updates that
// location's content instead of publishing a new pin.
const exampleSubmission = {
    name: 'Example Cafe (delete me, this is just a sample)',
    group: 'BTS', member: 'All', country: 'South Korea', city: 'Seoul',
    category: 'Cafe', year: '2024',
    episode: 'Example context for this location',
    episodeLink: 'https://example.com/a-real-verifiable-source',
    sourceNote: 'Explain here where this information comes from and how it was verified.',
    address: '1 Example-ro, Example-gu, Seoul',
    lat: 37.5, lng: 127.0,
    fullDescription: { en: '<p>First paragraph: the place itself.</p><p>Second paragraph: its connection to the group/artist.</p>' },
    practicalInfo: [
        { title: { en: 'How to get there' }, text: { en: 'Directions here.' } }
    ],
    tipsList: [
        { title: { en: 'A tip title' }, text: { en: 'The tip itself.' } }
    ]
};

async function main() {
    const scriptJsPath = path.join(__dirname, '..', 'script.js');
    const existingLocations = await loadAllExistingLocations(scriptJsPath, firebaseConfig);
    console.log(`Vérification anti-doublon contre ${existingLocations.length} lieux existants...`);

    const duplicate = findNearbyDuplicate(
        exampleSubmission.lat,
        exampleSubmission.lng,
        existingLocations,
        DUPLICATE_THRESHOLD_METERS
    );
    if (duplicate) {
        console.log(
            `Rejeté avant envoi : à ${duplicate.distanceMeters}m de "${duplicate.location.name}" ` +
            `(id ${duplicate.location.id}), déjà dans la base. Pas de doublon envoyé.`
        );
        return;
    }

    const id = await submitLocationForReview(exampleSubmission, 'example-ai-agent');
    console.log('Submitted for review, id:', id);
}

main().catch(err => { console.error(err); process.exit(1); });
