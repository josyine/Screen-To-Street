// ==========================================
// Prépare www/ — la copie du site que Capacitor empaquette dans l'app iOS (voir
// capacitor.config.json, webDir: "www") — à partir des VRAIS fichiers du site à la racine
// du dépôt, jamais l'inverse : www/ est entièrement jetable, reconstruite à chaque
// `npm run ios:sync`, jamais éditée à la main ni commit (voir .gitignore).
// ==========================================
// Demande du 09/11/2026 ("fais App Store iOS"). Le site est un ensemble de pages HTML
// classiques (pas un bundle construit par un outil comme Vite/Webpack) — pas de build à
// proprement parler, seulement une copie sélective : on exclut tout ce qui n'a rien à faire
// dans une app publique distribuée (admin-scripts/, firestore.rules, .github/, ce dossier
// ios-app/ lui-même, la config Node/Capacitor, les fichiers Git).
//
//   node ios-app/sync-web.js
// (ou via npm run ios:sync-web / ios:sync, voir package.json)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEST = path.join(ROOT, 'www');

// Pages HTML publiques du site (les 18 pages déjà listées partout ailleurs dans ce dépôt
// pour le cache-busting ?v=) — admin.html INCLUSE : déjà protégée par le même contrôle
// isCurrentUserAdmin() que sur le site web public, pas une raison de la traiter différemment
// ici (l'app ne doit pas être PLUS restrictive que le site lui-même).
const HTML_PAGES = [
    'account.html', 'admin.html', 'artists.html', 'badges.html', 'destinations.html',
    'feed.html', 'friends.html', 'index.html', 'legal.html', 'map-artists.html',
    'map-destinations.html', 'map.html', 'payment.html', 'profile.html', 'settings.html',
    'trips.html', 'visited.html', 'wishlist.html',
];
const JS_FILES = [
    'artists-content.js', 'countries.js', 'country-borders.js', 'destinations-content.js',
    'firebase-init.js', 'itinerary.js', 'map-tour.js', 'mei-onboarding.js', 'page-loader.js',
    'script.js', 'sw.js', 'tour-mode.js', 'visited-map-data.js', 'welcome-script.js',
    'locations-data.js',
];
const CSS_FILES = ['style.css', 'welcome-style.css', 'mei-onboarding.css'];
const OTHER_FILES = ['manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const DIRS = ['images'];

function copyFile(relPath) {
    const src = path.join(ROOT, relPath);
    const dest = path.join(DEST, relPath);
    if (!fs.existsSync(src)) {
        console.warn(`  (absent, ignoré) ${relPath}`);
        return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}

function copyDir(relDir) {
    const src = path.join(ROOT, relDir);
    if (!fs.existsSync(src)) {
        console.warn(`  (dossier absent, ignoré) ${relDir}`);
        return;
    }
    const dest = path.join(DEST, relDir);
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            fs.cpSync(s, d, { recursive: true });
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

console.log('Nettoyage de www/...');
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

console.log('Copie des pages HTML...');
HTML_PAGES.forEach(copyFile);
console.log('Copie des scripts JS...');
JS_FILES.forEach(copyFile);
console.log('Copie des feuilles de style...');
CSS_FILES.forEach(copyFile);
console.log('Copie des autres fichiers (manifest, icônes)...');
OTHER_FILES.forEach(copyFile);
console.log('Copie des dossiers (images/)...');
DIRS.forEach(copyDir);

console.log(`\nwww/ prêt — lancez "npx cap sync ios" (ou "npm run ios:sync" qui fait les deux) pour le répercuter dans le projet Xcode.`);
