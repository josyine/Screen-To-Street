// ==========================================
// FIREBASE : INITIALISATION PARTAGÉE (toutes les pages de l'app)
// ==========================================
// Ce fichier est chargé en tant que <script type="module"> sur chaque page qui a
// besoin de lire/écrire des données de compte (map.html, trips.html, wishlist.html,
// et bientôt visited.html, account.html...). Il expose sur `window` tout ce dont
// script.js (un script classique, pas un module) a besoin pour parler à Firestore,
// via un pont simple : des fonctions globales + un événement "firebase-ready".
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    deleteUser,
    reauthenticateWithPopup,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, deleteField, increment, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBa1e1JhWCxYI3fSWtVN6TsFiOnvxH7i5I",
    authDomain: "screen-to-street-e29ff.firebaseapp.com",
    projectId: "screen-to-street-e29ff",
    storageBucket: "screen-to-street-e29ff.firebasestorage.app",
    messagingSenderId: "48854939735",
    appId: "1:48854939735:web:4f6264a5589ebbf5a70b12"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseCurrentUser = null;

// Fonctions de connexion exposées globalement, pour que des pages qui n'ont pas
// leur propre module (map.html, legal.html...) puissent proposer un formulaire de
// connexion sans dupliquer toute la logique Firebase.
window.firebaseSignInEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
window.firebaseSignInGoogle = () => signInWithPopup(auth, googleProvider);
window.firebaseSendPasswordReset = (email) => sendPasswordResetEmail(auth, email);
// Vraie déconnexion Firebase (ferme la session), pas juste un nettoyage du localStorage.
window.firebaseSignOut = () => signOut(auth);

// Suppression définitive du compte : le document Firestore ET le compte
// d'authentification Firebase lui-même. Si Firebase exige une reconnexion récente
// (mesure de sécurité pour les actions sensibles) : pour un compte email/mot de passe,
// on demande le mot de passe avant de réessayer. `password` est optionnel : fourni
// seulement lors d'une deuxième tentative, une fois que la personne l'a saisi suite à
// l'erreur 'needs-password'.
//
// Pour un compte Google, on NE tente PAS reauthenticateWithPopup ici : ce code
// s'exécute après un premier `await doDelete()` qui a échoué, donc plusieurs ticks
// après le clic d'origine — la plupart des navigateurs ne considèrent alors plus
// l'ouverture d'une popup comme un geste utilisateur direct et la bloquent
// silencieusement (l'erreur qui en résulte, ex. 'auth/popup-blocked', ne correspond à
// aucun cas géré par l'appelant, d'où le message générique "Something went wrong"
// observé). On renvoie donc 'needs-google-reauth' pour que l'UI propose un bouton
// dédié : reauthenticateWithPopup sera alors appelée en tout premier, directement
// depuis le gestionnaire de clic de CE bouton (voir firebaseReauthenticateGoogleAndDelete
// ci-dessous), ce qui reste un geste utilisateur direct aux yeux du navigateur.
window.firebaseDeleteAccount = async function (password) {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    const doDelete = async () => {
        try { await deleteDoc(doc(db, 'users', user.uid)); } catch (e) { /* on continue même si le document n'existe pas/plus */ }
        await deleteUser(user);
    };

    try {
        await doDelete();
    } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
            const providerId = user.providerData[0] && user.providerData[0].providerId;
            if (providerId === 'google.com') {
                throw Object.assign(new Error('needs-google-reauth'), { code: 'needs-google-reauth' });
            } else if (password) {
                const cred = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, cred);
                await doDelete();
            } else {
                throw Object.assign(new Error('needs-password'), { code: 'needs-password' });
            }
        } else {
            throw err;
        }
    }
};

// Déclenchée directement par le clic sur le bouton "Confirm with Google" (geste
// utilisateur direct requis pour que la popup Google ne soit pas bloquée par le
// navigateur) : ré-authentifie puis relance la suppression, sans repasser par
// firebaseDeleteAccount ni par un quelconque await intermédiaire avant l'appel popup.
window.firebaseReauthenticateGoogleAndDelete = async function () {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    await reauthenticateWithPopup(user, googleProvider);
    try { await deleteDoc(doc(db, 'users', user.uid)); } catch (e) { /* on continue même si le document n'existe pas/plus */ }
    await deleteUser(user);
};

// Changement de mot de passe (settings.html) : ne s'applique qu'aux comptes
// email/mot de passe — un compte connecté uniquement via Google n'a pas de mot de
// passe Firebase à changer (settings.html détecte ce cas et n'appelle pas cette
// fonction). On ré-authentifie toujours avec le mot de passe actuel avant de définir
// le nouveau, ce qui satisfait au passage l'exigence Firebase de connexion récente
// pour cette action sensible et vérifie naturellement que l'ancien mot de passe est
// correct (sinon reauthenticateWithCredential rejette avec auth/wrong-password).
window.firebaseChangePassword = async function (currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
};

// Écrit (fusionne, sans écraser le reste du document) les champs donnés dans le
// document Firestore de l'utilisateur actuellement connecté. Ne fait rien si
// personne n'est connecté (visiteur non authentifié → wishlist locale uniquement,
// comme avant).
window.syncUserData = async function (fields) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), fields, { merge: true });
    } catch (e) {
        console.warn('Synchronisation Firestore échouée :', e);
    }
};

// Récupère le document complet de l'utilisateur connecté (ou null si personne
// n'est connecté, ou si le document n'existe pas encore).
window.loadUserCloudData = async function () {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.warn('Lecture Firestore échouée :', e);
        return null;
    }
};

// Note communautaire (/5) d'un lieu : moyenne partagée entre TOUS les utilisateurs, pas
// la moyenne des visites d'une seule personne. Stockée dans une collection PUBLIQUE
// séparée des documents utilisateur privés (`users/{uid}`) : chaque document ne contient
// que sum+count agrégés, jamais les notes individuelles ni qui a noté quoi.
//
// IMPORTANT — nécessite une règle Firestore dédiée que ce fichier ne peut pas déployer
// lui-même (à ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /locationRatings/{locationId} {
//     allow read: if true;
//     allow write: if request.auth != null
//       && request.resource.data.diff(resource.data).affectedKeys()
//            .hasOnly(['sum', 'count', 'foodSum', 'foodCount', 'valueSum', 'valueCount']);
//   }
// (Si la règle précédente, sans foodSum/foodCount/valueSum/valueCount, est encore en place,
// remplacez-la par celle-ci — sinon les notes food/valeur des lieux Cafe/Restaurants
// échoueront silencieusement avec permission-denied.)
// Limite connue : un client malveillant authentifié pourrait tout de même écrire un
// incrément arbitraire (ex: +1000) puisque les règles Firestore seules ne peuvent pas
// vérifier qu'un increment() correspond à "une vraie note entre 1 et 5" sans passer par
// une Cloud Function — hors de portée d'un site 100% statique sans backend comme celui-ci.
//
// `deltas` : objet ne contenant QUE les clés à incrémenter parmi sum/count/foodSum/
// foodCount/valueSum/valueCount (voir buildRatingDeltas()/buildRemovalDeltas() dans
// script.js) — foodSum/valueSum n'existent que pour les lieux Cafe/Restaurants.
window.updateLocationRatingAggregate = async function (locationId, deltas) {
    if (!deltas) return;
    const payload = {};
    for (const key of ['sum', 'count', 'foodSum', 'foodCount', 'valueSum', 'valueCount']) {
        if (deltas[key]) payload[key] = increment(deltas[key]);
    }
    if (Object.keys(payload).length === 0) return;
    try {
        await setDoc(doc(db, 'locationRatings', String(locationId)), payload, { merge: true });
    } catch (e) {
        console.warn('Mise à jour de la note communautaire échouée :', e);
    }
};

// Récupère la collection entière des notes communautaires en un seul aller-retour
// (plutôt qu'une lecture par lieu) — appelée une fois au chargement de map.html.
window.loadAllLocationRatings = async function () {
    try {
        const snap = await getDocs(collection(db, 'locationRatings'));
        const result = {};
        snap.forEach(d => { result[d.id] = d.data(); });
        return result;
    } catch (e) {
        console.warn('Lecture des notes communautaires échouée :', e);
        return {};
    }
};

// Compteur public "combien d'utilisateurs ont ce lieu dans leur wishlist" — utilisé pour
// afficher une statistique dans l'onglet Info ("X% des utilisateurs ont ajouté ce lieu à
// leur wishlist"), voir applyWishlistCountDeltas()/syncWishlist() dans script.js.
//
// IMPORTANT — nécessite une règle Firestore dédiée (à ajouter dans la console Firebase) :
//   match /locationStats/{locationId} {
//     allow read: if true;
//     allow write: if request.auth != null
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['wishlistCount']);
//   }
// Même limite connue que locationRatings : un client malveillant authentifié pourrait
// envoyer un increment() arbitraire — hors de portée d'un site statique sans backend.
window.updateLocationWishlistCount = async function (locationId, delta) {
    if (!delta) return;
    try {
        await setDoc(doc(db, 'locationStats', String(locationId)), { wishlistCount: increment(delta) }, { merge: true });
    } catch (e) {
        console.warn('Mise à jour du compteur wishlist échouée :', e);
    }
};

window.loadAllLocationStats = async function () {
    try {
        const snap = await getDocs(collection(db, 'locationStats'));
        const result = {};
        snap.forEach(d => { result[d.id] = d.data(); });
        return result;
    } catch (e) {
        console.warn('Lecture des statistiques de lieux échouée :', e);
        return {};
    }
};

// Nombre total de comptes créés sur le site — dénominateur du pourcentage ci-dessus.
// Incrémenté une seule fois par compte, juste après createUserWithEmailAndPassword
// (voir welcome-script.js). Document public à un seul champ, jamais de données perso.
//
// IMPORTANT — nécessite une règle Firestore dédiée (à ajouter dans la console Firebase) :
//   match /siteStats/global {
//     allow read: if true;
//     allow write: if request.auth != null
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['totalUsers']);
//   }
window.incrementSiteUserCount = async function () {
    try {
        await setDoc(doc(db, 'siteStats', 'global'), { totalUsers: increment(1) }, { merge: true });
    } catch (e) {
        console.warn('Incrémentation du compteur global d\'utilisateurs échouée :', e);
    }
};

window.loadSiteStats = async function () {
    try {
        const snap = await getDoc(doc(db, 'siteStats', 'global'));
        return snap.exists() ? snap.data() : {};
    } catch (e) {
        console.warn('Lecture des statistiques globales échouée :', e);
        return {};
    }
};

// ==========================================
// CONTENU RICHE D'UN LIEU (migration progressive hors de script.js)
// ==========================================
// Étape 1 de la migration vers Firestore (04/09/2026) : script.js contient encore les
// textes de TOUS les lieux (fullDescription/practicalInfo/tipsList), mais openDetailsPanel()
// tente maintenant AUSSI de lire une version à jour depuis Firestore et l'utilise si elle
// existe — sans jamais bloquer l'affichage (le contenu déjà dans script.js s'affiche
// immédiatement, cette lecture vient seulement le compléter/remplacer en arrière-plan si
// elle répond). Ça permet dès maintenant d'ajouter/corriger un lieu uniquement via
// Firestore (pas de modification de script.js), sans rien casser pour les lieux qui n'ont
// pas encore de document ici. Une étape 2 séparée (plus tard, plus risquée) retirera
// progressivement ces champs de script.js une fois cette lecture confirmée fiable en
// production, ce qui réduira enfin la taille du fichier envoyé à chaque visite.
//
// IMPORTANT — nécessite une règle Firestore dédiée que ce fichier ne peut pas déployer
// lui-même (à ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /locationContent/{locationId} {
//     allow read: if true;
//     allow write: if false;  // écrit uniquement via le script d'administration, jamais depuis le site
//   }
window.fetchLocationContent = async function (locationId) {
    try {
        const snap = await getDoc(doc(db, 'locationContent', String(locationId)));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.warn('Lecture du contenu Firestore du lieu échouée :', e);
        return null;
    }
};

// Avis publics ("Reviews") sur un lieu : une personne peut rendre publique sa fiche
// "J'ai visité ce lieu" (note + notes + photo) pour que les autres utilisateurs la
// voient dans le nouvel onglet "Reviews" du détail d'un lieu. Un avis par personne et
// par lieu (écrase le précédent s'il republie), stocké dans une sous-collection dédiée
// pour pouvoir lire tous les avis d'UN SEUL lieu sans lire toute la collection (pas de
// requête where() disponible ici, seulement collection()+getDocs()).
//
// IMPORTANT — nécessite une règle Firestore dédiée que ce fichier ne peut pas déployer
// lui-même (à ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /locationReviews/{locationId}/items/{uid} {
//     allow read: if true;
//     allow write: if request.auth != null && request.auth.uid == uid;
//   }
// Renvoie {success:true} ou {success:false, code} (jamais une exception) pour que
// l'appelant (script.js) puisse prévenir la personne si la publication a échoué —
// notamment si les règles Firestore ci-dessus n'ont pas encore été ajoutées côté
// console (code 'permission-denied'), auquel cas la publication échouait jusqu'ici
// TOUJOURS en silence : la case restait cochée dans l'interface, mais rien n'était
// réellement publié, donnant l'impression trompeuse que ça avait marché.
window.setLocationReview = async function (locationId, reviewData) {
    const user = auth.currentUser;
    if (!user) return { success: false, code: 'not-authenticated' };
    try {
        await setDoc(doc(db, 'locationReviews', String(locationId), 'items', user.uid), Object.assign({
            uid: user.uid,
            updatedAt: serverTimestamp()
        }, reviewData));
        return { success: true };
    } catch (e) {
        console.warn('Publication de l\'avis échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.deleteLocationReview = async function (locationId) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'locationReviews', String(locationId), 'items', user.uid));
    } catch (e) {
        console.warn('Suppression de l\'avis échouée :', e);
    }
};

window.fetchLocationReviews = async function (locationId) {
    try {
        const snap = await getDocs(collection(db, 'locationReviews', String(locationId), 'items'));
        const result = [];
        snap.forEach(d => result.push(d.data()));
        return result;
    } catch (e) {
        console.warn('Lecture des avis échouée :', e);
        return [];
    }
};

// ==========================================
// FILE DE RELECTURE DES NOUVEAUX LIEUX ("locationSubmissions")
// ==========================================
// Permet à un agent (IA ou humain) de PROPOSER un nouveau lieu ou une correction sans
// jamais publier directement : la proposition atterrit dans locationSubmissions avec
// status:'pending', et reste invisible sur le site tant qu'un administrateur (voir
// isCurrentUserAdmin() ci-dessous) ne l'a pas approuvée d'un clic. Volontairement séparé
// de locationContent (étape 1 de la migration Firestore, voir plus haut) : cette file
// est la porte d'entrée AVANT publication, locationContent est ce qui est réellement
// affiché sur le site.
//
// Politique du site (rappel) : ne jamais publier de faits non sourcés — un agent IA doit
// remplir `sourceNote`/`episodeLink` avec une vraie source vérifiable, jamais inventer une
// date de tournée ou une adresse. L'écran de relecture affiche ces sources pour que la
// personne qui approuve puisse les vérifier avant de publier.
//
// Comment devenir administrateur (aucune interface ne le permet, volontairement — un
// document dans `admins` ne peut être créé QUE depuis la console Firebase, jamais depuis
// le site) :
//   1. Firebase Console > Authentication : copiez votre UID (visible dans la liste des
//      utilisateurs, colonne "User UID").
//   2. Firebase Console > Firestore Database > Start collection > id "admins" >
//      Document ID = VOTRE UID, avec un champ quelconque (ex: role: "owner").
//
// IMPORTANT — nécessite ces règles Firestore (non déployables depuis ce fichier, à
// ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /admins/{uid} {
//     allow read: if request.auth != null && request.auth.uid == uid;
//     allow write: if false;  // jamais depuis le site, uniquement via la console Firebase
//   }
//   match /locationSubmissions/{submissionId} {
//     allow create: if true;  // n'importe qui (y compris un agent non authentifié) peut proposer
//     allow read, update, delete: if request.auth != null
//       && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
//   }
//   match /newLocations/{locationId} {
//     allow read: if true;  // lu par tout le monde au chargement de la carte (voir map.html)
//     allow write: if request.auth != null
//       && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
//   }
// Mis en cache PAR uid (pas juste un booléen global) : onAuthStateChanged (voir plus bas)
// appelle son callback une première fois de façon synchrone, souvent avant que la vraie
// session ne soit résolue — un premier appel avec !user renverrait alors false, et un
// simple cache global aurait figé ce false pour de bon même une fois la vraie session (et
// son éventuel statut administrateur) connue. Ne jamais mettre en cache le cas "personne
// connectée" évite ce piège ; mettre en cache par uid réutilise quand même le résultat une
// fois qu'une session réelle est là, sans relire Firestore à chaque appel.
let _adminCheckCache = null; // { uid, isAdmin }
window.isCurrentUserAdmin = async function () {
    const user = auth.currentUser;
    if (!user) return false;
    if (_adminCheckCache && _adminCheckCache.uid === user.uid) return _adminCheckCache.isAdmin;
    let isAdmin = false;
    try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        isAdmin = snap.exists();
    } catch (e) {
        isAdmin = false;
    }
    _adminCheckCache = { uid: user.uid, isAdmin };
    return isAdmin;
};

// `data` attend la même forme qu'un objet de celebLocations (name, group, member,
// country, city, category, year, episode, episodeLink, ytId, address, lat, lng, img,
// fullDescription, practicalInfo, tipsList) — plus `matchedLocId` (optionnel) si la
// proposition est une CORRECTION d'un lieu déjà publié plutôt qu'un nouveau lieu, et
// `sourceNote` (recommandé) expliquant d'où vient l'information.
window.submitLocationForReview = async function (data, submittedBy) {
    try {
        const ref = doc(collection(db, 'locationSubmissions'));
        await setDoc(ref, Object.assign({}, data, {
            status: 'pending',
            submittedBy: submittedBy || 'unknown',
            submittedAt: serverTimestamp()
        }));
        return { success: true, id: ref.id };
    } catch (e) {
        console.warn('Soumission d\'un lieu échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// Réservé aux administrateurs (voir isCurrentUserAdmin) — la règle Firestore ci-dessus
// refuse la lecture à tout autre compte, cette fonction renvoie donc [] pour eux plutôt
// que de planter.
window.listPendingSubmissions = async function () {
    try {
        const q = query(collection(db, 'locationSubmissions'), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        const result = [];
        snap.forEach(d => result.push(Object.assign({ id: d.id }, d.data())));
        return result;
    } catch (e) {
        console.warn('Lecture des propositions en attente échouée :', e);
        return [];
    }
};

// Publie la proposition : les champs "contenu" (Story/infos pratiques/conseils/vidéo)
// vont dans locationContent/{id} (lu par TOUT visiteur via fetchLocationContent, voir
// plus haut) ; s'il s'agit d'un NOUVEAU lieu (pas de matchedLocId), les champs "légers"
// nécessaires à son affichage sur la carte (nom, coordonnées, catégorie...) vont EN PLUS
// dans newLocations/{id}, que script.js fusionne dans celebLocations au chargement de la
// carte (voir map.html) — un nouveau lieu approuvé devient donc visible sans jamais
// toucher à script.js.
window.approveLocationSubmission = async function (submission) {
    const isAdmin = await window.isCurrentUserAdmin();
    if (!isAdmin) return { success: false, code: 'not-admin' };
    try {
        const targetId = submission.matchedLocId ? String(submission.matchedLocId) : 'new-' + submission.id;
        const contentFields = ['fullDescription', 'practicalInfo', 'tipsList', 'tip', 'directions', 'videoEmbeds', 'ytId', 'episodeLink'];
        const contentDoc = {};
        contentFields.forEach(f => { if (submission[f] !== undefined) contentDoc[f] = submission[f]; });
        await setDoc(doc(db, 'locationContent', targetId), contentDoc, { merge: true });

        if (!submission.matchedLocId) {
            const lightFields = ['name', 'group', 'member', 'country', 'city', 'category', 'year', 'episode', 'address', 'lat', 'lng', 'img'];
            const lightDoc = { id: targetId };
            lightFields.forEach(f => { if (submission[f] !== undefined) lightDoc[f] = submission[f]; });
            await setDoc(doc(db, 'newLocations', targetId), lightDoc);
        }

        await setDoc(doc(db, 'locationSubmissions', submission.id), { status: 'approved', reviewedAt: serverTimestamp() }, { merge: true });
        return { success: true, publishedId: targetId };
    } catch (e) {
        console.warn('Approbation de la proposition échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.rejectLocationSubmission = async function (submissionId, note) {
    const isAdmin = await window.isCurrentUserAdmin();
    if (!isAdmin) return { success: false, code: 'not-admin' };
    try {
        await setDoc(doc(db, 'locationSubmissions', submissionId), { status: 'rejected', reviewedAt: serverTimestamp(), reviewNote: note || '' }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Rejet de la proposition échoué :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// Lu par map.html au chargement (voir firebase-ready) : les nouveaux lieux déjà approuvés
// (voir approveLocationSubmission ci-dessus) sont fusionnés dans celebLocations à la
// volée, jamais écrits dans script.js.
window.fetchNewLocations = async function () {
    try {
        const snap = await getDocs(collection(db, 'newLocations'));
        const result = [];
        snap.forEach(d => result.push(d.data()));
        return result;
    } catch (e) {
        console.warn('Lecture des nouveaux lieux échouée :', e);
        return [];
    }
};

// ==========================================
// PARTAGE DE VOYAGES ENTRE UTILISATEURS ("travel buddies", trips.html)
// ==========================================
// Un voyage privé vit dans users/{uid}.myTrips (voir plus haut) — invisible aux autres
// comptes par construction. Le partager nécessite donc une VRAIE collection séparée
// trips/{tripId}, lisible/modifiable par le propriétaire ET chaque collaborateur ajouté
// (members: {uid: 'edit'|'view'}). Retrouver un compte à partir du pseudo tapé dans la
// case "Their username or email" nécessite à son tour un index public séparé
// (usernames/{pseudo} -> uid) : sans lui, impossible de résoudre un pseudo en uid sans
// élargir dangereusement les droits de lecture sur la collection privée users/.
// Limite connue : la recherche ne fonctionne que par PSEUDO exact (pas par email — cela
// nécessiterait une Cloud Function avec les droits admin, hors de portée d'un site 100%
// statique comme celui-ci).
//
// IMPORTANT — nécessite ces règles Firestore (non déployables depuis ce fichier, à
// ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /usernames/{username} {
//     allow read: if true;
//     allow write: if request.auth != null && request.resource.data.uid == request.auth.uid;
//   }
//   match /trips/{tripId} {
//     allow read: if request.auth != null
//       && (resource.data.ownerUid == request.auth.uid || request.auth.uid in resource.data.members);
//     allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
//     allow update: if request.auth != null
//       && (resource.data.ownerUid == request.auth.uid || resource.data.members[request.auth.uid] == 'edit');
//     allow delete: if request.auth != null && resource.data.ownerUid == request.auth.uid;
//   }
// Réserve un pseudo dans l'index public usernames/{pseudo} -> uid. Vérifie D'ABORD que
// le pseudo n'appartient pas déjà à un AUTRE compte avant d'écrire — sans ça, deux
// comptes choisissant le même pseudo pouvaient silencieusement se voler l'index l'un
// l'autre (le dernier à sauvegarder "gagnait"), rendant les invitations "travel buddy"
// imprévisibles. Renvoie {success, code} comme setLocationReview()/setDoc() plus haut,
// pour que l'appelant (account.html) puisse bloquer et prévenir la personne si le
// pseudo est déjà pris ailleurs.
window.claimUsername = async function (username) {
    const user = auth.currentUser;
    if (!user || !username) return { success: false, code: 'invalid' };
    const key = username.toLowerCase().trim();
    try {
        const existing = await getDoc(doc(db, 'usernames', key));
        if (existing.exists() && existing.data().uid !== user.uid) {
            return { success: false, code: 'taken' };
        }
        await setDoc(doc(db, 'usernames', key), { uid: user.uid }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Réservation du pseudo échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.lookupUserByUsername = async function (username) {
    if (!username) return null;
    try {
        const snap = await getDoc(doc(db, 'usernames', username.toLowerCase().trim()));
        return snap.exists() ? snap.data().uid : null;
    } catch (e) {
        console.warn('Recherche du pseudo échouée :', e);
        return null;
    }
};

window.createSharedTrip = async function (trip) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'trips', trip.id), Object.assign({}, trip, {
            ownerUid: user.uid,
            ownerName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
            members: {},
            memberNames: {}
        }));
    } catch (e) {
        console.warn('Création du voyage partagé échouée :', e);
    }
};

window.saveSharedTrip = async function (tripId, fields) {
    try {
        await setDoc(doc(db, 'trips', tripId), fields, { merge: true });
    } catch (e) {
        console.warn('Sauvegarde du voyage partagé échouée :', e);
    }
};

window.loadSharedTrip = async function (tripId) {
    try {
        const snap = await getDoc(doc(db, 'trips', tripId));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.warn('Lecture du voyage partagé échouée :', e);
        return null;
    }
};

window.inviteTripCollaborator = async function (tripId, username, role) {
    const uid = await window.lookupUserByUsername(username);
    if (!uid) return { error: 'not-found' };
    try {
        await setDoc(doc(db, 'trips', tripId), {
            members: { [uid]: role },
            memberNames: { [uid]: username.trim() }
        }, { merge: true });
        return { uid, username: username.trim(), role };
    } catch (e) {
        console.warn('Invitation échouée :', e);
        return { error: 'failed' };
    }
};

window.setTripCollaboratorRole = async function (tripId, uid, role) {
    try {
        await setDoc(doc(db, 'trips', tripId), { members: { [uid]: role } }, { merge: true });
    } catch (e) {
        console.warn('Changement de permission échoué :', e);
    }
};

window.removeTripCollaborator = async function (tripId, uid) {
    try {
        await setDoc(doc(db, 'trips', tripId), {
            members: { [uid]: deleteField() },
            memberNames: { [uid]: deleteField() }
        }, { merge: true });
    } catch (e) {
        console.warn('Retrait du collaborateur échoué :', e);
    }
};

window.listSharedTripsForMe = async function () {
    const user = auth.currentUser;
    if (!user) return [];
    try {
        const q = query(collection(db, 'trips'), where(`members.${user.uid}`, 'in', ['edit', 'view']));
        const snap = await getDocs(q);
        const result = [];
        snap.forEach(d => result.push(Object.assign({ _sharedTripId: d.id, _myRole: d.data().members[user.uid] }, d.data())));
        return result;
    } catch (e) {
        console.warn('Lecture des voyages partagés échouée :', e);
        return [];
    }
};

// ==========================================
// AMIS (ajout d'amis, partage de lieux, "quels amis ont visité ce lieu")
// ==========================================
// Réutilise l'index public usernames/{pseudo}->uid déjà en place pour le partage de
// voyages (voir lookupUserByUsername ci-dessus) pour retrouver un compte par pseudo.
//
// Une demande d'ami est un document à PART (friendRequests/{id}), supprimé dès qu'il
// est traité (accepté ou refusé) — pas de champ "status" à faire vivre indéfiniment.
// Une fois acceptée, l'amitié elle-même est stockée en DOUBLE, une fois de chaque côté,
// dans une sous-collection privée à chaque compte : users/{uid}/friendIndex/{friendUid}.
// Ce doublon (plutôt qu'un unique document partagé comme pour les voyages) est
// nécessaire ici : la règle ci-dessous n'autorise QUE deux personnes à écrire dans
// users/{ownerUid}/friendIndex/{friendUid} — le propriétaire de la liste, ou la personne
// qui y est ajoutée — ce qui permet à la personne qui ACCEPTE la demande d'écrire les
// deux côtés en une fois (dans sa propre liste, et dans celle de l'autre) sans jamais
// avoir besoin d'un accès en écriture plus large sur le compte d'autrui.
//
// friendVisits/{uid} est un MIROIR minimal et volontairement pauvre de users/{uid}.visitedLocs
// (uniquement la liste des ids de lieux, jamais les dates/notes/photos) : une collection
// séparée exprès, pour ne JAMAIS avoir à assouplir la règle du document users/{uid}
// complet (qui contient l'email et d'autres informations privées) juste pour permettre
// à un·e ami·e de voir "as-tu visité ce lieu ?".
//
// IMPORTANT — nécessite ces règles Firestore (non déployables depuis ce fichier, à
// ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /friendRequests/{requestId} {
//     allow read: if request.auth != null
//       && (resource.data.toUid == request.auth.uid || resource.data.fromUid == request.auth.uid);
//     allow create: if request.auth != null && request.resource.data.fromUid == request.auth.uid;
//     allow delete: if request.auth != null
//       && (resource.data.toUid == request.auth.uid || resource.data.fromUid == request.auth.uid);
//   }
//   match /users/{ownerUid}/friendIndex/{friendUid} {
//     allow read: if request.auth != null && request.auth.uid == ownerUid;
//     allow write: if request.auth != null
//       && (request.auth.uid == ownerUid || request.auth.uid == friendUid);
//   }
//   match /friendVisits/{uid} {
//     allow read: if request.auth != null && (
//       request.auth.uid == uid ||
//       exists(/databases/$(database)/documents/users/$(request.auth.uid)/friendIndex/$(uid))
//     );
//     allow write: if request.auth != null && request.auth.uid == uid
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['locationIds']);
//   }
// Limite connue, même famille que celle documentée plus haut pour usernames/trips :
// pas de vérification serveur qu'un uid "ami" existe vraiment avant l'écriture d'une
// demande — au pire, une demande fantôme vers un uid inexistant, sans conséquence
// (jamais acceptée puisque personne ne peut la lire).

window.sendFriendRequest = async function (username) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) return { error: 'empty' };
    const myUsername = (localStorage.getItem('userName') || '').trim();
    if (cleanUsername.toLowerCase() === myUsername.toLowerCase()) return { error: 'self' };
    const toUid = await window.lookupUserByUsername(cleanUsername);
    if (!toUid) return { error: 'not-found' };
    if (toUid === user.uid) return { error: 'self' };
    try {
        const alreadyFriend = await getDoc(doc(db, 'users', user.uid, 'friendIndex', toUid));
        if (alreadyFriend.exists()) return { error: 'already-friends' };
        // Filtrée sur fromUid==moi (jamais un scan complet de la collection, voir la
        // règle Firestore ci-dessus et le commentaire de listMyFriendRequests()) : évite
        // d'envoyer deux fois la même demande tant que la précédente est en attente.
        const existingSnap = await getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', user.uid)));
        let alreadySent = false;
        existingSnap.forEach(d => { if (d.data().toUid === toUid) alreadySent = true; });
        if (alreadySent) return { error: 'already-sent' };
        const ref = doc(collection(db, 'friendRequests'));
        await setDoc(ref, {
            fromUid: user.uid, fromUsername: myUsername,
            toUid, toUsername: cleanUsername,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.warn('Envoi de la demande d\'ami échoué :', e);
        return { error: 'failed' };
    }
};

// Demandes reçues ET envoyées, via DEUX requêtes filtrées séparément (jamais un scan
// non filtré de toute la collection) : une règle Firestore de type "toUid==moi OU
// fromUid==moi" ne peut être vérifiée par le serveur sur un getDocs() SANS where() -
// Firestore refuse alors la requête entière (elle ne "filtre" pas silencieusement les
// documents non lisibles pour une liste non contrainte). Chaque where() ci-dessous est
// en revanche trivialement valide pour la règle, puisque TOUS ses résultats possibles
// la respectent par construction.
window.listMyFriendRequests = async function () {
    const user = auth.currentUser;
    if (!user) return { incoming: [], outgoing: [] };
    try {
        const [incomingSnap, outgoingSnap] = await Promise.all([
            getDocs(query(collection(db, 'friendRequests'), where('toUid', '==', user.uid))),
            getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', user.uid)))
        ]);
        const incoming = [], outgoing = [];
        incomingSnap.forEach(d => incoming.push(Object.assign({ id: d.id }, d.data())));
        outgoingSnap.forEach(d => outgoing.push(Object.assign({ id: d.id }, d.data())));
        return { incoming, outgoing };
    } catch (e) {
        console.warn('Lecture des demandes d\'ami échouée :', e);
        return { incoming: [], outgoing: [] };
    }
};

window.acceptFriendRequest = async function (requestId, fromUid, fromUsername) {
    const user = auth.currentUser;
    if (!user) return;
    const myUsername = (localStorage.getItem('userName') || '').trim();
    try {
        await Promise.all([
            setDoc(doc(db, 'users', user.uid, 'friendIndex', fromUid), { username: fromUsername, since: serverTimestamp() }),
            setDoc(doc(db, 'users', fromUid, 'friendIndex', user.uid), { username: myUsername, since: serverTimestamp() }),
            deleteDoc(doc(db, 'friendRequests', requestId))
        ]);
    } catch (e) {
        console.warn('Acceptation de la demande d\'ami échouée :', e);
    }
};

// Sert aussi bien à refuser une demande reçue qu'à annuler une demande qu'on a
// soi-même envoyée — dans les deux cas, il suffit de supprimer le document.
window.declineFriendRequest = async function (requestId) {
    try {
        await deleteDoc(doc(db, 'friendRequests', requestId));
    } catch (e) {
        console.warn('Suppression de la demande d\'ami échouée :', e);
    }
};

window.listMyFriends = async function () {
    const user = auth.currentUser;
    if (!user) return [];
    try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'friendIndex'));
        const result = [];
        snap.forEach(d => result.push({ uid: d.id, username: d.data().username }));
        return result;
    } catch (e) {
        console.warn('Lecture de la liste d\'amis échouée :', e);
        return [];
    }
};

window.removeFriend = async function (friendUid) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await Promise.all([
            deleteDoc(doc(db, 'users', user.uid, 'friendIndex', friendUid)),
            deleteDoc(doc(db, 'users', friendUid, 'friendIndex', user.uid))
        ]);
    } catch (e) {
        console.warn('Retrait de l\'ami échoué :', e);
    }
};

// Miroir minimal (juste les ids) de la liste des lieux visités, voir le commentaire
// d'en-tête de cette section. Appelé depuis syncVisited() dans script.js à chaque
// changement de la liste des visites.
window.syncFriendVisits = async function (locationIds) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'friendVisits', user.uid), { locationIds: locationIds || [] }, { merge: true });
    } catch (e) {
        console.warn('Synchronisation des visites (amis) échouée :', e);
    }
};

// Charge en un seul aller-retour les lieux visités de chaque ami donné — appelé une
// fois au chargement (voir firebase-ready de map.html), pas par fiche lieu ouverte.
window.loadFriendVisits = async function (friendUids) {
    if (!friendUids || friendUids.length === 0) return {};
    try {
        const snaps = await Promise.all(friendUids.map(uid => getDoc(doc(db, 'friendVisits', uid))));
        const result = {};
        snaps.forEach((snap, i) => { result[friendUids[i]] = (snap.exists() && snap.data().locationIds) || []; });
        return result;
    } catch (e) {
        console.warn('Lecture des visites des amis échouée :', e);
        return {};
    }
};

// Partage d'un lieu précis à un ami (suite du système d'amis ci-dessus) : un simple
// document par partage, jamais modifié après coup sauf pour son champ `seen` (marqué
// par le destinataire une fois consulté). Pas de collection à part pour "mes partages
// envoyés" : listSharesForMe() de chacun suffit, et fromUid reste dans le document pour
// l'affichage ("Alice a partagé...").
//
// IMPORTANT — nécessite cette règle Firestore (non déployable depuis ce fichier, à
// ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /friendShares/{shareId} {
//     allow read: if request.auth != null
//       && (resource.data.toUid == request.auth.uid || resource.data.fromUid == request.auth.uid);
//     allow create: if request.auth != null && request.resource.data.fromUid == request.auth.uid
//       && exists(/databases/$(database)/documents/users/$(request.auth.uid)/friendIndex/$(request.resource.data.toUid));
//     allow update: if request.auth != null && resource.data.toUid == request.auth.uid
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['seen']);
//   }
// La condition exists(...) dans allow create empêche de partager un lieu à quelqu'un
// qui n'est pas (encore) un ami — cohérent avec le reste du système d'amis.

window.shareLocationWithFriend = async function (toUid, locationId, locationName) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    const myUsername = (localStorage.getItem('userName') || '').trim();
    try {
        const ref = doc(collection(db, 'friendShares'));
        await setDoc(ref, {
            fromUid: user.uid, fromUsername: myUsername,
            toUid, locationId, locationName: locationName || '',
            seen: false, createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.warn('Partage du lieu échoué :', e);
        return { error: 'failed' };
    }
};

// Filtrée sur toUid==moi (même raison que listMyFriendRequests() plus haut : un
// getDocs() sans where() sur toute la collection serait refusé par la règle ci-dessus).
window.listSharesForMe = async function () {
    const user = auth.currentUser;
    if (!user) return [];
    try {
        const snap = await getDocs(query(collection(db, 'friendShares'), where('toUid', '==', user.uid)));
        const result = [];
        snap.forEach(d => result.push(Object.assign({ id: d.id }, d.data())));
        return result;
    } catch (e) {
        console.warn('Lecture des lieux partagés échouée :', e);
        return [];
    }
};

window.markShareSeen = async function (shareId) {
    try {
        await setDoc(doc(db, 'friendShares', shareId), { seen: true }, { merge: true });
    } catch (e) {
        console.warn('Marquage du partage comme lu échoué :', e);
    }
};

// Dès que l'état de connexion est connu (au chargement de la page, et à chaque
// connexion/déconnexion), on prévient le reste du site via un évènement custom —
// c'est le pont qui permet à script.js (non-module) de réagir sans avoir besoin
// d'imports ES.
onAuthStateChanged(auth, (user) => {
    window.firebaseCurrentUser = user || null;
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { user: user || null } }));
});
