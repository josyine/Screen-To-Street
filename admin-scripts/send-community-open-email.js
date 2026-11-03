// ==========================================
// Envoie l'email "Community is open!" à tous les comptes ayant activé "Notify me" sur
// l'écran "Coming soon" de feed.html (users/{uid}.notifyCommunity === true — voir
// window.setCommunityNotifyPreference() dans firebase-init.js et initCommunityComingSoon()
// dans feed.html).
// ==========================================
// Demande du 03/11/2026 ("active les notifications email quand quelqu'un notify me").
// Diffusion en UNE FOIS, décidée manuellement par toi — contrairement à send-tour-push.js
// (qui tourne en cron), ce script-ci n'est PAS automatisé : lance-le (ou le workflow GitHub
// Actions .github/workflows/send-community-open-email.yml, bouton "Run workflow") LE JOUR
// OÙ TU ouvres vraiment Community (repasse window.COMMUNITY_ENABLED à true dans script.js,
// voir sa note en tête de fichier) — jamais avant.
//
// Fournisseur d'email : Resend (resend.com), compte gratuit — choisi car ce site n'a ni
// backend ni Cloud Function (100% statique, pas de Firebase CLI/CI ici) pour envoyer un
// email directement. Secret GitHub Actions requis : RESEND_API_KEY.
//
// IMPORTANT (03/11/2026) : au moment d'écrire ce script, aucun domaine n'est encore
// vérifié sur le compte Resend → l'adresse d'expédition par défaut ci-dessous
// (onboarding@resend.dev) ne peut envoyer QUE vers l'adresse email du compte Resend
// lui-même, pas encore vers de vrais utilisateurs (limitation du compte gratuit sans
// domaine vérifié, pas de ce script). Une fois un domaine vérifié dans Resend (Dashboard >
// Domains > Add Domain, puis les enregistrements DNS), ajoute un secret GitHub
// RESEND_FROM_EMAIL (ex: "Screen To Street <notifications@tondomaine.com>") — ce script
// l'utilisera automatiquement à la place, aucune autre modification nécessaire.
//
// Idempotent : marque chaque compte notifié avec users/{uid}.communityOpenEmailSent =
// true, donc relancer ce script par erreur (ou une deuxième fois après avoir ajouté de
// nouveaux inscrits) ne renvoie jamais deux fois le même email à la même personne.
//
//   npm install
//   node send-community-open-email.js

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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Voir la note "IMPORTANT" en tête de fichier : à remplacer automatiquement par le secret
// RESEND_FROM_EMAIL dès qu'un domaine est vérifié dans Resend.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Screen To Street <onboarding@resend.dev>';
// Pas encore de nom de domaine perso (confirmé le 03/11/2026) : le site tourne sur GitHub
// Pages. À mettre à jour ici si un domaine est acheté/branché un jour — rien d'autre à
// changer dans ce script.
const SITE_URL = 'https://josyine.github.io/Screen-To-Street';

function emailHtml(username) {
    const hello = username ? `Hi ${username},` : 'Hi,';
    const helloFr = username ? `Salut ${username},` : 'Salut,';
    return `
<div style="font-family:Poppins,Arial,sans-serif;max-width:520px;margin:0 auto;color:#2E3644;">
  <h1 style="color:#D42759;font-size:22px;margin:0 0 12px;">Community is open!</h1>
  <p>${hello}</p>
  <p>Fan photos are now live on Screen To Street — share your own visit pics and check out everyone else's at the locations you love.</p>
  <p><a href="${SITE_URL}/feed.html" style="background:#D42759;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block;">Open Community</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <h1 style="color:#D42759;font-size:22px;margin:0 0 12px;">La Community est ouverte !</h1>
  <p>${helloFr}</p>
  <p>Les photos des fans sont désormais disponibles sur Screen To Street — partage les tiennes et découvre celles des autres sur les lieux que tu aimes.</p>
  <p><a href="${SITE_URL}/feed.html" style="background:#D42759;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block;">Ouvrir Community</a></p>
</div>`;
}

async function sendOne(to, username) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: FROM_EMAIL,
            to: [to],
            subject: 'Community is open on Screen To Street!',
            html: emailHtml(username)
        })
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Resend a répondu ${res.status} : ${text}`);
    }
}

async function run() {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant (variable d'environnement / secret GitHub Actions).");
    admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
    const db = admin.firestore();

    // Un seul filtre d'égalité dans la requête (aucun index composite Firestore à créer
    // manuellement) — le tri "déjà notifié ?" se fait ensuite côté script, sur une liste de
    // toute façon petite (inscriptions volontaires avant l'ouverture).
    const snap = await db.collection('users').where('notifyCommunity', '==', true).get();
    const pending = snap.docs.filter(d => !d.data().communityOpenEmailSent);

    if (!pending.length) {
        console.log("Rien à envoyer — personne n'a activé « Notify me » (ou tout le monde a déjà été notifié).");
        return;
    }

    console.log(`${pending.length} compte(s) à notifier sur ${snap.size} inscrit(s)...`);
    let sent = 0, failed = 0;
    for (const docSnap of pending) {
        const uid = docSnap.id;
        const username = docSnap.data().username || '';
        try {
            const authUser = await admin.auth().getUser(uid);
            if (!authUser.email) {
                console.warn(`⚠️  ${uid} : pas d'adresse email sur ce compte, ignoré.`);
                continue;
            }
            await sendOne(authUser.email, username);
            await docSnap.ref.set({ communityOpenEmailSent: true }, { merge: true });
            sent++;
            console.log(`✉️  Envoyé à ${authUser.email}`);
        } catch (e) {
            failed++;
            console.error(`❌ ${uid} :`, e.message || e);
        }
        // Compte Resend gratuit : limite ~2 requêtes/seconde — pause large pour rester en dessous.
        await new Promise(r => setTimeout(r, 600));
    }
    console.log(`🎉 Terminé ! ${sent} email(s) envoyé(s), ${failed} échec(s).`);
}

run().catch(e => { console.error('❌ Erreur :', e); process.exit(1); });
