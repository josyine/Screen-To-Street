// ==========================================
// Envoie la notification push "grand public" dès qu'une nuit de concert "Arirang" vient
// d'être APPROUVÉE dans l'onglet "Tour nights" de admin.html.
// ==========================================
// Demande du 05/10/2026 : "il faut que ces informations apparaissent en notification
// push dès qu'elles sont publiées." Pas de Cloud Function ici (site 100% statique, pas de
// Firebase CLI/CI dans cet environnement) : ce script tourne en cron GitHub Actions
// toutes les ~15 minutes (voir .github/workflows/send-tour-push.yml) et PICTURE en
// permanence `tourNightOverrides` pour repérer ce qui vient d'être publié — léger délai
// (quelques minutes max) assumé en échange de ne nécessiter aucune Cloud Function ni
// déploiement manuel de ta part (choix confirmé le 05/10/2026, "je veux quelque chose de
// gratuit").
//
// Distinct de tour-night-agent.js (qui notifie SEULEMENT l'admin, dès qu'une PROPOSITION
// arrive, pas une publication) : ce script-ci diffuse à TOUS les jetons connus dès qu'une
// fiche passe `pushSent: false` → `true`.
//
//   npm install firebase-admin dotenv
//   node send-tour-push.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

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

async function run() {
    try {
        const pendingSnap = await db.collection('tourNightOverrides').where('pushSent', '==', false).get();
        if (pendingSnap.empty) {
            console.log('Rien à envoyer — aucune nuit de concert publiée en attente de notification.');
            return;
        }

        const tokensSnap = await db.collection('pushTokens').get();
        const tokens = tokensSnap.docs.map(d => d.id);
        if (!tokens.length) {
            console.log('⚠️  Aucun appareil abonné aux notifications push (pushTokens vide) — fiches marquées envoyées malgré tout pour ne pas réessayer indéfiniment.');
        }

        for (const docSnap of pendingSnap.docs) {
            const data = docSnap.data();
            const songCount = Array.isArray(data.surpriseSongs) ? data.surpriseSongs.length : 0;
            const body = songCount
                ? `Surprise songs & iconic moments added for the ${data.date} show!`
                : `Iconic moments added for the ${data.date} show!`;

            if (tokens.length) {
                // Message "data-only" (voir la note dans tour-night-agent.js) : garantit que
                // c'est toujours notre propre écouteur 'push' dans sw.js qui construit la
                // notification affichée, plutôt qu'un affichage générique du navigateur.
                const res = await admin.messaging().sendEachForMulticast({
                    tokens,
                    data: { title: `Arirang Tour — ${data.city}`, body, url: '/map.html' }
                });
                console.log(`🔔 ${data.city} (${data.date}) : envoyée à ${res.successCount}/${tokens.length} appareil(s).`);
                await removeInvalidTokens(tokens, res.responses);
            }

            await docSnap.ref.set({ pushSent: true }, { merge: true });
        }
        console.log(`🎉 Terminé ! ${pendingSnap.size} nuit(s) de concert notifiée(s).`);
    } catch (error) {
        console.error('❌ Erreur :', error);
    }
}

run();
