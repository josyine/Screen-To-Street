// ==========================================
// Agent IA (Gemini) — propose les chansons surprises & "iconic moments" d'un soir de
// concert BTS "Arirang" déjà passé, pour relecture dans l'onglet "Tour nights" de
// admin.html.
// ==========================================
// Demande du 05/10/2026 : "chaque fin de concert, qu'un agent IA ajoute automatiquement
// les informations que je viens de t'envoyer : Les chansons surprises et les iconic
// moment du concert... Ajoute ces infos en mode admin, je veux pouvoir vérifier avant de
// les publier."
//
//   npm install firebase-admin @google/generative-ai dotenv
//   node tour-night-agent.js
//
// Automatisation : voir .github/workflows/tour-night-agent.yml (cron quotidien — "fin de
// concert" est approximée ici par "la date du concert est déjà passée", voir la note sur
// isPast() plus bas).
//
// Source de vérité des dates : admin-scripts/tour-schedule.json (PAS script.js — ce
// script tourne en Node, jamais dans un navigateur, et ARIRANG_TOUR vit dans un fichier
// écrit pour le navigateur avec plein de code DOM autour ; tour-schedule.json est une
// copie DÉLIBÉRÉE, légère, des seules infos nécessaires ici (ville/pays/dates), à tenir à
// jour à la main si de nouvelles dates de tournée sont ajoutées côté script.js — rare,
// contrairement au contenu qui change tout le temps).
//
// Politique du site (rappel, IMPORTANT, identique à example-ai-submission.js) : ne jamais
// inventer une information. Si l'IA ne peut pas sourcer une chanson surprise ou un
// moment marquant avec certitude, elle doit renvoyer des tableaux vides plutôt qu'une
// réponse plausible mais non vérifiée — c'est à l'admin de voir "rien de fiable trouvé"
// et de laisser la fiche de côté, jamais de publier une invention.

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

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// "Fin de concert" est approximée par "la date du concert est strictement avant
// aujourd'hui (UTC)" — on ne peut pas connaître l'heure réelle de fin d'un concert précis,
// et ce script ne tourne qu'1x/jour (voir le workflow) : le lendemain matin, un concert
// d'hier est forcément déjà fini, quel que soit son fuseau horaire.
function isPast(dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr < today;
}

async function alreadyCovered(tourId, stopId, date, existingOverrideIds, existingSubmissionKeys) {
    const overrideId = `${tourId}_${stopId}_${date}`;
    if (existingOverrideIds.has(overrideId)) return true;
    const subKey = `${tourId}_${stopId}_${date}`;
    return existingSubmissionKeys.has(subKey);
}

// Cherche les jetons de l'admin (collection `admins`, voir firestore.rules) pour lui
// envoyer une notification push DÈS que cet agent a proposé une nouvelle fiche — but
// explicite de la demande : "envoie moi une notification dès que l'agent IA à ajouté ces
// infos afin que je sache quand vérifier." Jamais de diffusion générale ici (voir
// send-tour-push.js, un script séparé, pour la notification "grand public" envoyée après
// l'APPROBATION, pas après la proposition).
async function notifyAdminOfNewSubmissions(count, firstCity) {
    const adminsSnap = await db.collection('admins').get();
    const adminUids = adminsSnap.docs.map(d => d.id);
    if (!adminUids.length) {
        console.log('⚠️  Aucun document dans la collection `admins` — impossible de cibler une notification push.');
        return;
    }
    // "in" accepte au plus 30 valeurs — largement suffisant ici (un seul compte admin
    // aujourd'hui), mais découpé par precaution si la liste grandissait un jour.
    const tokens = [];
    for (let i = 0; i < adminUids.length; i += 30) {
        const batch = adminUids.slice(i, i + 30);
        const snap = await db.collection('pushTokens').where('uid', 'in', batch).get();
        snap.forEach(d => tokens.push(d.id));
    }
    if (!tokens.length) {
        console.log('⚠️  Aucun appareil admin abonné aux notifications push (pushTokens vide pour cet uid) — rien envoyé. Active le toggle "Push notifications" dans Settings, connecté en admin.');
        return;
    }
    const body = count === 1
        ? `New tour night ready to review: ${firstCity}.`
        : `${count} new tour nights ready to review, starting with ${firstCity}.`;
    // Message "data-only" (jamais de clé `notification` au niveau racine) : avec une clé
    // `notification`, certains navigateurs affichent eux-mêmes une notification générique
    // SANS déclencher l'écouteur 'push' de sw.js, qui n'aurait alors plus la main pour
    // construire l'URL de clic (event.notification.data.url) — "data-only" garantit que
    // c'est TOUJOURS notre propre code dans sw.js qui construit et affiche la notification.
    const res = await admin.messaging().sendEachForMulticast({
        tokens,
        data: { title: 'Tour nights — review needed', body, url: '/admin.html' }
    });
    console.log(`🔔 Notification push envoyée à l'admin (${res.successCount}/${tokens.length} appareil(s)).`);
    await removeInvalidTokens(tokens, res.responses);
}

// FCM renvoie une erreur par jeton expiré/désinstallé plutôt qu'une exception globale —
// nettoyer ici évite de réessayer d'envoyer indéfiniment à un appareil qui n'existe plus
// (même soin que findDuplicate() ailleurs dans ce dossier : un correctif silencieux plutôt
// qu'un échec répété non expliqué).
async function removeInvalidTokens(tokens, responses) {
    const toDelete = [];
    responses.forEach((r, i) => {
        if (!r.success && r.error && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(r.error.code)) {
            toDelete.push(tokens[i]);
        }
    });
    await Promise.all(toDelete.map(t => db.collection('pushTokens').doc(t).delete().catch(() => {})));
    if (toDelete.length) console.log(`   🧹 ${toDelete.length} jeton(s) expiré(s) retiré(s) de pushTokens.`);
}

async function runAgent() {
    try {
        console.log('🔍 Chargement du calendrier de la tournée et des nuits déjà couvertes...');
        const schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'tour-schedule.json'), 'utf8'));

        const [overridesSnap, submissionsSnap] = await Promise.all([
            db.collection('tourNightOverrides').get(),
            db.collection('tourNightSubmissions').get(), // toutes (pending/approved/rejected) : évite de reproposer une nuit déjà rejetée aussi
        ]);
        const existingOverrideIds = new Set(overridesSnap.docs.map(d => d.id));
        const existingSubmissionKeys = new Set(submissionsSnap.docs.map(d => {
            const data = d.data();
            return `${data.tourId}_${data.stopId}_${data.date}`;
        }));

        const pendingDates = [];
        for (const stop of schedule) {
            for (const date of stop.showDates) {
                if (!isPast(date)) continue;
                if (await alreadyCovered(stop.tourId, stop.stopId, date, existingOverrideIds, existingSubmissionKeys)) continue;
                pendingDates.push({ ...stop, date });
            }
        }

        if (!pendingDates.length) {
            console.log('✅ Rien à proposer — toutes les nuits déjà passées sont déjà couvertes (publiées ou en attente de relecture).');
            return;
        }
        console.log(`   ${pendingDates.length} nuit(s) de concert déjà passée(s) sans fiche encore proposée.`);

        // BUG corrigé (demande du 08/10/2026, "l'agent IA n'a pas fonctionné... concert
        // hier à Lima") : ce script traitait jusqu'ici tout le retard dans l'ordre
        // chronologique du calendrier (avril 2026 en premier) — avec des dizaines de
        // nuits jamais couvertes depuis le lancement de cette fonctionnalité, ça épuisait
        // le quota Gemini (429 "exceeded your current quota") bien avant d'atteindre les
        // nuits RÉCENTES (Bogota, puis Lima) qui sont les seules qui comptent encore pour
        // l'admin — un concert d'avril n'a plus d'intérêt à être proposé en octobre. Les
        // plus récentes d'abord, et un plafond par exécution, pour ne plus jamais épuiser
        // le quota avant de les atteindre (le reste du retard sera traité au fil des
        // prochains passages quotidiens, plus récent en premier à chaque fois).
        pendingDates.sort((a, b) => b.date.localeCompare(a.date));
        const MAX_NIGHTS_PER_RUN = 8;
        const nightsToProcess = pendingDates.slice(0, MAX_NIGHTS_PER_RUN);
        if (pendingDates.length > MAX_NIGHTS_PER_RUN) {
            console.log(`   (${pendingDates.length - MAX_NIGHTS_PER_RUN} nuit(s) plus ancienne(s) laissée(s) pour un prochain passage — priorité aux plus récentes.)`);
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash', generationConfig: { maxOutputTokens: 4096 } });
        let addedCount = 0;
        let firstCity = null;

        // Un essai supplémentaire pour les erreurs explicitement temporaires (503 "high
        // demand" vu dans les logs — le message lui-même dit "usually temporary, please
        // try again later") ; inutile de s'acharner sur un 429 de quota épuisé (reset
        // quotidien côté Gemini, pas quelque chose qu'un court délai résout), mais ça ne
        // coûte rien de réessayer une fois avant d'abandonner cette nuit pour aujourd'hui.
        async function generateWithRetry(prompt) {
            try {
                return await model.generateContent(prompt);
            } catch (err) {
                const msg = (err && err.message) || '';
                if (!/\[503/.test(msg)) throw err;
                console.log('   ⏳ 503 (surcharge temporaire du modèle) — nouvel essai dans 15s...');
                await new Promise(r => setTimeout(r, 15000));
                return await model.generateContent(prompt);
            }
        }

        for (const night of nightsToProcess) {
            console.log(`🤖 Recherche pour ${night.city} (${night.date})...`);
            const prompt = `Tu es un expert BTS suivant de très près la tournée mondiale "Arirang" (2026-2027).

Concert : BTS, "Arirang" World Tour, ${night.city}, ${night.country}, le ${night.date}.

Cherche UNIQUEMENT deux choses à propos de CE concert précis (cette date exacte, pas une
autre date de la même ville) :
1. Les "chansons surprises" (surprise songs) jouées ce soir-là — des titres rarement joués
   en live, annoncés spontanément pendant le concert, en plus de la setlist habituelle.
2. Les "iconic moments" (moments marquants) de ce concert précis — une anecdote, une
   réaction de fans, un incident technique, une déclaration d'un membre, un record
   d'affluence... tout fait réel et notable spécifique à cette date.

Règle absolue, identique partout ailleurs sur ce site : ne JAMAIS inventer une information.
Si tu n'es pas certain à 100% qu'une chanson surprise ou qu'un moment est réel et
vérifiable pour CETTE DATE PRÉCISE, laisse le champ correspondant vide (tableau vide)
plutôt que de deviner ou d'extrapoler depuis une autre date de la tournée. Mieux vaut
renvoyer une fiche vide que remplie avec des suppositions.

Renvoie UNIQUEMENT un objet JSON avec cette structure exacte :
{
  "surpriseSongs": ["Titre 1", "Titre 2"],
  "highlights": ["Phrase décrivant un premier moment marquant.", "Phrase décrivant un deuxième moment marquant, si vérifiable."],
  "sources": ["https://url-source-reelle-1.com", "https://url-source-reelle-2.com"]
}`;

            try {
                const result = await generateWithRetry(prompt);
                const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(text);
                const surpriseSongs = Array.isArray(parsed.surpriseSongs) ? parsed.surpriseSongs.filter(Boolean) : [];
                const highlights = Array.isArray(parsed.highlights) ? parsed.highlights.filter(Boolean) : [];
                const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(Boolean) : [];

                if (!surpriseSongs.length && !highlights.length) {
                    console.log(`   ⚠️  Rien de fiable trouvé pour ${night.city} (${night.date}) — pas de fiche créée (pas de place pour une invention).`);
                    continue;
                }

                await db.collection('tourNightSubmissions').add({
                    tourId: night.tourId,
                    stopId: night.stopId,
                    city: night.city,
                    country: night.country,
                    date: night.date,
                    surpriseSongs,
                    highlights: { en: highlights },
                    sources,
                    status: 'pending',
                    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                    submittedBy: 'Gemini-AI-Agent',
                });
                console.log(`✅ Proposition ajoutée pour ${night.city} (${night.date}) — ${surpriseSongs.length} chanson(s) surprise, ${highlights.length} moment(s) marquant(s).`);
                if (!firstCity) firstCity = night.city;
                addedCount++;
            } catch (err) {
                console.error(`❌ Échec pour ${night.city} (${night.date}) :`, err.message || err);
            }
            // Petite pause entre deux nuits (demande du 08/10/2026, voir la note plus haut
            // sur le 429 "exceeded your current quota") — n'empêche pas un quota déjà
            // épuisé de l'être, mais réduit le risque de le déclencher en premier lieu en
            // espaçant les appels plutôt que de les envoyer en rafale.
            await new Promise(r => setTimeout(r, 3000));
        }

        console.log(`🎉 Terminé ! ${addedCount} nouvelle(s) nuit(s) à relire dans l'onglet "Tour nights" de admin.html.`);
        if (addedCount > 0) await notifyAdminOfNewSubmissions(addedCount, firstCity);
    } catch (error) {
        console.error('❌ Erreur :', error);
    }
}

runAgent();
