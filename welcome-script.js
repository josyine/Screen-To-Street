// ==========================================
// FIREBASE : INITIALISATION
// ==========================================
// Toute la logique Firebase vit ici (dans ce module), et non plus dans une balise
// <script> séparée dans index.html, pour que les imports fonctionnent proprement.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

// On garde une trace de l'état de connexion, utile pour éviter de rouvrir la modale
// de connexion à quelqu'un qui est déjà connecté.
let firebaseCurrentUser = null;
onAuthStateChanged(auth, (user) => { firebaseCurrentUser = user || null; });

// ==========================================
// TRADUCTIONS ET LOGIQUE DE PAGE (inchangé)
// ==========================================
// Pass Guide (30/08/2026) : deux pass génériques (jamais liés à un artiste), les mêmes
// que le paywall de map.html (voir hasGuidePass()/buyGuidePass() dans script.js) — plus
// de sélection de groupe ni de prix par groupe à l'inscription.
const GUIDE_PASS_PRICES = { monthly: 9.99, lifetime: 19.99 };
let currentLang = localStorage.getItem('lang') || 'en';

const dict = {
    en: {
        navDest: "Destinations", navArtists: "Artists", navLogin: "Log in", 
        heroTitle: "You have a destination.<br>We have the guide.", 
        heroSubtitle: "Create custom routes instantly, with tools designed to follow your favorite artists.", 
        heroCta: "Generate my guide", heroDemo: "See Demo",
        authTitle: "Log in or sign up", authDesc: "Use your email or another service to continue with Screen To Street.",
        authGoogle: "Continue with Google", authEmail: "Continue with email",
        authTerms: "By continuing, you agree to Screen To Street's", linkTerms: "Terms of Use", 
        authPrivacy: "Read our", linkPrivacy: "Privacy Policy",
        haveAccountYet: "Already have an account?", logInLink: "Log in",
        noAccountYet: "Don't have an account?", signUpLink: "Sign up",

        loginTitle: "Log in", loginDesc: "Welcome back! Enter your email and password to continue.",
        forgotPassword: "Forgot password?", loginBtn: "Log in", orDivider: "OR",
        
        step1Title: "Account", emailCheck: "Create your account with an email and password.",
        emailLabel: "Email address", password: "Password", btnContinue: "Continue",
        
        step2Title: "Profile", step2Desc: "Tell us a bit about yourself.",
        usernameLabel: "Username", fname: "First Name", lname: "Last Name",
        countryLabel: "Country you want to visit", countryPlaceholder: "Select a country (optional)",
        reasonLabel: "Why are you using Screen To Street?", reasonPlaceholder: "Select an option (optional)",
        reason1: "To discover new places", reason2: "To plan a trip", reason3: "To get good addresses", reason4: "To follow my idol's footsteps", reason5: "Other",
        
        step3Title: "Passes", passDesc: "Select the groups you want to unlock. (14.99€ per group)",
        step3TitleGuide: "Unlock the full guide?", step3DescGuide: "Optional — you can also explore the map for free first (3 locations) and decide later.",
        skipPassesLink: "Continue with the free version",
        skipConfirmTitle: "Are you sure?", skipConfirmBody: "With the free version, you'll only have access to 3 locations. Unlock the full guide (500+ addresses) with a Travel or VIP pass instead.",
        skipConfirmBack: "See the passes again", skipConfirmProceed: "No thanks, continue for free",
        paywallMonthlyName: "TRAVEL PASS (1 Month)", paywallMonthlyPrice: "€9.99 / month",
        paywallVipName: "VIP PASS (Lifetime Access)", paywallVipPrice: "€19.99 (one-time payment)",
        subtotalLabel: "Subtotal:", payBtnEmpty: "Select a pass", btnToPayment: "Continue to Payment",
        
        step4Title: "Payment", step4Desc: "Complete your purchase to unlock the guides.",
        summaryPasses: "Selected Passes:", summaryTotal: "Total Due:",
        cardNum: "Card Number", expiry: "Expiry Date", cvc: "CVC", paySecurely: "Pay securely",
        
        processing: "Processing securely...", authRightTitle: "Unlock the world of your idols.",
        cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy",
        cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept",
        setCookiePrefsTitle: "Cookie Preferences", setCookiePrefsBody: "Necessary cookies keep the site working (login, saved wishlist) and can't be turned off. You choose whether we also use cookies to remember your preferences across visits.",
        setCookieNecessary: "Necessary", setCookieNecessarySub: "Always active", setCookieAnalytics: "Preferences & analytics", setCookieAnalyticsSub: "Remember your choices between visits", setSavePreferences: "Save preferences",

        errInvalidEmail: "Invalid email address.",
        errWeakPassword: "Password must be at least 6 characters.",
        errTooManyRequests: "Too many attempts. Try again in a few minutes.",
        errNetwork: "Network connection issue. Check your internet connection.",
        errWrongPassword: "Incorrect password for this email address.",
        errInvalidLogin: "Incorrect email or password.",
        errEmailInUse: "An account already exists with this email. Please log in instead.",
        resetEmailSent: "Password reset email sent — check your inbox.",
        enterEmailFirst: "Please enter your email address first.",
        errDefault: "Something went wrong. Please try again."
    },
    fr: {
        navDest: "Destinations", navArtists: "Artistes", navLogin: "Se connecter", 
        heroTitle: "Vous avez une destination.<br>Nous avons le guide.", 
        heroSubtitle: "Créez des itinéraires sur mesure instantanément, avec des outils conçus pour suivre vos idoles.", 
        heroCta: "Générer mon guide", heroDemo: "Voir la démo",
        authTitle: "Connectez-vous ou créez un compte", authDesc: "Utilisez votre e-mail ou un autre service pour continuer.",
        authGoogle: "Continuer avec Google", authEmail: "Continuer avec un e-mail",
        authTerms: "En continuant, vous acceptez les", linkTerms: "Conditions d'utilisation", 
        authPrivacy: "Consultez notre", linkPrivacy: "Politique de confidentialité",
        haveAccountYet: "Vous avez déjà un compte ?", logInLink: "Se connecter",
        noAccountYet: "Vous n'avez pas de compte ?", signUpLink: "S'inscrire",

        loginTitle: "Se connecter", loginDesc: "Ravis de vous revoir ! Entrez votre e-mail et votre mot de passe.",
        forgotPassword: "Mot de passe oublié ?", loginBtn: "Se connecter", orDivider: "OU",
        
        step1Title: "Compte", emailCheck: "Créez votre compte avec un e-mail et un mot de passe.",
        emailLabel: "Adresse e-mail", password: "Mot de passe", btnContinue: "Continuer",
        
        step2Title: "Profil", step2Desc: "Parlez-nous un peu de vous.",
        usernameLabel: "Nom d'utilisateur", fname: "Prénom", lname: "Nom",
        countryLabel: "Pays que vous souhaitez visiter", countryPlaceholder: "Sélectionnez un pays (facultatif)",
        reasonLabel: "Pourquoi utilisez-vous Screen To Street ?", reasonPlaceholder: "Sélectionnez une option (facultatif)",
        reason1: "Pour découvrir de nouveaux lieux", reason2: "Pour préparer un voyage", reason3: "Pour avoir de bonnes adresses", reason4: "Pour suivre la trace de mon idole", reason5: "Autre",
        
        step3Title: "Pass", passDesc: "Sélectionnez les groupes à débloquer. (14.99€ par groupe)",
        step3TitleGuide: "Débloquer le guide complet ?", step3DescGuide: "Facultatif — vous pouvez aussi explorer la carte gratuitement d'abord (3 lieux) et décider plus tard.",
        skipPassesLink: "Continuer avec la version gratuite",
        skipConfirmTitle: "Êtes-vous sûr(e) ?", skipConfirmBody: "Avec la version gratuite, vous n'aurez accès qu'à 3 lieux. Débloquez le guide complet (500+ adresses) avec un Pass Voyage ou VIP.",
        skipConfirmBack: "Revoir les pass", skipConfirmProceed: "Non merci, continuer gratuitement",
        paywallMonthlyName: "PASS VOYAGE (1 Mois)", paywallMonthlyPrice: "9,99 € / mois",
        paywallVipName: "PASS VIP (Accès à vie)", paywallVipPrice: "19,99 € (paiement unique)",
        subtotalLabel: "Sous-total :", payBtnEmpty: "Sélectionnez un pass", btnToPayment: "Passer au paiement",
        
        step4Title: "Paiement", step4Desc: "Finalisez votre achat pour débloquer les guides.",
        summaryPasses: "Pass sélectionnés :", summaryTotal: "Total à payer :",
        cardNum: "Numéro de carte", expiry: "Date d'expiration", cvc: "CVC", paySecurely: "Payer en toute sécurité",
        
        processing: "Traitement sécurisé...", authRightTitle: "Débloquez le monde de vos idoles.",
        cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies",
        cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter",
        setCookiePrefsTitle: "Préférences de cookies", setCookiePrefsBody: "Les cookies nécessaires font fonctionner le site (connexion, wishlist sauvegardée) et ne peuvent pas être désactivés. Vous choisissez si on utilise aussi des cookies pour mémoriser vos préférences d'une visite à l'autre.",
        setCookieNecessary: "Nécessaires", setCookieNecessarySub: "Toujours actifs", setCookieAnalytics: "Préférences et analyse", setCookieAnalyticsSub: "Mémorise vos choix d'une visite à l'autre", setSavePreferences: "Enregistrer les préférences",

        errInvalidEmail: "Adresse e-mail invalide.",
        errWeakPassword: "Le mot de passe doit contenir au moins 6 caractères.",
        errTooManyRequests: "Trop de tentatives. Réessayez dans quelques minutes.",
        errNetwork: "Problème de connexion internet.",
        errWrongPassword: "Mot de passe incorrect pour cette adresse e-mail.",
        errInvalidLogin: "E-mail ou mot de passe incorrect.",
        errEmailInUse: "Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.",
        resetEmailSent: "E-mail de réinitialisation envoyé — vérifiez votre boîte de réception.",
        enterEmailFirst: "Merci d'indiquer d'abord votre adresse e-mail.",
        errDefault: "Une erreur est survenue. Réessayez."
    }
};

let currentActiveStep = 0; // 0 = social, 1 = account, 2 = profile, 3 = passes, 4 = payment

// Repli sur l'anglais pour les langues pas encore traduites sur cette page (seuls en/fr
// existent ici pour l'instant) : le sélecteur propose bien les 8 langues comme sur le
// reste du site, mais le contenu reste lisible en attendant sa traduction complète.
function curDict() { return dict[currentLang] || dict.en; }

function updateLangUI() {
    const d = curDict();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(d[key]) el.innerHTML = d[key];
    });
    if (btnToStep4 && selectedSignupPlan) btnToStep4.textContent = curDict().btnToPayment;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.populateCountrySelect === 'function') window.populateCountrySelect('interest-country');

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.addEventListener('click', (e) => {
        const lMenu = document.getElementById('lang-menu');
        if(lMenu) lMenu.classList.toggle('hidden');
        e.stopPropagation();
    });

    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.preventDefault();
            currentLang = this.getAttribute('data-lang');
            localStorage.setItem('lang', currentLang);
            updateLangUI();
        });
    });

    document.addEventListener('click', () => { 
        const langMenu = document.getElementById('lang-menu');
        if (langMenu) langMenu.classList.add('hidden'); 
    });

    updateLangUI();

    // Rendre la timeline (stepper) cliquable pour revenir en arrière
    for(let i=1; i<=4; i++) {
        const stepBtn = document.getElementById('step-btn-' + i);
        if(stepBtn) {
            stepBtn.addEventListener('click', () => {
                if(i < currentActiveStep) { // On ne peut que reculer
                    showStep(i);
                }
            });
        }
    }
});

const modal = document.getElementById('auth-modal');

function showStep(step) {
    currentActiveStep = step;
    clearAuthError();
    
    document.querySelectorAll('.auth-step').forEach(s => s.classList.add('hidden'));
    const targetStep = document.getElementById('auth-step-' + step);
    if(targetStep) targetStep.classList.remove('hidden');

    const stepper = document.getElementById('auth-stepper');
    const isNumberedStep = (typeof step === 'number' && step >= 1 && step <= 4);
    if(!isNumberedStep) {
        if(stepper) stepper.classList.add('hidden');
    } else {
        if(stepper) stepper.classList.remove('hidden');
        
        for(let i=1; i<=4; i++) {
            let st = document.getElementById('step-dot-' + i);
            let lbl = document.getElementById('step-label-' + i);
            let line = document.getElementById('line-' + (i-1));
            
            if(i < step) {
                if(st) { st.style.background = '#e2e8f0'; st.style.color = '#64748b'; st.innerHTML = '✓'; }
                if(lbl) lbl.style.color = '#94a3b8';
                if(line) line.style.background = '#D42759';
            } else if(i === step) {
                if(st) { st.style.background = '#D42759'; st.style.color = '#fff'; st.innerHTML = i; }
                if(lbl) lbl.style.color = '#D42759';
                if(line) line.style.background = '#D42759';
            } else {
                if(st) { st.style.background = '#e2e8f0'; st.style.color = '#94a3b8'; st.innerHTML = i; }
                if(lbl) lbl.style.color = '#cbd5e1';
                if(line) line.style.background = '#e2e8f0';
            }
        }
    }
}

document.querySelectorAll('.open-auth-btn').forEach(btn => {
    btn.addEventListener('click', () => { 
        if(modal) modal.classList.remove('hidden'); 
        showStep(0); 
    });
});

// Bouton "Log in" du header : ouvre directement le vrai formulaire de connexion,
// jamais de redirection automatique — la personne doit toujours saisir ses identifiants.
const headerLoginBtn = document.getElementById('header-login-btn');
if (headerLoginBtn) {
    headerLoginBtn.addEventListener('click', () => {
        if(modal) modal.classList.remove('hidden');
        showStep('login');
    });
}

// Liens croisés "Se connecter" <-> "S'inscrire"
document.querySelectorAll('.link-to-login').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); showStep('login'); });
});
document.querySelectorAll('.link-to-signup').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); showStep(0); });
});

const closeAuth = document.getElementById('close-auth');
if(closeAuth) closeAuth.addEventListener('click', () => { if(modal) modal.classList.add('hidden'); });

// ==========================================
// GESTION DES ERREURS D'AUTHENTIFICATION
// ==========================================
function showAuthError(message) {
    const el = document.getElementById('auth-error');
    if(el) { el.textContent = message; el.classList.remove('hidden'); }
}
function clearAuthError() {
    const el = document.getElementById('auth-error');
    if(el) { el.classList.add('hidden'); el.textContent = ''; }
}
function friendlyAuthError(code) {
    const t = curDict();
    const table = {
        'auth/invalid-email': t.errInvalidEmail,
        'auth/weak-password': t.errWeakPassword,
        'auth/too-many-requests': t.errTooManyRequests,
        'auth/network-request-failed': t.errNetwork,
        'auth/wrong-password': t.errWrongPassword
    };
    return table[code] || t.errDefault;
}

// ==========================================
// CHARGEMENT DU PROFIL D'UN UTILISATEUR EXISTANT
// ==========================================
// Appelé quand quelqu'un se reconnecte (email ou Google) à un compte déjà créé :
// on récupère son profil Firestore, on le recopie dans localStorage pour que le
// reste du site (encore basé sur localStorage) fonctionne sans changement, puis
// on l'envoie directement sur la carte.
async function loadExistingProfileAndRedirect(user) {
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
            const data = snap.data();
            if (data.username) localStorage.setItem('userName', data.username);
            // Comptes créés avant l'ajout du partage de voyages : sans pseudo réservé dans
            // l'index public usernames/, personne ne peut inviter cette personne comme
            // "travel buddy" — on le répare discrètement à chaque connexion.
            // Fire-and-forget volontaire (ne doit jamais bloquer la connexion), mais on
            // vérifie quand même le résultat pour le journaliser : un échec silencieux ici
            // (ex: règles Firestore pas encore à jour au moment de cette connexion) est
            // exactement ce qui a laissé certains comptes plus anciens sans entrée
            // usernames/{pseudo}, les rendant introuvables par les autres. claimUsername()
            // avale déjà ses propres erreurs réseau (elle ne rejette jamais), d'où la
            // vérification du résultat plutôt qu'un .catch().
            if (data.username && typeof window.claimUsername === 'function') {
                window.claimUsername(data.username).then(r => {
                    if (r && r.success === false && r.code !== 'taken') {
                        console.warn('Réparation du pseudo public échouée au login :', r.code);
                    }
                });
            }
            if (data.firstName) localStorage.setItem('userFirstName', data.firstName);
            if (Array.isArray(data.unlockedGroups)) localStorage.setItem('unlockedGroups', JSON.stringify(data.unlockedGroups));
            // Pays d'intérêt : sans ça, une connexion sur un appareil qui n'a jamais vu ce
            // compte localement (nouvel appareil, cache navigateur vidé) retombait sur le
            // centrage par défaut de la carte au lieu du pays choisi à l'inscription.
            const loginInterestCountry = data.interestCountry || data.residenceCountry;
            if (loginInterestCountry) localStorage.setItem('userCountry', loginInterestCountry);
            // Photo de profil : toujours alignée sur ce que CE compte a en base, dans un
            // sens comme dans l'autre — sinon, sur un appareil déjà utilisé par un autre
            // compte, la photo laissée dans le localStorage partagé de l'appareil restait
            // affichée comme si elle appartenait au nouveau compte connecté.
            if (data.photo) localStorage.setItem('userPhoto', data.photo);
            else localStorage.removeItem('userPhoto');
        }
    } catch (e) {
        // Si la lecture échoue (règles de sécurité en cours d'ajustement, etc.),
        // on laisse quand même la personne accéder à la carte.
    }
    localStorage.setItem('userEmail', user.email || '');
    window.location.href = 'map.html';
}

// Réinitialise les données locales d'un NOUVEAU compte : un compte qui vient d'être
// créé ne doit jamais hériter de lieux visités, d'une wishlist ou de voyages
// laissés par un test précédent dans ce même navigateur. Tout doit venir
// explicitement de l'utilisateur, une fois son compte créé.
function resetFreshAccountData() {
    localStorage.removeItem('wishlistLocs');
    localStorage.removeItem('visitedLocs');
    localStorage.removeItem('myTrips');
    localStorage.removeItem('activeTripId');
    localStorage.removeItem('unlockedGroups');
}

// ==========================================
// CONNEXION GOOGLE (vrai popup Firebase, plus de simulation)
// ==========================================
window.openGooglePopup = async function() {
    clearAuthError();
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // On ne se fie plus à additionalUserInfo.isNewUser : ce flag Firebase s'est
        // avéré peu fiable en pratique (des comptes réellement nouveaux étaient parfois
        // traités comme existants, ce qui sautait l'étape des pass et du paiement).
        // À la place, on vérifie directement si un document existe déjà pour cet
        // utilisateur dans Firestore — une source de vérité beaucoup plus sûre.
        const snap = await getDoc(doc(db, 'users', user.uid));

        if (!snap.exists()) {
            // Vraiment nouveau compte : on repart d'une base vierge, on pré-remplit le
            // pseudo suggéré et on continue l'inscription (profil, pass, paiement).
            resetFreshAccountData();
            localStorage.setItem('userEmail', user.email || '');
            const unameInput = document.getElementById('uname');
            if (unameInput && user.displayName) unameInput.value = user.displayName.replace(/\s+/g, '');
            showStep(2);
        } else {
            // Compte Google déjà existant : on récupère son profil et on file sur la carte.
            await loadExistingProfileAndRedirect(user);
        }
    } catch (err) {
        // L'utilisateur a fermé la fenêtre Google lui-même : ce n'est pas une vraie erreur.
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
        showAuthError(friendlyAuthError(err.code));
    }
};

// ==========================================
// FORMULAIRE "SE CONNECTER" (dédié, séparé de l'inscription)
// ==========================================
const btnLoginSubmit = document.getElementById('btn-login-submit');
if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', async () => {
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        if(!emailInput.checkValidity()) { emailInput.reportValidity(); return; }
        if(!passInput.checkValidity()) { passInput.reportValidity(); return; }
        clearAuthError();

        const emailVal = emailInput.value.trim();
        const passVal = passInput.value;
        const originalLabel = btnLoginSubmit.textContent;
        btnLoginSubmit.disabled = true;
        btnLoginSubmit.textContent = '...';

        try {
            const cred = await signInWithEmailAndPassword(auth, emailVal, passVal);
            await loadExistingProfileAndRedirect(cred.user);
        } catch (err) {
            btnLoginSubmit.disabled = false;
            btnLoginSubmit.textContent = originalLabel;
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                showAuthError(curDict().errInvalidLogin);
            } else {
                showAuthError(friendlyAuthError(err.code));
            }
        }
    });
}

// "Mot de passe oublié ?"
const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        clearAuthError();
        const emailInput = document.getElementById('login-email');
        const emailVal = emailInput.value.trim();
        if (!emailVal) {
            showAuthError(curDict().enterEmailFirst);
            emailInput.focus();
            return;
        }
        try {
            await sendPasswordResetEmail(auth, emailVal);
            showAuthError(curDict().resetEmailSent);
        } catch (err) {
            showAuthError(friendlyAuthError(err.code));
        }
    });
}

// --- NAVIGATION --- //

// Step 0 -> Step 1 (Email)
const btnToEmail = document.getElementById('btn-to-email');
if(btnToEmail) btnToEmail.addEventListener('click', () => { showStep(1); });

// Step 1 -> Step 2 (Account -> Profile) : création de compte UNIQUEMENT.
// (La connexion à un compte existant se fait désormais via le formulaire "Se connecter" dédié.)
const btnToStep2 = document.getElementById('btn-to-step2');
if(btnToStep2) {
    btnToStep2.addEventListener('click', async () => { 
        const emailInput = document.getElementById('user-email');
        const passInput = document.getElementById('user-password');
        if(!emailInput.checkValidity()) { emailInput.reportValidity(); return; }
        if(!passInput.checkValidity()) { passInput.reportValidity(); return; }
        clearAuthError();

        const emailVal = emailInput.value.trim();
        const passVal = passInput.value;
        const originalLabel = btnToStep2.textContent;
        btnToStep2.disabled = true;
        btnToStep2.textContent = '...';

        try {
            await createUserWithEmailAndPassword(auth, emailVal, passVal);
            if (typeof window.incrementSiteUserCount === 'function') window.incrementSiteUserCount();
            resetFreshAccountData();
            localStorage.setItem('userEmail', emailVal);
            btnToStep2.disabled = false;
            btnToStep2.textContent = originalLabel;
            showStep(2);
        } catch (createErr) {
            btnToStep2.disabled = false;
            btnToStep2.textContent = originalLabel;
            if (createErr.code === 'auth/email-already-in-use') {
                showAuthError(curDict().errEmailInUse);
                const loginEmailInput = document.getElementById('login-email');
                if (loginEmailInput) loginEmailInput.value = emailVal;
            } else {
                showAuthError(friendlyAuthError(createErr.code));
            }
        }
    });
}

// Step 2 -> Step 3 (Profile -> Passes) : on écrit le profil dans Firestore
const btnToStep3 = document.getElementById('btn-to-step3');
if(btnToStep3) {
    btnToStep3.addEventListener('click', async () => {
        const uname = document.getElementById('uname');
        // SEUL le nom d'utilisateur est obligatoire
        if(!uname.checkValidity()) { uname.reportValidity(); return; }

        const usernameVal = uname.value.trim();
        const fnameVal = document.getElementById('fname').value.trim();
        const lnameVal = document.getElementById('lname').value.trim();
        const countryVal = document.getElementById('interest-country').value;
        const reasonVal = document.getElementById('user-reason').value;

        localStorage.setItem('userName', usernameVal);
        if (fnameVal) localStorage.setItem('userFirstName', fnameVal);
        if (countryVal) localStorage.setItem('userCountry', countryVal);

        const user = auth.currentUser;
        if (user) {
            btnToStep3.disabled = true;
            try {
                await updateProfile(user, { displayName: usernameVal });
                await setDoc(doc(db, 'users', user.uid), {
                    username: usernameVal,
                    firstName: fnameVal,
                    lastName: lnameVal,
                    email: user.email,
                    interestCountry: countryVal,
                    reason: reasonVal,
                    unlockedGroups: [],
                    wishlistLocs: [],
                    visitedLocs: [],
                    myTrips: [],
                    createdAt: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                // On laisse la personne avancer même si l'écriture échoue pour l'instant ;
                // les règles de sécurité Firestore seront ajustées dans une étape suivante.
            }
            // Réserve le pseudo dans l'index public usernames/ (voir firebase-init.js) :
            // c'est ce qui permet à un autre utilisateur d'inviter cette personne comme
            // "travel buddy" sur un voyage (trips.html) en tapant simplement son pseudo.
            if (typeof window.claimUsername === 'function') {
                window.claimUsername(usernameVal).then(r => {
                    if (r && r.success === false) console.warn('Réservation du pseudo à l\'inscription échouée :', r.code);
                });
            }
            btnToStep3.disabled = false;
        }
        
        showStep(3);
    });
}

// Choix du pass (étape 3) : au clic sur une des deux cartes, plus de case à cocher —
// une seule carte sélectionnée à la fois (pas un panier), voir .pass-card.selected
// dans welcome-style.css.
let selectedSignupPlan = null;
window.selectSignupPlan = function (plan) {
    selectedSignupPlan = plan;
    document.querySelectorAll('.pass-card[data-plan]').forEach(card => {
        card.classList.toggle('selected', card.getAttribute('data-plan') === plan);
    });
    if (btnToStep4) {
        btnToStep4.disabled = false;
        btnToStep4.textContent = curDict().btnToPayment;
    }
};

// Step 3 -> Step 4 (Passes -> Payment)
const btnToStep4 = document.getElementById('btn-to-step4');
if(btnToStep4) {
    btnToStep4.addEventListener('click', () => {
        if (!selectedSignupPlan) return;
        const sumPasses = document.getElementById('summary-passes');
        const sumPrice = document.getElementById('summary-price');
        const price = GUIDE_PASS_PRICES[selectedSignupPlan];
        const isFr = currentLang === 'fr';
        if (sumPasses) sumPasses.textContent = selectedSignupPlan === 'lifetime'
            ? (isFr ? 'Pass VIP (accès à vie)' : 'VIP Pass (lifetime access)')
            : (isFr ? 'Pass Voyage (1 mois)' : 'Travel Pass (1 month)');
        if (sumPrice) sumPrice.textContent = `${price.toFixed(2).replace('.', isFr ? ',' : '.')} €`;

        showStep(4);
    });
}

// Continuer sans pass : un petit popup de confirmation dissuasif s'affiche d'abord
// ("vous n'aurez accès qu'à 3 lieux...") avant de vraiment aller à la carte — voir
// hasGuidePass()/FREE_LOCATION_VIEW_LIMIT dans script.js pour la limite elle-même.
const btnSkipPasses = document.getElementById('btn-skip-passes');
const skipConfirmModal = document.getElementById('skip-passes-confirm-modal');
if (btnSkipPasses && skipConfirmModal) {
    btnSkipPasses.addEventListener('click', (e) => {
        e.preventDefault();
        skipConfirmModal.classList.remove('hidden');
    });
    const closeSkipConfirm = () => skipConfirmModal.classList.add('hidden');
    document.getElementById('skip-passes-confirm-close').addEventListener('click', closeSkipConfirm);
    document.getElementById('skip-passes-confirm-back').addEventListener('click', closeSkipConfirm);
    document.getElementById('skip-passes-confirm-proceed').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'map.html';
    });
}

// Paiement (toujours simulé pour l'instant — aucun vrai système de paiement n'est branché) :
// on enregistre le pass choisi dans Firestore et dans localStorage, puis on redirige.
// Même schéma de données que buyGuidePass() dans script.js (guidePassType /
// guidePassExpiresAt), pour que map.html reconnaisse le pass dès l'arrivée.
const checkoutForm = document.getElementById('checkout-form');
if(checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!selectedSignupPlan) return;

        localStorage.setItem('guidePassType', selectedSignupPlan);
        const fields = { guidePassType: selectedSignupPlan };
        if (selectedSignupPlan === 'monthly') {
            const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
            localStorage.setItem('guidePassExpiresAt', String(expiresAt));
            fields.guidePassExpiresAt = expiresAt;
        }

        document.getElementById('btn-submit-payment').style.display = 'none';
        const paymentLoader = document.getElementById('payment-loader');
        if(paymentLoader) paymentLoader.classList.remove('hidden');

        const user = auth.currentUser;
        if (user) {
            try {
                await setDoc(doc(db, 'users', user.uid), fields, { merge: true });
            } catch (e) {
                // Silencieux : le paiement reste simulé, on ne bloque pas la personne pour ça.
            }
        }

        setTimeout(() => { window.location.href = 'map.html'; }, 2000);
    });
}

// Cookies Bannière
if(!localStorage.getItem('cookiesAccepted')) { 
    const cBanner = document.getElementById('cookie-banner');
    if(cBanner) cBanner.classList.remove('hidden'); 
}
// `cookiesAccepted` sert deux rôles à la fois : sa seule présence indique que la
// personne a déjà fait un choix (la bannière ne se réaffiche plus), et sa valeur
// indique ce choix (cookies "préférences & analyse" activés ou non) — même convention
// que le toggle de la modale "Cookie Preferences" sur settings.html.
function closeCookies(accepted) {
    localStorage.setItem('cookiesAccepted', accepted ? 'true' : 'false');
    const cBanner = document.getElementById('cookie-banner');
    if(cBanner) cBanner.classList.add('hidden');
}
const cookieAccept = document.getElementById('cookie-accept');
const cookieReject = document.getElementById('cookie-reject');
// "Reject" fermait jusqu'ici la bannière en marquant silencieusement les cookies
// comme acceptés (même code que "Accept") : le choix de la personne n'était jamais
// réellement respecté. Corrigé pour enregistrer le refus.
if(cookieAccept) cookieAccept.addEventListener('click', () => closeCookies(true));
if(cookieReject) cookieReject.addEventListener('click', () => closeCookies(false));

// "Manage" : ouvre une vraie modale de préférences (nécessaires/toujours actifs +
// préférences & analyse, activable) au lieu de ne rien faire.
const cookieManageBtn = document.getElementById('cookie-manage');
const cookiePrefsModal = document.getElementById('cookie-prefs-modal');
const cookieAnalyticsToggle = document.getElementById('cookie-analytics-toggle');
const cookiePrefsSave = document.getElementById('cookie-prefs-save');
function setToggleState(el, on) {
    if (!el) return;
    el.classList.toggle('on', on);
    el.classList.toggle('off', !on);
}
if (cookieManageBtn && cookiePrefsModal) {
    cookieManageBtn.addEventListener('click', () => {
        setToggleState(cookieAnalyticsToggle, localStorage.getItem('cookiesAccepted') === 'true');
        cookiePrefsModal.classList.remove('hidden');
    });
}
if (cookieAnalyticsToggle) {
    cookieAnalyticsToggle.addEventListener('click', () => {
        setToggleState(cookieAnalyticsToggle, !cookieAnalyticsToggle.classList.contains('on'));
    });
}
if (cookiePrefsSave) {
    cookiePrefsSave.addEventListener('click', () => {
        closeCookies(cookieAnalyticsToggle.classList.contains('on'));
        cookiePrefsModal.classList.add('hidden');
    });
}

// ==========================================
// OUVERTURE AUTOMATIQUE DU FORMULAIRE DE CONNEXION
// ==========================================
// Permet à d'autres pages (ex: legal.html) de renvoyer vers index.html?login=1
// pour ouvrir directement le vrai formulaire "Se connecter", au lieu de simplement
// atterrir sur la page d'accueil.
if (new URLSearchParams(window.location.search).get('login') === '1') {
    if (modal) modal.classList.remove('hidden');
    showStep('login');
}
