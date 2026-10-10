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
// BUG corrigé (demande du 10/10/2026, plusieurs correctifs "pas visibles" ce jour-là
// malgré un ?v=... déjà bumpé sur script.js/map.html/etc.) : CACHE_VERSION ci-dessous
// n'avait pas changé depuis le 20/09/2026, donc les OCTETS de ce fichier sw.js
// lui-même n'avaient pas bougé pendant toute cette session — un navigateur ne déclenche
// la mise à jour d'un Service Worker (install → activate → clients.claim(), déjà codés
// plus bas) qu'en détectant un changement d'octets dans SON PROPRE fichier. Sans ça, un
// appareil ayant déjà ce worker installé AVANT aujourd'hui pouvait rester bloqué sur son
// instance JS en mémoire, qui ne relit jamais le ?v=... des pages pour décider quoi
// servir — ce bump-ci (du fichier sw.js lui-même, pas seulement des pages qu'il sert)
// force enfin cette détection, où aucun des bumps précédents de cette session n'avait
// de prise. À refaire à chaque fois que la LOGIQUE de ce fichier change ; inutile pour
// un simple changement dans script.js/map.html/etc. (déjà couvert par leur propre ?v=).
const CACHE_VERSION = 'stns-static-v20261010';

// Bibliothèques externes figées par version dans leur URL (unpkg pour Leaflet,
// gstatic pour le SDK Firebase) : contrairement à Firestore/Auth (données live,
// jamais mises en cache), ces fichiers ne changent jamais tant que la version
// dans l'URL ne change pas, donc cache-first sans risque de servir du périmé.
const CACHEABLE_CDN_HOSTS = ['unpkg.com', 'www.gstatic.com'];
const isCacheableCdnRequest = (url) =>
    CACHEABLE_CDN_HOSTS.includes(url.hostname) && /\.(js|css)(\?.*)?$/.test(url.pathname);

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
    if (url.origin !== self.location.origin) {
        // Seules les bibliothèques JS/CSS figées par version (Leaflet, SDK Firebase) sont
        // concernées ici — jamais les tuiles de carte, ni Firestore/Auth (données live).
        if (isCacheableCdnRequest(url)) {
            event.respondWith(
                caches.open(CACHE_VERSION).then(async (cache) => {
                    const cached = await cache.match(req);
                    if (cached) return cached;
                    const res = await fetch(req);
                    if (res && res.ok) cache.put(req, res.clone());
                    return res;
                })
            );
        }
        return;
    }

    // BUG CRITIQUE corrigé le 12/09/2026 : cette condition référençait STATIC_ASSETS, un
    // tableau supprimé lors d'une simplification précédente de ce fichier (le
    // préchargement à l'install s'appuyait dessus, mais plus rien d'autre) — sans lui, CE
    // service worker levait une ReferenceError à CHAQUE requête réseau interceptée sur
    // tout le site, cassant potentiellement le chargement de bien plus que les seuls
    // fichiers statiques visés ici. Explique probablement une bonne partie du "le site
    // met énormément de temps à charger" rapporté juste après l'introduction de ce
    // fichier.
    //
    // BUG corrigé (demande du 20/09/2026, "la page feed ne fonctionne toujours pas sur
    // mobile... même en navigation privée", persistant après plusieurs correctifs déjà
    // livrés côté script.js/feed.html) : ce gestionnaire servait ces fichiers en
    // "cache d'abord" (stale-while-revalidate) — la page en cours recevait TOUJOURS la
    // version déjà en cache, même périmée, le réseau ne servant qu'à rafraîchir le cache
    // pour la PROCHAINE visite. Sur une PWA installée sur l'écran d'accueil iOS en
    // particulier, la mise à jour du Service Worker lui-même (sw.js) est notoirement peu
    // fiable côté WebKit — un appareil resté bloqué sur un ancien sw.js reste alors
    // bloqué indéfiniment sur d'anciennes versions de script.js/feed.html même après
    // publication d'un correctif, quel que soit le nombre de fois où le code source est
    // corrigé côté dépôt. Passé en "réseau d'abord, cache en secours" : chaque chargement
    // tente désormais le réseau EN PREMIER (la version la plus fraîche gagne dès qu'elle
    // est disponible), le cache ne servant plus que de repli hors-ligne/réseau en échec —
    // couplé au cache-busting ?v=... déjà en place (voir script.js/feed.html), ceci
    // élimine ce risque de version figée sans sacrifier le repli hors-ligne recherché à
    // l'origine (demande du 11/09/2026).
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|webp|json)(\?.*)?$/.test(url.pathname);
    if (isStaticAsset) {
        event.respondWith(
            caches.open(CACHE_VERSION).then(async (cache) => {
                try {
                    const res = await fetch(req);
                    if (res && res.ok) cache.put(req, res.clone());
                    return res;
                } catch (e) {
                    const cached = await cache.match(req);
                    if (cached) return cached;
                    throw e;
                }
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

// ==========================================
// NOTIFICATIONS PUSH (demande du 05/10/2026) — reçues via FCM (Firebase Cloud Messaging)
// pendant que ce Service Worker est actif mais qu'aucun onglet du site n'a le focus
// (c'est le cas normal : getToken() dans firebase-init.js enregistre CE fichier comme
// Service Worker de la messagerie, voir serviceWorkerRegistration passé à getToken()).
// Gestion volontairement "à la main" (pas d'import de firebase-messaging-sw.js) : un
// seul gestionnaire `push`, quel que soit le site côté Firebase/FCM, cohérent avec le
// reste de ce fichier qui ne dépend déjà d'aucun SDK Firebase. admin-scripts/
// tour-night-agent.js et send-tour-push.js envoient volontairement des messages
// "data-only" (jamais de clé `notification` au niveau racine) : avec une clé
// `notification`, certains navigateurs affichent eux-mêmes une notification générique
// SANS déclencher cet écouteur — "data-only" garantit que c'est TOUJOURS ce code-ci qui
// construit la notification affichée (et son URL de clic, voir plus bas).
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json().data || {} : {}; } catch (e) { /* payload non-JSON, ignoré ci-dessous */ }
    const title = data.title || 'Screen To Street';
    const body = data.body || '';
    const url = data.url || '/map.html';
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            data: { url }
        })
    );
});

// Clic sur la notification : ramène sur l'onglet déjà ouvert du site si possible (évite
// une deuxième copie du site dans un nouvel onglet), sinon en ouvre un nouveau sur l'URL
// ciblée (ex: map.html pour aller directement voir la nuit de concert publiée).
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/map.html';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
            const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
            if (existing) return existing.focus();
            return self.clients.openWindow(url);
        })
    );
});
