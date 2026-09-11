// ==========================================
// SERVICE WORKER : cache des fichiers statiques du site (demande du 11/09/2026,
// "via l'application, quand je change de page, il y a un temps de chargement assez
// long où la page s'affiche floue").
// ==========================================
// Cause probable : script.js (~1 Mo, non minifié) + style.css + firebase-init.js sont
// re-téléchargés (ou au minimum re-validés en réseau, requête conditionnelle 304) à
// CHAQUE navigation puisque le site est multi-pages (pas de SPA) — chaque page change
// = rechargement complet du document. En PWA installée, sans barre de progression du
// navigateur pour indiquer que ça charge, l'attente parait "figée/floue". Un Service
// Worker sert ces fichiers directement depuis le cache local (aucun aller-retour
// réseau), ce qui accélère aussi bien la version installée que le navigateur classique.
//
// IMPORTANT : ne touche jamais aux requêtes cross-origin (Firebase/Firestore, polices
// Google, tuiles Leaflet...) — seuls les fichiers statiques du même domaine sont
// concernés, jamais les données live du compte.
const CACHE_VERSION = 'stns-static-v20260911';

// Pas de préchargement à l'install : les fichiers réels sont demandés avec leur
// query-string de version (ex. "script.js?v=20260907"), le cache se remplit donc tout
// seul, avec la bonne clé, dès la première requête interceptée ci-dessous.
self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Fichiers statiques (JS/CSS/manifest/icônes) : cache d'abord, réseau en secours,
    // puis on rafraîchit le cache en tâche de fond (stale-while-revalidate) pour que la
    // prochaine navigation profite déjà d'une éventuelle mise à jour sans jamais faire
    // attendre l'utilisateur dessus.
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|webp|json)(\?.*)?$/.test(url.pathname) || STATIC_ASSETS.includes(url.pathname.replace(/^\//, ''));
    if (isStaticAsset) {
        event.respondWith(
            caches.open(CACHE_VERSION).then(async (cache) => {
                const cached = await cache.match(req);
                const network = fetch(req).then((res) => {
                    if (res && res.ok) cache.put(req, res.clone());
                    return res;
                }).catch(() => cached);
                return cached || network;
            })
        );
        return;
    }

    // Les pages HTML elles-mêmes (map.html, profile.html...) ne sont volontairement PAS
    // mises en cache ici : le site est modifié très fréquemment (nouvelles fonctionnalités
    // quasi quotidiennes) et un HTML en cache périmé montrerait une version obsolète tant
    // que le Service Worker ne se met pas à jour. Seuls les fichiers statiques versionnés
    // (?v=...) ci-dessus le sont — ils portent déjà leur propre cache-busting, donc aucun
    // risque de rester bloqué sur une ancienne version après une mise à jour du site.
});
