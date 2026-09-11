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
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, deleteField, increment, arrayUnion, arrayRemove, serverTimestamp, query, where, orderBy, limit, documentId, onSnapshot } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

// Se connecter par pseudo (demande du 06/09/2026), en plus de l'e-mail — mêmes
// formulaires de connexion que map.html (popup "gate") et legal.html, qui appellent tous
// deux firebaseSignInEmail()/firebaseSendPasswordReset() ci-dessous : un seul endroit à
// corriger pour que la connexion par pseudo fonctionne partout. Voir resolveLoginEmail()
// dans welcome-script.js (page d'accueil, copie séparée car ce module n'y est pas chargé)
// pour l'explication complète de usernameLogin/{pseudo} -> {email} et pourquoi c'est une
// collection à part de `usernames` (jamais d'e-mail exposé en liste).
async function resolveLoginEmail(value) {
    const trimmed = (value || '').trim();
    if (!trimmed || trimmed.includes('@')) return trimmed;
    try {
        const snap = await getDoc(doc(db, 'usernameLogin', trimmed.toLowerCase()));
        return snap.exists() ? (snap.data().email || trimmed) : trimmed;
    } catch (e) {
        return trimmed;
    }
}

// Fonctions de connexion exposées globalement, pour que des pages qui n'ont pas
// leur propre module (map.html, legal.html...) puissent proposer un formulaire de
// connexion sans dupliquer toute la logique Firebase.
window.firebaseSignInEmail = async (emailOrUsername, password) => signInWithEmailAndPassword(auth, await resolveLoginEmail(emailOrUsername), password);
window.firebaseSignInGoogle = () => signInWithPopup(auth, googleProvider);
window.firebaseSendPasswordReset = async (emailOrUsername) => sendPasswordResetEmail(auth, await resolveLoginEmail(emailOrUsername));
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
// Nettoyage Firestore avant suppression définitive du compte (voir doDelete() ci-dessous
// et le bouton Google équivalent plus bas) : deleteUser() (Firebase Auth) ne touche JAMAIS
// Firestore, un service complètement séparé — sans ce nettoyage explicite, l'entrée
// usernames/{pseudo} restait bloquée à jamais sur l'ancien uid (empêchant un nouveau
// compte de reprendre le même pseudo), et les conversations DM de ce compte restaient
// visibles/fantômes côté amis, avec impossibilité de les supprimer (demande du
// 06/09/2026 : "j'ai supprimé un utilisateur et la conversation existe encore"). Best-
// effort et volontairement silencieux sur erreur : chaque étape est indépendante, une
// erreur sur l'une ne doit jamais empêcher les autres ni bloquer la suppression du compte
// lui-même. Doit tourner AVANT la suppression de users/{uid} (a besoin d'y lire le pseudo
// et, via listMyFriends(), de la sous-collection friendIndex).
async function cleanupFirestoreBeforeAccountDeletion(uid) {
    let username = null;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) username = snap.data().username || null;
    } catch (e) { /* tant pis, on continue sans libérer le pseudo */ }

    if (username) {
        const key = username.toLowerCase().trim();
        try {
            const unameSnap = await getDoc(doc(db, 'usernames', key));
            // Ne supprime que si l'entrée pointe bien vers CE compte (jamais celle d'un
            // autre compte qui aurait par ailleurs le même pseudo affiché localement).
            if (unameSnap.exists() && unameSnap.data().uid === uid) {
                await deleteDoc(doc(db, 'usernames', key));
            }
        } catch (e) { console.warn('Libération du pseudo échouée :', e); }
    }

    try {
        if (typeof window.listMyFriends === 'function') {
            const friends = await window.listMyFriends();
            await Promise.all(friends.map(f =>
                deleteDoc(doc(db, 'conversations', dmConversationId(uid, f.uid))).catch(() => {})
            ));
        }
    } catch (e) { console.warn('Suppression des conversations échouée :', e); }
}

window.firebaseDeleteAccount = async function (password) {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    const doDelete = async () => {
        await cleanupFirestoreBeforeAccountDeletion(user.uid);
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
    await cleanupFirestoreBeforeAccountDeletion(user.uid);
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
//
// Bug corrigé le 10/09/2026 : c'est LA fonction derrière la sauvegarde cloud des
// voyages/wishlist/lieux visités (voir syncVisited()/openTripModal()/toggleWishlist()
// dans script.js, tous des appels "fire and forget" sans vérifier de retour) — mais
// elle avalait silencieusement toute erreur Firestore (juste un console.warn). Le
// localStorage local était TOUJOURS écrit avant l'appel (ailleurs dans script.js),
// donc la sauvegarde avait l'air de marcher sur cet appareil même quand elle
// n'atteignait jamais Firestore (règles refusées, hors-ligne, requête bloquée...) —
// invisible pour qui ne garde pas la console ouverte, et donc absente pour tout
// autre appareil/compte qui consulterait les mêmes données ensuite. Retourne
// maintenant {success,code} ET affiche un toast d'erreur (limité à un seul à la
// fois, pour ne pas spammer si plusieurs sync échouent d'affilée hors-ligne).
let _syncUserDataErrorToastShown = false;
window.syncUserData = async function (fields) {
    const user = auth.currentUser;
    if (!user) return { success: false, code: 'not-authenticated' };
    try {
        await setDoc(doc(db, 'users', user.uid), fields, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Synchronisation Firestore échouée :', e);
        if (!_syncUserDataErrorToastShown && typeof window.showSimpleToast === 'function') {
            _syncUserDataErrorToastShown = true;
            const isFr = document.documentElement.lang === 'fr' || (window.currentLang === 'fr');
            window.showSimpleToast(
                isFr ? "Problème de connexion : vos changements sont enregistrés sur cet appareil mais pas encore dans le cloud." : "Connection issue: your changes are saved on this device but not yet synced to the cloud.",
                { isError: true }
            );
            setTimeout(() => { _syncUserDataErrorToastShown = false; }, 15000);
        }
        return { success: false, code: e && e.code || 'unknown' };
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
//            .hasOnly(['sum', 'count', 'foodSum', 'foodCount', 'valueSum', 'valueCount',
//                      'accessibilitySum', 'accessibilityCount', 'siteQualitySum', 'siteQualityCount']);
//   }
// (Si la règle précédente, sans les 4 derniers champs, est encore en place, remplacez-la
// par celle-ci — sinon les nouvelles notes accessibilité/qualité échoueront silencieusement
// avec permission-denied.)
// Limite connue : un client malveillant authentifié pourrait tout de même écrire un
// incrément arbitraire (ex: +1000) puisque les règles Firestore seules ne peuvent pas
// vérifier qu'un increment() correspond à "une vraie note entre 1 et 5" sans passer par
// une Cloud Function — hors de portée d'un site 100% statique sans backend comme celui-ci.
//
// `deltas` : objet ne contenant QUE les clés à incrémenter parmi sum/count et, pour
// chaque dimension de OPTIONAL_RATING_DIMENSIONS (script.js), <dim>Sum/<dim>Count —
// foodSum/foodCount n'existent que pour les lieux Cafe/Restaurants, les autres
// dimensions (value/accessibility/siteQuality) s'appliquent à tous les lieux.
window.updateLocationRatingAggregate = async function (locationId, deltas) {
    if (!deltas) return;
    const payload = {};
    for (const key of ['sum', 'count', 'foodSum', 'foodCount', 'valueSum', 'valueCount',
                        'accessibilitySum', 'accessibilityCount', 'siteQualitySum', 'siteQualityCount']) {
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
//     allow write: if request.auth != null
//       && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
//   }
// (écrit uniquement par un compte admin — voir approveLocationSubmission() plus bas, qui
// écrit ici après approbation d'une proposition ; "write: if false" a longtemps bloqué
// cette écriture avec une erreur "permission-denied" au clic sur "Approuver".)
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
        // Miroir vers publicProfiles/{uid} (voir plus haut) pour la page de profil public :
        // ne bloque jamais la publication de l'avis lui-même si ce miroir échoue (ex: règle
        // Firestore pas encore déployée) — l'avis reste visible sur la fiche du lieu même
        // si le profil met du temps à le refléter.
        try {
            await setDoc(doc(db, 'publicProfiles', user.uid), {
                reviews: { [String(locationId)]: Object.assign({}, reviewData, { locationId: String(locationId), updatedAt: serverTimestamp() }) }
            }, { merge: true });
        } catch (mirrorErr) {
            console.warn('Miroir public de l\'avis échoué :', mirrorErr);
        }
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
        await setDoc(doc(db, 'publicProfiles', user.uid), {
            reviews: { [String(locationId)]: deleteField() }
        }, { merge: true });
    } catch (e) {
        console.warn('Suppression de l\'avis échouée :', e);
    }
};

// Page de profil public (profile.html) : miroir des avis d'un compte, voir
// setLocationReview()/deleteLocationReview() ci-dessus.
window.fetchPublicProfile = async function (uid) {
    try {
        const snap = await getDoc(doc(db, 'publicProfiles', uid));
        return snap.exists() ? snap.data() : { reviews: {} };
    } catch (e) {
        console.warn('Lecture du profil public échouée :', e);
        return { reviews: {} };
    }
};

// Abonnement à sens unique façon Instagram (bouton "Follow" du profil public, demande du
// 08/09/2026) — voir follows/{targetUid}/items/{followerUid} dans firestore.rules.
// Distinct du système d'amis mutuel (friendIndex/friendCount) existant plus haut : ici,
// suivre quelqu'un n'exige aucune réciprocité ni acceptation.
window.isFollowing = async function (targetUid) {
    const user = auth.currentUser;
    if (!user || !targetUid) return false;
    try {
        const snap = await getDoc(doc(db, 'follows', targetUid, 'items', user.uid));
        return snap.exists();
    } catch (e) {
        console.warn('Lecture du statut d\'abonnement échouée :', e);
        return false;
    }
};
window.followUser = async function (targetUid) {
    const user = auth.currentUser;
    if (!user || !targetUid || targetUid === user.uid) return false;
    try {
        await setDoc(doc(db, 'follows', targetUid, 'items', user.uid), { at: serverTimestamp() });
        return true;
    } catch (e) {
        console.warn('Abonnement échoué :', e);
        return false;
    }
};
window.unfollowUser = async function (targetUid) {
    const user = auth.currentUser;
    if (!user || !targetUid) return false;
    try {
        await deleteDoc(doc(db, 'follows', targetUid, 'items', user.uid));
        return true;
    } catch (e) {
        console.warn('Désabonnement échoué :', e);
        return false;
    }
};
window.getFollowerCount = async function (targetUid) {
    if (!targetUid) return 0;
    try {
        const snap = await getDocs(collection(db, 'follows', targetUid, 'items'));
        return snap.size;
    } catch (e) {
        console.warn('Lecture du nombre d\'abonnés échouée :', e);
        return 0;
    }
};

// Photo publiée de façon autonome (bouton "+" -> "Add a photo", demande du 09/09/2026) —
// distincte des photos attachées à un avis "I visited this place"/"Add a review" : pas de
// note ni de visite associée, juste un lieu, une date et une légende facultative. Stockée
// dans publicProfiles/{uid}.photos.{id} (même document que .reviews, déjà en écriture
// libre pour son propriétaire — pas de règle Firestore dédiée nécessaire), lue à la fois
// par l'onglet Photos de profile.html et par fetchGlobalPhotoFeed() ci-dessous.
window.addProfilePhoto = async function ({ locationId, locationName, photo, date, caption }) {
    const user = auth.currentUser;
    if (!user) return { success: false, code: 'not-authenticated' };
    try {
        const photoId = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await setDoc(doc(db, 'publicProfiles', user.uid), {
            photos: {
                [photoId]: {
                    locationId, locationName: locationName || null, photo,
                    date: date || null, caption: (caption || '').slice(0, 280),
                    updatedAt: serverTimestamp()
                }
            }
        }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Publication de la photo échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// Modifier/supprimer une publication autonome (demande du 10/09/2026, icône crayon dans
// la modale plein-écran mobile de profile.html) — SEULEMENT les photos autonomes
// (publicProfiles/{uid}.photos.{photoId}, voir addProfilePhoto() ci-dessus), pas les
// photos attachées à un avis "I visited this place" (celles-ci font partie d'un avis
// complet avec note/visite, modifiées via ce flux existant, pas celui-ci).
window.updateProfilePhoto = async function (photoId, { photo, caption }) {
    const user = auth.currentUser;
    if (!user || !photoId) return { success: false, code: 'not-authenticated' };
    try {
        const fields = { updatedAt: serverTimestamp() };
        if (photo !== undefined) fields.photo = photo;
        if (caption !== undefined) fields.caption = (caption || '').slice(0, 280);
        await setDoc(doc(db, 'publicProfiles', user.uid), { photos: { [photoId]: fields } }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Modification de la photo échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};
window.deleteProfilePhoto = async function (photoId) {
    const user = auth.currentUser;
    if (!user || !photoId) return { success: false, code: 'not-authenticated' };
    try {
        await setDoc(doc(db, 'publicProfiles', user.uid), { photos: { [photoId]: deleteField() } }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Suppression de la photo échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// Biographie éditable du profil public (demande du 08/09/2026) : simple champ texte sur
// publicProfiles/{uid}, déjà en écriture libre pour son propriétaire (allow write ci-dessous,
// voir firestore.rules) — pas de règle dédiée nécessaire.
window.updateMyBio = async function (bio) {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        await setDoc(doc(db, 'publicProfiles', user.uid), { bio: (bio || '').slice(0, 280) }, { merge: true });
        return true;
    } catch (e) {
        console.warn('Mise à jour de la biographie échouée :', e);
        return false;
    }
};

// Fil d'actualité public façon Instagram (feed.html, demande du 08/09/2026) : agrège les
// photos publiées par TOUS les comptes. Sans backend/Cloud Function, pas de requête
// "collection group" possible pour lire toutes les publicProfiles/*.reviews d'un coup (pas
// de règle {path=**} dessus) — même pattern d'agrégation côté client que
// loadAllUsernamesCached()/searchUsernamesContaining() ci-dessous : petite échelle acceptée
// (un site fan, pas des millions de comptes).
let _globalPhotoFeedCache = null;
let _globalPhotoFeedCachePromise = null;
window.fetchGlobalPhotoFeed = async function () {
    if (_globalPhotoFeedCache) return _globalPhotoFeedCache;
    if (_globalPhotoFeedCachePromise) return _globalPhotoFeedCachePromise;
    _globalPhotoFeedCachePromise = (async () => {
        try {
            const users = await loadAllUsernamesCached();
            const profiles = await Promise.all(users.map(async u => {
                try {
                    const snap = await getDoc(doc(db, 'publicProfiles', u.uid));
                    return { u, data: snap.exists() ? snap.data() : null };
                } catch (e) {
                    return { u, data: null };
                }
            }));
            const photos = [];
            profiles.forEach(({ u, data }) => {
                if (!data) return;
                Object.values(data.reviews || {}).forEach(r => {
                    if (!r.photo) return;
                    photos.push({
                        id: String(r.locationId),
                        uid: u.uid,
                        username: u.username,
                        locationId: r.locationId,
                        locationName: r.locationName || '',
                        photo: r.photo,
                        caption: r.notes || '',
                        updatedAt: (r.updatedAt && r.updatedAt.seconds) || 0
                    });
                });
                // Photos autonomes (bouton "+" -> "Add a photo", demande du 09/09/2026) —
                // voir addProfilePhoto() ci-dessus. Plusieurs possibles par lieu et par
                // personne, contrairement à .reviews (un avis par lieu) : id = clé de
                // publicProfiles/{uid}.photos, pas locationId, pour ne jamais entrer en
                // collision entre elles ni avec une photo d'avis au même lieu.
                Object.entries(data.photos || {}).forEach(([photoId, p]) => {
                    if (!p.photo) return;
                    photos.push({
                        id: photoId,
                        uid: u.uid,
                        username: u.username,
                        locationId: p.locationId,
                        locationName: p.locationName || '',
                        photo: p.photo,
                        caption: p.caption || '',
                        updatedAt: (p.updatedAt && p.updatedAt.seconds) || 0
                    });
                });
            });
            photos.sort((a, b) => b.updatedAt - a.updatedAt);
            _globalPhotoFeedCache = photos;
            return photos;
        } catch (e) {
            console.warn('Chargement du fil de photos échoué :', e);
            return [];
        } finally {
            _globalPhotoFeedCachePromise = null;
        }
    })();
    return _globalPhotoFeedCachePromise;
};

// "J'aime" d'une photo du fil (photoLikes/{photoKey}/items/{uid}, voir firestore.rules) :
// chaque compte écrit/efface SON PROPRE document, jamais celui d'un autre — même schéma que
// friendIndex/friendShares. photoKey est une clé déterministe "<uid propriétaire>_<locationId>".
window.getPhotoLikeState = async function (photoKey) {
    const user = auth.currentUser;
    try {
        const snap = await getDocs(collection(db, 'photoLikes', photoKey, 'items'));
        let likedByMe = false;
        snap.forEach(d => { if (user && d.id === user.uid) likedByMe = true; });
        return { count: snap.size, likedByMe };
    } catch (e) {
        console.warn('Lecture des likes échouée :', e);
        return { count: 0, likedByMe: false };
    }
};
window.togglePhotoLike = async function (photoKey, liked) {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        if (liked) {
            await setDoc(doc(db, 'photoLikes', photoKey, 'items', user.uid), { at: serverTimestamp() });
        } else {
            await deleteDoc(doc(db, 'photoLikes', photoKey, 'items', user.uid));
        }
        return true;
    } catch (e) {
        console.warn('Mise à jour du like échouée :', e);
        return false;
    }
};

// Retrouve le pseudo d'un compte à partir de son uid (sens inverse de
// lookupUserByUsername ci-dessus) : nécessaire pour afficher l'en-tête d'un profil
// public ouvert depuis un uid (avatar ami, "a visité ce lieu"...) plutôt qu'un pseudo.
// Même collection publique usernames/ que lookupUserByUsername (allow read: if true).
window.lookupUsernameByUid = async function (uid) {
    if (!uid) return null;
    try {
        const q = query(collection(db, 'usernames'), where('uid', '==', uid), limit(1));
        const snap = await getDocs(q);
        let username = null;
        snap.forEach(d => { username = d.data().username || d.id; });
        return username;
    } catch (e) {
        console.warn('Recherche du pseudo par uid échouée :', e);
        return null;
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
        const contentFields = ['fullDescription', 'practicalInfo', 'tipsList', 'tip', 'directions', 'videoEmbeds', 'ytId', 'episodeLink', 'tweetUrl', 'instagramUrl', 'facebookUrl', 'tiktokUrl'];
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

// Édition directe d'un lieu déjà publié, par un admin, depuis l'icône crayon de sa fiche
// sur la carte (voir openLocationEditModal() dans script.js — demande du 06/09/2026) :
// contourne la file de soumissions/approbation ci-dessus, réservée aux propositions de
// non-admins ou aux nouveaux lieux — un admin qui modifie un lieu qu'il vient de relire
// n'a pas besoin de se re-approuver lui-même. N'écrit QUE dans locationContent/{id},
// jamais les champs "squelette" (nom, coordonnées...) qui restent dans
// script.js/celebLocations (stratégie hybride : squelette gratuit sur GitHub, contenu
// riche chargé à la demande depuis Firestore, pour ne jamais épuiser le quota gratuit de
// lectures/jour en rechargeant les 200 lieux à chaque visite). La vraie protection reste
// la règle Firestore de locationContent (write : admin uniquement) — ce isCurrentUserAdmin()
// côté client n'est qu'un raccourci UX pour éviter un aller-retour réseau inutile.
window.adminUpdateLocationContent = async function (locationId, fields) {
    const isAdmin = await window.isCurrentUserAdmin();
    if (!isAdmin) return { success: false, code: 'not-admin' };
    try {
        await setDoc(doc(db, 'locationContent', String(locationId)), fields, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Édition directe du lieu échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// Champs "squelette" (Group/Members/Country/City/Date) d'un lieu DÉJÀ publié (demande du
// 11/09/2026, même modale "crayon" que ci-dessus) : contrairement à locationContent
// ci-dessus, ces champs vivent normalement en dur dans script.js/celebLocations (stratégie
// hybride documentée plus haut), jamais réécrits pour un lieu existant. Plutôt que
// d'inventer un nouveau mécanisme, on réutilise exactement le même principe déjà en place
// pour newLocations (une collection entière lue UNE SEULE FOIS par visite, voir map.html) :
// un document ici par lieu MODIFIÉ, fusionné dans celebLocations au chargement — pas de
// lecture supplémentaire par lieu affiché. Collection séparée de newLocations (qui, elle,
// ne concerne que les tout nouveaux lieux) pour ne jamais mélanger les deux sémantiques.
window.fetchLocationSkeletonOverrides = async function () {
    try {
        const snap = await getDocs(collection(db, 'locationSkeletonOverrides'));
        const result = {};
        snap.forEach(d => { result[d.id] = d.data(); });
        return result;
    } catch (e) {
        console.warn('Lecture des corrections de fiches échouée :', e);
        return {};
    }
};
window.adminUpdateLocationSkeleton = async function (locationId, fields) {
    const isAdmin = await window.isCurrentUserAdmin();
    if (!isAdmin) return { success: false, code: 'not-admin' };
    try {
        await setDoc(doc(db, 'locationSkeletonOverrides', String(locationId)), fields, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Correction de la fiche échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// "Supprimer" un lieu depuis l'onglet admin "Existing locations" (demande du 06/09/2026) :
// pour un lieu du squelette (celebLocations, codé en dur dans script.js), une vraie
// suppression nécessiterait de modifier ET publier le code du site — impossible depuis un
// panneau d'administration d'un site 100% statique sans backend. On masque donc le lieu à
// la place : un seul document public (siteConfig/hiddenLocations, { ids: [...] }) listant
// les ids à ne jamais afficher, LU UNE SEULE FOIS par visite (voir map.html, juste après
// la fusion de newLocations) — une seule lecture Firestore de plus par visiteur, pas une
// par lieu masqué. Équivalent pratique d'une suppression côté visiteurs du site.
window.fetchHiddenLocationIds = async function () {
    try {
        const snap = await getDoc(doc(db, 'siteConfig', 'hiddenLocations'));
        return snap.exists() && Array.isArray(snap.data().ids) ? snap.data().ids : [];
    } catch (e) {
        console.warn('Lecture des lieux masqués échouée :', e);
        return [];
    }
};
window.adminSetLocationHidden = async function (locationId, hidden) {
    const isAdmin = await window.isCurrentUserAdmin();
    if (!isAdmin) return { success: false, code: 'not-admin' };
    try {
        const idStr = String(locationId);
        await setDoc(doc(db, 'siteConfig', 'hiddenLocations'), {
            ids: hidden ? arrayUnion(idStr) : arrayRemove(idStr)
        }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Masquage du lieu échoué :', e);
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
//     allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
//     allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
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
            // Pris par un AUTRE compte — mais seulement "réellement" pris si ce compte
            // existe encore. Un compte supprimé libère normalement son pseudo lui-même
            // (voir cleanupFirestoreBeforeAccountDeletion ci-dessus), mais un compte
            // supprimé par une autre voie (avant ce correctif, ou directement depuis la
            // console Firebase) laisse une entrée usernames/ orpheline qui bloquerait ce
            // pseudo pour toujours sans jamais pouvoir être réclamé — demande du
            // 06/09/2026 ("j'ai recréé un compte avec le même pseudo et j'ai 2x le même
            // pseudo"). On vérifie donc que le détenteur actuel a encore un compte avant
            // de refuser la réclamation.
            const holderSnap = await getDoc(doc(db, 'users', existing.data().uid));
            if (holderSnap.exists()) return { success: false, code: 'taken' };
        }
        // `username` (comme la clé du document) est toujours en minuscules — règle du
        // 06/09/2026, jamais de majuscule dans un pseudo — peu importe la casse tapée par
        // l'appelant.
        await setDoc(doc(db, 'usernames', key), { uid: user.uid, username: key }, { merge: true });
        // Index séparé pour la connexion par pseudo (voir resolveLoginEmail dans
        // welcome-script.js) — jamais fusionné dans `usernames` (public en lecture pour la
        // recherche d'amis) pour ne pas exposer les e-mails en liste : sa règle Firestore
        // n'autorise que la lecture d'UN document précis, jamais une requête sur toute la
        // collection.
        await setDoc(doc(db, 'usernameLogin', key), { email: user.email }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Réservation du pseudo échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

// Libère l'ANCIEN pseudo après un renommage réussi (account.html) : sans ça,
// usernames/{ancien-pseudo} restait indéfiniment dans l'index public une fois le nouveau
// pseudo réclamé, et continuait à apparaître dans les suggestions d'ajout d'ami
// (searchUsernamesByPrefix/searchUsernamesContaining) alors que ce pseudo n'est plus
// utilisé par personne (bug rapporté le 06/09/2026 : "Marie" renommée "mahihie"
// continuait à s'afficher). Ne supprime que si le document appartient bien au compte
// courant (la règle `allow delete` l'exige de toute façon).
window.releaseUsername = async function (oldUsername) {
    const user = auth.currentUser;
    if (!user || !oldUsername) return;
    const key = oldUsername.toLowerCase().trim();
    try {
        const snap = await getDoc(doc(db, 'usernames', key));
        if (snap.exists() && snap.data().uid === user.uid) {
            await deleteDoc(doc(db, 'usernames', key));
        }
        await deleteDoc(doc(db, 'usernameLogin', key));
    } catch (e) {
        console.warn('Libération de l\'ancien pseudo échouée :', e);
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

// Auto-complétion par pseudo (partage de voyage, friends.html) : requête par PRÉFIXE sur
// l'id du document (toujours en minuscules) via une plage [prefix, prefix+'') — la
// seule forme de recherche texte que Firestore sait faire nativement, pas une vraie
// recherche "contient" (ça nécessiterait un service de recherche externe, hors de portée
// d'un site statique sans backend). "Perrine" retrouve donc "Perrine4058" (préfixe), mais
// pas un pseudo où "Perrine" apparaîtrait au milieu — limite acceptée pour ce site.
window.searchUsernamesByPrefix = async function (prefix, maxResults) {
    const key = (prefix || '').toLowerCase().trim();
    if (!key) return [];
    try {
        const q = query(collection(db, 'usernames'),
            orderBy(documentId()),
            where(documentId(), '>=', key),
            where(documentId(), '<', key + ''),
            limit(maxResults || 6));
        const snap = await getDocs(q);
        const results = [];
        snap.forEach(d => results.push({ uid: d.data().uid, username: d.data().username || d.id }));
        return results;
    } catch (e) {
        console.warn('Recherche de pseudos échouée :', e);
        return [];
    }
};

// Recherche "contient" (friends.html, ajout d'ami — demande du 06/09/2026) : contrairement
// à searchUsernamesByPrefix() ci-dessus, retrouve un pseudo où le texte tapé apparaît
// n'importe où, pas seulement en préfixe ("Perrine" retrouve aussi "xPerrine99"). Firestore
// ne sait pas faire ça nativement (il faudrait un service de recherche externe payant, hors
// de portée d'un site 100% statique) : on charge donc TOUTE la collection usernames/ une
// seule fois (mise en cache en mémoire pour la session — `allow read: if true` l'autorise
// déjà, c'est le même index public utilisé pour le partage de voyage) et on filtre côté
// client. Ne pose pas de problème d'échelle ni de vie privée particulier ici : la
// collection ne contient que pseudo->uid, déjà entièrement publique/lisible par tous.
let _allUsernamesCache = null;
let _allUsernamesCachePromise = null;
async function loadAllUsernamesCached() {
    if (_allUsernamesCache) return _allUsernamesCache;
    if (_allUsernamesCachePromise) return _allUsernamesCachePromise;
    _allUsernamesCachePromise = (async () => {
        try {
            const snap = await getDocs(collection(db, 'usernames'));
            const list = [];
            snap.forEach(d => list.push({ uid: d.data().uid, username: d.data().username || d.id }));
            _allUsernamesCache = list;
            return list;
        } catch (e) {
            console.warn('Chargement de la liste des pseudos échoué :', e);
            return [];
        } finally {
            _allUsernamesCachePromise = null;
        }
    })();
    return _allUsernamesCachePromise;
}
window.searchUsernamesContaining = async function (text, maxResults) {
    const q = (text || '').toLowerCase().trim();
    if (!q) return [];
    const all = await loadAllUsernamesCached();
    const matches = all.filter(u => u.username.toLowerCase().includes(q));
    // Un pseudo qui COMMENCE par le texte tapé est plus pertinent qu'un pseudo où le
    // texte apparaît seulement au milieu/à la fin — trié en premier, sinon alphabétique.
    matches.sort((a, b) => {
        const aStarts = a.username.toLowerCase().startsWith(q);
        const bStarts = b.username.toLowerCase().startsWith(q);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.username.localeCompare(b.username);
    });
    return matches.slice(0, maxResults || 8);
};

// Idempotent (merge:true, jamais members/memberNames dans le payload) : peut être
// rappelée sans risque sur un voyage déjà partagé — appelée à chaque partage/invitation
// (voir sendTripInvite() plus bas), ça auto-répare aussi bien un document jamais créé
// qu'un document créé de façon incomplète par l'ancien bug de ce nom, sans jamais écraser
// les collaborateurs déjà présents (bug rapporté le 06/09/2026 : un voyage partagé
// affichait "undefined" et "Shared by ARMY").
window.createSharedTrip = async function (trip) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    try {
        await setDoc(doc(db, 'trips', trip.id), Object.assign({}, trip, {
            ownerUid: user.uid,
            ownerName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
        }), { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Création du voyage partagé échouée :', e);
        return { error: 'failed' };
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

// Invitation à rejoindre un voyage partagé (demande du 06/09/2026) : remplace l'ancien
// inviteTripCollaborator(), qui ajoutait directement à trips/{id}.members — désormais,
// la personne invitée n'apparaît dans le voyage (donc dans My Itinerary/Explore côté
// carte, et la liste "Trip groups" de friends.html, qui lisent tous cette même source)
// qu'après avoir accepté elle-même (voir acceptTripInvite ci-dessous), comme pour une
// demande d'ami. `tripName`/`tripCoverImage` sont dupliqués sur l'invitation elle-même
// (plutôt que relus depuis trips/{id} au moment de l'affichage) pour que la personne
// invitée puisse voir de quel voyage il s'agit sans avoir encore accès en lecture au
// document trips/{id} lui-même (la règle de lecture exige d'être déjà membre).
window.sendTripInvite = async function (tripId, tripName, tripCoverImage, username, role) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) return { error: 'empty' };
    const uid = await window.lookupUserByUsername(cleanUsername);
    if (!uid) return { error: 'not-found' };
    if (uid === user.uid) return { error: 'self' };
    // Vérification "déjà membre" à part, dans son propre try/catch : un échec ici (ex.
    // règles Firestore pas encore republiées côté console après un changement, voir
    // firestore.rules) ne doit jamais faire échouer l'invitation entière — au pire on saute
    // cette vérification et on laisse la règle de création de tripInvites/{id} (toujours
    // valide, elle, tant que fromUid == soi-même) et la déduplication "already-invited"
    // ci-dessous protéger contre les doublons (demande du 07/09/2026 : "Failed to send the
    // invite" pour un compte non-admin alors que le compte admin y arrivait).
    try {
        const tripSnap = await getDoc(doc(db, 'trips', tripId));
        if (tripSnap.exists() && tripSnap.data().members && tripSnap.data().members[uid]) {
            return { error: 'already-member' };
        }
    } catch (e) {
        console.warn('Vérification "déjà membre" ignorée (voyage pas encore synchronisé ou règles à republier) :', e);
    }
    // Auto-réparation GARANTIE du document trips/{id} avant de créer l'invitation (demande
    // du 07/09/2026 : "il faut régler ce problème une bonne fois pour toute") — jusqu'ici,
    // chaque écran qui envoie une invitation devait PENSER À appeler createSharedTrip()
    // séparément avant, et un seul oubli (ex: la création d'un voyage avec invités en une
    // étape, dans createNewTripAdvanced()) suffisait à laisser trips/{id} sans ownerUid/name
    // — l'invitation partait quand même (sendTripInvite ne dépend pas de ce document), mais
    // acceptTripInvite() échouait ensuite en silence : sa clause d'auto-ajout dans les
    // règles Firestore exige que le document existe déjà AVEC un ownerUid valide, donc
    // Firestore la traite comme une création interdite (payload sans ownerUid) plutôt
    // qu'une mise à jour. En centralisant ici, dans la SEULE fonction par laquelle toute
    // invitation transite, ce oubli devient impossible. `name`/`coverImage` ne sont écrits
    // que s'ils sont fournis (jamais une chaîne vide qui écraserait une vraie valeur déjà
    // en place) ; un échec ici (ex: appelant qui n'est ni propriétaire ni éditeur du voyage)
    // est ignoré sans bloquer l'envoi de l'invitation elle-même.
    try {
        const heal = {
            ownerUid: user.uid,
            ownerName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
        };
        if (tripName) heal.name = tripName;
        if (tripCoverImage) heal.coverImage = tripCoverImage;
        await setDoc(doc(db, 'trips', tripId), heal, { merge: true });
    } catch (e) {
        console.warn('Auto-réparation du voyage avant invitation ignorée :', e);
    }
    try {
        const existingSnap = await getDocs(query(collection(db, 'tripInvites'), where('fromUid', '==', user.uid)));
        let alreadyInvited = false;
        existingSnap.forEach(d => { if (d.data().toUid === uid && d.data().tripId === String(tripId)) alreadyInvited = true; });
        if (alreadyInvited) return { error: 'already-invited' };
        const myUsername = (localStorage.getItem('userName') || '').trim();
        const ref = doc(collection(db, 'tripInvites'));
        await setDoc(ref, {
            tripId: String(tripId), tripName: tripName || '', tripCoverImage: tripCoverImage || '',
            fromUid: user.uid, fromUsername: myUsername,
            toUid: uid, toUsername: cleanUsername,
            role: role || 'view',
            createdAt: serverTimestamp()
        });
        return { success: true, uid, username: cleanUsername, role: role || 'view' };
    } catch (e) {
        console.warn('Invitation au voyage échouée :', e);
        return { error: 'failed' };
    }
};

// Reçues ET envoyées, même schéma que listMyFriendRequests() (deux where() séparés).
window.listMyTripInvites = async function () {
    const user = auth.currentUser;
    if (!user) return { incoming: [], outgoing: [] };
    try {
        const [incomingSnap, outgoingSnap] = await Promise.all([
            getDocs(query(collection(db, 'tripInvites'), where('toUid', '==', user.uid))),
            getDocs(query(collection(db, 'tripInvites'), where('fromUid', '==', user.uid)))
        ]);
        const incoming = [], outgoing = [];
        incomingSnap.forEach(d => incoming.push(Object.assign({ id: d.id }, d.data())));
        outgoingSnap.forEach(d => outgoing.push(Object.assign({ id: d.id }, d.data())));
        return { incoming, outgoing };
    } catch (e) {
        console.warn('Lecture des invitations de voyage échouée :', e);
        return { incoming: [], outgoing: [] };
    }
};

window.acceptTripInvite = async function (inviteId, tripId, role) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    const myUsername = (localStorage.getItem('userName') || '').trim();
    try {
        // Un voyage invité AVANT le correctif d'auto-réparation de sendTripInvite() (voir
        // plus haut) peut encore, malgré tout, ne pas avoir de document trips/{id} : dans ce
        // cas, la simple fusion members/memberNames ci-dessous serait traitée comme une
        // CRÉATION par Firestore (le document n'existe pas), refusée puisqu'elle ne fournit
        // aucun ownerUid — d'où "Failed to accept" en silence malgré le correctif précédent
        // (bug rapporté à nouveau le 07/09/2026, cette fois pour une invitation antérieure au
        // premier correctif). On construit ici nous-mêmes un document complet à partir des
        // informations déjà stockées sur l'invitation elle-même (tripName/tripCoverImage/
        // fromUid/fromUsername, voir sendTripInvite()) — la personne qui accepte devient un
        // simple membre, jamais propriétaire (voir la règle `create` élargie dans
        // firestore.rules, qui l'autorise explicitement). Si le document existe déjà
        // (immense majorité des cas), ceci reste une simple fusion sans aucun effet de bord :
        // ownerUid/name/coverImage sont réécrits avec les mêmes valeurs qu'avant (self-heal
        // habituel), members/memberNames s'ajoutent normalement.
        let heal = { members: { [user.uid]: role || 'view' }, memberNames: { [user.uid]: myUsername } };
        try {
            const tripSnap = await getDoc(doc(db, 'trips', tripId));
            if (!tripSnap.exists()) {
                const inviteSnap = await getDoc(doc(db, 'tripInvites', inviteId));
                const inv = inviteSnap.exists() ? inviteSnap.data() : {};
                heal = Object.assign({
                    ownerUid: inv.fromUid || '',
                    ownerName: inv.fromUsername || 'ARMY',
                    name: inv.tripName || '',
                    coverImage: inv.tripCoverImage || '',
                }, heal);
            }
        } catch (e) {
            console.warn('Vérification du voyage avant acceptation ignorée :', e);
        }
        await setDoc(doc(db, 'trips', tripId), heal, { merge: true });
        await deleteDoc(doc(db, 'tripInvites', inviteId));
        return { success: true };
    } catch (e) {
        console.warn('Acceptation de l\'invitation au voyage échouée :', e);
        return { error: 'failed' };
    }
};

window.declineTripInvite = async function (inviteId) {
    try {
        await deleteDoc(doc(db, 'tripInvites', inviteId));
    } catch (e) {
        console.warn('Refus de l\'invitation au voyage échoué :', e);
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
// users/{uid}/friendIndex/{friendUid} — le propriétaire de la liste, ou la personne
// qui y est ajoutée — ce qui permet à la personne qui ACCEPTE la demande d'écrire les
// deux côtés en une fois (dans sa propre liste, et dans celle de l'autre) sans jamais
// avoir besoin d'un accès en écriture plus large sur le compte d'autrui.
// BUG corrigé le 06/09/2026 : la règle publiée référençait `ownerUid`, une variable
// jamais déclarée dans ce match imbriqué (seul `uid`, du match /users/{uid} englobant,
// existe ici) — ce qui faisait échouer toute lecture/écriture de friendIndex avec
// permission-denied, empêchant purement et simplement d'ajouter des amis.
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
//     allow read: if true;
//     allow write: if request.auth != null && request.auth.uid == uid
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['locationIds']);
//   }
//   match /publicProfiles/{uid} {
//     allow read: if true;
//     allow write: if request.auth != null && request.auth.uid == uid;
//     allow update: if request.auth != null
//       && exists(/databases/$(database)/documents/users/$(uid)/friendIndex/$(request.auth.uid))
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['friendCount']);
//     allow create: if request.auth != null
//       && exists(/databases/$(database)/documents/users/$(uid)/friendIndex/$(request.auth.uid))
//       && request.resource.data.keys().hasOnly(['friendCount']);
//   }
// friendVisits/{uid} est désormais public en lecture (demande du 07/09/2026, page de
// profil public façon Instagram) — voir firestore.rules pour le détail de ce
// changement. publicProfiles/{uid} est un miroir des avis publics d'un compte (voir
// setLocationReview() plus bas), pour afficher "ses avis"/"ses photos" sur son profil
// sans avoir besoin d'une requête collection group sur locationReviews/*/items.
// Le champ friendCount (demande du 08/09/2026, "followers" du profil public) est le SEUL
// champ qu'un autre compte que le propriétaire peut modifier — et seulement s'il est
// réellement dans la liste d'amis de {uid} (friendIndex), pour empêcher n'importe qui
// d'incrémenter arbitrairement le compteur de n'importe quel profil.
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
        // Compteur "followers" public de profile.html (publicProfiles/{uid}.friendCount) :
        // incrémenté des DEUX côtés maintenant que la relation existe réellement dans
        // friendIndex des deux comptes — la règle Firestore de publicProfiles/{uid} exige
        // justement cette existence pour autoriser une écriture par quelqu'un d'autre que
        // le propriétaire du document, restreinte au seul champ friendCount. Ne bloque
        // jamais l'acceptation elle-même si ce miroir échoue.
        try {
            await Promise.all([
                setDoc(doc(db, 'publicProfiles', user.uid), { friendCount: increment(1) }, { merge: true }),
                setDoc(doc(db, 'publicProfiles', fromUid), { friendCount: increment(1) }, { merge: true })
            ]);
        } catch (countErr) {
            console.warn('Mise à jour du compteur de followers échouée :', countErr);
        }
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
        // Décrémente le compteur "followers" public AVANT de supprimer les entrées
        // friendIndex ci-dessous : la règle Firestore de publicProfiles/{uid} exige que la
        // relation existe encore au moment de l'écriture pour autoriser quelqu'un d'autre
        // que le propriétaire à modifier son friendCount.
        try {
            await Promise.all([
                setDoc(doc(db, 'publicProfiles', user.uid), { friendCount: increment(-1) }, { merge: true }),
                setDoc(doc(db, 'publicProfiles', friendUid), { friendCount: increment(-1) }, { merge: true })
            ]);
        } catch (countErr) {
            console.warn('Mise à jour du compteur de followers échouée :', countErr);
        }
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

// Page de profil public (profile.html) : lieux visités d'UN compte quelconque, pas
// nécessairement un ami (friendVisits/{uid} est public en lecture, voir plus haut).
window.fetchUserVisitedIds = async function (uid) {
    if (!uid) return [];
    try {
        const snap = await getDoc(doc(db, 'friendVisits', uid));
        return (snap.exists() && snap.data().locationIds) || [];
    } catch (e) {
        console.warn('Lecture des lieux visités du profil échouée :', e);
        return [];
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
            toUid, type: 'location', locationId, locationName: locationName || '',
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

// ==========================================
// MESSAGERIE (friends.html) — messages directs entre deux amis, et discussion de
// groupe pour chaque voyage partagé ("un groupe = un trip", voir friends.html).
// ==========================================
// Une conversation DM a pour id "dm_<uidA>_<uidB>" (uids triés pour être déterministe
// des deux côtés) et porte directement members:[uidA,uidB] — jamais amené à changer.
// Une conversation de groupe a pour id "trip_<tripId>" et NE duplique PAS la liste des
// membres : sa règle de lecture/écriture consulte directement trips/{tripId} (déjà la
// source de vérité pour "qui est dans ce voyage"), pour ne jamais risquer une
// désynchronisation entre deux listes de membres qui devraient toujours être identiques.
//
// IMPORTANT — nécessite ces règles Firestore (non déployables depuis ce fichier, à
// ajouter dans la console Firebase, onglet Firestore > Rules) :
//   function isConvoMember(convoData) {
//     return convoData.type == 'dm'
//       ? request.auth.uid in convoData.members
//       : (get(/databases/$(database)/documents/trips/$(convoData.tripId)).data.ownerUid == request.auth.uid
//          || request.auth.uid in get(/databases/$(database)/documents/trips/$(convoData.tripId)).data.members);
//   }
//   match /conversations/{convoId} {
//     allow read: if request.auth != null && isConvoMember(resource.data);
//     allow create: if request.auth != null && isConvoMember(request.resource.data);
//     allow update: if request.auth != null && isConvoMember(resource.data)
//       && request.resource.data.diff(resource.data).affectedKeys()
//            .hasOnly(['lastMessageAt', 'lastMessageText', 'lastMessageFromUid']);
//     allow delete: if request.auth != null && isConvoMember(resource.data);
//     match /messages/{messageId} {
//       allow read: if request.auth != null
//         && isConvoMember(get(/databases/$(database)/documents/conversations/$(convoId)).data);
//       allow create: if request.auth != null && request.resource.data.fromUid == request.auth.uid
//         && isConvoMember(get(/databases/$(database)/documents/conversations/$(convoId)).data);
//       allow update: if request.auth != null
//         && isConvoMember(get(/databases/$(database)/documents/conversations/$(convoId)).data)
//         && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes']);
//       allow delete: if request.auth != null && resource.data.fromUid == request.auth.uid
//         && request.time < resource.data.createdAt + duration.value(10, 'm');
//     }
//     match /reads/{uid} {
//       allow read, write: if request.auth != null && request.auth.uid == uid;
//     }
//   }
// Limite connue : n'importe quel membre d'une conversation peut la lire/écrire des
// messages en son propre nom — comme pour le reste du site, aucune Cloud Function ne
// vérifie le CONTENU d'un message (longueur, spam...).

function dmConversationId(uidA, uidB) { return uidA < uidB ? `dm_${uidA}_${uidB}` : `dm_${uidB}_${uidA}`; }
function tripConversationId(tripId) { return `trip_${tripId}`; }
window.dmConversationId = dmConversationId;
window.tripConversationId = tripConversationId;

// N'écrit type/members/memberNames QUE si le document n'existe pas encore : un simple
// setDoc(..., {merge:true}) sur un document déjà existant est classé "update" par les
// règles Firestore, qui n'autorisent la modification que de lastMessageAt/lastMessageText/
// lastMessageFromUid sur une conversation existante (voir firestore.rules) — si le
// pseudo affiché a changé depuis la création (renommage, ancien compte recréé...),
// re-fusionner memberNames avec la nouvelle valeur violait cette règle et faisait
// échouer silencieusement TOUTE ouverture ultérieure de cette conversation (donc l'envoi
// de messages) — bug confirmé le 06/09/2026.
window.ensureDmConversation = async function (friendUid, friendUsername) {
    const user = auth.currentUser;
    if (!user) return null;
    const convoId = dmConversationId(user.uid, friendUid);
    const myUsername = (localStorage.getItem('userName') || '').trim();
    try {
        const ref = doc(db, 'conversations', convoId);
        const existing = await getDoc(ref);
        if (!existing.exists()) {
            await setDoc(ref, {
                type: 'dm', members: [user.uid, friendUid],
                memberNames: { [user.uid]: myUsername, [friendUid]: friendUsername },
            });
        }
        return convoId;
    } catch (e) {
        console.warn('Création de la conversation échouée :', e);
        return null;
    }
};

window.ensureTripConversation = async function (tripId, tripName) {
    const convoId = tripConversationId(tripId);
    try {
        const ref = doc(db, 'conversations', convoId);
        const existing = await getDoc(ref);
        if (!existing.exists()) {
            await setDoc(ref, { type: 'trip', tripId: String(tripId), tripName: tripName || '' });
        }
        return convoId;
    } catch (e) {
        console.warn('Création de la conversation de groupe échouée :', e);
        return null;
    }
};

// Supprime une conversation (DM ou groupe de voyage — bouton "×" de friends.html, demande
// du 06/09/2026) : efface uniquement l'HISTORIQUE de messages (le document
// conversations/{id} lui-même), jamais l'amitié ni l'appartenance au voyage — rouvrir la
// conversation en recréera une nouvelle, vide, via ensureDmConversation()/
// ensureTripConversation() ci-dessus. Ne supprime pas la sous-collection messages/ (pas de
// Cloud Function pour le faire proprement sur un site 100% statique) : ces documents
// orphelins restent invisibles/inaccessibles une fois le parent supprimé (la règle de
// messages/{id} exige de résoudre isConvoMember() sur le document conversations/{id}
// parent, qui échoue une fois celui-ci supprimé).
window.deleteConversation = async function (convoId) {
    try {
        await deleteDoc(doc(db, 'conversations', convoId));
        return { success: true };
    } catch (e) {
        console.warn('Suppression de la conversation échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.sendMessage = async function (convoId, text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return { error: 'empty' };
    return window.sendRichMessage(convoId, { text: trimmed }, trimmed);
};

// Version générique derrière sendMessage() (texte simple) ET le menu "+" de friends.html
// (partager un lieu, partager un voyage, créer un sondage) : `extraFields` porte les
// champs propres à chaque type (voir les 3 fonctions ci-dessous), `previewText` est ce
// qui s'affiche dans la sidebar (ex: "Shared a location" plutôt que le texte brut d'un
// sondage). Aucune restriction de champs côté règles Firestore sur la création d'un
// message — seule la mise à jour ultérieure de `votes` (vote dans un sondage) est
// contrainte.
window.sendRichMessage = async function (convoId, extraFields, previewText) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    const myUsername = (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim();
    try {
        const msgRef = doc(collection(db, 'conversations', convoId, 'messages'));
        await setDoc(msgRef, Object.assign({ fromUid: user.uid, fromUsername: myUsername, createdAt: serverTimestamp() }, extraFields));
        await setDoc(doc(db, 'conversations', convoId), {
            lastMessageAt: serverTimestamp(), lastMessageText: (previewText || '').slice(0, 140), lastMessageFromUid: user.uid,
        }, { merge: true });
        return { success: true, id: msgRef.id };
    } catch (e) {
        console.warn('Envoi du message échoué :', e);
        return { error: 'failed' };
    }
};

// Partager un lieu précis DANS une conversation (menu "+", différent de
// shareLocationWithFriend() ci-dessus qui alimente les notifications de la sidebar sans
// passer par une conversation) — locationId/locationName suffisent, le rendu ressort les
// détails (image, lien) depuis celebLocations côté client, jamais dupliqués ici.
window.sendLocationShareMessage = async function (convoId, locationId, locationName) {
    return window.sendRichMessage(convoId,
        { type: 'location', locationId: String(locationId), locationName: locationName || '' },
        locationName || 'Shared a location');
};

// Partager un voyage DANS une conversation (menu "+", simple carte de chat — indépendant
// de sendTripInvite() qui gère l'invitation à rejoindre le voyage lui-même).
window.sendTripShareMessage = async function (convoId, tripId, tripName) {
    return window.sendRichMessage(convoId,
        { type: 'trip', sharedTripId: String(tripId), sharedTripName: tripName || '' },
        tripName || 'Shared a trip');
};

// Sondage simple : question + jusqu'à 4 options, votes stockés comme {uid: optionIndex}
// directement sur le message (pas de sous-collection — un sondage de conversation reste
// de taille modeste). Pas de mise à jour en temps réel (comme le reste de la messagerie
// de ce site, qui n'utilise jamais onSnapshot) : les votes des autres n'apparaissent
// qu'au prochain rafraîchissement de la conversation.
window.sendPollMessage = async function (convoId, question, options) {
    const cleanOptions = (options || []).map(o => (o || '').trim()).filter(Boolean).slice(0, 4);
    if (!question || !question.trim() || cleanOptions.length < 2) return { error: 'invalid' };
    return window.sendRichMessage(convoId,
        { type: 'poll', pollQuestion: question.trim(), pollOptions: cleanOptions, votes: {} },
        question.trim());
};

// Voter (ou changer son vote) dans un sondage — un seul choix par personne, la ré-écriture
// du même uid remplace simplement son vote précédent (merge sur `votes.<uid>`).
window.voteInPoll = async function (convoId, messageId, optionIndex) {
    const user = auth.currentUser;
    if (!user) return { error: 'not-signed-in' };
    try {
        await setDoc(doc(db, 'conversations', convoId, 'messages', messageId),
            { votes: { [user.uid]: optionIndex } }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Vote dans le sondage échoué :', e);
        return { error: 'failed' };
    }
};

window.loadMessages = async function (convoId) {
    try {
        const snap = await getDocs(collection(db, 'conversations', convoId, 'messages'));
        const msgs = [];
        snap.forEach(d => msgs.push(Object.assign({ id: d.id }, d.data())));
        msgs.sort((a, b) => ((a.createdAt && a.createdAt.seconds) || 0) - ((b.createdAt && b.createdAt.seconds) || 0));
        return msgs;
    } catch (e) {
        console.warn('Lecture des messages échouée :', e);
        return [];
    }
};

// Écoute en temps réel les messages d'UNE conversation ouverte (demande du 07/09/2026 :
// "je veux recevoir les messages sans devoir recharger la page") — seul endroit du site à
// utiliser onSnapshot (voir la note plus haut sur sendPollMessage : jusqu'ici, toute la
// messagerie se contentait de charger une fois à l'ouverture). Volontairement limité à LA
// conversation actuellement ouverte plutôt qu'un onSnapshot par ligne de la sidebar — un
// abonnement par ami/voyage resterait actif en permanence même en arrière-plan, ce qui
// multiplierait les lectures Firestore facturées pour un gain surtout utile pendant qu'on
// regarde activement une conversation. `callback(msgs)` est rappelé à chaque changement
// (même tri par createdAt que loadMessages ci-dessus) ; la fonction retournée se désabonne
// (à appeler quand on change de conversation ou qu'on ferme le panneau).
window.listenForMessages = function (convoId, callback) {
    try {
        return onSnapshot(collection(db, 'conversations', convoId, 'messages'), (snap) => {
            const msgs = [];
            snap.forEach(d => msgs.push(Object.assign({ id: d.id }, d.data())));
            msgs.sort((a, b) => ((a.createdAt && a.createdAt.seconds) || 0) - ((b.createdAt && b.createdAt.seconds) || 0));
            callback(msgs);
        }, (e) => {
            console.warn('Écoute des messages échouée :', e);
        });
    } catch (e) {
        console.warn('Abonnement aux messages échoué :', e);
        return () => {};
    }
};

// Nombre RÉEL de messages non lus dans une conversation (demande du 07/09/2026 : le badge
// de la sidebar affichait toujours "1", jamais le vrai total) — tous les messages créés
// après la dernière lecture (reads/{uid}, voir markConversationRead), moins les nôtres
// (on ne compte jamais ses propres messages comme "non lus" pour soi-même). Une seule
// inégalité (`createdAt >`) : jamais besoin d'index composite, contrairement à un filtre
// combiné sur fromUid — le tri par expéditeur se fait donc côté client après lecture.
window.countUnreadMessagesInConversation = async function (convoId) {
    const user = auth.currentUser;
    if (!user) return 0;
    try {
        const readSnap = await getDoc(doc(db, 'conversations', convoId, 'reads', user.uid));
        const readAt = readSnap.exists() ? readSnap.data().lastReadAt : null;
        const messagesRef = collection(db, 'conversations', convoId, 'messages');
        const snap = await getDocs(readAt ? query(messagesRef, where('createdAt', '>', readAt)) : messagesRef);
        let count = 0;
        snap.forEach(d => { if (d.data().fromUid !== user.uid) count++; });
        return count;
    } catch (e) {
        console.warn('Comptage des messages non lus échoué :', e);
        return 0;
    }
};

// Supprime un message qu'on a soi-même envoyé, si les 10 minutes autorisées ne sont pas
// encore écoulées (voir la règle Firestore ci-dessus, seule autorité réelle sur ce délai —
// cette fonction se contente de relayer un 'permission-denied' clair si le client a laissé
// le bouton visible trop longtemps, ex: horloge locale décalée).
window.deleteMessage = async function (convoId, messageId) {
    try {
        await deleteDoc(doc(db, 'conversations', convoId, 'messages', messageId));
        return { success: true };
    } catch (e) {
        console.warn('Suppression du message échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.markConversationRead = async function (convoId) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'conversations', convoId, 'reads', user.uid), { lastReadAt: serverTimestamp() }, { merge: true });
    } catch (e) {
        console.warn('Marquage de la conversation comme lue échoué :', e);
    }
};

// Utilisé pour l'aperçu (nom du voyage, dernier message...) dans la sidebar de
// friends.html avant même d'avoir ouvert la conversation.
window.loadConversationMeta = async function (convoId) {
    try {
        const snap = await getDoc(doc(db, 'conversations', convoId));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        return null;
    }
};

// Aperçu d'UNE conversation pour la sidebar de friends.html (demande du 06/09/2026, liste
// façon messagerie mobile : dernier message + heure relative + "non lu") — regroupe en un
// seul appel ce que loadConversationMeta() (aperçu) et countUnreadConversations() (juste
// un compteur global) faisaient séparément, pour ne pas dupliquer la logique de
// comparaison lastMessageAt/lastReadAt à chaque ligne de la liste.
window.getConversationPreview = async function (convoId) {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const [convoSnap, readSnap] = await Promise.all([
            getDoc(doc(db, 'conversations', convoId)),
            getDoc(doc(db, 'conversations', convoId, 'reads', user.uid)),
        ]);
        if (!convoSnap.exists()) return null;
        const data = convoSnap.data();
        const lastMsgSeconds = (data.lastMessageAt && data.lastMessageAt.seconds) || 0;
        const readData = readSnap.exists() ? readSnap.data() : null;
        const readSeconds = (readData && readData.lastReadAt && readData.lastReadAt.seconds) || 0;
        const mine = data.lastMessageFromUid === user.uid;
        return {
            lastMessageText: data.lastMessageText || '',
            lastMessageAt: lastMsgSeconds || null,
            mine,
            unread: !mine && lastMsgSeconds > 0 && lastMsgSeconds > readSeconds
        };
    } catch (e) {
        return null;
    }
};

// Compte les CONVERSATIONS ayant au moins un message non lu (pas le nombre total de
// messages non lus) parmi la liste d'ids donnée — convoIds construite côté script.js à
// partir de myFriendsList (une conversation DM potentielle par ami) et des voyages
// partagés (une conversation de groupe potentielle par voyage), plutôt qu'une requête
// sur toute la collection `conversations` (que la règle ci-dessus refuserait de toute
// façon sans where(), voir le commentaire de listMyFriendRequests()).
window.countUnreadConversations = async function (convoIds) {
    const user = auth.currentUser;
    if (!user || !convoIds || convoIds.length === 0) return 0;
    let count = 0;
    for (const convoId of convoIds) {
        try {
            const [convoSnap, readSnap] = await Promise.all([
                getDoc(doc(db, 'conversations', convoId)),
                getDoc(doc(db, 'conversations', convoId, 'reads', user.uid)),
            ]);
            if (!convoSnap.exists() || !convoSnap.data().lastMessageAt) continue;
            if (convoSnap.data().lastMessageFromUid === user.uid) continue;
            const lastMsgSeconds = convoSnap.data().lastMessageAt.seconds || 0;
            const readData = readSnap.exists() ? readSnap.data() : null;
            const readSeconds = (readData && readData.lastReadAt && readData.lastReadAt.seconds) || 0;
            if (lastMsgSeconds > readSeconds) count++;
        } catch (e) {
            console.warn('Vérification des messages non lus échouée pour ' + convoId + ' :', e);
        }
    }
    return count;
};

// Dès que l'état de connexion est connu (au chargement de la page, et à chaque
// connexion/déconnexion), on prévient le reste du site via un évènement custom —
// c'est le pont qui permet à script.js (non-module) de réagir sans avoir besoin
// d'imports ES.
// Auto-répare usernameLogin/{pseudo} (connexion par pseudo — voir resolveLoginEmail plus
// haut) pour un compte créé/renommé AVANT ce correctif. loadExistingProfileAndRedirect()
// dans welcome-script.js ne le fait qu'à une connexion FRAÎCHE par e-mail — un compte qui
// reste connecté (session Firebase persistée, jamais de nouvelle connexion depuis le
// correctif) ne passe jamais par là, laissant sa connexion par pseudo cassée
// indéfiniment (bug rapporté le 06/09/2026 : "josyine" existe bien mais la connexion par
// pseudo échoue). onAuthStateChanged ci-dessous se déclenche à CHAQUE chargement de page
// avec une session active, correctif ou pas — l'endroit idéal pour ce genre de réparation
// silencieuse. Ne réécrit rien si l'entrée existe déjà (un getDoc de plus par chargement
// de page reste négligeable pour un site à ce niveau de trafic).
async function ensureUsernameLoginIndexed(user) {
    try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists() || !userSnap.data().username) return;
        const key = userSnap.data().username.toLowerCase().trim();
        const loginSnap = await getDoc(doc(db, 'usernameLogin', key));
        if (!loginSnap.exists()) {
            await setDoc(doc(db, 'usernameLogin', key), { email: user.email }, { merge: true });
        }
    } catch (e) {
        // Pas grave si ça échoue (règles pas encore republiées, etc.) : la connexion par
        // e-mail reste toujours disponible en secours.
    }
}

onAuthStateChanged(auth, (user) => {
    window.firebaseCurrentUser = user || null;
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { user: user || null } }));
    if (user) ensureUsernameLoginIndexed(user);
});
