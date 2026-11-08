# Screen To Street — App Store iOS (Capacitor)

Demande du 09/11/2026 ("fais App Store iOS"). Ce dossier/readme explique ce qui a été
préparé depuis ce bac à sable (sans Mac, sans Xcode, sans compte développeur Apple — voir
"Ce que je n'ai pas pu faire" plus bas) et ce qu'il reste à faire sur ta machine.

## Ce qui est déjà en place

- **`package.json` / `node_modules`** (racine du dépôt) — Capacitor (`@capacitor/core`,
  `@capacitor/ios`, `@capacitor/cli`) + deux plugins natifs utiles pour la suite
  (`@capacitor/share`, `@capacitor/push-notifications`, pas encore branchés dans le code du
  site — voir "Pistes pour la suite" plus bas).
- **`capacitor.config.json`** — `appId: "com.screentostreet.app"` (à CHANGER si tu veux un
  autre identifiant — c'est le tien à choisir, il doit juste rester identique à vie une fois
  publié), `appName: "Screen To Street"`, `webDir: "www"`.
- **`ios-app/sync-web.js`** — copie uniquement les fichiers PUBLICS du site (les 18 pages,
  les scripts/styles qu'elles chargent, `images/`, `manifest.json`, les icônes) dans `www/`,
  jamais `admin-scripts/`, `firestore.rules`, `.github/`, ni rien de ce dépôt Git lui-même.
  `www/` est entièrement jetable — ne JAMAIS l'éditer à la main, il est reconstruit à chaque
  lancement du script (voir `.gitignore`).
- **`ios/`** — le projet Xcode généré par `npx cap add ios` (déjà exécuté ici) :
  `App.xcworkspace`, `App.xcodeproj`, `Podfile`, `Info.plist`, dossiers d'icônes/splash
  (`Assets.xcassets`). `Info.plist` a été complété avec :
  - `LSApplicationQueriesSchemes` (`instagram-stories`, `instagram`) — nécessaire pour le
    partage direct en Story Instagram déjà présent sur le site (voir
    `tryInstagramStoryShare()` dans `script.js`).
  - `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` /
    `NSPhotoLibraryAddUsageDescription` — sans ces 3 clés, l'app PLANTE dès la première
    tentative d'upload de photo ou de sauvegarde dans Photos (le site en propose à plusieurs
    endroits : admin, Mei's Pictures, avis, couverture de voyage, "Enregistrer dans les
    Photos" du menu de partage).

## ⚠️ Le point le plus important avant de songer à publier : la connexion Google

Le site utilise `signInWithPopup(auth, googleProvider)` (Firebase Auth, voir
`window.firebaseSignInGoogle` dans `firebase-init.js`). **Google bloque explicitement la
connexion OAuth depuis une WebView intégrée** (le message exact est
`disallowed_useragent`) — c'est précisément le type de fenêtre qu'utilise une app empaquetée
avec Capacitor. Autrement dit : **tel quel, le bouton "Se connecter avec Google" ne
fonctionnera probablement pas dans l'app une fois publiée**, même si tout le reste
fonctionne parfaitement.

Je n'ai pas corrigé ça ici — c'est un vrai changement d'architecture (pas un simple réglage)
qui a besoin d'un vrai appareil pour être vérifié, et qui dépend d'accès que je n'ai pas
(ta Console Firebase, pour ajouter une app iOS et récupérer `GoogleService-Info.plist`).
Deux pistes, par ordre de préférence :

1. **Le plugin officiel `@capacitor-firebase/authentication`** — fournit une vraie
   connexion Google NATIVE (en dehors de la WebView), puis relie le résultat à la session
   Firebase Auth JS classique du site (`signInWithCredential`) — le reste du code
   (`auth.currentUser`, `onAuthStateChanged`, etc.) continue de fonctionner sans changement.
   Demande : ajouter une app iOS dans ta Console Firebase (Paramètres du projet > Ajouter
   une app > iOS, avec le Bundle ID `com.screentostreet.app`), télécharger le
   `GoogleService-Info.plist` généré et l'ajouter au projet Xcode, puis quelques lignes de
   configuration Xcode (schéma d'URL "reversed client ID").
2. **`@capacitor/browser` + redirection par schéma d'URL personnalisé** — ouvre
   l'authentification dans le vrai navigateur système (Safari), hors WebView, puis récupère
   le résultat via un lien `screentostreet://...` déclaré dans l'app. Plus de code à écrire
   à la main, mais ne dépend d'aucun plugin tiers.

Dans les deux cas : **teste la connexion Google en tout premier**, sur un vrai appareil ou
le simulateur, avant de perdre du temps sur le reste (icônes, screenshots App Store...). Si
ça ne marche pas, personne ne peut se connecter dans l'app.

## Prérequis (uniquement faisables sur TA machine)

- **Un Mac** avec Xcode installé (gratuit, via le Mac App Store) — aucune alternative,
  Apple n'autorise la compilation/signature d'une app iOS que depuis Xcode sur macOS.
- **CocoaPods** (`sudo gem install cocoapods`, ou `brew install cocoapods`).
- **Un compte Apple Developer** (99 $/an) — https://developer.apple.com/programs/ —
  nécessaire pour signer l'app et la publier, même pour un test sur ton propre téléphone au
  -delà de 7 jours.

## Étapes, dans l'ordre

1. `npm install` (une fois, à la racine du dépôt — installe Capacitor et les plugins).
2. `cd ios/App && pod install && cd ../..` — résout les dépendances natives (CocoaPods),
   n'a pas pu tourner ici faute de CocoaPods sur Linux.
3. `npm run ios:sync` — reconstruit `www/` à partir du site puis synchronise vers le projet
   Xcode. **À refaire à chaque fois que tu modifies le site** (ou que je le modifie et que tu
   récupères les changements), avant de recompiler dans Xcode.
4. `npm run ios:open` (ou directement `open ios/App/App.xcworkspace`) — ouvre le projet dans
   Xcode. **Toujours le `.xcworkspace`, jamais le `.xcodeproj` seul** (CocoaPods ne
   fonctionne qu'avec le workspace).
5. Dans Xcode : onglet "Signing & Capabilities" du target "App" → choisis ton compte/équipe
   développeur → ajuste le Bundle Identifier si tu as changé `appId` dans
   `capacitor.config.json` (les deux doivent rester synchronisés — relance `npx cap sync
   ios` après tout changement du `appId`).
6. Remplace les icônes/écran de lancement par défaut dans
   `ios/App/App/Assets.xcassets/AppIcon.appiconset` et `.../Splash.imageset` — `icon-512.png`
   (racine du dépôt) est un bon point de départ pour générer le jeu complet de tailles
   (un outil comme https://icon.kitchen ou le générateur d'assets intégré à Xcode fait ça
   en quelques clics).
7. Lance l'app dans le Simulateur (▶ dans Xcode) pour un premier test rapide, puis sur un
   vrai iPhone (nécessaire pour tester la connexion Google, la caméra, le partage Instagram
   Story — rien de tout ça ne fonctionne de façon fiable en Simulateur).
8. Une fois satisfait : Xcode → Product → Archive → Distribute App → App Store Connect.
9. Sur https://appstoreconnect.apple.com : crée la fiche de l'app (nom, description,
   captures d'écran — obligatoires pour plusieurs tailles d'iPhone, à faire depuis le
   Simulateur ou un vrai appareil), renseigne l'URL de ta politique de confidentialité
   (`legal.html` du site, une fois un nom de domaine en place — ou l'URL GitHub Pages
   actuelle en attendant), puis soumets pour revue.

## Pistes pour la suite (pas faites ici, à décider avec toi)

- **Risque de refus Apple (règle 4.2, "Minimum Functionality")** : Apple refuse parfois une
  app qui n'est "qu'un site web dans un cadre", sans rien de spécifiquement natif. J'ai posé
  la base pour deux fonctionnalités natives qui aident à éviter ça (`@capacitor/share`,
  `@capacitor/push-notifications`, déjà dans `package.json`/le `Podfile`), mais le CODE du
  site n'a pas encore été modifié pour vraiment les utiliser (le partage utilise encore
  l'API Web `navigator.share`, qui fonctionne déjà bien dans Capacitor normalement — à
  confirmer sur un vrai appareil). Dis-moi si tu veux qu'on les branche vraiment.
- **Notifications push natives (APNs)** : le système actuel (`admin-scripts/send-tour-push.js`,
  Firebase Cloud Messaging) est pensé pour le web — pour de vraies notifications dans l'app
  iOS même fermée, il faut un certificat/clé APNs (Apple Developer Console) ajouté à ta
  Console Firebase ; le reste du backend peut rester largement identique.
- **Google Play (Android)** : `@capacitor/android` peut être ajouté exactement de la même
  façon (`npx cap add android`) si tu veux aussi publier sur le Play Store un jour —
  pas demandé pour l'instant, je n'y ai pas touché.

## Ce que je n'ai pas pu faire depuis cet environnement

Ce bac à sable tourne sous Linux, sans Xcode, sans CocoaPods, sans compte développeur Apple
et sans appareil iOS réel :
- Impossible de lancer `pod install` (CocoaPods absent) — déjà signalé par un avertissement
  pendant `npx cap add ios`, sans bloquer la génération du reste du projet.
- Impossible de compiler, signer ou lancer l'app sur un simulateur/appareil.
- Impossible de vérifier que la connexion Google fonctionne, que le partage Instagram Story
  fonctionne dans ce contexte natif, ou quoi que ce soit demandant un vrai rendu iOS.
- Impossible de créer/soumettre la fiche App Store Connect (nécessite ton compte).

Tout ce qui précède est strictement réservé à ta machine — aucun raccourci possible depuis
ici.
