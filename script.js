// ==========================================
// 0. CONFIGURATION DU FOND DE CARTE
// ==========================================
// Le style OSM Carto standard (tile.openstreetmap.org) affiche les noms de lieux
// uniquement dans la langue/écriture locale (ex: 서울특별시 plutôt que "Seoul" en Corée),
// illisible pour une bonne partie des visiteurs du site. On utilise donc le style
// "osm-intl" de Wikimedia — construit par Wikimedia précisément pour son public
// multilingue mondial : mêmes données et mêmes couleurs qu'OSM Carto standard (fond
// crème, parcs en vert, eau en bleu, routes en jaune/orange), mais avec les noms
// internationaux/latins ajoutés à côté du nom local. Entièrement gratuit, sans
// inscription ni clé API, un seul hôte (pas de sous-domaines a/b/c comme OSM standard).
// (Seule condition d'usage : garder l'attribution "OpenStreetMap contributors" visible,
// déjà incluse ci-dessous, et rester dans un usage raisonnable — largement le cas ici.)
// CARTO a été écarté : il a changé sa politique en août 2026 et impose désormais une clé.
const OSM_TILE_URL = 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png';
// Repli automatique sur OSM Carto standard (labels locaux uniquement, mais robuste et
// toujours disponible) si le style Wikimedia venait à devenir inaccessible — mieux vaut
// une carte lisible dans une langue que pas de carte du tout. Voir attachOSMFallback().
const OSM_TILE_FALLBACK_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Échappe du texte fourni par un·e utilisateur·rice (message de chat, pseudo, nom de
// voyage...) avant de l'insérer via innerHTML — sans ça, un message de la messagerie
// amis (voir friends.html) contenant du HTML/JS s'exécuterait chez qui le lit.
// Widget "liens supplémentaires" (demande du 11/09/2026, "je veux pouvoir ajouter
// plusieurs liens twitter, instagram, facebook, tiktok... ajoute un + si je veux ajouter
// un nouveau lien") — réutilisé par la fiche de review d'une proposition (admin.html) ET
// la modale crayon "Edit location" (voir ensureLocationEditModal plus bas) pour les 4
// réseaux sociaux. Le lien "principal" de chaque réseau garde son champ + son aperçu
// embarqué existants, inchangés ; ce widget gère UNIQUEMENT les liens EN PLUS (stockés à
// part, ex. tweetUrls[]) — pas d'aperçu embarqué pour ceux-ci, une simple liste de champs
// validés, pour rester raisonnable en complexité.
window.createMultiUrlField = function (container, opts) {
    opts = opts || {};
    const placeholder = opts.placeholder || 'https://...';
    const fieldStyle = opts.fieldStyle || "width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 10px; font-size:12px; font-family:'Poppins',sans-serif;";
    const errStyle = opts.errStyle || 'font-size:10.5px; color:#D42759;';
    const initialValues = Array.isArray(opts.values) ? opts.values.filter(Boolean) : [];

    function rowHtml(value) {
        return `<div class="mu-row" style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
            <input type="url" class="mu-input" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}" style="${fieldStyle} margin-bottom:0; flex:1;">
            <button type="button" class="mu-remove" title="Remove this link" style="flex-shrink:0; width:32px; height:32px; border:1.5px solid #e2e8f0; background:#fff; border-radius:8px; color:#94a3b8; font-size:16px; line-height:1; cursor:pointer;">&times;</button>
        </div>
        <div class="mu-error" style="${errStyle} display:none; margin:-4px 0 8px 0;"></div>`;
    }

    container.innerHTML = initialValues.map(rowHtml).join('') +
        `<button type="button" class="mu-add-btn" style="background:none; border:none; color:#D42759; font-size:11.5px; font-weight:700; cursor:pointer; padding:2px 0 8px 0; font-family:'Poppins',sans-serif;">+ Add another link</button>`;

    container.querySelector('.mu-add-btn').addEventListener('click', () => {
        container.querySelector('.mu-add-btn').insertAdjacentHTML('beforebegin', rowHtml(''));
    });
    container.addEventListener('click', (e) => {
        if (!e.target.classList.contains('mu-remove')) return;
        const row = e.target.closest('.mu-row');
        const errorEl = row.nextElementSibling && row.nextElementSibling.classList.contains('mu-error') ? row.nextElementSibling : null;
        if (errorEl) errorEl.remove();
        row.remove();
    });

    return {
        // validateFn(url) -> cleaned URL string, or null/false if invalid. Champs vides
        // ignorés silencieusement (pas une erreur) ; un champ rempli mais invalide est
        // signalé sur sa propre ligne et fait échouer hasError.
        collect: function (validateFn) {
            let hasError = false;
            const values = [];
            container.querySelectorAll('.mu-row').forEach(row => {
                const input = row.querySelector('.mu-input');
                const errorEl = row.nextElementSibling;
                const val = input.value.trim();
                if (!val) { if (errorEl) errorEl.style.display = 'none'; return; }
                const clean = validateFn ? validateFn(val) : val;
                if (clean) {
                    values.push(clean);
                    if (errorEl) errorEl.style.display = 'none';
                } else {
                    hasError = true;
                    if (errorEl) { errorEl.textContent = "Doesn't look like a valid URL for this platform."; errorEl.style.display = 'block'; }
                }
            });
            return { values, hasError };
        }
    };
};

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
window.escapeHtml = escapeHtml;

// Couleur d'avatar déterministe à partir d'un pseudo — même palette/algorithme que les
// copies locales de feed.html (feedAvatarColor) et profile.html (profileAvatarColor),
// extrait ici en version partagée pour le tiroir "photos des visiteurs" d'un lieu (voir
// openLocVisitorsDrawer plus bas) sans dupliquer une troisième fois la même palette.
window.avatarColorForUsername = function (username) {
    const palette = ['#D42759', '#8B5CF6', '#F06090', '#10b981', '#3b82f6', '#f59e0b'];
    let sum = 0;
    for (let i = 0; i < (username || '').length; i++) sum += username.charCodeAt(i);
    return palette[sum % palette.length];
};

// Service Worker (demande du 11/09/2026, "via l'application, changement de page trop
// lent") : cache les fichiers statiques (script.js, style.css...) pour éviter de les
// re-télécharger/re-valider en réseau à chaque navigation — voir sw.js. Enregistré après
// le "load" pour ne jamais retarder l'affichage de la page en cours, et sans danger pour
// la version navigateur classique (accélère aussi les visites suivantes là-bas).
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// Confirmation générique et courte, réutilisable depuis n'importe quelle page (friend
// request envoyée, username changé...) — voir .simple-toast-container dans style.css.
// Crée son propre conteneur à la volée au premier appel (pas de <div> à ajouter dans
// chaque fichier HTML) ; plusieurs toasts successifs s'empilent verticalement.
// Recherche par nom parmi celebLocations (pas exposée directement sur window pour garder
// une frontière d'API propre) — utilisée par le menu "+" de friends.html pour partager un
// lieu précis dans une conversation, sans dupliquer la liste des lieux ailleurs.
window.searchCelebLocationsByName = function (query, maxResults) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    return celebLocations.filter(l => (l.name || '').toLowerCase().includes(q)).slice(0, maxResults || 8);
};

// Charge le widget officiel Twitter/X une seule fois (partagé par toutes les fiches lieu
// visitées dans la session), puis fait rendre le <blockquote> injecté à chaque appel —
// widgets.js ne transforme QUE les blockquotes présents au moment de son propre
// chargement, un blockquote ajouté dynamiquement plus tard a besoin d'un appel explicite
// à widgets.load() pour être rendu (voir renderTweetEmbedOnDetails ci-dessous).
let _twitterWidgetLoadPromise = null;
function loadTwitterWidgetScriptOnce() {
    if (window.twttr && window.twttr.widgets) return Promise.resolve();
    if (_twitterWidgetLoadPromise) return _twitterWidgetLoadPromise;
    _twitterWidgetLoadPromise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://platform.twitter.com/widgets.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.body.appendChild(s);
    });
    return _twitterWidgetLoadPromise;
}
async function renderTweetEmbedOnDetails(container, tweetUrl) {
    container.innerHTML = `<blockquote class="twitter-tweet"><a href="${tweetUrl}"></a></blockquote>`;
    await loadTwitterWidgetScriptOnce();
    if (window.twttr && window.twttr.widgets) window.twttr.widgets.load(container);
}

// Même principe que le widget Twitter ci-dessus, pour un post/reel Instagram précis (demande
// du 07/09/2026 : le lien "Instagram" restait un simple lien "Follow" sans jamais s'afficher
// en embed, contrairement au tweet — voir admin.html pour le même correctif côté prévisualisation
// avant publication). embed.js EST la méthode officielle sans clé API pour un post PUBLIC
// (le même mécanisme que le bouton "Embed" sur instagram.com) — contrairement à un lien de
// simple profil (instagram.com/{username}), qui n'a pas d'équivalent embarquable et reste
// donc un lien "Follow" classique (voir isInstagramPostUrl ci-dessous).
function isInstagramPostUrl(url) {
    return /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[^/?]+/i.test((url || '').trim());
}
let _instagramWidgetLoadPromise = null;
function loadInstagramWidgetScriptOnce() {
    if (window.instgrm && window.instgrm.Embeds) return Promise.resolve();
    if (_instagramWidgetLoadPromise) return _instagramWidgetLoadPromise;
    _instagramWidgetLoadPromise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://www.instagram.com/embed.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.body.appendChild(s);
    });
    return _instagramWidgetLoadPromise;
}
async function renderInstagramEmbedOnDetails(container, instagramUrl) {
    container.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${instagramUrl}" data-instgrm-version="14"></blockquote>`;
    await loadInstagramWidgetScriptOnce();
    // Contrairement à twttr.widgets.load(container) (accepte un conteneur précis),
    // instgrm.Embeds.process() retraite TOUJOURS tous les blockquotes de la page — sans
    // second argument ciblé côté API officielle, mais sans risque ici : les blockquotes
    // déjà traités sont ignorés par le widget lui-même.
    if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
}

window.showSimpleToast = function (message, opts) {
    const isError = opts && opts.isError;
    let container = document.getElementById('simple-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'simple-toast-container';
        container.className = 'simple-toast-container';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'simple-toast' + (isError ? ' error' : '');
    el.innerHTML = `<span class="simple-toast-check">${isError ? '!' : '✓'}</span><span></span>`;
    el.querySelector('span:last-child').textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
};

// Lien direct "voir le voyage" depuis une conversation de groupe (friends.html) :
// trips.html?openTrip=<id> doit ouvrir ce voyage précis au chargement plutôt que le
// dernier voyage actif. Exécuté au tout début de script.js (avant DOMContentLoaded, donc
// avant le premier appel à initTrips() dans applyTranslations()) : pour un voyage
// POSSÉDÉ, ceci suffit puisque initTrips() lit justement activeTripId depuis le
// localStorage. Pour un voyage seulement PARTAGÉ avec ce compte (pas dans myTrips), voir
// le traitement complémentaire dans refreshSharedTrips() plus bas, qui a accès à
// sharedTripsCache une fois celui-ci chargé depuis Firestore.
(function () {
    const openTripParam = new URLSearchParams(location.search).get('openTrip');
    if (openTripParam) localStorage.setItem('activeTripId', openTripParam);
})();

// Bascule silencieusement une couche de tuiles vers le repli OSM standard si trop de
// tuiles du style principal échouent à charger (ex: service Wikimedia temporairement
// indisponible) — au-delà d'un petit nombre d'échecs pour ne pas réagir à une simple
// tuile isolée en erreur réseau.
function attachOSMFallback(tileLayer, map) {
    let failCount = 0;
    let switched = false;
    tileLayer.on('tileerror', () => {
        if (switched) return;
        failCount++;
        // Seuil abaissé (était 5) : sur une connexion mobile faible, attendre 5 échecs
        // avant de basculer laissait la carte grise trop longtemps avant le repli.
        if (failCount > 2) {
            switched = true;
            tileLayer.setUrl(OSM_TILE_FALLBACK_URL);
        }
    });
    return tileLayer;
}

function createOSMTileLayer(map, opts) {
    const layer = L.tileLayer(OSM_TILE_URL, Object.assign({ attribution: OSM_ATTRIBUTION, maxZoom: 19, maxNativeZoom: 18 }, opts));
    if (map) attachOSMFallback(layer, map);
    return layer;
}

// ==========================================
// 0ter. MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Le site est 100% statique (pas de backend/serveur), donc il n'existe aucun moyen
// fiable côté client de "vérifier en direct sur le site de BTS" leur position actuelle
// (pas de flux officiel public exploitable en JS, et scraper un site externe depuis le
// navigateur se heurte systématiquement à CORS). La seule approche techniquement saine
// pour un site comme celui-ci est donc une liste de dates tenue à jour manuellement —
// exactement comme le fait n'importe quel site d'actus de tournée.
//
// Calendrier ci-dessous transmis directement par toi (visuel officiel de l'Arirang World
// Tour) le 30/08/2026 — remplace la version précédente basée sur des recherches web
// incertaines. Les dates des dernières villes (Singapour, Jakarta, Melbourne, Sydney,
// Hong Kong) viennent de la lecture du visuel et sont un peu moins nettes que les autres
// (texte compact) : à recontrôler si un doute apparaît. Le lieu ("venue") des étapes
// asiatiques/océaniennes de fin de tournée n'était pas précisé dans ce que tu as fourni —
// laissé vide plutôt que d'inventer un nom de salle. D'autres villes doivent encore être
// annoncées (2027 : Japon, Moyen-Orient et plus) — à ajouter ici dès qu'elles le seront.
// Plusieurs tournées sont maintenant disponibles (voir ALL_TOURS plus bas) — le
// sélecteur "Choisir une tournée" du Mode Tournée permet de passer de l'une à l'autre.
// TOUR_MODE_DATA (défini plus bas comme un getter) désigne toujours la tournée
// actuellement CONSULTÉE dans le panneau, tandis que le badge "en direct" ne regarde
// que LIVE_TOUR_ID (la seule tournée avec des dates réelles au présent/futur — les
// tournées historiques ci-dessous sont entièrement terminées et resteront donc
// toujours "Terminé", ce qui est le comportement honnête attendu).
const ARIRANG_TOUR = {
    id: 'arirang',
    tourName: "Arirang World Tour",
    group: "BTS",
    stops: [
        { id: 'goyang',      city: 'Goyang',        country: 'South Korea', venue: 'Goyang Stadium',            lat: 37.6584,  lng: 126.7828,  showDates: ['2026-04-09', '2026-04-11', '2026-04-12'],
          nights: [
              { dates: ['2026-04-09'], surpriseSongs: ['봄날 (Spring Day)', 'Save ME'], highlights: { en: ["The very first reunion concert after military service: <b>Jin</b> and <b>Jungkook</b> burst into tears during the opening song at the sight of the sea of purple."], fr: ["Le tout premier concert de retrouvailles après le service militaire : <b>Jin</b> et <b>Jungkook</b> ont fondu en larmes dès la chanson d'ouverture en voyant l'océan violet."], es: ["El primerísimo concierto de reencuentro tras el servicio militar: <b>Jin</b> y <b>Jungkook</b> rompieron a llorar desde la canción de apertura al ver el océano violeta."], it: ["Il primissimo concerto di riunione dopo il servizio militare: <b>Jin</b> e <b>Jungkook</b> sono scoppiati in lacrime già dalla canzone d'apertura, alla vista dell'oceano viola."], pt: ["O primeiríssimo show de reencontro após o serviço militar: <b>Jin</b> e <b>Jungkook</b> começaram a chorar já na música de abertura, ao ver o oceano roxo."], ko: ["군 복무 후 첫 재회 콘서트: <b>진</b>과 <b>정국</b>은 오프닝 곡에서부터 보라색 바다를 보고 눈물을 터뜨렸다."], ja: ["兵役後、初めての再会コンサート。<b>ジン</b>と<b>ジョングク</b>はオープニング曲から紫色の海を見て涙をこぼした。"], zh: ["服兵役后的首场重聚演唱会：<b>Jin</b>和<b>Jungkook</b>在开场曲时看到紫色的海洋便落泪了。"] } },
              { dates: ['2026-04-11', '2026-04-12'], surpriseSongs: ['FIRE', 'Not Today'], highlights: { en: ["<b>RM</b> gave a moving speech about their kept promise to return as seven, sparking a 5-minute standing ovation."], fr: ["<b>RM</b> a fait un discours bouleversant sur leur promesse tenue de revenir à sept, provoquant une standing ovation de 5 minutes."], es: ["<b>RM</b> dio un discurso conmovedor sobre su promesa cumplida de volver siendo siete, provocando una ovación de pie de 5 minutos."], it: ["<b>RM</b> ha tenuto un discorso commovente sulla promessa mantenuta di tornare in sette, scatenando una standing ovation di 5 minuti."], pt: ["<b>RM</b> fez um discurso emocionante sobre a promessa cumprida de voltarem sendo sete, provocando uma ovação de pé de 5 minutos."], ko: ["<b>RM</b>은 일곱 명이 함께 돌아오겠다는 약속을 지켰다는 감동적인 연설을 했고, 5분간의 기립박수가 이어졌다."], ja: ["<b>RM</b>は「7人で戻る」という約束を守れたことについて感動的なスピーチを行い、5分間のスタンディングオベーションが起きた。"], zh: ["<b>RM</b>发表了关于七人一起回归这一承诺兑现的感人演讲，引发了长达5分钟的起立鼓掌。"] } }
          ] },
        { id: 'tokyo',       city: 'Tokyo',         country: 'Japan',       venue: 'Tokyo Dome',                 lat: 35.7056,  lng: 139.7519,  showDates: ['2026-04-17', '2026-04-18'],
          nights: [
              { dates: ['2026-04-17', '2026-04-18'], surpriseSongs: ['House Of Cards', 'Euphoria'], highlights: { en: ["<b>V</b> sang a snippet of his solo song a cappella.", "<b>Jimin</b> had fun wearing a Mount Fuji-shaped hat thrown by a fan."], fr: ["<b>V</b> a chanté un extrait de sa chanson solo a cappella.", "<b>Jimin</b> s'est amusé à porter un chapeau en forme de mont Fuji lancé par une fan."], es: ["<b>V</b> cantó a capela un fragmento de su canción en solitario.", "<b>Jimin</b> se divirtió llevando un sombrero con forma del Monte Fuji lanzado por una fan."], it: ["<b>V</b> ha cantato a cappella un estratto della sua canzone da solista.", "<b>Jimin</b> si è divertito a indossare un cappello a forma di Monte Fuji lanciato da una fan."], pt: ["<b>V</b> cantou a capella um trecho de sua música solo.", "<b>Jimin</b> se divertiu usando um chapéu em forma do Monte Fuji jogado por uma fã."], ko: ["<b>뷔</b>는 자신의 솔로 곡 일부를 아카펠라로 불렀다.", "<b>지민</b>은 한 팬이 던진 후지산 모양 모자를 쓰고 즐거워했다."], ja: ["<b>V</b>はソロ曲の一部をアカペラで歌った。", "<b>ジミン</b>はファンが投げた富士山型の帽子をかぶって楽しんだ。"], zh: ["<b>V</b>清唱了一段他的个人歌曲。", "<b>Jimin</b>开心地戴上了一位粉丝扔来的富士山形状帽子。"] } }
          ] },
        { id: 'tampa',       city: 'Tampa',         country: 'USA',         venue: 'Raymond James Stadium',      lat: 27.9759,  lng: -82.5033,  showDates: ['2026-04-25', '2026-04-26', '2026-04-28'],
          nights: [
              { dates: ['2026-04-25', '2026-04-26'], highlights: { en: ["The \"Maknae Line\" (<b>Jimin</b>, <b>V</b>, <b>Jungkook</b>) improvised a chaotic choreography during the encore, ending up collapsing with laughter on stage."], fr: ["La \"Maknae Line\" (<b>Jimin</b>, <b>V</b>, <b>Jungkook</b>) a improvisé une chorégraphie chaotique pendant le rappel, finissant par s'écrouler de rire sur scène."], es: ["La \"Maknae Line\" (<b>Jimin</b>, <b>V</b>, <b>Jungkook</b>) improvisó una coreografía caótica durante el bis, terminando desplomados de risa en el escenario."], it: ["La \"Maknae Line\" (<b>Jimin</b>, <b>V</b>, <b>Jungkook</b>) ha improvvisato una coreografia caotica durante il bis, finendo per crollare dalle risate sul palco."], pt: ["A \"Maknae Line\" (<b>Jimin</b>, <b>V</b>, <b>Jungkook</b>) improvisou uma coreografia caótica durante o bis, acabando desabando de rir no palco."], ko: ["\"막내 라인\"(<b>지민</b>, <b>뷔</b>, <b>정국</b>)이 앙코르 중 즉흥적으로 엉망진창인 안무를 선보이다 결국 무대 위에서 웃음을 참지 못하고 주저앉았다."], ja: ["「マンネライン」(<b>ジミン</b>、<b>V</b>、<b>ジョングク</b>)がアンコール中に即興でめちゃくちゃな振り付けを披露し、最後はステージ上で笑い転げた。"], zh: ["\"忙内line\"（<b>Jimin</b>、<b>V</b>、<b>Jungkook</b>）在安可环节即兴表演了一段混乱的舞蹈，最后笑到瘫倒在舞台上。"] } },
              { dates: ['2026-04-28'], surpriseSongs: ['Life Goes On', '뱁새 (Silver Spoon)'], highlights: { en: ["<b>RM</b> got completely soaked during the traditional water fight of the encore and comically slipped without getting hurt, amusing the whole stadium."], fr: ["<b>RM</b> a été complètement trempé lors de la bataille d'eau traditionnelle du rappel et a glissé de façon comique sans se faire mal, amusant tout le stade."], es: ["<b>RM</b> quedó completamente empapado durante la tradicional batalla de agua del bis y resbaló de forma cómica sin hacerse daño, divirtiendo a todo el estadio."], it: ["<b>RM</b> è rimasto completamente fradicio durante la tradizionale battaglia d'acqua del bis ed è scivolato in modo comico senza farsi male, divertendo tutto lo stadio."], pt: ["<b>RM</b> ficou completamente encharcado durante a tradicional batalha de água do bis e escorregou de forma cômica sem se machucar, divertindo todo o estádio."], ko: ["<b>RM</b>은 앙코르에서 전통이 된 물총 싸움 중 흠뻑 젖었고, 다치지 않고 코믹하게 미끄러져 경기장 전체를 즐겁게 했다."], ja: ["<b>RM</b>はアンコールの恒例となった水かけ合戦でずぶ濡れになり、怪我なくコミカルに滑って会場中を沸かせた。"], zh: ["<b>RM</b>在安可环节的传统泼水大战中被彻底淋湿，还滑稽地滑倒（没有受伤），逗乐了全场。"] } }
          ] },
        { id: 'elpaso',      city: 'El Paso',       country: 'USA',         venue: 'Sun Bowl Stadium',           lat: 31.7757,  lng: -106.5004, showDates: ['2026-05-02', '2026-05-03'],
          nights: [
              { dates: ['2026-05-02'], surpriseSongs: ['On', 'Outro: Wings'], highlights: { en: ["<b>Suga</b> smiled tenderly at a fan sign that read \"I will sue Min Yoongi again in 2026.\""], fr: ["<b>Suga</b> a souri tendrement à une pancarte d'une fan qui disait \"I will sue Min Yoongi again in 2026\"."], es: ["<b>Suga</b> sonrió con ternura a un cartel de una fan que decía \"I will sue Min Yoongi again in 2026\"."], it: ["<b>Suga</b> ha sorriso teneramente a un cartello di una fan con scritto \"I will sue Min Yoongi again in 2026\"."], pt: ["<b>Suga</b> sorriu com ternura para uma placa de uma fã que dizia \"I will sue Min Yoongi again in 2026\"."], ko: ["<b>슈가</b>는 한 팬이 든 \"I will sue Min Yoongi again in 2026\"이라는 팻말을 보고 다정하게 미소지었다."], ja: ["<b>シュガ</b>はファンが掲げた「I will sue Min Yoongi again in 2026」というボードを見て優しく微笑んだ。"], zh: ["<b>Suga</b>看到一位粉丝举着写有\"I will sue Min Yoongi again in 2026\"的牌子，露出了温柔的微笑。"] } },
              { dates: ['2026-05-03'], surpriseSongs: ['Dionysus', 'Best of Me'] }
          ] },
        { id: 'mexicocity',  city: 'Mexico City',   country: 'Mexico',      venue: 'Estadio GNP Seguros',        lat: 19.3046,  lng: -99.1505,  showDates: ['2026-05-07', '2026-05-09', '2026-05-10'],
          nights: [
              { dates: ['2026-05-07'], surpriseSongs: ['상남자 (Boy in Luv)', 'So What'], highlights: { en: ["The crowd sang a deafening \"Cielito Lindo\" before the encore, which deeply moved <b>J-Hope</b>."], fr: ["Le public a chanté un \"Cielito Lindo\" assourdissant avant le rappel, ce qui a profondément ému <b>J-Hope</b>."], es: ["El público cantó un ensordecedor \"Cielito Lindo\" antes del bis, lo que emocionó profundamente a <b>J-Hope</b>."], it: ["Il pubblico ha cantato un assordante \"Cielito Lindo\" prima del bis, commuovendo profondamente <b>J-Hope</b>."], pt: ["O público cantou um ensurdecedor \"Cielito Lindo\" antes do bis, o que emocionou profundamente <b>J-Hope</b>."], ko: ["앙코르 전 관객들이 귀청이 떨어질 듯한 \"Cielito Lindo\"를 떼창해 <b>제이홉</b>을 깊이 감동시켰다."], ja: ["アンコール前、観客が耳をつんざくような大合唱で「Cielito Lindo」を歌い、<b>J-Hope</b>を深く感動させた。"], zh: ["安可前，观众齐声高唱震耳欲聋的《Cielito Lindo》，深深打动了<b>J-Hope</b>。"] } },
              { dates: ['2026-05-09', '2026-05-10'], highlights: { en: ["Mexican fans organized a light project in the colors of the Korean and Mexican flags."], fr: ["Les fans mexicains ont organisé un projet lumineux aux couleurs du drapeau coréen et mexicain."], es: ["Los fans mexicanos organizaron un proyecto de luces con los colores de las banderas coreana y mexicana."], it: ["I fan messicani hanno organizzato un progetto luminoso con i colori delle bandiere coreana e messicana."], pt: ["Os fãs mexicanos organizaram um projeto luminoso com as cores das bandeiras coreana e mexicana."], ko: ["멕시코 팬들은 한국과 멕시코 국기 색상으로 이루어진 조명 프로젝트를 준비했다."], ja: ["メキシコのファンは韓国とメキシコの国旗の色を使ったライトプロジェクトを企画した。"], zh: ["墨西哥粉丝组织了一场以韩国和墨西哥国旗颜色为主题的灯光应援。"] } }
          ] },
        { id: 'stanford',    city: 'Stanford',      country: 'USA',         venue: 'Stanford Stadium',           lat: 37.4342,  lng: -122.1610, showDates: ['2026-05-16', '2026-05-17', '2026-05-19'],
          nights: [
              { dates: ['2026-05-16', '2026-05-17'], highlights: { en: ["<b>Jungkook</b> spotted a child dressed as Cooky (BT21) in the pit and came down to give them a high-five."], fr: ["<b>Jungkook</b> a remarqué un enfant déguisé en Cooky (BT21) dans la fosse et est descendu lui taper dans la main."], es: ["<b>Jungkook</b> vio a un niño disfrazado de Cooky (BT21) en el foso y bajó a chocarle la mano."], it: ["<b>Jungkook</b> ha notato un bambino travestito da Cooky (BT21) nel parterre ed è sceso per dargli il cinque."], pt: ["<b>Jungkook</b> notou uma criança fantasiada de Cooky (BT21) na pista e desceu para bater a mão com ela."], ko: ["<b>정국</b>은 스탠딩석에서 쿠키(BT21) 옷을 입은 아이를 발견하고 내려가 하이파이브를 해주었다."], ja: ["<b>ジョングク</b>はスタンディングエリアでクッキー(BT21)の衣装を着た子どもを見つけ、降りてハイタッチをした。"], zh: ["<b>Jungkook</b>注意到内场有个打扮成Cooky（BT21）的小孩，特意走下去和他击掌。"] } },
              { dates: ['2026-05-19'], surpriseSongs: ['I Need U', 'No More Dream'], highlights: { en: ["Iconic moment: Bay Area ARMYs organized a massive project, simultaneously raising the South Korean flag while singing Arirang during the song Body to Body."], fr: ["Moment iconique : les ARMYs de la Bay Area ont organisé un projet massif en levant simultanément le drapeau de la Corée du Sud tout en chantant Arirang pendant la chanson Body to Body."], es: ["Momento icónico: las ARMYs del Área de la Bahía organizaron un proyecto masivo, levantando simultáneamente la bandera de Corea del Sur mientras cantaban Arirang durante la canción Body to Body."], it: ["Momento iconico: le ARMY della Bay Area hanno organizzato un progetto di massa, alzando simultaneamente la bandiera della Corea del Sud mentre cantavano Arirang durante la canzone Body to Body."], pt: ["Momento icônico: as ARMYs da Bay Area organizaram um projeto em massa, erguendo simultaneamente a bandeira da Coreia do Sul enquanto cantavam Arirang durante a música Body to Body."], ko: ["상징적인 순간: 베이 에어리어의 아미들은 Body to Body 곡이 나오는 동안 다 함께 태극기를 들어올리며 아리랑을 합창하는 대규모 프로젝트를 준비했다."], ja: ["象徴的な瞬間：ベイエリアのARMYは、Body to Bodyの曲中に韓国国旗を一斉に掲げながらアリランを合唱する大規模プロジェクトを企画した。"], zh: ["标志性时刻：湾区ARMY组织了一场大型应援，在《Body to Body》歌曲响起时齐声高唱《阿里郎》，同时一起挥舞韩国国旗。"] } }
          ] },
        { id: 'vegas',       city: 'Las Vegas',     country: 'USA',         venue: 'Allegiant Stadium',          lat: 36.0908,  lng: -115.1833, showDates: ['2026-05-23', '2026-05-24', '2026-05-27', '2026-05-28'],
          nights: [
              { dates: ['2026-05-23'], surpriseSongs: ['Permission to Dance', '고민보다 Go (Go Go)'] },
              { dates: ['2026-05-24'], surpriseSongs: ['Black Swan', '등골브레이커 (Spine Breaker)'], highlights: { en: ["<b>Jin</b>, wearing his famous joke glasses, delivered a completely off-beat dance performance to Spine Breaker, backed up by <b>Suga</b>."], fr: ["<b>Jin</b>, avec ses fameuses lunettes humoristiques, a livré une performance de danse complètement décalée sur Spine Breaker, soutenu par <b>Suga</b>."], es: ["<b>Jin</b>, con sus famosas gafas cómicas, ofreció una actuación de baile totalmente disparatada con Spine Breaker, respaldado por <b>Suga</b>."], it: ["<b>Jin</b>, con i suoi famosi occhiali buffi, ha regalato un'esibizione di ballo completamente fuori dagli schemi su Spine Breaker, supportato da <b>Suga</b>."], pt: ["<b>Jin</b>, com seus famosos óculos engraçados, entregou uma performance de dança completamente fora do tom em Spine Breaker, apoiado por <b>Suga</b>."], ko: ["<b>진</b>은 특유의 개그 안경을 쓰고 Spine Breaker 무대에서 완전히 엉뚱한 춤을 선보였고, <b>슈가</b>가 이를 받쳐주었다."], ja: ["<b>ジン</b>は例のギャグ眼鏡をかけ、Spine Breakerで完全にズレたダンスパフォーマンスを披露し、<b>シュガ</b>がそれを支えた。"], zh: ["<b>Jin</b>戴着他那标志性的搞笑眼镜，在《Spine Breaker》中奉献了一段完全跑调的舞蹈表演，<b>Suga</b>在一旁配合。"] } },
              { dates: ['2026-05-27'], surpriseSongs: ['Anpanman', '진격의 방탄 (Attack on Bangtan)'] },
              { dates: ['2026-05-28'], surpriseSongs: ['흥탄소년단 (Boyz with Fun)', 'Danger'], highlights: { en: ["The concert ended under a spectacular fireworks display above Allegiant Stadium."], fr: ["Le concert s'est terminé sous un feu d'artifice spectaculaire au-dessus de l'Allegiant Stadium."], es: ["El concierto terminó bajo unos fuegos artificiales espectaculares sobre el Allegiant Stadium."], it: ["Il concerto si è concluso sotto uno spettacolare spettacolo pirotecnico sopra l'Allegiant Stadium."], pt: ["O show terminou sob um espetacular show de fogos de artifício sobre o Allegiant Stadium."], ko: ["콘서트는 알리전트 스타디움 상공에서 펼쳐진 화려한 불꽃놀이와 함께 마무리되었다."], ja: ["コンサートはアリージアント・スタジアム上空の壮大な花火とともに幕を閉じた。"], zh: ["演唱会在Allegiant体育场上空绚丽的烟花中落下帷幕。"] } }
          ] },
        { id: 'busan',       city: 'Busan',         country: 'South Korea', venue: 'Busan Asiad Main Stadium',   lat: 35.1907,  lng: 129.0587,  showDates: ['2026-06-12', '2026-06-13'],
          nights: [
              { dates: ['2026-06-12'], surpriseSongs: ['팔도강산 (Paldogangsan)', 'Ma City'], highlights: { en: ["A return to <b>Jimin</b> and <b>Jungkook</b>'s hometown region: <b>Jimin</b> cried heavily while addressing his family in the audience."], fr: ["Retour sur les terres de <b>Jimin</b> et <b>Jungkook</b> : <b>Jimin</b> a pleuré à chaudes larmes en s'adressant à sa famille présente dans le public."], es: ["Regreso a la tierra natal de <b>Jimin</b> y <b>Jungkook</b>: <b>Jimin</b> lloró desconsoladamente al dirigirse a su familia presente entre el público."], it: ["Ritorno nella terra natale di <b>Jimin</b> e <b>Jungkook</b>: <b>Jimin</b> ha pianto a dirotto rivolgendosi alla sua famiglia presente tra il pubblico."], pt: ["Retorno à terra natal de <b>Jimin</b> e <b>Jungkook</b>: <b>Jimin</b> chorou muito ao se dirigir à sua família presente na plateia."], ko: ["<b>지민</b>과 <b>정국</b>의 고향으로의 귀환: <b>지민</b>은 객석에 있는 가족에게 인사를 건네며 펑펑 울었다."], ja: ["<b>ジミン</b>と<b>ジョングク</b>の故郷への凱旋公演：<b>ジミン</b>は客席にいる家族に呼びかけながら号泣した。"], zh: ["重返<b>Jimin</b>和<b>Jungkook</b>的家乡：<b>Jimin</b>在向台下的家人喊话时泪流满面。"] } },
              { dates: ['2026-06-13'], surpriseSongs: ['보조개 (Dimple)', '땡 (Ddaeng)', 'Magic Shop'], highlights: { en: ["BTS's 13th anniversary, broadcast live in cinemas around the world: the group shared a huge cake on stage, and the performance of Ddaeng sent the stadium into a complete frenzy."], fr: ["Anniversaire des 13 ans de BTS, retransmis en direct dans les cinémas du monde entier : le groupe a partagé un énorme gâteau sur scène, et l'interprétation de Ddaeng a rendu le stade complètement hystérique."], es: ["13.º aniversario de BTS, retransmitido en directo en cines de todo el mundo: el grupo compartió una enorme tarta en el escenario, y la interpretación de Ddaeng dejó al estadio completamente enloquecido."], it: ["Il 13° anniversario dei BTS, trasmesso in diretta nei cinema di tutto il mondo: il gruppo ha condiviso un'enorme torta sul palco, e l'esibizione di Ddaeng ha mandato lo stadio completamente in delirio."], pt: ["13º aniversário do BTS, transmitido ao vivo em cinemas do mundo todo: o grupo compartilhou um enorme bolo no palco, e a apresentação de Ddaeng deixou o estádio completamente em êxtase."], ko: ["전 세계 영화관에 생중계된 BTS 데뷔 13주년: 멤버들은 무대 위에서 커다란 케이크를 나눴고, Ddaeng 무대는 경기장을 완전히 열광의 도가니로 만들었다."], ja: ["世界中の映画館で生中継されたBTSデビュー13周年: メンバーはステージ上で大きなケーキを分け合い、「Ddaeng」のパフォーマンスはスタジアムを完全な熱狂に包んだ。"], zh: ["BTS出道13周年，全球影院同步直播：成员们在台上分享了一个巨大的蛋糕，《Ddaeng》的表演更是让全场彻底沸腾。"] } }
          ] },
        { id: 'madrid',      city: 'Madrid',        country: 'Spain',       venue: 'Riyadh Air Metropolitano',   lat: 40.4362,  lng: -3.5995,   showDates: ['2026-06-26', '2026-06-27'],
          nights: [
              { dates: ['2026-06-26'], surpriseSongs: ['Airplane Pt.2', 'Outro: Wings'] },
              { dates: ['2026-06-27'], surpriseSongs: ['소우주 (Mikrokosmos)', 'Best of Me'], highlights: { en: ["<b>V</b> had fun with the Spanish words he'd learned for the occasion, throwing out passionate \"Te amo mucho\"s."], fr: ["<b>V</b> s'est amusé avec les mots espagnols appris pour l'occasion, lâchant des \"Te amo mucho\" enflammés."], es: ["<b>V</b> se divirtió con las palabras en español que aprendió para la ocasión, soltando efusivos \"Te amo mucho\"."], it: ["<b>V</b> si è divertito con le parole spagnole imparate per l'occasione, lanciando appassionati \"Te amo mucho\"."], pt: ["<b>V</b> se divertiu com as palavras em espanhol que aprendeu para a ocasião, soltando apaixonados \"Te amo mucho\"."], ko: ["<b>뷔</b>는 이번 공연을 위해 배운 스페인어로 열정적인 \"Te amo mucho\"를 외치며 즐거워했다."], ja: ["<b>V</b>はこの日のために覚えたスペイン語を使い、情熱的に「Te amo mucho」を連発して楽しんだ。"], zh: ["<b>V</b>兴致勃勃地用为此特意学的西班牙语，热情地喊出\"Te amo mucho\"。"] } }
          ] },
        { id: 'brussels',    city: 'Brussels',      country: 'Belgium',     venue: 'Stade Roi Baudouin',         lat: 50.8951,  lng: 4.3411,    showDates: ['2026-07-01', '2026-07-02'],
          nights: [
              { dates: ['2026-07-01'], surpriseSongs: ['Tomorrow', '작은 것들을 위한 시 (Boy with Luv)'] },
              { dates: ['2026-07-02'], surpriseSongs: ['On', 'For Youth'], highlights: { en: ["<b>Jungkook</b> grabbed a front-row ARMY's phone to film himself with it during the concert."], fr: ["<b>Jungkook</b> a récupéré le téléphone d'une ARMY au premier rang pour se filmer avec pendant le concert."], es: ["<b>Jungkook</b> tomó el teléfono de una ARMY en primera fila para grabarse con él durante el concierto."], it: ["<b>Jungkook</b> ha preso il telefono di una ARMY in prima fila per filmarsi durante il concerto."], pt: ["<b>Jungkook</b> pegou o celular de uma ARMY da primeira fila para se filmar com ele durante o show."], ko: ["<b>정국</b>은 맨 앞줄 아미의 휴대폰을 가져가 공연 중 직접 자신을 촬영했다."], ja: ["<b>ジョングク</b>は最前列のARMYのスマホを受け取り、コンサート中に自分で撮影した。"], zh: ["<b>Jungkook</b>拿起前排一位ARMY的手机，在演唱会中自拍了一段视频。"] } }
          ] },
        { id: 'london',      city: 'London',        country: 'UK',          venue: 'Tottenham Hotspur Stadium',  lat: 51.6043,  lng: -0.0668,   showDates: ['2026-07-06', '2026-07-07'],
          nights: [
              { dates: ['2026-07-06'], surpriseSongs: ['Life Goes On', 'Dionysus'], highlights: { en: ["<b>J-Hope</b> launched into an absolutely epic freestyle dance in the London rain."], fr: ["<b>J-Hope</b> s'est lancé dans un freestyle de danse absolument dantesque sous la pluie londonienne."], es: ["<b>J-Hope</b> se lanzó a un freestyle de baile absolutamente descomunal bajo la lluvia londinense."], it: ["<b>J-Hope</b> si è lanciato in un freestyle di ballo assolutamente epico sotto la pioggia londinese."], pt: ["<b>J-Hope</b> se lançou em um freestyle de dança absolutamente épico sob a chuva londrina."], ko: ["<b>제이홉</b>은 런던의 빗속에서 그야말로 압도적인 프리스타일 댄스를 선보였다."], ja: ["<b>J-Hope</b>はロンドンの雨の中、まさに圧巻のフリースタイルダンスを繰り広げた。"], zh: ["<b>J-Hope</b>在伦敦的雨中即兴跳了一段极其震撼的freestyle舞蹈。"] } },
              { dates: ['2026-07-07'], highlights: { en: ["A classic moment: OT7 warmly thanked Europe for its loyalty."], fr: ["Séance classique : OT7 a chaleureusement remercié l'Europe pour sa loyauté."], es: ["Un momento clásico: OT7 agradeció calurosamente a Europa por su lealtad."], it: ["Un momento classico: gli OT7 hanno ringraziato calorosamente l'Europa per la sua fedeltà."], pt: ["Um momento clássico: OT7 agradeceu calorosamente à Europa por sua lealdade."], ko: ["클래식한 순간: OT7은 유럽 팬들의 변함없는 사랑에 따뜻한 감사를 전했다."], ja: ["定番の瞬間：OT7はヨーロッパの変わらぬ愛に温かく感謝を伝えた。"], zh: ["经典时刻：OT7全员向欧洲粉丝的忠诚支持表达了温暖的感谢。"] } }
          ] },
        { id: 'munich',      city: 'Munich',        country: 'Germany',     venue: 'Allianz Arena',              lat: 48.2188,  lng: 11.6247,   showDates: ['2026-07-11', '2026-07-12'],
          nights: [
              { dates: ['2026-07-11'], surpriseSongs: ['뱁새 (Silver Spoon)', 'Pied Piper'] },
              { dates: ['2026-07-12'], surpriseSongs: ['Louder than Bombs', '피 땀 눈물 (Blood Sweat & Tears)'], highlights: { en: ["Performing Louder than Bombs live was a huge fan request: the arena shook from how loud the fans were screaming."], fr: ["Chanter Louder than Bombs en live était une immense demande des fans : l'arène a tremblé tellement les fans criaient."], es: ["Interpretar Louder than Bombs en directo era una gran petición de los fans: la arena tembló de lo fuerte que gritaban los fans."], it: ["Cantare Louder than Bombs dal vivo era una grande richiesta dei fan: l'arena ha tremato per quanto i fan urlavano."], pt: ["Cantar Louder than Bombs ao vivo era um grande pedido dos fãs: a arena tremeu de tão alto que os fãs gritavam."], ko: ["Louder than Bombs 라이브는 팬들의 오랜 요청이었고, 팬들의 함성이 얼마나 컸던지 경기장이 흔들릴 정도였다."], ja: ["Louder than Bombsのライブ披露はファンの強い要望だった。ファンの歓声があまりに大きく、会場が揺れるほどだった。"], zh: ["现场演唱《Louder than Bombs》是粉丝们一直以来的强烈心愿：全场尖叫声之大，甚至让场馆都为之震动。"] } }
          ] },
        { id: 'paris',       city: 'Paris',         country: 'France',      venue: 'Stade de France',            lat: 48.9244,  lng: 2.3601,    showDates: ['2026-07-17', '2026-07-18'],
          nights: [
              { dates: ['2026-07-17'], surpriseSongs: ['작은 것들을 위한 시 (Boy with Luv)', 'Jump'], highlights: { en: ["During the closing bows, <b>Jimin</b> took off his tour t-shirt (the famous white Layered t-shirt from the Arirang edition) and handed it directly to a young child on their father's shoulders in the pit, creating a moment that went viral worldwide."], fr: ["Lors des salutations finales, <b>Jimin</b> a retiré son t-shirt de la tournée (le fameux t-shirt blanc Layered de l'édition Arirang) et l'a donné directement à un jeune enfant sur les épaules de son père dans la fosse, créant un moment viral mondial."], es: ["Durante los saludos finales, <b>Jimin</b> se quitó su camiseta de la gira (la famosa camiseta blanca Layered de la edición Arirang) y se la entregó directamente a un niño pequeño subido a los hombros de su padre en el foso, creando un momento viral a nivel mundial."], it: ["Durante i saluti finali, <b>Jimin</b> si è tolto la maglietta del tour (la famosa maglietta bianca Layered dell'edizione Arirang) e l'ha data direttamente a un bambino sulle spalle del padre nel parterre, creando un momento diventato virale in tutto il mondo."], pt: ["Durante as reverências finais, <b>Jimin</b> tirou sua camiseta da turnê (a famosa camiseta branca Layered da edição Arirang) e a entregou diretamente a uma criança nos ombros do pai na pista, criando um momento que viralizou no mundo todo."], ko: ["마지막 인사 시간에 <b>지민</b>은 투어 티셔츠(아리랑 에디션의 그 유명한 화이트 레이어드 티셔츠)를 벗어 스탠딩석에서 아버지 어깨 위에 있던 어린아이에게 직접 건네주었고, 이는 전 세계적으로 화제가 된 순간이 되었다."], ja: ["最後の挨拶の際、<b>ジミン</b>はツアーTシャツ(アリラン・エディションの有名な白いレイヤードTシャツ)を脱ぎ、スタンディングエリアで父親の肩の上にいた小さな子どもに直接手渡し、世界的に話題となる瞬間を作り出した。"], zh: ["在最后的谢幕环节，<b>Jimin</b>脱下了他的巡演T恤（Arirang版本那件著名的白色叠层T恤），直接送给了内场一位坐在父亲肩膀上的小朋友，这一幕在全球引发轰动。"] } },
              { dates: ['2026-07-18'], surpriseSongs: ['So What', 'We Are Bulletproof: The Eternal'], highlights: { en: ["A monumental project from the French crowd at Stade de France, lighting up the stands in the colors of France and then in solid purple. <b>Jungkook</b> once again shed a few tears during the closing speech."], fr: ["Projet monumental du public français au Stade de France, qui a illuminé les gradins aux couleurs de la France puis en violet intégral. <b>Jungkook</b> a de nouveau lâché quelques larmes lors du discours final."], es: ["Un proyecto monumental del público francés en el Stade de France, que iluminó las gradas con los colores de Francia y luego en violeta total. <b>Jungkook</b> volvió a derramar algunas lágrimas durante el discurso final."], it: ["Un progetto monumentale del pubblico francese allo Stade de France, che ha illuminato le tribune con i colori della Francia e poi tutto in viola. <b>Jungkook</b> ha di nuovo versato qualche lacrima durante il discorso finale."], pt: ["Um projeto monumental do público francês no Stade de France, que iluminou as arquibancadas com as cores da França e depois em roxo total. <b>Jungkook</b> mais uma vez derramou algumas lágrimas durante o discurso final."], ko: ["스타드 드 프랑스에서 프랑스 관객들이 준비한 대규모 프로젝트: 관중석을 프랑스 국기 색으로, 이어서 보라색으로 물들였다. <b>정국</b>은 마지막 인사말에서 또다시 눈물을 보였다."], ja: ["スタッド・ド・フランスでフランスの観客が行った壮大なプロジェクト：客席をフランス国旗の色に、続いて紫一色に染め上げた。<b>ジョングク</b>は最後の挨拶で再び涙を見せた。"], zh: ["法国观众在法兰西大球场组织了一场盛大的应援：先将看台点亮成法国国旗的颜色，随后又变为一片紫色。<b>Jungkook</b>在最后致辞时再次落泪。"] } }
          ] },
        { id: 'newyork',     city: 'East Rutherford (New York)', country: 'USA', venue: 'MetLife Stadium',       lat: 40.8135,  lng: -74.0745,  showDates: ['2026-08-01', '2026-08-02'],
          nights: [
              { dates: ['2026-08-01'], surpriseSongs: ['병 (Dis-ease)', 'Run'] },
              { dates: ['2026-08-02'], surpriseSongs: ['고엽 (Autumn Leaves)', '고민보다 Go (Go Go)'] }
          ] },
        { id: 'foxborough',  city: 'Foxborough (Boston)', country: 'USA',   venue: 'Gillette Stadium',           lat: 42.0909,  lng: -71.2643,  showDates: ['2026-08-05', '2026-08-06'],
          nights: [
              { dates: ['2026-08-05'], surpriseSongs: ['낙원 (Paradise)', 'No More Dream'] },
              { dates: ['2026-08-06'], surpriseSongs: ['Make It Right', 'N.O'], highlights: { en: ["<b>Jin</b> made a legendary joke about \"Boston lobsters\" before miming a lobster on stage for 3 minutes."], fr: ["<b>Jin</b> a fait une blague légendaire sur les \"homards de Boston\" avant de mimer un homard pendant 3 minutes sur scène."], es: ["<b>Jin</b> hizo una broma legendaria sobre las \"langostas de Boston\" antes de imitar a una langosta durante 3 minutos en el escenario."], it: ["<b>Jin</b> ha fatto una battuta leggendaria sulle \"aragoste di Boston\" prima di imitare un'aragosta per 3 minuti sul palco."], pt: ["<b>Jin</b> fez uma piada lendária sobre as \"lagostas de Boston\" antes de imitar uma lagosta por 3 minutos no palco."], ko: ["<b>진</b>은 \"보스턴 랍스터\"에 대한 전설적인 농담을 던진 뒤, 무대 위에서 3분 동안 랍스터 흉내를 냈다."], ja: ["<b>ジン</b>は「ボストンのロブスター」についての伝説的なジョークを言った後、ステージ上で3分間ロブスターの真似をした。"], zh: ["<b>Jin</b>讲了一个关于\"波士顿龙虾\"的经典笑话，随后在舞台上模仿龙虾长达3分钟。"] } }
          ] },
        { id: 'baltimore',   city: 'Baltimore',     country: 'USA',         venue: 'M&T Bank Stadium',           lat: 39.2780,  lng: -76.6227,  showDates: ['2026-08-10', '2026-08-11'],
          nights: [
              { dates: ['2026-08-10'], surpriseSongs: ['잠시 (Telepathy)', '상남자 (Boy in Luv)'] },
              { dates: ['2026-08-11'], surpriseSongs: ['하루만 (Just One Day)', 'Best of Me'] }
          ] },
        { id: 'arlington',   city: 'Arlington (Dallas)', country: 'USA',    venue: 'AT&T Stadium',               lat: 32.7473,  lng: -97.0945,  showDates: ['2026-08-15', '2026-08-16'],
          nights: [
              { dates: ['2026-08-15'], surpriseSongs: ['Permission to Dance', '고민보다 Go (Go Go)'] },
              { dates: ['2026-08-16'], surpriseSongs: ['Butterfly', 'DNA'] }
          ] },
        { id: 'toronto',     city: 'Toronto',       country: 'Canada',      venue: 'Rogers Stadium',             lat: 43.6532,  lng: -79.3832,  showDates: ['2026-08-22', '2026-08-23'],
          nights: [
              { dates: ['2026-08-22'], surpriseSongs: ['Outro: Wings', '쩔어 (Dope)'] },
              { dates: ['2026-08-23'], surpriseSongs: ["00:00 (Zero O'Clock)", 'Outro: Tear'], highlights: { en: ["The Rap Line (<b>RM</b>, <b>Suga</b>, <b>J-Hope</b>) delivered such an intense performance of Outro: Tear that even the other members bowed to them from the sides of the stage."], fr: ["La Rap Line (<b>RM</b>, <b>Suga</b>, <b>J-Hope</b>) a offert une performance de Outro: Tear tellement intense que même les autres membres du groupe s'inclinaient devant eux sur les côtés de la scène."], es: ["La Rap Line (<b>RM</b>, <b>Suga</b>, <b>J-Hope</b>) ofreció una interpretación de Outro: Tear tan intensa que incluso los demás miembros se inclinaron ante ellos desde los laterales del escenario."], it: ["La Rap Line (<b>RM</b>, <b>Suga</b>, <b>J-Hope</b>) ha regalato un'esibizione di Outro: Tear così intensa che perfino gli altri membri si sono inchinati a loro dai lati del palco."], pt: ["A Rap Line (<b>RM</b>, <b>Suga</b>, <b>J-Hope</b>) entregou uma performance de Outro: Tear tão intensa que até os outros membros se curvaram para eles das laterais do palco."], ko: ["랩 라인(<b>RM</b>, <b>슈가</b>, <b>제이홉</b>)은 Outro: Tear 무대를 매우 강렬하게 선보여, 다른 멤버들조차 무대 옆에서 그들에게 고개 숙여 인사할 정도였다."], ja: ["ラップライン(<b>RM</b>、<b>シュガ</b>、<b>J-Hope</b>)は「Outro: Tear」を非常に強烈に披露し、他のメンバーたちもステージの脇から彼らにお辞儀をするほどだった。"], zh: ["Rap Line（<b>RM</b>、<b>Suga</b>、<b>J-Hope</b>）演绎的《Outro: Tear》气场极强，以至于其他成员都在舞台两侧向他们鞠躬致意。"] } }
          ] },
        { id: 'chicago',     city: 'Chicago',       country: 'USA',         venue: 'Soldier Field',              lat: 41.8623,  lng: -87.6167,  showDates: ['2026-08-27', '2026-08-28'],
          nights: [
              { dates: ['2026-08-27'], surpriseSongs: ['Tomorrow', '힙합성애자 (Hip Hop Phile)'] },
              { dates: ['2026-08-28'], surpriseSongs: ['134340', '소우주 (Mikrokosmos)'], highlights: { en: ["During Mikrokosmos, a light rain began to fall over the open-air stadium, making the atmosphere magical and deeply poetic."], fr: ["Pendant Mikrokosmos, une pluie fine a commencé à tomber sur le stade ouvert, rendant l'atmosphère magique et très poétique."], es: ["Durante Mikrokosmos, comenzó a caer una lluvia fina sobre el estadio al aire libre, creando una atmósfera mágica y muy poética."], it: ["Durante Mikrokosmos, una pioggerellina ha iniziato a cadere sullo stadio all'aperto, rendendo l'atmosfera magica e molto poetica."], pt: ["Durante Mikrokosmos, uma chuva fina começou a cair sobre o estádio a céu aberto, tornando a atmosfera mágica e muito poética."], ko: ["Mikrokosmos가 흐르는 동안 개방형 경기장 위로 가랑비가 내리기 시작해, 마법 같고 매우 시적인 분위기를 자아냈다."], ja: ["Mikrokosmosが流れている間、屋外スタジアムに小雨が降り始め、幻想的でとても詩的な雰囲気を作り出した。"], zh: ["在演唱《Mikrokosmos》期间，露天体育场开始下起细雨，营造出如梦似幻、诗意十足的氛围。"] } }
          ] },
        { id: 'la',          city: 'Los Angeles',   country: 'USA',         venue: 'SoFi Stadium',               lat: 33.9535,  lng: -118.3392, showDates: ['2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06'],
          nights: [
              { dates: ['2026-09-01'], surpriseSongs: ['상남자 (Boy in Luv)', 'Magic Shop'] },
              { dates: ['2026-09-02'], surpriseSongs: ['Love Maze', '뱁새 (Silver Spoon)'] }
              /* 2026-09-05: surprise songs not yet reported by sourced outlets — add once verified, do not invent */
          ] },
        { id: 'bogota',      city: 'Bogota',        country: 'Colombia',    venue: 'Estadio El Campín',          lat: 4.6486,   lng: -74.0925,  showDates: ['2026-10-02', '2026-10-03'] },
        { id: 'lima',        city: 'Lima',          country: 'Peru',        venue: 'Estadio San Marcos',         lat: -12.0578, lng: -77.0839,  showDates: ['2026-10-07', '2026-10-09', '2026-10-10'] },
        { id: 'santiago',    city: 'Santiago',      country: 'Chile',       venue: 'Estadio Nacional',           lat: -33.4642, lng: -70.6072,  showDates: ['2026-10-14', '2026-10-16', '2026-10-17'] },
        { id: 'buenosaires', city: 'Buenos Aires',  country: 'Argentina',   venue: 'Estadio Único de La Plata',  lat: -34.9432, lng: -57.9598,  showDates: ['2026-10-21', '2026-10-23', '2026-10-24'] },
        { id: 'saopaulo',    city: 'São Paulo',     country: 'Brazil',      venue: 'Estádio do Morumbis',        lat: -23.6000, lng: -46.7167,  showDates: ['2026-10-28', '2026-10-30', '2026-10-31'] },
        { id: 'kaohsiung',   city: 'Kaohsiung',     country: 'Taiwan',      venue: 'Kaohsiung National Stadium', lat: 22.7469,  lng: 120.2966,  showDates: ['2026-11-19', '2026-11-21', '2026-11-22'] },
        { id: 'bangkok',     city: 'Bangkok',       country: 'Thailand',    venue: '',                           lat: 13.7563,  lng: 100.5018,  showDates: ['2026-12-03', '2026-12-05', '2026-12-06'] },
        { id: 'kualalumpur', city: 'Kuala Lumpur',  country: 'Malaysia',    venue: '',                           lat: 3.1390,   lng: 101.6869,  showDates: ['2026-12-12', '2026-12-13'] },
        { id: 'singapore',   city: 'Singapore',     country: 'Singapore',   venue: '',                           lat: 1.3521,   lng: 103.8198,  showDates: ['2026-12-19', '2026-12-20'] },
        { id: 'jakarta',     city: 'Jakarta',       country: 'Indonesia',   venue: '',                           lat: -6.2088,  lng: 106.8456,  showDates: ['2026-12-26', '2026-12-27'] },
        { id: 'melbourne',   city: 'Melbourne',     country: 'Australia',   venue: '',                           lat: -37.8136, lng: 144.9631,  showDates: ['2027-02-12', '2027-02-13'] },
        { id: 'sydney',      city: 'Sydney',        country: 'Australia',   venue: '',                           lat: -33.8688, lng: 151.2093,  showDates: ['2027-02-20', '2027-02-21'] },
        { id: 'hongkong',    city: 'Hong Kong',     country: 'Hong Kong',   venue: '',                           lat: 22.3193,  lng: 114.1694,  showDates: ['2027-03-06', '2027-03-07'] },
        { id: 'manila',      city: 'Manila',        country: 'Philippines', venue: 'Philippine Arena',           lat: 14.6939,  lng: 120.9483,  showDates: ['2027-03-13', '2027-03-14'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

// Deux tournées manquaient encore ici (demande du 11/09/2026 : "colore toutes les dates
// où BTS ont eu de l'activité depuis leur début en 2013") — les toutes premières, avant
// Wings ci-dessous. Dates vérifiées par recherche web (Wikipedia/Billboard/btssetlist.com
// via WebSearch, sources listées dans le message envoyé à l'utilisateur), pas transmises
// par toi comme les tournées suivantes — à corriger si une date s'avère inexacte.
const RED_BULLET_TOUR_2014 = {
    id: 'redbullet2014',
    tourName: "BTS Live Trilogy Episode II: The Red Bullet",
    group: "BTS",
    stops: [
        { id: 'rb14-seoul',   city: 'Seoul',         country: 'South Korea', venue: 'Olympic Hall',        lat: 37.5219, lng: 126.9312,  showDates: ['2014-10-17', '2014-10-18', '2014-10-19'] },
        { id: 'rb14-kobe',    city: 'Kobe',          country: 'Japan',       venue: 'Kobe',                 lat: 34.6901, lng: 135.1955,  showDates: ['2014-11-13', '2014-11-14'] },
        { id: 'rb14-tokyo',   city: 'Tokyo',         country: 'Japan',       venue: 'Tokyo',                lat: 35.6762, lng: 139.6503,  showDates: ['2014-11-16'] },
        { id: 'rb14-manila',  city: 'Manila',        country: 'Philippines', venue: 'Manila',               lat: 14.5995, lng: 120.9842,  showDates: ['2014-12-07'] },
        { id: 'rb14-sg',      city: 'Singapore',     country: 'Singapore',   venue: 'Singapore',            lat: 1.3521,  lng: 103.8198,  showDates: ['2014-12-13'] },
        { id: 'rb15-bangkok', city: 'Bangkok',       country: 'Thailand',    venue: 'Bangkok',              lat: 13.7563, lng: 100.5018,  showDates: ['2014-12-20'] },
        { id: 'rb15-kl',      city: 'Kuala Lumpur',  country: 'Malaysia',    venue: 'Mega Star Arena',      lat: 3.1390,  lng: 101.6869,  showDates: ['2015-06-06'] },
        { id: 'rb15-sydney',  city: 'Sydney',        country: 'Australia',   venue: 'Roundhouse',           lat: -33.8688, lng: 151.2093, showDates: ['2015-07-10'] },
        { id: 'rb15-melb',    city: 'Melbourne',     country: 'Australia',   venue: 'Plenary 1',            lat: -37.8136, lng: 144.9631, showDates: ['2015-07-12'] },
        { id: 'rb15-ny',      city: 'New York',      country: 'USA',        venue: 'Best Buy Theater',      lat: 40.7580, lng: -73.9855,  showDates: ['2015-07-16'] },
        { id: 'rb15-dallas',  city: 'Dallas',        country: 'USA',        venue: 'Verizon Theatre at Grand Prairie', lat: 32.7767, lng: -96.7970, showDates: ['2015-07-18'] },
        { id: 'rb15-chicago', city: 'Chicago',       country: 'USA',        venue: 'Rosemont Theatre',      lat: 41.8781, lng: -87.6298,  showDates: ['2015-07-24'] },
        { id: 'rb15-la',      city: 'Los Angeles',   country: 'USA',        venue: 'Club Nokia',            lat: 34.0522, lng: -118.2437, showDates: ['2015-07-26'] },
        { id: 'rb15-mexico',  city: 'Mexico City',   country: 'Mexico',     venue: 'Pabellon Oeste',        lat: 19.4326, lng: -99.1332,  showDates: ['2015-07-29'] },
        { id: 'rb15-saopaulo',city: 'São Paulo',     country: 'Brazil',     venue: 'Espaço das Américas',   lat: -23.5990, lng: -46.6910,  showDates: ['2015-07-31'] },
        { id: 'rb15-santiago',city: 'Santiago',      country: 'Chile',      venue: 'Movistar Arena',        lat: -33.4672, lng: -70.6323,  showDates: ['2015-08-02'] },
        { id: 'rb15-hk',      city: 'Hong Kong',     country: 'Hong Kong',  venue: 'AsiaWorld-Arena',       lat: 22.3213, lng: 113.9412,  showDates: ['2015-08-29'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

const MOTS_ON_STAGE_TOUR_2015 = {
    id: 'mots2015',
    tourName: "BTS Live The Most Beautiful Moment in Life On Stage",
    group: "BTS",
    stops: [
        { id: 'mots15-seoul',    city: 'Seoul',    country: 'South Korea', venue: 'SK Olympic Handball Gymnasium', lat: 37.5219, lng: 126.9312, showDates: ['2015-11-27', '2015-11-28', '2015-11-29'] },
        { id: 'mots15-yokohama', city: 'Yokohama', country: 'Japan',       venue: 'Yokohama Arena',                lat: 35.5085, lng: 139.6175, showDates: ['2015-12-08', '2015-12-09'] },
        // Concerts de Kobe reportés du 27-28/12/2015 au 22-23/03/2016 (annulation pour raisons médicales).
        { id: 'mots16-kobe',     city: 'Kobe',     country: 'Japan',       venue: 'Kobe World Memorial Hall',      lat: 34.6901, lng: 135.1955, showDates: ['2016-03-22', '2016-03-23'] },
        // Extension "Epilogue" : dates de début/fin confirmées, tournée complète (9 villes) non détaillée ici.
        { id: 'mots16-epi-seoul', city: 'Seoul', country: 'South Korea', venue: 'Epilogue — début de tournée', lat: 37.5219, lng: 126.9312, showDates: ['2016-05-07'] },
        { id: 'mots16-epi-tokyo', city: 'Tokyo', country: 'Japan',       venue: 'Epilogue — fin de tournée',   lat: 35.6762, lng: 139.6503, showDates: ['2016-08-14'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

// Tournées historiques, transmises directement par toi le 30/08/2026. Entièrement
// terminées (toujours "Terminé" dans le Mode Tournée), consultables via le sélecteur
// pour le plaisir de parcourir le parcours du groupe — jamais prises en compte pour le
// badge "en direct" (voir LIVE_TOUR_ID). Mêmes coordonnées que les nouvelles entrées
// ajoutées à celebLocations pour ces mêmes salles.
const WINGS_TOUR_2017 = {
    id: 'wings2017',
    tourName: "BTS Live Trilogy Episode III: The Wings Tour",
    group: "BTS",
    stops: [
        { id: 'w17-seoul1',    city: 'Seoul',        country: 'South Korea', venue: 'Gocheok Sky Dome',                     lat: 37.4986,  lng: 126.8672,  showDates: ['2017-02-18', '2017-02-19'] },
        { id: 'w17-santiago',  city: 'Santiago',     country: 'Chile',       venue: 'Movistar Arena',                       lat: -33.4672, lng: -70.6323,  showDates: ['2017-03-11', '2017-03-12'] },
        { id: 'w17-saopaulo',  city: 'São Paulo',    country: 'Brazil',      venue: 'Citibank Hall',                        lat: -23.5990, lng: -46.6910,  showDates: ['2017-03-19', '2017-03-20'] },
        { id: 'w17-newark',    city: 'Newark',       country: 'USA',         venue: 'Prudential Center',                    lat: 40.7336,  lng: -74.1710,  showDates: ['2017-03-23', '2017-03-24'] },
        { id: 'w17-chicago',   city: 'Chicago',      country: 'USA',         venue: 'Allstate Arena',                       lat: 42.0362,  lng: -87.8845,  showDates: ['2017-03-29'] },
        { id: 'w17-anaheim',   city: 'Anaheim',      country: 'USA',         venue: 'Honda Center',                         lat: 33.8078,  lng: -117.8766, showDates: ['2017-04-01', '2017-04-02'] },
        { id: 'w17-bangkok',   city: 'Bangkok',      country: 'Thailand',    venue: 'Bangkok Indoor Stadium',               lat: 13.8083,  lng: 100.6144,  showDates: ['2017-04-22', '2017-04-23'] },
        { id: 'w17-jakarta',   city: 'Jakarta',      country: 'Indonesia',   venue: 'ICE BSD City',                         lat: -6.3021,  lng: 106.6528,  showDates: ['2017-04-29'] },
        { id: 'w17-manila',    city: 'Manila',       country: 'Philippines', venue: 'Mall of Asia Arena',                   lat: 14.5352,  lng: 120.9822,  showDates: ['2017-05-06', '2017-05-07'] },
        { id: 'w17-hongkong',  city: 'Hong Kong',    country: 'Hong Kong',   venue: 'AsiaWorld-Expo',                       lat: 22.3213,  lng: 113.9412,  showDates: ['2017-05-13', '2017-05-14'] },
        { id: 'w17-sydney',    city: 'Sydney',       country: 'Australia',   venue: 'Qudos Bank Arena',                     lat: -33.8474, lng: 151.0631,  showDates: ['2017-05-26'] },
        { id: 'w17-osaka1',    city: 'Osaka',        country: 'Japan',       venue: 'Osaka-jo Hall',                        lat: 34.6873,  lng: 135.5262,  showDates: ['2017-05-30', '2017-05-31', '2017-06-01'] },
        { id: 'w17-hiroshima', city: 'Hiroshima',    country: 'Japan',       venue: 'Hiroshima Green Arena',                lat: 34.3971,  lng: 132.4652,  showDates: ['2017-06-07'] },
        { id: 'w17-nagoya',    city: 'Nagoya',       country: 'Japan',       venue: 'Nippon Gaishi Hall',                   lat: 35.1256,  lng: 136.9686,  showDates: ['2017-06-14', '2017-06-15'] },
        { id: 'w17-saitama',   city: 'Saitama',      country: 'Japan',       venue: 'Saitama Super Arena',                  lat: 35.8969,  lng: 139.6303,  showDates: ['2017-06-20', '2017-06-21', '2017-06-22'] },
        { id: 'w17-fukuoka',   city: 'Fukuoka',      country: 'Japan',       venue: 'Marine Messe Fukuoka',                 lat: 33.6489,  lng: 130.3739,  showDates: ['2017-06-24', '2017-06-25'] },
        { id: 'w17-sapporo',   city: 'Sapporo',      country: 'Japan',       venue: 'Makomanai Sekisui Heim Ice Arena',     lat: 43.0089,  lng: 141.3489,  showDates: ['2017-07-01', '2017-07-02'] },
        { id: 'w17-osaka2',    city: 'Osaka',        country: 'Japan',       venue: 'Kyocera Dome',                         lat: 34.6688,  lng: 135.4744,  showDates: ['2017-10-14', '2017-10-15'] },
        { id: 'w17-taoyuan',   city: 'Taoyuan',      country: 'Taiwan',      venue: 'Taoyuan International Baseball Stadium', lat: 24.9903, lng: 121.3010, showDates: ['2017-10-21', '2017-10-22'] },
        { id: 'w17-macau',     city: 'Macau',        country: 'Macau',       venue: 'Cotai Arena',                          lat: 22.1470,  lng: 113.5533,  showDates: ['2017-11-04'] },
        { id: 'w17-seoul2',    city: 'Seoul',        country: 'South Korea', venue: 'Gocheok Sky Dome (The Final)',         lat: 37.4986,  lng: 126.8672,  showDates: ['2017-12-08', '2017-12-09', '2017-12-10'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

const LOVE_YOURSELF_TOUR_2018 = {
    id: 'ly2018',
    tourName: "BTS World Tour: Love Yourself",
    group: "BTS",
    stops: [
        { id: 'ly18-seoul',     city: 'Seoul',        country: 'South Korea', venue: 'Seoul Olympic Stadium',       lat: 37.5153,  lng: 127.0730,  showDates: ['2018-08-25', '2018-08-26'] },
        { id: 'ly18-la',        city: 'Los Angeles',  country: 'USA',         venue: 'Staples Center (Crypto.com Arena)', lat: 34.0430, lng: -118.2673, showDates: ['2018-09-05', '2018-09-06', '2018-09-08', '2018-09-09'] },
        { id: 'ly18-oakland',   city: 'Oakland',      country: 'USA',         venue: 'Oracle Arena',                lat: 37.7503,  lng: -122.2030, showDates: ['2018-09-12'] },
        { id: 'ly18-fortworth', city: 'Fort Worth',   country: 'USA',         venue: 'Fort Worth Convention Center', lat: 32.7521, lng: -97.3277,  showDates: ['2018-09-15', '2018-09-16'] },
        { id: 'ly18-hamilton',  city: 'Hamilton',     country: 'Canada',      venue: 'FirstOntario Centre',          lat: 43.2586,  lng: -79.8712,  showDates: ['2018-09-20', '2018-09-22', '2018-09-23'] },
        { id: 'ly18-newark',    city: 'Newark',       country: 'USA',         venue: 'Prudential Center',            lat: 40.7336,  lng: -74.1710,  showDates: ['2018-09-28', '2018-09-29'] },
        { id: 'ly18-chicago',   city: 'Chicago',      country: 'USA',         venue: 'United Center',                lat: 41.8807,  lng: -87.6742,  showDates: ['2018-10-02', '2018-10-03'] },
        { id: 'ly18-newyork',   city: 'New York',     country: 'USA',         venue: 'Citi Field',                   lat: 40.7571,  lng: -73.8458,  showDates: ['2018-10-06'] },
        { id: 'ly18-london',    city: 'London',       country: 'UK',          venue: 'The O2 Arena',                 lat: 51.5033,  lng: 0.0032,     showDates: ['2018-10-09', '2018-10-10'] },
        { id: 'ly18-amsterdam', city: 'Amsterdam',    country: 'Netherlands', venue: 'Ziggo Dome',                   lat: 52.3132,  lng: 4.9382,     showDates: ['2018-10-13'] },
        { id: 'ly18-berlin',    city: 'Berlin',       country: 'Germany',     venue: 'Mercedes-Benz Arena',          lat: 52.5058,  lng: 13.4432,    showDates: ['2018-10-16', '2018-10-17'] },
        { id: 'ly18-paris',     city: 'Paris',        country: 'France',      venue: 'AccorHotels Arena',            lat: 48.8388,  lng: 2.3788,     showDates: ['2018-10-19', '2018-10-20'] },
        { id: 'ly18-tokyo',     city: 'Tokyo',        country: 'Japan',       venue: 'Tokyo Dome',                   lat: 35.7056,  lng: 139.7519,   showDates: ['2018-11-13', '2018-11-14'] },
        { id: 'ly18-osaka',     city: 'Osaka',        country: 'Japan',       venue: 'Kyocera Dome',                 lat: 34.6688,  lng: 135.4744,   showDates: ['2018-11-21', '2018-11-23', '2018-11-24'] },
        { id: 'ly18-taoyuan',   city: 'Taoyuan',      country: 'Taiwan',      venue: 'Taoyuan International Baseball Stadium', lat: 24.9903, lng: 121.3010, showDates: ['2018-12-08', '2018-12-09'] },
        { id: 'ly19-nagoya',    city: 'Nagoya',       country: 'Japan',       venue: 'Nagoya Dome',                  lat: 35.1855,  lng: 136.9457,   showDates: ['2019-01-12', '2019-01-13'] },
        { id: 'ly19-singapore', city: 'Singapore',    country: 'Singapore',   venue: 'National Stadium',             lat: 1.3033,   lng: 103.8748,   showDates: ['2019-01-19'] },
        { id: 'ly19-fukuoka',   city: 'Fukuoka',      country: 'Japan',       venue: 'Fukuoka Yahuoku! Dome',        lat: 33.5954,  lng: 130.3618,   showDates: ['2019-02-16', '2019-02-17'] },
        { id: 'ly19-hongkong',  city: 'Hong Kong',    country: 'Hong Kong',   venue: 'AsiaWorld-Expo Arena',         lat: 22.3213,  lng: 113.9412,   showDates: ['2019-03-20', '2019-03-21', '2019-03-23', '2019-03-24'] },
        { id: 'ly19-bangkok',   city: 'Bangkok',      country: 'Thailand',    venue: 'Rajamangala National Stadium', lat: 13.7563,  lng: 100.6242,   showDates: ['2019-04-06', '2019-04-07'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

const SPEAK_YOURSELF_TOUR_2019 = {
    id: 'lysy2019',
    tourName: "BTS World Tour Love Yourself: Speak Yourself",
    group: "BTS",
    stops: [
        { id: 'sy19-la',       city: 'Los Angeles (Pasadena)', country: 'USA', venue: 'Rose Bowl Stadium',   lat: 34.1613,  lng: -118.1676, showDates: ['2019-05-04', '2019-05-05'] },
        { id: 'sy19-chicago',  city: 'Chicago',      country: 'USA',         venue: 'Soldier Field',                lat: 41.8623,  lng: -87.6167,  showDates: ['2019-05-11', '2019-05-12'] },
        { id: 'sy19-newark',   city: 'East Rutherford', country: 'USA',      venue: 'MetLife Stadium',              lat: 40.8135,  lng: -74.0745,  showDates: ['2019-05-18', '2019-05-19'] },
        { id: 'sy19-saopaulo', city: 'São Paulo',    country: 'Brazil',      venue: 'Allianz Parque',               lat: -23.5273, lng: -46.6780,  showDates: ['2019-05-25', '2019-05-26'] },
        { id: 'sy19-london',   city: 'London',       country: 'UK',          venue: 'Wembley Stadium',              lat: 51.5560,  lng: -0.2795,   showDates: ['2019-06-01', '2019-06-02'] },
        { id: 'sy19-paris',    city: 'Paris',        country: 'France',      venue: 'Stade de France',              lat: 48.9244,  lng: 2.3601,     showDates: ['2019-06-07', '2019-06-08'] },
        { id: 'sy19-osaka',    city: 'Osaka',        country: 'Japan',       venue: 'Yanmar Stadium Nagai',         lat: 34.6117,  lng: 135.5188,   showDates: ['2019-07-06', '2019-07-07'] },
        { id: 'sy19-shizuoka', city: 'Shizuoka',     country: 'Japan',       venue: 'Shizuoka Stadium Ecopa',       lat: 34.8161,  lng: 137.9433,   showDates: ['2019-07-13', '2019-07-14'] },
        { id: 'sy19-riyadh',   city: 'Riyadh',       country: 'Saudi Arabia', venue: 'King Fahd International Stadium', lat: 24.7136, lng: 46.7208, showDates: ['2019-10-11'] },
        { id: 'sy19-seoul',    city: 'Seoul',        country: 'South Korea', venue: 'Seoul Olympic Stadium (The Final)', lat: 37.5153, lng: 127.0730, showDates: ['2019-10-26', '2019-10-27', '2019-10-29'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

const PTD_TOUR_2021 = {
    id: 'ptd2021',
    tourName: "Permission to Dance on Stage",
    group: "BTS",
    stops: [
        { id: 'ptd21-virtual', city: 'Seoul', country: 'South Korea', venue: 'Seoul Olympic Stadium (Concert virtuel / Weverse)', lat: 37.5153, lng: 127.0730, showDates: ['2021-10-24'] },
        { id: 'ptd21-la',    city: 'Los Angeles',  country: 'USA',         venue: 'SoFi Stadium',          lat: 33.9535, lng: -118.3392, showDates: ['2021-11-27', '2021-11-28', '2021-12-01', '2021-12-02'] },
        { id: 'ptd22-seoul', city: 'Seoul',        country: 'South Korea', venue: 'Seoul Olympic Stadium', lat: 37.5153, lng: 127.0730,  showDates: ['2022-03-10', '2022-03-12', '2022-03-13'] },
        { id: 'ptd22-vegas', city: 'Las Vegas',    country: 'USA',         venue: 'Allegiant Stadium',     lat: 36.0908, lng: -115.1833, showDates: ['2022-04-08', '2022-04-09', '2022-04-15', '2022-04-16'] }
    ].map(s => Object.assign(s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }))
};

const ALL_TOURS = [ARIRANG_TOUR, RED_BULLET_TOUR_2014, MOTS_ON_STAGE_TOUR_2015, WINGS_TOUR_2017, LOVE_YOURSELF_TOUR_2018, SPEAK_YOURSELF_TOUR_2019, PTD_TOUR_2021];
const LIVE_TOUR_ID = 'arirang';
let selectedTourId = LIVE_TOUR_ID;
function getSelectedTour() { return ALL_TOURS.find(t => t.id === selectedTourId) || ALL_TOURS[0]; }
function getLiveTour() { return ALL_TOURS.find(t => t.id === LIVE_TOUR_ID) || ALL_TOURS[0]; }
Object.defineProperty(window, 'TOUR_MODE_DATA', { get() { return getSelectedTour(); }, configurable: true });

// Certains "live" ne sont pas liés à la tournée du groupe : un membre seul peut être en
// déplacement pour un événement (fashion week, festival, etc.) pendant que les autres ne
// le sont pas. Tableau volontairement VIDE : je n'ai aucune date réelle sourcée pour un
// événement solo en ce moment, et le site ne doit jamais afficher une actualité inventée.
// À compléter par toi au fil de l'actualité, même format que TOUR_MODE_DATA.stops mais
// avec un champ "member" et "eventName" à la place de "venue" :
// { id: 'ex', member: 'Jimin', eventName: 'Paris Fashion Week', city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, showDates: ['2026-XX-XX'] }
const MEMBER_EVENTS_DATA = [];

// Jalons hors-tournée (demande du 11/09/2026 : "colore toutes les dates où BTS ont eu de
// l'activité depuis leur début en 2013") — sorties d'albums/singles, cérémonies de
// récompenses, discours à l'ONU, concerts en ligne (ère pandémie), le concert gratuit de
// Busan, et le service militaire de chaque membre (dates d'incorporation/libération).
// Dates vérifiées par recherche web (Billboard, Wikipedia, Reuters/AP, WWD... sources
// listées dans le message envoyé à l'utilisateur), pas une liste exhaustive de CHAQUE jour
// d'activité en 12 ans (impossible à garantir sans une base de données dédiée) mais les
// jalons majeurs, publics et bien documentés. member=null pour les événements de groupe.
const BTS_MILESTONES_DATA = [
    { id: 'debut',        member: null,  eventName: 'Debut showcase — "2 Cool 4 Skool"',        city: 'Seoul',      country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2013-06-13'] },
    { id: 'bbma17',       member: null,  eventName: 'Billboard Music Awards — Top Social Artist', city: 'Las Vegas',  country: 'USA', lat: 36.0908, lng: -115.1833, showDates: ['2017-05-21'] },
    { id: 'bbma18',       member: null,  eventName: 'Billboard Music Awards — Top Social Artist', city: 'Las Vegas',  country: 'USA', lat: 36.0908, lng: -115.1833, showDates: ['2018-05-20'] },
    { id: 'un2018',       member: null,  eventName: 'UN General Assembly speech — Generation Unlimited', city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, showDates: ['2018-09-24'] },
    { id: 'bbma19',       member: null,  eventName: 'Billboard Music Awards — Top Duo/Group',    city: 'Las Vegas',  country: 'USA', lat: 36.0908, lng: -115.1833, showDates: ['2019-05-01'] },
    { id: 'dynamite',     member: null,  eventName: '"Dynamite" release',                        city: 'Seoul',      country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2020-08-21'] },
    { id: 'motsone',      member: null,  eventName: 'Map of the Soul ON:E — online concert',      city: 'Seoul',      country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2020-10-10', '2020-10-11'] },
    { id: 'butter',       member: null,  eventName: '"Butter" release',                           city: 'Seoul',      country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2021-05-21'] },
    { id: 'bbma21',       member: null,  eventName: 'Billboard Music Awards — performance',       city: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, showDates: ['2021-05-23'] },
    { id: 'grammy22',     member: null,  eventName: 'Grammy Awards — "Butter" performance',       city: 'Las Vegas',  country: 'USA', lat: 36.0908, lng: -115.1833, showDates: ['2022-04-03'] },
    { id: 'proof',        member: null,  eventName: '"Proof" album release',                      city: 'Seoul',      country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2022-06-10'] },
    { id: 'yettocome',    member: null,  eventName: '"Yet To Come in Busan" — free concert (World Expo bid)', city: 'Busan', country: 'South Korea', lat: 35.1796, lng: 129.0756, showDates: ['2022-10-15'] },
    { id: 'jimin-dior23', member: 'Jimin', eventName: 'Paris Fashion Week — Dior debut as ambassador', city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, showDates: ['2023-01-20'] },
    { id: 'suga-val23',   member: 'SUGA',  eventName: 'Paris Fashion Week — Valentino Haute Couture', city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, showDates: ['2023-01-25'] },
    { id: 'jin-enlist',   member: 'Jin',   eventName: 'Military service begins',  city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2022-12-13'] },
    { id: 'jhope-enlist', member: 'j-hope',eventName: 'Military service begins', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2023-04-18'] },
    { id: 'suga-enlist',  member: 'SUGA',  eventName: 'Military service begins (social service)', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2023-09-22'] },
    { id: 'rmv-enlist',   member: null,   eventName: 'RM & V — military service begins', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2023-12-11'] },
    { id: 'jjk-enlist',   member: null,   eventName: 'Jimin & Jungkook — military service begins', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2023-12-12'] },
    { id: 'jin-discharge',   member: 'Jin',   eventName: 'Military service completed', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2024-06-12'] },
    { id: 'jhope-discharge', member: 'j-hope',eventName: 'Military service completed', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2024-10-16'] },
    { id: 'rmv-discharge',   member: null,   eventName: 'RM & V — military service completed', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2025-06-10'] },
    { id: 'jjk-discharge',   member: null,   eventName: 'Jimin & Jungkook — military service completed', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2025-06-11'] },
    { id: 'suga-discharge',  member: 'SUGA', eventName: 'Military service completed', city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, showDates: ['2025-06-21'] }
];

// window.__tourModeNowOverride (chaîne ISO, ex: '2026-09-03') permet aux tests
// automatisés de simuler une autre date sans jamais toucher à Date() global ni aux
// données réelles ci-dessus — ignoré en production (jamais posé par le site lui-même).
function getTourNow() {
    return window.__tourModeNowOverride ? new Date(window.__tourModeNowOverride) : new Date();
}
function getTourStopStatus(stop, nowDate) {
    const now = nowDate.getTime();
    const start = new Date(stop.dateStart + 'T00:00:00').getTime();
    const end = new Date(stop.dateEnd + 'T23:59:59').getTime();
    if (now > end) return 'done';
    if (now >= start && now <= end) return 'current';
    return 'upcoming';
}
function getCurrentTourStop() {
    const now = getTourNow();
    return getLiveTour().stops.find(s => getTourStopStatus(s, now) === 'current') || null;
}
function getCurrentMemberEvent() {
    const now = getTourNow();
    return MEMBER_EVENTS_DATA.find(s => getTourStopStatus(Object.assign({}, s, { dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }), now) === 'current') || null;
}

// ==========================================
// PANNEAU "LIVE" (badge + timeline unifiée, filtrable par membre)
// ==========================================
// Réunit dans une seule liste chronologique les étapes de la tournée EN COURS (qui
// concernent tout le groupe — voir getLiveTour()) et les événements solo d'un membre
// (MEMBER_EVENTS_DATA, ex: Jimin à la Fashion Week de Paris pendant que les autres ne le
// sont pas). Séparé du panneau Mode Tournée existant (tour-mode.js), qui reste
// accessible tel quel pour l'historique complet des tournées passées.
const BTS_MEMBERS = [
    { id: 'RM', name: 'RM', color: '#D42759' },
    { id: 'Jin', name: 'Jin', color: '#8B5CF6' },
    { id: 'SUGA', name: 'SUGA', color: '#3b82f6' },
    { id: 'J-Hope', name: 'J-Hope', color: '#f59e0b' },
    { id: 'Jimin', name: 'Jimin', color: '#F06090' },
    { id: 'V', name: 'V', color: '#10b981' },
    { id: 'Jungkook', name: 'Jungkook', color: '#6366f1' }
];
let liveTimelineSelectedMember = 'all';

// ==========================================
// SÉLECTEUR "SWITCH ARTIST" (Mode Tournée + panneau Live)
// ==========================================
// Seul BTS a de vraies données de tournée/live pour l'instant (ALL_TOURS, BTS_MEMBERS,
// MEMBER_EVENTS_DATA) — politique du site : ne jamais inventer de dates pour un autre
// groupe. Choisir un autre groupe affiche donc un état honnête "pas encore de données"
// au lieu de tournées fictives, plutôt que de toucher aux fonctions de rendu existantes.
window.selectedTourLiveGroup = window.selectedTourLiveGroup || 'BTS';

function renderGroupSwitcherMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    // Lu au moment de l'appel (pas au chargement du script) car groupColors est déclaré
    // plus bas dans ce fichier — y accéder ici évite toute dépendance à l'ordre des const.
    const groups = Object.keys(groupColors);
    menu.innerHTML = groups.map(g =>
        `<div class="group-switcher-option${g === window.selectedTourLiveGroup ? ' active' : ''}" onclick="window.changeTourLiveGroup('${g}')">${g}</div>`
    ).join('');
}

window.toggleGroupSwitcher = function(menuId, event) {
    if (event) event.stopPropagation();
    ['group-switcher-menu-tour', 'group-switcher-menu-live'].forEach(id => {
        const m = document.getElementById(id);
        if (!m) return;
        if (id === menuId) { renderGroupSwitcherMenu(id); m.classList.toggle('hidden'); }
        else m.classList.add('hidden');
    });
};

document.addEventListener('click', () => {
    ['group-switcher-menu-tour', 'group-switcher-menu-live'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
    });
});

window.changeTourLiveGroup = function(group) {
    window.selectedTourLiveGroup = group;
    document.querySelectorAll('.group-switcher-current').forEach(el => { el.textContent = group; });
    ['group-switcher-menu-tour', 'group-switcher-menu-live'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
    });

    const livePanel = document.getElementById('live-panel');
    if (livePanel && !livePanel.classList.contains('hidden')) {
        renderLiveAvatars();
        renderLiveTimeline();
    }

    const tourOverlay = document.getElementById('tour-mode-empty-overlay');
    if (tourOverlay) {
        const isBTS = group === 'BTS';
        if (!isBTS) tourOverlay.textContent = t('groupNoDataYet').replace('{group}', group);
        tourOverlay.classList.toggle('hidden', isBTS);
    }
};

// `includePast` (demande du 11/09/2026, vue Calendrier) : par défaut (liste, badge Live),
// seuls les évènements pas encore terminés comptent — "Live & Upcoming" n'a pas vocation à
// lister l'historique. Le Calendrier fait exception : coloré aussi sur le passé pour garder
// une vue d'ensemble du mois, même une fois une date dépassée (voir renderLiveCalendar()).
function getLiveTimelineEntries(includePast) {
    if (window.selectedTourLiveGroup && window.selectedTourLiveGroup !== 'BTS') return [];
    const now = getTourNow();
    // Toutes les tournées (demande du 11/09/2026 : "colore toutes les dates où BTS ont eu
    // de l'activité depuis leur début en 2013"), pas seulement getLiveTour() (la tournée
    // EN COURS, arirang) comme avant — ce filtre ne servait qu'à Tour Mode/le badge "en
    // direct", jamais à distinguer "cette tournée a existé". Les tournées terminées ont de
    // toute façon status:'done', donc déjà exclues ailleurs par le filtre includePast
    // ci-dessous — aucun changement pour le badge Live / Tour Mode, seulement pour le
    // Calendrier (qui appelle avec includePast=true).
    const groupEntries = ALL_TOURS.flatMap(tour => tour.stops.map(s => ({
        kind: 'group', member: null, id: s.id,
        title: `${tour.tourName} — ${s.city}`,
        city: s.city, country: s.country, lat: s.lat, lng: s.lng,
        dateStart: s.dateStart, dateEnd: s.dateEnd, dates: s.showDates ? s.showDates.slice() : undefined,
        status: getTourStopStatus(s, now)
    })));
    const soloEntries = MEMBER_EVENTS_DATA.map(s => ({
        kind: 'solo', member: s.member, id: s.id,
        title: `${s.member} — ${s.eventName}`, eventName: s.eventName,
        city: s.city, country: s.country, lat: s.lat, lng: s.lng,
        dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1], dates: s.showDates.slice(),
        status: getTourStopStatus({ dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }, now)
    }));
    // Jalons hors-tournée (BTS_MILESTONES_DATA, voir plus haut) : sorties, récompenses,
    // discours, concerts en ligne, service militaire — même traitement que soloEntries.
    const milestoneEntries = BTS_MILESTONES_DATA.map(s => ({
        kind: s.member ? 'solo' : 'group', member: s.member || null, id: 'ms-' + s.id,
        title: s.member ? `${s.member} — ${s.eventName}` : `BTS — ${s.eventName}`, eventName: s.eventName,
        city: s.city, country: s.country, lat: s.lat, lng: s.lng,
        dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1], dates: s.showDates.slice(),
        status: getTourStopStatus({ dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }, now)
    }));
    // Évènements approuvés via l'onglet admin "Live & Upcoming" (demande du 11/09/2026) :
    // bulk-fetchés une seule fois par visite dans map.html (window.__liveEventsFromFirestore,
    // même principe que newLocations pour les lieux) — jamais republiés dans script.js/
    // MEMBER_EVENTS_DATA ci-dessus, voir liveEvents/{id} et approveLiveEventSubmission()
    // dans firebase-init.js. Pas de champ "dates" détaillé (schéma Firestore : seulement
    // dateStart/dateEnd) — renderLiveCalendar() retombe sur ces deux bornes pour celles-ci.
    const approvedEntries = (window.__liveEventsFromFirestore || []).map(s => ({
        kind: s.kind || 'solo', member: s.member || null, id: 'live-' + s.id,
        title: s.title || (s.member ? `${s.member} — ${s.eventName || ''}` : (s.eventName || '')),
        eventName: s.eventName || '',
        city: s.city, country: s.country, lat: s.lat, lng: s.lng,
        dateStart: s.dateStart, dateEnd: s.dateEnd || s.dateStart,
        status: getTourStopStatus({ dateStart: s.dateStart, dateEnd: s.dateEnd || s.dateStart }, now)
    }));
    return groupEntries.concat(soloEntries, milestoneEntries, approvedEntries)
        .filter(e => includePast || e.status !== 'done')
        .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
}

// Parmi plusieurs entrées "en direct" simultanées (demande du 06/09/2026, effet "paquet
// de cartes" sur le badge Live) : choisit celle la plus pertinente pour CET utilisateur —
// celle dont le membre a le plus de lieux dans sa wishlist. Une étape de tournée de groupe
// concerne tous les membres à la fois : lui donner la SOMME de tout le monde la ferait
// systématiquement gagner face à n'importe quel évènement solo (une somme dépasse presque
// toujours une seule part) — sa pertinence est donc plutôt le MEILLEUR score individuel
// (le membre que cet utilisateur préfère profite aussi de la tournée de groupe). À égalité,
// une entrée solo (un membre précis) l'emporte sur l'étape de groupe, plus spécifique à ce
// que l'utilisateur suit vraiment. Les autres entrées restent accessibles via le panneau
// Live complet, seul le badge résumé en haut de la carte met celle-ci en avant.
function getMostRelevantLiveEntry(entries) {
    if (!entries || entries.length === 0) return null;
    if (entries.length === 1) return entries[0];
    const wishlistLocs = getWishlistLocs().map(id => celebLocations.find(l => l.id === id)).filter(Boolean);
    const memberCounts = {};
    wishlistLocs.forEach(l => { if (l.member && l.member !== 'All') memberCounts[l.member] = (memberCounts[l.member] || 0) + 1; });
    const bestMemberCount = Object.keys(memberCounts).length ? Math.max(...Object.values(memberCounts)) : 0;
    const relevance = (entry) => entry.member ? (memberCounts[entry.member] || 0) : bestMemberCount;
    return entries.reduce((best, e) => {
        const eR = relevance(e), bR = relevance(best);
        if (eR > bR) return e;
        // À égalité, préférer l'entrée solo (plus spécifique) sur l'étape de groupe — mais
        // seulement quand cette égalité reflète un vrai signal (>0) : sans aucune donnée de
        // wishlist, tout est à égalité à 0 et il vaut mieux garder l'ordre neutre (le groupe
        // en tête, comme dans l'exemple de référence) plutôt qu'un choix solo arbitraire.
        if (eR === bR && eR > 0 && e.member && !best.member) return e;
        return best;
    }, entries[0]);
}

function fmtLiveDate(dateStart, dateEnd) {
    const locale = currentLang || 'en';
    const opts = { month: 'short', day: 'numeric' };
    const d1 = new Date(dateStart + 'T00:00:00');
    if (dateStart === dateEnd) return d1.toLocaleDateString(locale, opts);
    const d2 = new Date(dateEnd + 'T00:00:00');
    return `${d1.toLocaleDateString(locale, opts)} – ${d2.toLocaleDateString(locale, opts)}`;
}

function renderLiveAvatars() {
    const wrap = document.getElementById('live-panel-avatars');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (window.selectedTourLiveGroup && window.selectedTourLiveGroup !== 'BTS') return;
    const allBtn = document.createElement('div');
    allBtn.className = 'live-avatar live-avatar-all' + (liveTimelineSelectedMember === 'all' ? ' active' : '');
    allBtn.textContent = t('liveFilterAll');
    allBtn.title = t('liveFilterAll');
    allBtn.onclick = () => { liveTimelineSelectedMember = 'all'; renderLiveAvatars(); renderLiveTimeline(); };
    wrap.appendChild(allBtn);
    BTS_MEMBERS.forEach(m => {
        const el = document.createElement('div');
        el.className = 'live-avatar' + (liveTimelineSelectedMember === m.id ? ' active' : '');
        el.style.background = m.color;
        el.textContent = m.name.replace('-', '').slice(0, 2).toUpperCase();
        el.title = m.name;
        el.onclick = () => { liveTimelineSelectedMember = m.id; renderLiveAvatars(); renderLiveTimeline(); };
        wrap.appendChild(el);
    });
}

function renderLiveTimeline() {
    const wrapEl = document.getElementById('live-panel-timeline');
    const emptyEl = document.getElementById('live-panel-empty');
    if (!wrapEl) return;
    let entries = getLiveTimelineEntries();
    if (liveTimelineSelectedMember !== 'all') {
        entries = entries.filter(e => e.kind === 'group' || e.member === liveTimelineSelectedMember);
    }
    if (entries.length === 0) {
        wrapEl.innerHTML = '';
        wrapEl.classList.add('hidden');
        if (emptyEl) {
            emptyEl.textContent = (window.selectedTourLiveGroup && window.selectedTourLiveGroup !== 'BTS')
                ? t('groupNoDataYet').replace('{group}', window.selectedTourLiveGroup)
                : t('liveTimelineEmpty');
            emptyEl.classList.remove('hidden');
        }
        return;
    }
    wrapEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');

    wrapEl.innerHTML = '<div class="live-tl-wrap">' + entries.map(e => {
        const statusCls = e.status === 'current' ? 'is-current' : 'is-upcoming';
        const tag = e.status === 'current' ? t('liveTodayLive') : fmtLiveDate(e.dateStart, e.dateEnd);
        const kindLabel = e.kind === 'group' ? t('liveKindGroup') : t('liveKindSolo');
        return `<div class="live-tl-item ${statusCls}">
            <div class="live-tl-dot"></div>
            <div class="live-tl-tag">${tag}</div>
            <div class="live-tl-title" onclick="map.flyTo([${e.lat}, ${e.lng}], 6, { duration: 0.6 }); closeLivePanel();">${e.title}</div>
            <div class="live-tl-kind">${e.city}, ${e.country} &middot; ${kindLabel}</div>
        </div>`;
    }).join('') + '</div>';
}

window.openLivePanel = function() {
    const panel = document.getElementById('live-panel');
    if (!panel) return;
    liveTimelineSelectedMember = 'all';
    document.querySelectorAll('.group-switcher-current').forEach(el => { el.textContent = window.selectedTourLiveGroup; });
    renderLiveAvatars();
    renderLiveTimeline();
    // Toujours rouvrir sur la vue Liste, mois courant (demande du 08/09/2026 : nouvelle vue
    // Calendrier ci-dessous) — sans ça, rouvrir le panneau garderait le mois qu'on avait
    // navigué la dernière fois, déroutant pour "qui est en direct MAINTENANT".
    liveCalMonthOffset = 0;
    if (typeof window.switchLiveView === 'function') window.switchLiveView('list');
    panel.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.add('open'));
};

// Vue "Calendrier" du panneau Live (demande du 08/09/2026) : mois par mois, un jour est mis
// en évidence dès qu'un arrêt de tournée ou un évènement solo le recouvre (dateStart..dateEnd
// inclus), pour voir d'un coup d'œil les jours à activité sans avoir à parcourir la liste.
let liveCalMonthOffset = 0;

window.switchLiveView = function(view) {
    document.querySelectorAll('.live-panel-view-tab').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const avatarsEl = document.getElementById('live-panel-avatars');
    const timelineEl = document.getElementById('live-panel-timeline');
    const calEl = document.getElementById('live-panel-calendar');
    const emptyEl = document.getElementById('live-panel-empty');
    if (view === 'calendar') {
        if (avatarsEl) avatarsEl.classList.add('hidden');
        if (timelineEl) timelineEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (calEl) { calEl.classList.remove('hidden'); renderLiveCalendar(); }
    } else {
        if (avatarsEl) avatarsEl.classList.remove('hidden');
        if (calEl) calEl.classList.add('hidden');
        renderLiveTimeline();
    }
};

window.shiftLiveCalMonth = function(delta) {
    liveCalMonthOffset += delta;
    renderLiveCalendar();
};

function renderLiveCalendar() {
    const grid = document.getElementById('live-cal-grid');
    const label = document.getElementById('live-cal-month-label');
    if (!grid) return;
    // Ferme une bulle éventuellement encore ouverte (voir showLiveCalDayBubble) — sinon
    // changer de mois la laisse pointer vers une case qui n'existe plus.
    const openBubble = document.getElementById('live-cal-day-bubble');
    if (openBubble) openBubble.classList.remove('open');
    const now = getTourNow();
    const base = new Date(now.getFullYear(), now.getMonth() + liveCalMonthOffset, 1);
    const year = base.getFullYear(), month = base.getMonth();
    if (label) label.textContent = base.toLocaleDateString(currentLang || 'en', { month: 'long', year: 'numeric' });

    // true (demande du 11/09/2026, "je veux avoir aussi la visibilité sur le passé") : à
    // la différence de la vue Liste et du badge Live (toujours "à venir" uniquement, voir
    // includePast dans getLiveTimelineEntries()), le Calendrier garde aussi les dates déjà
    // passées colorées — naviguer vers un mois antérieur montrait sinon une grille
    // totalement vide dès qu'un évènement était terminé.
    const entries = getLiveTimelineEntries(true);
    // Jours du mois affiché recouverts par au moins un évènement (une tournée dure souvent
    // plusieurs jours : chaque jour de dateStart à dateEnd inclus compte, pas seulement le
    // premier).
    // BUG rapporté le 11/09/2026 : "Concert Oct 14 - Oct 17" ne doit colorer QUE le 14 et
    // le 17 (les dates listées dans Live), pas les jours entre les deux — avant ce
    // correctif, TOUS les jours de dateStart à dateEnd inclus étaient marqués.
    //
    // Complété le 11/09/2026 ("colore toutes les dates où BTS ont eu de l'activité") :
    // quand l'évènement connaît chaque date précise (e.dates, ex. les 4 soirs d'une étape
    // de tournée), on colore CES dates-là plutôt que seulement dateStart/dateEnd — un
    // concert du 27, 28, 1er et 2 doit colorer les 4 soirs, pas juste le 27 et le 2. Sans
    // e.dates (ex. les évènements approuvés côté admin, qui n'ont que dateStart/dateEnd),
    // on retombe sur le même comportement qu'avant : seulement les deux bornes.
    const eventDaysMap = {};
    entries.forEach(e => {
        let uniqueDates;
        if (e.dates && e.dates.length) {
            uniqueDates = e.dates.map(ds => new Date(ds + 'T00:00:00'));
        } else {
            const d1 = new Date(e.dateStart + 'T00:00:00');
            const d2 = new Date(e.dateEnd + 'T00:00:00');
            // Set plutôt qu'un simple [d1, d2] : un évènement d'un seul jour (dateStart ===
            // dateEnd) ne doit compter qu'une fois, pas apparaître deux fois dans la liste
            // des évènements du jour (et donc pas deux fois dans le title="" au survol).
            uniqueDates = d1.getTime() === d2.getTime() ? [d1] : [d1, d2];
        }
        uniqueDates.forEach(d => {
            if (d.getFullYear() === year && d.getMonth() === month) {
                const key = d.getDate();
                (eventDaysMap[key] = eventDaysMap[key] || []).push(e);
            }
        });
    });

    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = (now.getFullYear() === year && now.getMonth() === month) ? now.getDate() : null;

    grid.innerHTML = '';
    for (let i = 0; i < firstWeekday; i++) {
        const cell = document.createElement('div');
        cell.className = 'live-cal-day other-month';
        grid.appendChild(cell);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const dayEvents = eventDaysMap[day];
        cell.className = 'live-cal-day' + (dayEvents ? ' has-event' : '') + (day === todayKey ? ' today' : '');
        cell.textContent = day;
        if (dayEvents) {
            cell.title = dayEvents.map(e => e.title).join(', ');
            // Demande du 11/09/2026 : cliquer une date colorée expliquait jusqu'ici
            // seulement au survol (cell.title, invisible sur tactile) et redirigeait vers
            // la liste complète plutôt que de répondre directement "qu'est-ce qui s'est
            // passé ce jour-là" — remplacé par une bulle très brève, voir
            // showLiveCalDayBubble() plus bas.
            cell.onclick = (evt) => { evt.stopPropagation(); showLiveCalDayBubble(cell, dayEvents); };
        }
        grid.appendChild(cell);
    }
}

// Bulle "qu'est-ce qui s'est passé ce jour-là" (demande du 11/09/2026) : très brève
// (titre + date de l'évènement, rien de plus), positionnée juste au-dessus de la date
// cliquée façon bulle de message, avec une petite flèche pointant vers elle. Se ferme
// toute seule après quelques secondes, ou dès qu'on clique ailleurs/une autre date.
let liveCalBubbleHideTimeout = null;
function showLiveCalDayBubble(cell, dayEvents) {
    let bubble = document.getElementById('live-cal-day-bubble');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'live-cal-day-bubble';
        bubble.className = 'live-cal-day-bubble';
        bubble.innerHTML = '<div class="live-cal-day-bubble-card"><div class="live-cal-day-bubble-arrow"></div><div class="live-cal-day-bubble-rows"></div></div>';
        document.body.appendChild(bubble);
        document.addEventListener('click', () => bubble.classList.remove('open'));
    }
    bubble.querySelector('.live-cal-day-bubble-rows').innerHTML = dayEvents.map(e => `
        <div class="live-cal-day-bubble-row">
            <div class="live-cal-day-bubble-title">${escapeHtml(e.title)}</div>
            <div class="live-cal-day-bubble-date">${fmtLiveDate(e.dateStart, e.dateEnd)}</div>
        </div>
    `).join('');
    const rect = cell.getBoundingClientRect();
    bubble.style.left = (rect.left + rect.width / 2) + 'px';
    bubble.style.top = rect.top + 'px';
    bubble.classList.add('open');
    clearTimeout(liveCalBubbleHideTimeout);
    liveCalBubbleHideTimeout = setTimeout(() => bubble.classList.remove('open'), 4000);
}
window.closeLivePanel = function() {
    const panel = document.getElementById('live-panel');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(() => panel.classList.add('hidden'), 200);
    const openBubble = document.getElementById('live-cal-day-bubble');
    if (openBubble) openBubble.classList.remove('open');
};

// Petit point rouge sur l'icône "Live" du header dès qu'un arrêt de tournée ou un
// événement solo est EN COURS en ce moment — sans ça, rien ne distingue ce bouton d'une
// icône statique et personne ne penserait à cliquer dessus au bon moment.
window.initLiveBadge = function() {
    const dot = document.getElementById('live-badge-dot');
    if (!dot) return;
    const isLive = getLiveTimelineEntries().some(e => e.status === 'current');
    dot.classList.toggle('hidden', !isLive);
};


// ==========================================
// 1. INITIALISATION ROBUSTE DE L'APPLICATION
// ==========================================
let map = null;
let markerGroup = null;
let currentFilteredLocations = []; 
let currentLocationIdForMemory = null; 
let currentGeneratedItinerary = [];
let currentLang = localStorage.getItem('lang') || 'en';

// En mode démo (map.html?demo=1, voir map-tour.js), la carte doit rester consultable
// sans compte réel et montrer de vraies données pour la présentation — sans jamais
// écrire dans le localStorage réel de l'utilisateur (qui pourrait déjà avoir un compte
// avec d'autres groupes débloqués). window.__demoMode est posé tout en haut de
// map.html, avant même le chargement de ce fichier.
// ==========================================
// MONÉTISATION : "Pass Guide" générique (30/08/2026)
// ==========================================
// Ancien modèle : on vendait l'accès À UN GROUPE PRÉCIS ("Débloquer BTS", 14.99€/groupe),
// avec la carte entièrement bloquée tant qu'aucun groupe n'était acheté. Remplacé par un
// modèle qui découple délibérément la transaction financière du nom de l'artiste (moins
// exposé juridiquement) : TOUS les lieux sont désormais toujours visibles sur la carte
// (effet "wow, 500+ lieux !" dès l'arrivée), et on vend l'accès aux FICHES DÉTAIL du
// guide dans son ensemble — jamais "l'accès BTS" — après 3 consultations gratuites.
// getUnlockedGroups() reflète ça : elle ne sert plus qu'à filtrer par groupe demandé
// par l'utilisateur (ex: le sélecteur "GROUPE" de la sidebar), plus jamais à bloquer
// l'accès — elle renvoie donc toujours la liste complète des groupes du catalogue.
function getUnlockedGroups() {
    if (window.__demoMode) return ['BTS'];
    return [...new Set(celebLocations.map(l => l.group))];
}

const FREE_LOCATION_VIEW_LIMIT = 3;

function getViewedLocationIds() {
    return JSON.parse(localStorage.getItem('viewedLocationIds') || '[]');
}

// Vrai s'il existe un pass actif — Pass VIP (accès à vie) ou Pass Voyage (1 mois) non
// expiré. Ni l'un ni l'autre ne sont liés à un groupe précis : un pass débloque la
// totalité du guide.
function hasGuidePass() {
    const type = localStorage.getItem('guidePassType');
    if (type === 'lifetime') return true;
    if (type === 'monthly') {
        const expiresAt = parseInt(localStorage.getItem('guidePassExpiresAt') || '0', 10);
        return Date.now() < expiresAt;
    }
    return false;
}
window.hasGuidePass = hasGuidePass;

// Affiche/masque et met à jour le compteur "X/3 lieux gratuits restants" (voir
// #free-views-counter dans map.html) — masqué dès qu'un pass est actif, sinon reflète
// le nombre de fiches lieu DIFFÉRENTES déjà consultées gratuitement.
function updateFreeViewsCounter() {
    const el = document.getElementById('free-views-counter');
    if (!el) return;
    if (hasGuidePass()) { el.classList.add('hidden'); return; }
    const remaining = Math.max(0, FREE_LOCATION_VIEW_LIMIT - getViewedLocationIds().length);
    el.textContent = t('freeViewsCounter').replace('{remaining}', remaining);
    el.classList.remove('hidden');
}
window.updateFreeViewsCounter = updateFreeViewsCounter;

// Achat toujours simulé pour l'instant (aucun vrai système de paiement branché, voir
// buyGuidePass ci-dessous et le texte du popup du paywall) : enregistre le pass dans
// Firestore + localStorage, ferme le paywall, puis rouvre automatiquement la fiche lieu
// qui avait déclenché le mur de paiement pour ne pas casser l'élan de la personne.
window.buyGuidePass = async function (type) {
    localStorage.setItem('guidePassType', type);
    const fields = { guidePassType: type };
    if (type === 'monthly') {
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('guidePassExpiresAt', String(expiresAt));
        fields.guidePassExpiresAt = expiresAt;
    } else {
        localStorage.removeItem('guidePassExpiresAt');
        fields.guidePassExpiresAt = null;
    }
    if (typeof window.syncUserData === 'function') await window.syncUserData(fields);
    updateFreeViewsCounter();

    closeModal('cart-modal');
    const pendingId = window.__pendingPaywallLocId;
    window.__pendingPaywallLocId = null;
    if (pendingId != null && typeof window.openDetailsPanel === 'function') {
        window.openDetailsPanel(pendingId);
    }
};

window.openGuidePaywallModal = function () {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    const active = hasGuidePass();
    const limitBlock = document.getElementById('paywall-limit-block');
    const activeBlock = document.getElementById('paywall-active-block');
    const cards = document.getElementById('paywall-cards');
    if (limitBlock) limitBlock.classList.toggle('hidden', active);
    if (activeBlock) activeBlock.classList.toggle('hidden', !active);
    if (cards) cards.classList.toggle('hidden', active);
    if (active && activeBlock) {
        const type = localStorage.getItem('guidePassType');
        const descEl = document.getElementById('paywall-active-desc');
        if (descEl) {
            if (type === 'lifetime') {
                descEl.textContent = t('paywallActiveDescVip');
            } else {
                const expiresAt = parseInt(localStorage.getItem('guidePassExpiresAt') || '0', 10);
                descEl.textContent = t('paywallActiveDescMonthly').replace('{date}', new Date(expiresAt).toLocaleDateString(currentLang));
            }
        }
    }
    modal.classList.remove('hidden');
};
// Alias conservé : le bouton "Unlock Passes" du header (toutes les pages) appelle encore
// openCartModal() par son nom historique — inutile de renommer chaque bouton.
window.openCartModal = window.openGuidePaywallModal;

// Même principe pour les listes personnelles : en mode démo, la carte doit se comporter
// comme une page modèle (aucune visite/wishlist/trip réels affichés), jamais comme la
// page d'un compte existant qui traînerait dans le localStorage de cet appareil.
function getVisitedLocs() {
    if (window.__demoMode) return [];
    return JSON.parse(localStorage.getItem('visitedLocs') || '[]');
}
function getWishlistLocs() {
    if (window.__demoMode) return [];
    return JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
}
function getMyTripsList() {
    if (window.__demoMode) return [];
    return JSON.parse(localStorage.getItem('myTrips') || '[]');
}

let currentTrip = null;
let draggedEl = null;
let dragType = null; 
let tripIdToDelete = null;
let locToRemoveData = null; 
let dayToRemoveBtn = null; 
let tripPageMap = null;
let tripPageLayer = null;
let tripMainLayerGroup = null;
let dayMiniMaps = []; // instances Leaflet des mini-cartes par jour (une par .day-card), à détruire avant chaque re-render puisque box.innerHTML='' supprime leur conteneur DOM sans les libérer
let itiSelectedCategories = []; // catégories cochées dans le multi-select de l'Auto-Itinerary Generator ; tableau vide = toutes les catégories
let createTripSelectedCategories = []; // même principe pour la modale "Create New Trip" (My Trips)
// Pseudos en attente d'invitation, saisis DANS la modale "Create New Trip" elle-même
// (voir la demande du 04/09/2026) — le voyage partagé n'est créé et les invitations
// envoyées qu'APRÈS la création réelle du voyage, dans createNewTripAdvanced().
let createTripPendingInvitees = [];

// ==========================================
// 0bis. SYNCHRONISATION CLOUD DE LA WISHLIST (Firestore)
// ==========================================
// Petite fonction centrale appelée juste après chaque écriture locale de la
// wishlist : si un compte est connecté (window.syncUserData vient de
// firebase-init.js), on répercute aussi le changement dans Firestore. Si
// firebase-init.js n'est pas chargé sur la page (ex: map-destinations.html) ou si
// personne n'est connecté, cette fonction ne fait rien de plus — la wishlist reste
// purement locale, exactement comme avant.
function wishlistIdSet(wList) {
    return new Set((wList || []).map(w => (w && typeof w === 'object') ? w.id : w));
}
// Dernier état connu (dédupliqué par id) de la wishlist, utilisé pour ne compter dans
// l'agrégat public `locationStats.wishlistCount` (voir plus bas) qu'un lieu qui vient
// RÉELLEMENT d'entrer ou de sortir de la wishlist — pas chaque écriture localStorage,
// puisqu'un même lieu peut avoir plusieurs entrées (une par voyage, voir trips.html).
let lastSyncedWishlistIds = wishlistIdSet(getWishlistLocs());

function applyWishlistCountDeltas(wList) {
    const newIds = wishlistIdSet(wList);
    if (typeof window.updateLocationWishlistCount === 'function') {
        newIds.forEach(id => { if (!lastSyncedWishlistIds.has(id)) window.updateLocationWishlistCount(id, 1); });
        lastSyncedWishlistIds.forEach(id => { if (!newIds.has(id)) window.updateLocationWishlistCount(id, -1); });
    }
    lastSyncedWishlistIds = newIds;
}

function syncWishlist(wList) {
    applyWishlistCountDeltas(wList);
    if (typeof window.syncUserData === 'function') {
        window.syncUserData({ wishlistLocs: wList });
    }
}

// Une entrée "visited" peut être soit l'ancien format ({id, date, rating, notes}),
// soit le nouveau format à plusieurs visites ({id, visits: [{date, rating, notes}, ...]}).
// Cette fonction met toujours à niveau vers le nouveau format, pour que le reste du
// code n'ait jamais à se soucier de la version des données.
function normalizeVisitEntry(entry) {
    if (typeof entry !== 'object' || entry === null) entry = { id: entry };
    if (Array.isArray(entry.visits)) return entry;
    if (entry.date || entry.rating || entry.notes) {
        return { id: entry.id, visits: [{ date: entry.date || '', rating: entry.rating || 0, notes: entry.notes || '' }] };
    }
    return { id: entry.id, visits: [] };
}
window.normalizeVisitEntry = normalizeVisitEntry;

// Note communautaire (/5) affichée dans la fiche détail et dans la liste "LOCATIONS" du
// menu de gauche : moyenne partagée entre TOUS les utilisateurs du site (pas seulement
// les visites de la personne connectée), agrégée côté Firestore dans la collection
// publique `locationRatings` (voir firebase-init.js — nécessite une règle Firestore
// dédiée, non déployable depuis ce fichier). Cache local {locationId: {sum, count,
// <dim>Sum, <dim>Count, ...}} — une dimension par entrée de OPTIONAL_RATING_DIMENSIONS
// (`food` reste réservé aux lieux Cafe/Restaurants, voir FOOD_RELATED_CATEGORIES et
// isFoodCategory dans openMemoryEditor() ; les autres s'appliquent à tous les lieux),
// rempli une fois au chargement (voir le listener "firebase-ready" de map.html) puis mis
// à jour de façon optimiste dès qu'on enregistre/modifie/retire une note, pour un
// affichage immédiat sans attendre l'aller-retour réseau.
let communityRatings = {};
// Une entrée ici = un champ "rating<Dim>" sur l'objet visite (ex: ratingAccessibility) +
// deux champs d'agrégat "<dim>Sum"/"<dim>Count" sur le document locationRatings. Ajouter
// une nouvelle dimension de note ne demande que d'ajouter son nom ici (voir aussi
// buildRatingDeltas/buildRemovalDeltas/zeroRatingAggregate juste en dessous) — SAUF pour
// le widget d'étoiles et son affichage, qui restent à câbler à la main (voir
// window.setAccessibilityStars etc. et renderVisitsList()).
const OPTIONAL_RATING_DIMENSIONS = ['food', 'value', 'accessibility', 'siteQuality'];
const RATING_DIMENSION_KEYS = ['sum', 'count'].concat(
    OPTIONAL_RATING_DIMENSIONS.flatMap(d => [d + 'Sum', d + 'Count'])
);
function zeroRatingAggregate() {
    const obj = { sum: 0, count: 0 };
    OPTIONAL_RATING_DIMENSIONS.forEach(d => { obj[d + 'Sum'] = 0; obj[d + 'Count'] = 0; });
    return obj;
}
function ratingKeyFor(dim) { return 'rating' + dim.charAt(0).toUpperCase() + dim.slice(1); }

function communityRatingAvg(locId) {
    const r = communityRatings[locId];
    if (!r || !r.count) return null;
    return r.sum / r.count;
}
function communityDimensionAvg(locId, dim) {
    const r = communityRatings[locId];
    const sumKey = dim + 'Sum', countKey = dim + 'Count';
    if (!r || !r[countKey]) return null;
    return r[sumKey] / r[countKey];
}
window.communityDimensionAvg = communityDimensionAvg;

// Statistique "X% des utilisateurs ont ajouté ce lieu à leur wishlist" (onglet Info de la
// fiche détail) : locationWishlistStats = {locationId: {wishlistCount}}, siteTotalUsers =
// nombre total de comptes créés sur le site (voir loadAllLocationStats()/loadSiteStats()
// dans firebase-init.js). Retourne null tant que ces données ne sont pas encore chargées,
// ou si le site compte trop peu de comptes pour qu'un pourcentage soit représentatif.
let locationWishlistStats = {};
let siteTotalUsers = 0;
const MIN_USERS_FOR_WISHLIST_STAT = 5;
window.setLocationWishlistStats = function(stats, totalUsers) {
    locationWishlistStats = stats || {};
    siteTotalUsers = totalUsers || 0;
};
function wishlistPercentForLocation(locId) {
    if (siteTotalUsers < MIN_USERS_FOR_WISHLIST_STAT) return null;
    const count = (locationWishlistStats[locId] && locationWishlistStats[locId].wishlistCount) || 0;
    if (count <= 0) return null;
    return Math.min(100, Math.round((count / siteTotalUsers) * 100));
}
window.wishlistPercentForLocation = wishlistPercentForLocation;

// Amis : liste de {uid, username} + lieux visités par chacun ({uid: [locationIds]}),
// chargées une seule fois au login (voir le listener "firebase-ready" de map.html) puis
// consultées à chaque ouverture de fiche lieu — voir friendsWhoVisited() plus bas.
let myFriendsList = [];
let friendVisitsCache = {};
window.setFriendsData = function(friends, visits) {
    myFriendsList = friends || [];
    friendVisitsCache = visits || {};
};
function friendsWhoVisited(locId) {
    return myFriendsList.filter(f => (friendVisitsCache[f.uid] || []).includes(locId));
}
window.friendsWhoVisited = friendsWhoVisited;

// Badge unifié de l'icône "Message" du header (voir map.html) : cumule les partages
// (lieu/voyage) non vus ET les conversations avec un message non lu — voir friends.html
// pour l'endroit où tout ça se consulte réellement, l'icône ne fait plus qu'y renvoyer.
// Portée par l'icône "message" depuis le 08/09/2026 (l'icône "ami" mène maintenant au
// profil public, voir plus bas) — d'où le renommage friend-icon-badge -> message-icon-badge.
window.refreshFriendNotifications = async function() {
    // #message-icon-badge (header desktop) ET #mti-message-badge (icône message partagée
    // du haut à droite en mobile, voir injectMobileTopIcons() plus haut, demande du
    // 08/09/2026) : une page peut avoir les deux en même temps, d'où querySelectorAll
    // plutôt que getElementById qui n'aurait mis à jour que le premier des deux trouvé.
    const badges = document.querySelectorAll('#message-icon-badge, #mti-message-badge');
    if (!badges.length) return;
    if (typeof window.countUnreadFriendNotifications !== 'function') return;
    const count = await window.countUnreadFriendNotifications();
    badges.forEach(badge => {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    });
};

// Voyages partagés dont JE fais partie (propriétaire qui les a partagés, voir
// trip.isShared, OU collaborateur — voir listSharedTripsForMe() dans firebase-init.js) :
// c'est la liste "Trip groups" de friends.html, ET la source des ids de conversation de
// groupe pour le comptage des messages non lus (chaque voyage <-> une conversation
// "trip_<id>", voir tripConversationId()).
window.listMyTripGroups = async function() {
    const owned = getMyTripsList().filter(t => t.isShared).map(t => ({ id: t.id, name: t.name, isOwner: true, coverImage: t.coverImage }));
    const shared = typeof window.listSharedTripsForMe === 'function' ? await window.listSharedTripsForMe() : [];
    const collaborator = shared.map(t => ({ id: t._sharedTripId, name: t.name, isOwner: false, coverImage: t.coverImage }));
    return owned.concat(collaborator);
};

// Additionne les sources de notifications "amis" : demandes d'ami reçues, partages
// (lieu/voyage) non vus, et conversations (DM + groupes de voyage) avec au moins un
// message non lu.
window.countUnreadFriendNotifications = async function() {
    let count = 0;
    // BUG rapporté le 11/09/2026 : envoyer une demande d'ami n'avertissait la personne
    // visée nulle part — ni badge sur l'icône message, ni aucun autre signal — avant
    // qu'elle n'aille consulter friends.html de sa propre initiative. listMyFriendRequests()
    // (déjà utilisée par friends.html/profile.html pour AFFICHER la liste) donne aussi le
    // décompte qui manquait ici.
    if (typeof window.listMyFriendRequests === 'function') {
        const { incoming } = await window.listMyFriendRequests();
        count += incoming.length;
    }
    if (typeof window.listSharesForMe === 'function') {
        const shares = await window.listSharesForMe();
        count += shares.filter(s => !s.seen).length;
    }
    if (typeof window.countUnreadConversations === 'function' && typeof window.dmConversationId === 'function') {
        const user = window.firebaseCurrentUser;
        if (user) {
            // myFriendsList n'est peuplée (via setFriendsData()) que sur les pages qui en
            // ont aussi besoin pour autre chose (friends.html, map.html) — sur toutes les
            // autres (trips.html, account.html...), elle reste vide en permanence, ce qui
            // faisait disparaître silencieusement les messages non lus du badge de l'icône
            // "Amis" partout sauf sur ces deux pages (demande du 06/09/2026). On récupère
            // donc la liste d'amis nous-mêmes plutôt que de dépendre de cet état partagé.
            const friends = typeof window.listMyFriends === 'function' ? await window.listMyFriends() : myFriendsList;
            const dmIds = friends.map(f => window.dmConversationId(user.uid, f.uid));
            const tripGroups = await window.listMyTripGroups();
            const tripIds = tripGroups.map(g => window.tripConversationId(g.id));
            count += await window.countUnreadConversations(dmIds.concat(tripIds));
        }
    }
    return count;
};

// Partage un voyage à un ami DEPUIS friends.html : envoie une INVITATION (voir
// sendTripInvite() dans firebase-init.js, demande du 06/09/2026) plutôt que d'ajouter
// directement l'ami comme collaborateur — il n'apparaîtra dans le voyage qu'après
// l'avoir acceptée lui-même. `tripLocalObj` est l'entrée telle que dans getMyTripsList().
window.shareTripFromFriendsPage = async function(tripLocalObj, friendUid, friendUsername) {
    // Toujours appelé, même si isShared est déjà à true localement (voir
    // createSharedTrip() dans firebase-init.js, désormais idempotent) : au cas où le
    // document trips/{id} aurait été créé de façon incomplète, ça réaffirme name/ownerName
    // AVANT d'envoyer l'invitation, pour que la personne invitée voie toujours le bon nom.
    const createResult = typeof window.createSharedTrip === 'function' ? await window.createSharedTrip(tripLocalObj) : null;
    if (createResult && createResult.success && !tripLocalObj.isShared) {
        tripLocalObj.isShared = true;
        const trips = getMyTripsList();
        const idx = trips.findIndex(t => t.id === tripLocalObj.id);
        if (idx !== -1) { trips[idx] = tripLocalObj; localStorage.setItem('myTrips', JSON.stringify(trips)); syncTrips(trips); }
    }
    if (typeof window.ensureTripConversation === 'function') {
        await window.ensureTripConversation(tripLocalObj.id, tripLocalObj.name);
    }
    if (typeof window.sendTripInvite === 'function') {
        return window.sendTripInvite(tripLocalObj.id, tripLocalObj.name, tripLocalObj.coverImage, friendUsername, 'view');
    }
};

// Bouton "Partager" de la fiche lieu : liste les amis (myFriendsList, déjà chargée au
// login, voir plus haut) plutôt qu'un aller-retour réseau à chaque ouverture du menu.
const shareLocationBtn = document.getElementById('share-location-btn');
if (shareLocationBtn) {
    shareLocationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('share-location-menu');
        const list = document.getElementById('share-friend-list');
        const empty = document.getElementById('share-no-friends');
        if (!menu || !list) return;
        const willOpen = menu.classList.contains('hidden');
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
        if (!willOpen) return;
        list.innerHTML = myFriendsList.map(f => `<div class="dropdown-option share-friend-option" data-friend-uid="${f.uid}">${f.username}</div>`).join('');
        if (empty) empty.classList.toggle('hidden', myFriendsList.length > 0);
        menu.classList.remove('hidden');
    });
}
// "Share via..." (demande du 11/09/2026) : ouvre la fenêtre de partage native de l'OS
// (AirDrop, Messages, Mail, WhatsApp... sur mobile) via l'API Web Share — cette API exige
// un contexte HTTPS et n'existe pas partout (desktop la plupart du temps), d'où le repli
// sur une copie du lien dans le presse-papier avec confirmation par toast.
const shareNativeOptionEl = document.getElementById('share-native-option');
if (shareNativeOptionEl) {
    shareNativeOptionEl.addEventListener('click', async () => {
        const loc = celebLocations.find(l => l.id === currentLocationIdForMemory);
        if (!loc) return;
        const menu = document.getElementById('share-location-menu');
        if (menu) menu.classList.add('hidden');
        const shareUrl = new URL(`map.html?loc=${loc.id}`, window.location.href).href;
        const shareData = { title: loc.name, text: currentLang === 'fr' ? `Découvre ce lieu sur Screen To Street : ${loc.name}` : `Check out this place on Screen To Street: ${loc.name}`, url: shareUrl };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (e) { /* annulé par la personne — rien à faire */ }
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                if (typeof window.showSimpleToast === 'function') window.showSimpleToast(currentLang === 'fr' ? 'Lien copié !' : 'Link copied!');
            } catch (e) { /* presse-papier indisponible (permission refusée) — rien d'autre à proposer ici */ }
        }
    });
}
const shareFriendListEl = document.getElementById('share-friend-list');
if (shareFriendListEl) {
    shareFriendListEl.addEventListener('click', async (e) => {
        const opt = e.target.closest('.share-friend-option');
        if (!opt) return;
        const loc = celebLocations.find(l => l.id === currentLocationIdForMemory);
        if (!loc) return;
        if (typeof window.shareLocationWithFriend !== 'function') {
            if (typeof window.showSimpleToast === 'function') window.showSimpleToast(currentLang === 'fr' ? "Connexion indisponible, réessayez." : 'Not connected, please try again.', { isError: true });
            return;
        }
        await window.shareLocationWithFriend(opt.getAttribute('data-friend-uid'), loc.id, loc.name);
        const menu = document.getElementById('share-location-menu');
        if (menu) menu.classList.add('hidden');
        if (shareLocationBtn) {
            shareLocationBtn.classList.add('share-sent-flash');
            setTimeout(() => shareLocationBtn.classList.remove('share-sent-flash'), 900);
        }
    });
}

window.setCommunityRatings = function(ratings) {
    communityRatings = ratings || {};
};

// Applique un delta au cache local (affichage immédiat) ET le persiste sur Firestore pour
// que les autres utilisateurs le voient aussi à leur prochain chargement. `deltas` ne
// contient que les clés à modifier parmi RATING_DIMENSION_KEYS (ex: {sum:4, count:1} pour
// une nouvelle visite sans note food/valeur).
function applyCommunityRatingDelta(locId, deltas) {
    if (!deltas || RATING_DIMENSION_KEYS.every(k => !deltas[k])) return;
    const cur = communityRatings[locId] || zeroRatingAggregate();
    const next = Object.assign({}, cur);
    RATING_DIMENSION_KEYS.forEach(k => { if (deltas[k]) next[k] = (cur[k] || 0) + deltas[k]; });
    ['count'].concat(OPTIONAL_RATING_DIMENSIONS.map(d => d + 'Count')).forEach(k => { if (next[k] < 0) next[k] = 0; });
    communityRatings[locId] = next;
    if (typeof window.updateLocationRatingAggregate === 'function') {
        window.updateLocationRatingAggregate(locId, deltas);
    }
}

// Calcule les deltas à appliquer pour un visit donné, selon qu'il s'agit d'une NOUVELLE
// visite (isNewVisit=true, le compte de chaque dimension présente augmente de 1) ou de la
// MODIFICATION d'une visite existante (isNewVisit=false, seule la différence avec
// l'ancienne valeur compte, le compte ne change que si une dimension apparaît/disparaît —
// ex: la catégorie du lieu a changé entre-temps, pour la dimension "food").
function buildRatingDeltas(newVisit, isNewVisit, oldVisit) {
    const deltas = {};
    if (isNewVisit) {
        deltas.sum = newVisit.rating || 0;
        deltas.count = 1;
        OPTIONAL_RATING_DIMENSIONS.forEach(d => {
            const key = ratingKeyFor(d);
            if (newVisit[key] != null) { deltas[d + 'Sum'] = newVisit[key]; deltas[d + 'Count'] = 1; }
        });
    } else {
        const old = oldVisit || {};
        deltas.sum = (newVisit.rating || 0) - (old.rating || 0);
        OPTIONAL_RATING_DIMENSIONS.forEach(d => {
            const key = ratingKeyFor(d);
            if (newVisit[key] != null || old[key] != null) {
                deltas[d + 'Sum'] = (newVisit[key] || 0) - (old[key] || 0);
                deltas[d + 'Count'] = (newVisit[key] != null ? 1 : 0) - (old[key] != null ? 1 : 0);
            }
        });
    }
    return deltas;
}

// Deltas (négatifs) à appliquer pour retirer la contribution d'une ou plusieurs visites
// déjà comptées — un seul visit ([removed]) pour la suppression d'une visite précise, ou
// toutes les visites d'un lieu quand on décoche entièrement "J'ai visité ce lieu".
function buildRemovalDeltas(visits) {
    const deltas = zeroRatingAggregate();
    (visits || []).forEach(v => {
        if (v.rating > 0) { deltas.sum -= v.rating; deltas.count -= 1; }
        OPTIONAL_RATING_DIMENSIONS.forEach(d => {
            const key = ratingKeyFor(d);
            if (v[key] != null) { deltas[d + 'Sum'] -= v[key]; deltas[d + 'Count'] -= 1; }
        });
    });
    return deltas;
}
window.applyCommunityRatingDelta = applyCommunityRatingDelta;

window.refreshLocationRating = function(locId) {
    const ratingEl = document.getElementById('details-rating');
    const ratingValEl = document.getElementById('details-rating-value');
    if (!ratingEl || !ratingValEl) return;
    const avg = communityRatingAvg(locId);
    if (avg === null) {
        ratingEl.classList.add('hidden');
        return;
    }
    ratingValEl.textContent = avg.toFixed(1);
    ratingEl.classList.remove('hidden');
};

function syncVisited(vList) {
    if (typeof window.syncUserData === 'function') {
        window.syncUserData({ visitedLocs: vList });
    }
    // Miroir minimal pour la fonctionnalité "amis" (voir syncFriendVisits() dans
    // firebase-init.js) : uniquement la liste des ids, jamais les dates/notes/photos.
    if (typeof window.syncFriendVisits === 'function') {
        window.syncFriendVisits(vList.map(v => (v && typeof v === 'object') ? v.id : v));
    }
}
window.syncVisited = syncVisited;

function syncTrips(trips) {
    if (typeof window.syncUserData === 'function') {
        window.syncUserData({ myTrips: trips });
    }
}
window.syncTrips = syncTrips;

// Au chargement de la page, une fois que Firebase a déterminé si quelqu'un est
// connecté (ou non) : si oui, on va chercher sa wishlist et ses pass réels dans
// Firestore pour remplacer les valeurs locales (qui pourraient être vides, ou celles
// d'un autre compte testé plus tôt sur ce même appareil). NOTE : le voile de
// connexion et la fenêtre "aucun pass débloqué" de map.html sont gérés entièrement
// par le script inline de map.html lui-même (voir ce fichier) — pas ici, pour éviter
// tout doublon ou conflit entre les deux.
window.addEventListener('firebase-ready', async (e) => {
    const user = e.detail && e.detail.user;
    if (!user) return; // visiteur non connecté : on garde les données locales telles quelles

    // Icônes "Ami" (profil public), "Message" et "Admin" du header : présentes en HTML
    // (masquées par défaut via la classe .hidden) sur TOUTES les pages qui incluent ce
    // script — un seul endroit pour les afficher/rafraîchir plutôt qu'un bout de JS
    // dupliqué par page. Idempotent : ne fait rien sur une page qui n'a pas ces boutons
    // dans son HTML (ex: page de login).
    const friendIconBtn = document.getElementById('friend-icon-btn');
    if (friendIconBtn) friendIconBtn.classList.remove('hidden');
    // Icône "Feed" (demande du 10/09/2026, "ajoute un icone de redirection vers la page
    // Feed sur ordinateur" — jusqu'ici, feed.html n'était atteignable que via la nav du
    // bas mobile, aucun lien desktop n'existait). Même bouton que friend-icon-btn/
    // message-icon-btn (masqué par défaut, affiché une fois connecté).
    const feedIconBtn = document.getElementById('feed-icon-btn');
    if (feedIconBtn) feedIconBtn.classList.remove('hidden');
    const messageIconBtn = document.getElementById('message-icon-btn');
    if (messageIconBtn) {
        messageIconBtn.classList.remove('hidden');
        if (typeof window.refreshFriendNotifications === 'function') window.refreshFriendNotifications();
    }
    const adminShortcutBtn = document.getElementById('admin-shortcut-btn');
    if (typeof window.isCurrentUserAdmin === 'function' && await window.isCurrentUserAdmin()) {
        if (adminShortcutBtn) adminShortcutBtn.classList.remove('hidden');
        // Mémorisé une fois ici (pas re-vérifié à chaque ouverture de fiche lieu, ce qui
        // ferait clignoter l'icône crayon) — voir openDetailsPanel() et
        // openLocationEditModal() plus bas, qui s'appuient dessus.
        window.__isAdminUser = true;
        const adminEditBtn = document.getElementById('details-admin-edit-btn');
        if (adminEditBtn) adminEditBtn.classList.remove('hidden');
    }

    // Voyages partagés par d'autres utilisateurs (voir listSharedTripsForMe() dans
    // firebase-init.js) : chargés une fois par page trips.html, indépendamment des
    // propres voyages de la personne (cloudData.myTrips ci-dessous), puisqu'il s'agit
    // d'une toute autre collection Firestore.
    if (document.getElementById('edit-trip-name') && typeof window.refreshSharedTrips === 'function') {
        window.refreshSharedTrips();
    }

    const cloudData = await window.loadUserCloudData();
    if (cloudData) {
        if (Array.isArray(cloudData.wishlistLocs)) {
            localStorage.setItem('wishlistLocs', JSON.stringify(cloudData.wishlistLocs));
            // Recale la référence locale sur l'état cloud SANS déclencher de delta sur
            // l'agrégat public (ce n'est pas un clic sur "wishlist", juste un chargement).
            lastSyncedWishlistIds = wishlistIdSet(cloudData.wishlistLocs);

            // Rafraîchit les affichages déjà construits qui dépendent de la wishlist.
            // skipFitBounds=true (comme dans map.html) : ce rafraîchissement arrive ici de
            // façon asynchrone, APRÈS le centrage initial sur le pays choisi fait par
            // map.html au moment du login — un simple renderLocations() sans ce paramètre
            // rappelait fitBounds() sur TOUS les lieux et effaçait ce centrage un instant
            // plus tard (c'était le vrai bug persistant du recadrage carte sur mobile).
            if (document.getElementById('map') && !window.__tripViewActive && typeof renderLocations === 'function') renderLocations(true);
            if (document.getElementById('edit-trip-name') && typeof window.renderTrip === 'function' && currentTrip) window.renderTrip();
            if (typeof window.refreshWishlistFromCloud === 'function') window.refreshWishlistFromCloud();
        }
        if (Array.isArray(cloudData.visitedLocs)) {
            localStorage.setItem('visitedLocs', JSON.stringify(cloudData.visitedLocs));
            if (document.getElementById('map') && !window.__tripViewActive && typeof renderLocations === 'function') renderLocations(true);
            if (typeof window.refreshVisitedFromCloud === 'function') window.refreshVisitedFromCloud();
        }
        if (Array.isArray(cloudData.myTrips)) {
            // FUSION plutôt qu'un simple écrasement : un voyage tout juste créé en local
            // (ex: "Save Trip" depuis l'Auto-Itinerary Generator) mais dont la synchro
            // Firestore n'a pas encore eu le temps d'aboutir (page rechargée trop vite,
            // firebase-init.js pas encore totalement chargé sur une connexion lente...)
            // se faisait purement et simplement effacer par cette lecture cloud, qui ne
            // le connaissait pas encore — donnant l'impression que "Save Trip" ne
            // sauvegardait rien. On garde donc tout voyage présent en local mais absent
            // du cloud (probable écriture pas encore propagée) plutôt que de le perdre.
            const localTrips = getMyTripsList();
            const cloudIds = new Set(cloudData.myTrips.map(t => t.id));
            const localOnlyTrips = localTrips.filter(t => !cloudIds.has(t.id));
            const mergedTrips = cloudData.myTrips.concat(localOnlyTrips);
            localStorage.setItem('myTrips', JSON.stringify(mergedTrips));
            if (localOnlyTrips.length > 0 && typeof window.syncUserData === 'function') {
                window.syncUserData({ myTrips: mergedTrips });
            }
            if (document.getElementById('edit-trip-name') && typeof window.initTrips === 'function') window.initTrips();
            if (typeof window.loadItineraryTabOptions === 'function' && document.getElementById('tab-itinerary-btn')) window.loadItineraryTabOptions();
        }
        if (Array.isArray(cloudData.unlockedGroups)) {
            // Champ historique de l'ancien modèle par groupe : plus lu pour la
            // monétisation (voir hasGuidePass()), gardé en local uniquement au cas où
            // un ancien code y ferait encore référence quelque part.
            localStorage.setItem('unlockedGroups', JSON.stringify(cloudData.unlockedGroups));
        }
        // Pass Guide (voir hasGuidePass()) : synchronisé entre appareils comme le reste
        // du compte, pour qu'un pass acheté sur un appareil s'applique partout.
        if (cloudData.guidePassType) {
            localStorage.setItem('guidePassType', cloudData.guidePassType);
            if (cloudData.guidePassExpiresAt) localStorage.setItem('guidePassExpiresAt', String(cloudData.guidePassExpiresAt));
            else localStorage.removeItem('guidePassExpiresAt');
        }
        if (Array.isArray(cloudData.viewedLocationIds)) {
            // Fusion (pas remplacement) : un lieu vu gratuitement sur un autre appareil
            // reste compté, on ne veut pas offrir 3 nouvelles vues gratuites par appareil.
            const localViewed = getViewedLocationIds();
            const merged = [...new Set([...localViewed, ...cloudData.viewedLocationIds])];
            localStorage.setItem('viewedLocationIds', JSON.stringify(merged));
        }
        // `interestCountry` (le pays qu'on veut visiter) a remplacé `residenceCountry`
        // (le pays où l'on habite) — repli sur l'ancien champ pour les comptes créés
        // avant ce changement, qui n'ont que residenceCountry en base.
        const interestCountry = cloudData.interestCountry || cloudData.residenceCountry;
        if (interestCountry) {
            const prevCountry = localStorage.getItem('userCountry');
            localStorage.setItem('userCountry', interestCountry);
            // Recentre seulement si la carte est déjà affichée et que la valeur cloud
            // diffère de celle déjà utilisée pour le centrage initial (nouvel appareil,
            // ou pays changé depuis account.html).
            if (map && interestCountry !== prevCountry && typeof window.getMapCenterForCountry === 'function') {
                const c = window.getMapCenterForCountry(interestCountry);
                map.setView([c[0], c[1]], c[2]);
            }
        }

        // Photo de profil : toujours alignée sur CE compte, dans les deux sens — sans ce
        // "sinon on la retire", un appareil déjà utilisé par un autre compte gardait la
        // photo de ce précédent compte affichée comme si elle appartenait à celui-ci.
        const prevPhoto = localStorage.getItem('userPhoto');
        const cloudPhoto = cloudData.photo || null;
        if (cloudPhoto !== prevPhoto) {
            if (cloudPhoto) localStorage.setItem('userPhoto', cloudPhoto);
            else localStorage.removeItem('userPhoto');
            const firstName = (localStorage.getItem('userFirstName') || '').trim();
            const nameNow = (localStorage.getItem('userName') || 'U').trim();
            const initial = (firstName || nameNow || 'U').charAt(0).toUpperCase();
            document.querySelectorAll('.user-avatar-btn').forEach(btn => {
                if (cloudPhoto) btn.innerHTML = `<img src="${cloudPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                else { btn.innerHTML = ''; btn.textContent = initial; }
            });
            const profilePreview = document.getElementById('profile-preview');
            if (profilePreview) {
                if (cloudPhoto) profilePreview.innerHTML = `<img src="${cloudPhoto}" style="width:100%;height:100%;object-fit:cover;">`;
                else profilePreview.textContent = initial;
            }
            if (typeof window.updateResetPhotoLinkVisibility === 'function') window.updateResetPhotoLinkVisibility();
        }

        // Identifiant et date de son dernier changement (voir account.html — limité à une
        // fois par semaine) : synchronisés depuis le cloud pour qu'un nouvel appareil, ou
        // un localStorage vidé, ne réinitialise pas silencieusement le délai d'attente.
        if (cloudData.username) localStorage.setItem('userName', cloudData.username);
        if (cloudData.lastUsernameChangeAt) localStorage.setItem('lastUsernameChangeAt', String(cloudData.lastUsernameChangeAt));
        if (document.getElementById('user-name-input') && typeof window.refreshUsernameFieldFromStorage === 'function') {
            window.refreshUsernameFieldFromStorage();
        }
    }
});

// GARDE-FOU : si firebase-init.js n'a jamais réussi à se charger/s'initialiser (bug
// rapporté le 10/09/2026 : "seul mon compte fonctionne, rien ne se sauvegarde avec les
// autres") — ce module importe le SDK Firebase depuis un CDN externe (www.gstatic.com,
// voir le haut de firebase-init.js), sans repli si ce domaine est injoignable (réseau
// d'entreprise, bloqueur de contenu, panne CDN...). Dans ce cas, AUCUNE fonction
// window.* de firebase-init.js n'existe jamais, et chaque site d'appel du site les
// protège déjà par `if (typeof window.xxx === 'function')` — ce qui évite un crash,
// mais échoue alors EN SILENCE. Si "firebase-ready" n'est toujours pas arrivé après un
// long délai, on le signale plutôt que de laisser deviner.
//
// Correctif du 10/09/2026 (régression rapportée : un faux positif déclenché sur mobile
// juste après une publication de photo réussie) : l'ancien seuil fixe de 10s était bien
// trop court pour un mobile réel (connexion cellulaire + un gros bundle Firebase minifié
// à parser, contrairement à ce test local/rapide) — le SDK finissait par charger, mais
// après le délai, déclenchant la bannière alors que tout fonctionnait. Remplacé par un
// sondage répété (toutes les 3s, jusqu'à 30s) qui vérifie AUSSI l'existence réelle d'une
// fonction clé de firebase-init.js (pas seulement l'événement, qui a pu être manqué par
// un souci de timing d'attache d'écouteur) — un faux positif est donc beaucoup plus
// difficile à déclencher, sans perdre la détection d'un vrai échec de chargement.
(function () {
    let resolved = false;
    window.addEventListener('firebase-ready', () => { resolved = true; }, { once: true });
    let elapsed = 0;
    const interval = 3000, maxWait = 30000;
    const poll = setInterval(() => {
        elapsed += interval;
        if (resolved || typeof window.syncUserData === 'function') { clearInterval(poll); return; }
        if (elapsed < maxWait) return;
        clearInterval(poll);
        if (document.getElementById('st-connection-banner')) return;
        const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr') || document.documentElement.lang === 'fr';
        const banner = document.createElement('div');
        banner.id = 'st-connection-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#D42759;color:#fff;font-family:"Poppins",sans-serif;font-size:12.5px;font-weight:600;text-align:center;padding:10px 16px;box-shadow:0 2px 10px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;';
        const span = document.createElement('span');
        span.textContent = isFr
            ? "Connexion à nos serveurs impossible — messages, photos, voyages et autres sauvegardes ne fonctionneront pas tant que ça persiste."
            : "Couldn't connect to our servers — messages, photos, trips and other saves won't work until this is resolved.";
        const btn = document.createElement('button');
        btn.textContent = isFr ? 'Actualiser' : 'Refresh';
        btn.style.cssText = 'background:#fff;color:#D42759;border:none;border-radius:100px;padding:5px 16px;font-weight:700;font-family:"Poppins",sans-serif;font-size:12px;cursor:pointer;flex-shrink:0;';
        btn.onclick = () => window.location.reload();
        banner.appendChild(span);
        banner.appendChild(btn);
        document.body.prepend(banner);
    }, interval);
})();

// ==========================================
// NAV DU BAS PARTAGÉE MOBILE : Home / Live / + / Search / Avatar (demande du 08/09/2026)
// Une seule implémentation, injectée sur TOUTES les pages (script.js est chargé partout) —
// remplace, en mobile, l'ancienne barre d'icônes .top-nav/.universal-icons (masquée sur
// mobile depuis style.css). Voir aussi window.stNavigate() pour l'animation de transition.
// ==========================================
function injectMobileBottomNav() {
    if (document.getElementById('mobile-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.className = 'mobile-bottom-nav';
    nav.innerHTML = `
        <a href="map.html" class="mbn-item" data-stnav title="Home">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z"/></svg>
        </a>
        <button type="button" class="mbn-item" id="mbn-live-btn" title="Live">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M5 12a7 7 0 0 1 7-7"></path><path d="M19 12a7 7 0 0 1-7 7"></path><path d="M2 12a10 10 0 0 1 10-10"></path><path d="M22 12a10 10 0 0 1-10 10"></path></svg>
        </button>
        <button type="button" class="mbn-item mbn-add" id="mbn-add-btn" title="Add">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <a href="feed.html" class="mbn-item" data-stnav title="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </a>
        <a href="profile.html" class="mbn-item mbn-avatar" data-stnav id="mbn-avatar-link">U</a>
    `;
    document.body.appendChild(nav);

    const liveBtn = document.getElementById('mbn-live-btn');
    if (liveBtn) liveBtn.addEventListener('click', () => {
        // window.openLivePanel() est défini globalement (script.js) mais ne fait rien sans
        // le markup #live-panel, présent uniquement sur map.html — on vérifie donc l'élément
        // lui-même, pas juste l'existence de la fonction, pour savoir s'il faut naviguer.
        if (document.getElementById('live-panel')) { window.openLivePanel(); return; }
        window.stNavigate('map.html?live=1');
    });
    const addBtn = document.getElementById('mbn-add-btn');
    if (addBtn) addBtn.addEventListener('click', () => {
        if (typeof window.openQuickAddSheet === 'function') window.openQuickAddSheet();
    });

    nav.querySelectorAll('a[data-stnav]').forEach(a => {
        a.addEventListener('click', (e) => {
            if (window.matchMedia && !window.matchMedia('(max-width: 760px)').matches) return;
            e.preventDefault();
            window.stNavigate(a.getAttribute('href'));
        });
    });
}

// ==========================================
// ICÔNES PARTAGÉES DU HAUT À DROITE MOBILE : Message + Engrenage (demande du 08/09/2026)
// En plus de la nav du bas (Home/Live/+/Search/Avatar), un petit duo reste en haut à
// droite sur mobile — l'icône engrenage ouvre le même menu "toutes les pages" que sur
// desktop (Compte/Voyages/Wishlist/Amis/Réglages/Déconnexion), l'icône message mène à
// friends.html et porte le badge de non-lus (voir window.refreshFriendNotifications()).
// ==========================================
function injectMobileTopIcons() {
    if (document.getElementById('mobile-top-icons')) return;
    const wrap = document.createElement('div');
    wrap.id = 'mobile-top-icons';
    wrap.innerHTML = `
        <a href="friends.html" class="header-icon-btn" data-stnav title="Messages">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span id="mti-message-badge" class="notif-badge hidden">0</span>
        </a>
        <div class="dropdown-container">
            <button id="mti-gear-btn" class="header-icon-btn" type="button" title="Menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
            <div id="mti-gear-menu" class="dropdown-menu hidden">
                <a href="map-destinations.html" class="dropdown-option" data-i18n="exploreDestOption">Explore Destinations</a>
                <a href="map-artists.html" class="dropdown-option" data-i18n="exploreArtistsOption">Explore Artists</a>
                <div class="dropdown-divider"></div>
                <a href="account.html" class="dropdown-option" data-i18n="accountOption">Your Account</a>
                <a href="visited.html" class="dropdown-option" data-i18n="visitedOption">Visited</a>
                <a href="wishlist.html" class="dropdown-option" data-i18n="wishlistOption">My Wishlist</a>
                <a href="trips.html" class="dropdown-option" data-i18n="tripsOption">My Trips</a>
                <a href="settings.html" class="dropdown-option" data-i18n="settingsOption">Settings</a>
                <div class="dropdown-divider"></div>
                <a href="index.html" class="dropdown-option" id="mti-logout-btn" style="color:#D42759; font-weight:bold;" data-i18n="logoutOption">Logout</a>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    const gearBtn = document.getElementById('mti-gear-btn');
    if (gearBtn) gearBtn.addEventListener('click', (e) => {
        document.querySelectorAll('.dropdown-menu').forEach(m => { if (m.id !== 'mti-gear-menu') m.classList.add('hidden'); });
        document.getElementById('mti-gear-menu').classList.toggle('hidden');
        e.stopPropagation();
    });

    wrap.querySelectorAll('a[data-stnav]').forEach(a => {
        a.addEventListener('click', (e) => {
            if (window.matchMedia && !window.matchMedia('(max-width: 760px)').matches) return;
            e.preventDefault();
            window.stNavigate(a.getAttribute('href'));
        });
    });

    if (typeof window.refreshFriendNotifications === 'function') window.refreshFriendNotifications();
}

// Anime une sortie glissée avant de naviguer réellement (mobile uniquement) — demande du
// 08/09/2026 "type glissement quand je change de page". La page d'arrivée relaie l'entrée
// via sessionStorage (voir plus bas, "stnav-entering").
window.stNavigate = function (href) {
    if (window.matchMedia && !window.matchMedia('(max-width: 760px)').matches) { window.location.href = href; return; }
    try { sessionStorage.setItem('stNavEnter', '1'); } catch (e) {}
    document.body.classList.add('stnav-leaving');
    setTimeout(() => { window.location.href = href; }, 150);
};

// Volet "+" : ajouter une photo / un lieu visité / un avis (demande du 08/09/2026).
// Sans backend dédié, les trois options renvoient vers map.html, qui ouvre l'explorateur
// et invite à choisir un lieu — les flux d'ajout de photo/visite/avis existent déjà par
// lieu (voir openMemoryEditor côté map.html).
window.openQuickAddSheet = function () {
    let overlay = document.getElementById('qa-sheet-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'qa-sheet-overlay';
        overlay.className = 'qa-sheet-overlay';
        overlay.innerHTML = `
            <div class="qa-sheet">
                <div class="qa-sheet-handle"></div>
                <div class="qa-sheet-title">${t('quickAddTitle')}</div>
                <div class="qa-sheet-option" data-qa="photo">
                    <span class="qa-sheet-option-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path></svg></span>
                    <span>${t('quickAddPhoto')}</span>
                </div>
                <div class="qa-sheet-option" data-qa="visited">
                    <span class="qa-sheet-option-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><path d="m9 11 2 2 4-4"></path></svg></span>
                    <span>${t('quickAddVisited')}</span>
                </div>
                <div class="qa-sheet-option" data-qa="review">
                    <span class="qa-sheet-option-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"></polygon></svg></span>
                    <span>${t('quickAddReview')}</span>
                </div>
                <button type="button" class="qa-sheet-cancel">${t('quickAddCancel')}</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) window.closeQuickAddSheet(); });
        overlay.querySelector('.qa-sheet-cancel').addEventListener('click', window.closeQuickAddSheet);
        overlay.querySelectorAll('.qa-sheet-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const kind = opt.dataset.qa;
                window.closeQuickAddSheet();
                // "Ajouter une photo" (demande du 09/09/2026) a maintenant son propre volet
                // (choix du lieu/date/légende, voir window.openAddPhotoModal() ci-dessous) —
                // "visited"/"review" continuent de renvoyer vers map.html (pas de flux dédié
                // multi-page pour ceux-ci, le site n'ayant pas de backend/Cloud Functions).
                if (kind === 'photo' && typeof window.openAddPhotoModal === 'function') {
                    window.openAddPhotoModal();
                } else {
                    window.location.href = 'map.html?quickadd=' + kind;
                }
            });
        });
    }
    overlay.classList.add('open');
};
window.closeQuickAddSheet = function () {
    const overlay = document.getElementById('qa-sheet-overlay');
    if (overlay) overlay.classList.remove('open');
};

// Volet "Ajouter une photo" (demande du 09/09/2026) : contrairement à "I visited this
// place"/"Add a review" (qui restent liés à une fiche lieu précise dans map.html), ceci
// publie une photo autonome sur le profil — choix du lieu par recherche, date, légende
// facultative. Stockée dans publicProfiles/{uid}.photos.{id} (voir addProfilePhoto() dans
// firebase-init.js), lue à la fois par l'onglet Photos de profile.html et par feed.html.
window.openAddPhotoModal = function () {
    let overlay = document.getElementById('add-photo-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'add-photo-overlay';
        overlay.className = 'qa-sheet-overlay';
        overlay.innerHTML = `
            <div class="qa-sheet add-photo-sheet">
                <div class="qa-sheet-handle"></div>
                <div class="qa-sheet-title">${t('addPhotoTitle')}</div>
                <div class="add-photo-field">
                    <label class="add-photo-label">${t('addPhotoLocationLabel')}</label>
                    <input type="text" id="add-photo-location-input" class="add-photo-input" placeholder="${t('addPhotoLocationPlaceholder')}" autocomplete="off">
                    <div id="add-photo-location-suggestions" class="add-photo-suggestions hidden"></div>
                </div>
                <div class="add-photo-field">
                    <label class="add-photo-label">${t('addPhotoDateLabel')}</label>
                    <input type="date" id="add-photo-date-input" class="add-photo-input">
                </div>
                <div class="add-photo-field">
                    <label class="add-photo-label">${t('addPhotoPhotoLabel')}</label>
                    <input type="file" id="add-photo-file-input" accept="image/*,.heic,.heif" class="hidden">
                    <div id="add-photo-preview" class="add-photo-preview hidden"><img id="add-photo-preview-img"></div>
                    <button type="button" id="add-photo-choose-btn" class="add-photo-choose-btn">${t('addPhotoChooseBtn')}</button>
                </div>
                <div class="add-photo-field">
                    <label class="add-photo-label">${t('addPhotoCaptionLabel')}</label>
                    <textarea id="add-photo-caption-input" class="add-photo-textarea" maxlength="280" placeholder="${t('addPhotoCaptionPlaceholder')}"></textarea>
                </div>
                <div id="add-photo-error" class="add-photo-error hidden"></div>
                <button type="button" id="add-photo-submit-btn" class="add-photo-submit-btn">${t('addPhotoSubmitBtn')}</button>
                <button type="button" class="qa-sheet-cancel">${t('quickAddCancel')}</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) window.closeAddPhotoModal(); });
        overlay.querySelector('.qa-sheet-cancel').addEventListener('click', window.closeAddPhotoModal);

        const dateInput = overlay.querySelector('#add-photo-date-input');
        const locInput = overlay.querySelector('#add-photo-location-input');
        const suggestionsEl = overlay.querySelector('#add-photo-location-suggestions');
        const fileInput = overlay.querySelector('#add-photo-file-input');
        const chooseBtn = overlay.querySelector('#add-photo-choose-btn');
        const errorEl = overlay.querySelector('#add-photo-error');
        let selectedLocation = null;
        let pendingPhoto = null;

        locInput.addEventListener('input', () => {
            selectedLocation = null;
            const q = locInput.value.trim().toLowerCase();
            if (!q || typeof celebLocations === 'undefined') { suggestionsEl.classList.add('hidden'); suggestionsEl.innerHTML = ''; return; }
            const matches = celebLocations.filter(l => l.name.toLowerCase().includes(q)).slice(0, 8);
            if (!matches.length) { suggestionsEl.classList.add('hidden'); suggestionsEl.innerHTML = ''; return; }
            suggestionsEl.innerHTML = matches.map(l =>
                `<div class="add-photo-suggestion" data-id="${l.id}">${escapeHtml(l.name)}<span class="add-photo-suggestion-meta">${escapeHtml([l.city, l.country].filter(Boolean).join(', '))}</span></div>`
            ).join('');
            suggestionsEl.classList.remove('hidden');
            suggestionsEl.querySelectorAll('.add-photo-suggestion').forEach(row => {
                row.addEventListener('click', () => {
                    const loc = celebLocations.find(l => l.id === Number(row.dataset.id));
                    if (loc) { selectedLocation = loc; locInput.value = loc.name; }
                    suggestionsEl.classList.add('hidden');
                });
            });
        });

        chooseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            errorEl.classList.add('hidden');
            try {
                pendingPhoto = await fileToResizedDataUrl(file, 900);
                const preview = overlay.querySelector('#add-photo-preview');
                preview.querySelector('img').src = pendingPhoto;
                preview.classList.remove('hidden');
                chooseBtn.textContent = t('addPhotoChangeBtn');
            } catch (err) {
                console.warn('Import de la photo échoué :', err);
                errorEl.textContent = currentLang === 'fr' ? "Impossible d'importer cette photo. Essayez un autre fichier (format JPEG/PNG)." : "Couldn't import this photo. Try a different file (JPEG/PNG format).";
                errorEl.classList.remove('hidden');
            }
            e.target.value = '';
        });

        overlay.querySelector('#add-photo-submit-btn').addEventListener('click', async () => {
            errorEl.classList.add('hidden');
            if (!selectedLocation) { errorEl.textContent = t('addPhotoErrorLocation'); errorEl.classList.remove('hidden'); return; }
            if (!pendingPhoto) { errorEl.textContent = t('addPhotoErrorPhoto'); errorEl.classList.remove('hidden'); return; }
            if (typeof window.addProfilePhoto !== 'function') {
                errorEl.textContent = t('addPhotoErrorGeneric');
                errorEl.classList.remove('hidden');
                return;
            }
            const submitBtn = overlay.querySelector('#add-photo-submit-btn');
            submitBtn.disabled = true;
            const result = await window.addProfilePhoto({
                locationId: selectedLocation.id,
                locationName: selectedLocation.name,
                photo: pendingPhoto,
                date: dateInput.value,
                caption: overlay.querySelector('#add-photo-caption-input').value.trim()
            });
            submitBtn.disabled = false;
            if (result && result.success) {
                window.closeAddPhotoModal();
                if (typeof window.showSimpleToast === 'function') window.showSimpleToast(t('addPhotoSuccess'));
                selectedLocation = null; pendingPhoto = null;
                locInput.value = '';
                dateInput.value = new Date().toISOString().split('T')[0];
                overlay.querySelector('#add-photo-caption-input').value = '';
                overlay.querySelector('#add-photo-preview').classList.add('hidden');
                chooseBtn.textContent = t('addPhotoChooseBtn');
            } else {
                errorEl.textContent = t('addPhotoErrorGeneric');
                errorEl.classList.remove('hidden');
            }
        });

        dateInput.value = new Date().toISOString().split('T')[0];
    }
    overlay.classList.add('open');
};
window.closeAddPhotoModal = function () {
    const overlay = document.getElementById('add-photo-overlay');
    if (overlay) overlay.classList.remove('open');
};

document.addEventListener('DOMContentLoaded', () => {
    injectMobileBottomNav();
    injectMobileTopIcons();
    injectLocVisitorsChevron();
    // Relais de l'animation d'entrée glissée depuis la page précédente (voir stNavigate
    // ci-dessus) : posé côté page de départ, consommé une seule fois ici.
    try {
        if (sessionStorage.getItem('stNavEnter')) {
            sessionStorage.removeItem('stNavEnter');
            document.body.classList.add('stnav-entering');
            setTimeout(() => document.body.classList.remove('stnav-entering'), 250);
        }
    } catch (e) {}
});

// Filet de sécurité bfcache (demande du 11/09/2026, piste secondaire du bug "le site ne
// fonctionne plus après avoir un peu navigué") : stnav-leaving est posée AVANT de quitter
// la page (voir stNavigate ci-dessus) avec une animation en fill-mode:forwards (voir
// .stnavSlideOut dans style.css), donc l'état "glissé hors écran / opacité 0" PERSISTE une
// fois l'animation finie. Elle n'est normalement retirée QUE par le DOMContentLoaded de la
// page suivante — qui ne se déclenche jamais si le retour en arrière (geste natif, bouton
// précédent) restaure cette même page depuis le bfcache du navigateur plutôt que de la
// recharger. Résultat possible : revenir sur une page mobile où tout le contenu reste
// invisible/inerte, qui a tout l'air d'un site "cassé" sans la moindre erreur JS.
window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.body.classList.remove('stnav-leaving', 'stnav-entering');
});

// Bouton "Log out" de la fenêtre de précaution "aucun pass débloqué" (map.html).
document.addEventListener('DOMContentLoaded', () => {
    const gateLogoutLink = document.getElementById('gate-logout-link');
    if (gateLogoutLink) {
        gateLogoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            const finish = () => { localStorage.clear(); window.location.href = 'index.html'; };
            if (typeof window.firebaseSignOut === 'function') {
                let settled = false;
                const settleOnce = () => { if (!settled) { settled = true; finish(); } };
                window.firebaseSignOut().then(settleOnce).catch(settleOnce);
                setTimeout(settleOnce, 2500);
            } else {
                finish();
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // .mbn-avatar : icône avatar de la nav du bas mobile (voir injectMobileBottomNav()
    // plus bas) — même logique photo/initiale que .user-avatar-btn, plus une couleur de
    // fond déterministe (comme profile.html) quand il n'y a pas de photo, faute de quoi
    // elle resterait transparente/invisible.
    const userAvatarEls = document.querySelectorAll('.user-avatar-btn, .mbn-avatar');
    if (userAvatarEls.length > 0) {
        const savedPhoto = localStorage.getItem('userPhoto');
        // Initiale de l'avatar : prénom en priorité (comme Google), sinon pseudo.
        const firstName = (localStorage.getItem('userFirstName') || '').trim();
        const userName = (localStorage.getItem('userName') || 'U').trim();
        const avatarInitial = (firstName || userName || 'U').charAt(0).toUpperCase();
        const avatarPalette = ['#D42759', '#8B5CF6', '#F06090', '#10b981', '#3b82f6', '#f59e0b'];
        let avatarColorSum = 0;
        for (let i = 0; i < userName.length; i++) avatarColorSum += userName.charCodeAt(i);
        const avatarColor = avatarPalette[avatarColorSum % avatarPalette.length];

        userAvatarEls.forEach(avatarEl => {
            const isMbn = avatarEl.classList.contains('mbn-avatar');
            if (savedPhoto && savedPhoto.trim() !== '') {
                // BUG rapporté le 11/09/2026 ("cercle coloré autour de l'avatar") :
                // .mbn-item porte un padding de 6px, donc une <img> à 100%/100% ne
                // remplissait que la boîte de CONTENU (14x14px sur les 26x26px de
                // l'avatar), laissant l'avatarColor de fond visible tout autour comme un
                // anneau. position:absolute + inset:0 ignore ce padding et fait
                // vraiment remplir tout le cercle par la photo — voir position:relative
                // sur .mbn-avatar dans style.css. Fond retiré : plus besoin derrière une
                // vraie photo, et il resterait sinon visible dans les coins du carré
                // avant le rognage en cercle par border-radius.
                if (isMbn) avatarEl.style.background = 'none';
                avatarEl.innerHTML = `<img src="${savedPhoto}" alt="Profile" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius:50%; border:none;">`;
                avatarEl.style.color = 'transparent';
            } else {
                if (isMbn) avatarEl.style.background = avatarColor;
                avatarEl.innerHTML = '';
                avatarEl.textContent = avatarInitial;
            }
        });
    }

    if (document.getElementById('map') && typeof L !== 'undefined' && !map) {
        // Centré par défaut sur le pays de résidence renseigné à l'inscription (lu en
        // local pour éviter tout clignotement le temps que Firebase confirme la session ;
        // voir le listener "firebase-ready" plus bas pour la mise à jour si le compte
        // cloud a une valeur différente/plus fraîche).
        const initialCenter = window.getMapCenterForCountry ? window.getMapCenterForCountry(localStorage.getItem('userCountry')) : [37.541, 127.025, 7];
        map = L.map('map', { zoomControl: false }).setView([initialCenter[0], initialCenter[1]], initialCenter[2]);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        const mainTileLayer = createOSMTileLayer(map).addTo(map);
        markerGroup = L.layerGroup().addTo(map);
        // La bulle de résumé au survol (voir showMapHoverTip/addSingleLocationMarker) est
        // positionnée par rapport aux pixels de la carte au moment du survol : si la carte
        // bouge pendant qu'elle est ouverte (pan, zoom), on la ferme plutôt que de la
        // laisser dériver loin du marqueur qu'elle décrivait.
        map.on('movestart zoomstart', () => { if (typeof hideMapHoverTip === 'function') hideMapHoverTip(); });

        // Voile de chargement (voir .map-loading-overlay, style.css) : masqué dès que
        // les tuiles de la vue actuelle ont fini de charger (succès ou échec — à ce
        // stade attachOSMFallback() a eu la main pour basculer sur le repli), avec un
        // filet de sécurité à 6s pour ne jamais rester bloqué affiché indéfiniment si
        // l'évènement ne se déclenche pas pour une raison quelconque.
        const mapLoadingOverlay = document.getElementById('map-loading-overlay');
        if (mapLoadingOverlay) {
            mapLoadingOverlay.classList.remove('hidden');
            const hideMapLoadingOverlay = () => mapLoadingOverlay.classList.add('hidden');
            mainTileLayer.on('load', hideMapLoadingOverlay);
            setTimeout(hideMapLoadingOverlay, 6000);
        }

        // Si Leaflet s'initialise avec un conteneur qui n'a pas encore sa taille finale
        // (fréquent sur mobile : barre d'adresse qui se rétracte après le premier rendu,
        // police qui finit de charger, etc.), la carte reste visuellement "coincée" —
        // grise ou mal centrée — jusqu'à ce qu'une interaction manuelle (zoom, pan) force
        // Leaflet à recalculer. On corrige ça de deux façons : plusieurs appels différés à
        // invalidateSize() (pas un seul, au cas où la taille ne soit toujours pas stable au
        // premier essai), et on réapplique le centrage voulu à chaque fois TANT QUE la
        // personne n'a pas encore touché la carte elle-même (sinon invalidateSize() se contente
        // de garder le centre géographique déjà affiché, qui peut être faux si la toute
        // première mesure de taille était elle-même fausse).
        let mapUserInteracted = false;
        map.on('dragstart zoomstart', () => { mapUserInteracted = true; });
        const resettleMap = () => {
            if (!map) return;
            map.invalidateSize();
            if (!mapUserInteracted) map.setView([initialCenter[0], initialCenter[1]], initialCenter[2]);
        };
        [200, 600, 1200].forEach(delay => setTimeout(resettleMap, delay));

        // Sur mobile, plusieurs choses peuvent faire que la taille réelle du conteneur
        // #map ne corresponde plus à ce que Leaflet a mesuré en dernier — la barre
        // d'adresse du navigateur qui apparaît/disparaît au scroll (Safari iOS en
        // particulier), le clavier virtuel, une police qui finit de charger après coup...
        // — sans que "resize" ou même "visualViewport.resize" ne se déclenchent de façon
        // fiable dans tous les cas. Plutôt que d'écouter des évènements qui peuvent
        // manquer certains de ces cas, un ResizeObserver posé directement sur le
        // conteneur de la carte réagit à TOUT changement de sa taille réellement rendue,
        // quelle qu'en soit la cause — c'est la source la plus fiable possible. On garde
        // en plus les écouteurs resize/orientationchange en repli pour les navigateurs
        // sans ResizeObserver (très rare aujourd'hui).
        const mapContainerEl = document.querySelector('.map-container');
        if (typeof ResizeObserver !== 'undefined' && mapContainerEl) {
            new ResizeObserver(resettleMap).observe(mapContainerEl);
        } else {
            window.addEventListener('resize', resettleMap);
            if (window.visualViewport) window.visualViewport.addEventListener('resize', resettleMap);
            window.addEventListener('orientationchange', () => setTimeout(resettleMap, 300));
        }

        map.on('zoomend', function() {
            const zoom = map.getZoom();
            let markerSize = 28; let iconSize = 14;
            // Avec des lieux répartis sur plusieurs continents, la carte doit parfois
            // dézoomer beaucoup pour tous les faire tenir : les marqueurs restent donc
            // visibles (avec une icône, même petite) au lieu de devenir de simples
            // anneaux à peine perceptibles.
            // Tailles légèrement réduites par rapport aux 16/22/26/32px d'origine (demande
            // du 04/09/2026 : "les boutons de location sont un peu trop gros") — mêmes
            // paliers de zoom, mêmes proportions icône/marqueur (~50%), juste ~12% plus
            // petit. Garder clusterPixelRadiusForZoom() ci-dessous en phase avec ces
            // valeurs : le seuil de regroupement des marqueurs proches est calculé à
            // partir de leur taille réelle en pixels.
            if (zoom < 4) { markerSize = 14; iconSize = 7; }
            else if (zoom < 6) { markerSize = 19; iconSize = 9; }
            else if (zoom < 9) { markerSize = 22; iconSize = 11; }
            else { markerSize = 28; iconSize = 14; }
            document.documentElement.style.setProperty('--marker-size', `${markerSize}px`);
            document.documentElement.style.setProperty('--icon-size', `${iconSize}px`);

            // Recalcule le regroupement des marqueurs proches pour le nouveau zoom (des
            // lieux fusionnés en un seul cluster peuvent redevenir individuels en
            // zoomant, et l'inverse en dézoomant) — sans reconstruire la liste latérale
            // ni relancer un fitBounds, seulement pour ce zoom-ci.
            if (!window.__tripViewActive && typeof renderMapMarkers === 'function' && Array.isArray(currentFilteredLocations)) {
                renderMapMarkers(currentFilteredLocations, { fitBounds: false });
            }
        });
    }

    window.toggleMobileMenu = function() {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (!sidebar.classList.contains('open')) sidebar.classList.remove('expanded');
            const isOpen = sidebar.classList.contains('open');
            // Menu ouvert sur mobile : le bouton hamburger devient un bouton "retour à la
            // carte" (icône croix) et la barre d'icônes du bas (.top-nav, demande du
            // 08/09/2026 : déplacée en bas façon Instagram, voir style.css) est masquée le
            // temps que le menu occupe tout l'écran. #mobile-menu-btn est maintenant HORS de
            // .top-nav dans le HTML (un voisin, pas un enfant), donc on le retrouve par id
            // plutôt que via btn.closest('.top-nav') qui ne le contiendrait plus.
            const btn = document.getElementById('mobile-menu-btn');
            if (btn) btn.classList.toggle('is-open', isOpen);
            const topNav = document.querySelector('.top-nav');
            if (topNav) topNav.classList.toggle('menu-open', isOpen);
            const bottomNav = document.getElementById('mobile-bottom-nav');
            if (bottomNav) bottomNav.classList.toggle('menu-open', isOpen);
            const topIcons = document.getElementById('mobile-top-icons');
            if (topIcons) topIcons.classList.toggle('menu-open', isOpen);
            const mobileSearch = document.getElementById('mobile-map-search');
            if (mobileSearch) mobileSearch.classList.toggle('menu-open', isOpen);
        }
    };

    ['lang-btn', 'profile-btn', 'cart-btn', 'friend-shares-btn', 'profile-settings-btn', 'feed-settings-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', (e) => {
            if(id === 'cart-btn') return; 
            const menuId = id.replace('-btn', '-menu');
            document.querySelectorAll('.dropdown-menu').forEach(m => { if(m.id !== menuId) m.classList.add('hidden'); });
            const targetMenu = document.getElementById(menuId);
            if(targetMenu) targetMenu.classList.toggle('hidden');
            e.stopPropagation();
        });
    });

    // Clic sur "English" / "Français" dans le menu de langue (map.html / trips.html) :
    // ce gestionnaire manquait, ce qui faisait que la traduction ne se déclenchait jamais.
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const lang = opt.getAttribute('data-lang');
            if(lang) window.changeLang(lang);
            const menu = opt.closest('.dropdown-menu');
            if(menu) menu.classList.add('hidden');
        });
    });

    document.addEventListener('click', () => { 
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden')); 
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById('tab-' + btn.dataset.tab);
            if(target) target.classList.add('active');
            if (btn.dataset.tab === 'reviews' && typeof window.loadLocationReviews === 'function' && currentLocationIdForMemory != null) {
                window.loadLocationReviews(currentLocationIdForMemory);
            }
        });
    });

    // #logout-btn (header desktop) ET #mti-logout-btn (menu engrenage mobile partagé,
    // voir injectMobileTopIcons() plus haut) : querySelectorAll plutôt que getElementById
    // pour câbler les DEUX quand une page a les deux à la fois (demande du 08/09/2026).
    document.querySelectorAll('#logout-btn, #mti-logout-btn').forEach(logoutBtn => {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const finishLogout = () => {
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('userFirstName');
                localStorage.removeItem('unlockedGroups');
                localStorage.removeItem('wishlistLocs');
                localStorage.removeItem('visitedLocs');
                localStorage.removeItem('myTrips');
                localStorage.removeItem('activeTripId');
                window.location.href = 'index.html';
            };
            // Ferme réellement la session Firebase (avant, ce bouton ne faisait que
            // vider le localStorage : la session restait active côté Firebase, donc
            // la personne restait connectée malgré elle en revenant sur le site).
            // BUG rapporté le 11/09/2026 ("le bouton logout ne fonctionne pas sur
            // mobile") : sur un réseau mobile lent/instable, signOut(auth) peut rester
            // en attente sans jamais résoudre ni rejeter — le .then/.catch ne se
            // déclenche alors jamais et rien ne se passe, sans le moindre message
            // d'erreur. Un filet de secours à 2.5s garantit que finishLogout()
            // s'exécute de toute façon (localStorage vidé + redirection), même si la
            // session Firebase elle-même n'a pas eu le temps de se fermer proprement.
            if (typeof window.firebaseSignOut === 'function') {
                let settled = false;
                const settleOnce = () => { if (!settled) { settled = true; finishLogout(); } };
                window.firebaseSignOut().then(settleOnce).catch(settleOnce);
                setTimeout(settleOnce, 2500);
            } else {
                finishLogout();
            }
        });
    });

    // Barre de recherche rapide mobile de map.html (demande du 11/09/2026, #mobile-map-search
    // dans map.html) : recherche directement dans celebLocations (nom/ville/pays/groupe/
    // membre) sans passer par le menu complet, avec un petit menu de résultats cliquables.
    // N'existe que sur map.html — pas d'effet ailleurs (querySelector renvoie null).
    const mobileSearchInput = document.getElementById('mobile-map-search-input');
    const mobileSearchResults = document.getElementById('mobile-map-search-results');
    if (mobileSearchInput && mobileSearchResults) {
        const renderMobileSearchResults = () => {
            const q = mobileSearchInput.value.trim().toLowerCase();
            if (!q) { mobileSearchResults.classList.add('hidden'); mobileSearchResults.innerHTML = ''; return; }
            const matches = (typeof celebLocations !== 'undefined' ? celebLocations : []).filter(l =>
                (l.name || '').toLowerCase().includes(q) ||
                (l.city || '').toLowerCase().includes(q) ||
                (l.country || '').toLowerCase().includes(q) ||
                (l.group || '').toLowerCase().includes(q) ||
                (l.member || '').toLowerCase().includes(q)
            ).slice(0, 8);
            if (matches.length === 0) {
                mobileSearchResults.innerHTML = `<div class="mobile-map-search-empty">No location found</div>`;
            } else {
                mobileSearchResults.innerHTML = matches.map(l => `
                    <div class="mobile-map-search-result" data-loc-id="${l.id}">
                        <div class="mobile-map-search-result-name">${escapeHtml(l.name)}</div>
                        <div class="mobile-map-search-result-meta">${escapeHtml(l.city)}, ${escapeHtml(l.country)}</div>
                    </div>
                `).join('');
            }
            mobileSearchResults.classList.remove('hidden');
        };
        mobileSearchInput.addEventListener('input', renderMobileSearchResults);
        mobileSearchInput.addEventListener('focus', () => { if (mobileSearchInput.value.trim()) renderMobileSearchResults(); });
        mobileSearchResults.addEventListener('click', (e) => {
            const row = e.target.closest('.mobile-map-search-result');
            if (!row) return;
            const locId = Number(row.getAttribute('data-loc-id'));
            const loc = celebLocations.find(l => l.id === locId);
            mobileSearchResults.classList.add('hidden');
            mobileSearchInput.value = '';
            mobileSearchInput.blur();
            // Juste un raccourci pour retrouver un lieu sur la carte (demande du
            // 11/09/2026), pas une manière d'ouvrir sa fiche — même choix que la
            // recherche de la sidebar (#search-input) juste au-dessus dans ce fichier.
            if (loc && map) map.flyTo([loc.lat, loc.lng], 16, { duration: 0.6 });
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#mobile-map-search')) mobileSearchResults.classList.add('hidden');
        });
    }

    updateUI();

    // Si on arrive sur map.html avec ?loc=ID (depuis le bouton "More details" de
    // visited.html / wishlist.html, ou un lien partagé — bouton "Share via..." de la
    // fiche lieu), on ouvre directement la fiche du lieu concerné.
    if(document.getElementById('map')) {
        const params = new URLSearchParams(window.location.search);
        const locParam = params.get('loc');
        if(locParam) {
            // BUG rapporté le 11/09/2026 (lien partagé vers un lieu, ouvert sur un appareil
            // qui n'a pas encore de session — le cas le plus lent à charger) : un délai FIXE
            // de 700ms ne suffisait pas toujours avant que celebLocations ait fini de
            // recevoir les fusions Firestore (newLocations/locationSkeletonOverrides/
            // liveEvents, voir map.html) et que la fenêtre de connexion (#auth-gate-overlay)
            // ait fini de se refermer — la fiche s'ouvrait alors dans le vide (ou pas du
            // tout), donnant l'impression d'une page cassée/figée. On réessaie plutôt
            // jusqu'à ce que le lieu soit réellement trouvable ET que la fenêtre de connexion
            // ne bloque plus l'interaction, avec un plafond de 12s pour ne jamais attendre
            // indéfiniment (connexion Firebase qui ne répond jamais).
            const targetLocId = Number(locParam);
            const tryOpenSharedLocation = (attemptsLeft) => {
                const gateBlocking = document.body.classList.contains('auth-gate-active');
                const locExists = typeof celebLocations !== 'undefined' && celebLocations.some(l => l.id === targetLocId);
                if (!gateBlocking && locExists) {
                    if (typeof window.switchMainTab === 'function') window.switchMainTab('explore');
                    window.openDetailsPanel(targetLocId);
                    return;
                }
                if (attemptsLeft <= 0) return; // plafond atteint — abandon silencieux (comme avant ce correctif)
                setTimeout(() => tryOpenSharedLocation(attemptsLeft - 1), 300);
            };
            setTimeout(() => tryOpenSharedLocation(40), 300); // 40 x 300ms = 12s de plafond
        }
        // ?live=1 : icône "Live" de la nav du bas mobile (injectMobileBottomNav) quand on
        // n'est pas déjà sur map.html — ouvre le panneau Live/Tour dès que la page a fini
        // de s'initialiser.
        if (params.get('live')) {
            setTimeout(() => { if (typeof window.openLivePanel === 'function') window.openLivePanel(); }, 700);
        }
        // ?quickadd=photo|visited|review : icône "+" de la nav du bas mobile — pas de flux
        // dédié multi-page (le site n'a pas de backend/Cloud Functions), donc on ouvre
        // l'explorateur et on invite à choisir un lieu, où les flux d'ajout existants
        // (photo/visite/avis, voir openMemoryEditor) prennent le relais.
        const quickAddKind = params.get('quickadd');
        if (quickAddKind) {
            setTimeout(() => {
                if (typeof window.switchMainTab === 'function') window.switchMainTab('explore');
                if (typeof window.showSimpleToast === 'function') {
                    const msgByKind = {
                        photo: t('quickAddPickLocationPhoto'),
                        visited: t('quickAddPickLocationVisited'),
                        review: t('quickAddPickLocationReview')
                    };
                    window.showSimpleToast(msgByKind[quickAddKind] || t('quickAddPickLocation'));
                }
            }, 700);
        }
    }
});

// ==========================================
// 2. DONNÉES (ICONES ET FILTRES)
// ==========================================
const iconsSVG = {
    "Run BTS": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5h18"/><path d="M4 8.5 5.5 4h3L7 8.5"/><path d="M9.3 8.5 10.8 4h3l-1.5 4.5"/><path d="M14.7 8.5 16.2 4h3l-1.5 4.5"/><rect x="3" y="8.5" width="18" height="11.5" rx="1.5"/></svg>`,
    "Bon Voyage": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    "Restaurants": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    "Cafe": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
    "Museums": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
    "MV Location": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
    "Concerts": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "Fashion": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a8.59 8.59 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    "Pop-up Store": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    "Landmarks": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="4" y="8" rx="2" ry="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    "Default": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
};


const groupColors = { "BTS": "#8b5cf6", "Blackpink": "#ec4899", "Twice": "#f43f5e", "Seventeen": "#3b82f6", "Katseye": "#10b981", "TXT": "#f59e0b" };

const filterData = {
    "BTS": { members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"], categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks", "Pop-up Store"] },
    "Blackpink": { members: ["Jisoo", "Jennie", "Rosé", "Lisa"], categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"] },
    "General": { categories: ["Cafe", "Concerts", "Fashion", "Landmarks", "Museums", "Restaurants", "Pop-up Store"] }
};

// Catalogue statique (demande du 13/09/2026, "mets toutes les données des lieux en brut
// dans le site, je ne veux plus qu'elles soient stockées dans Firestore") : chargé depuis
// locations-data.js (voir la balise <script> juste AVANT celle de script.js sur chaque
// page), lui-même régénéré depuis Firestore par admin-scripts/export-locations.js - voir
// .github/workflows/export-locations.yml pour l'automatisation. L'admin continue
// d'éditer/ajouter des lieux exactement comme avant (icône crayon, agent IA) : ces
// écritures restent instantanées côté Firestore, seule leur PUBLICATION publique attend
// le prochain export plutôt qu'une lecture Firestore à chaque visite (voir le README de
// admin-scripts/ pour lancer un export à la demande). .slice() pour ne jamais partager la
// même référence de tableau que window.STATIC_LOCATIONS.
let celebLocations = (window.STATIC_LOCATIONS || []).slice();

// ==========================================
// Messages éphémères "nouveau lieu ajouté"
// ==========================================
// Annonce, au lancement du site (une seule fois par session de navigation — voir
// sessionStorage plus bas), quelques lieux tirés au sort parmi ceux ajoutés récemment.
// NEW_LOCATION_IDS liste les ids concernés : actuellement les 43 lieux de concert des
// tournées historiques (ids 113–155, voir plus haut) — à mettre à jour avec les ids des
// prochains lieux ajoutés le jour où on en ajoutera de nouveaux.
const NEW_LOCATION_IDS = Array.from({ length: 43 }, (_, i) => 113 + i);
const NEW_LOCATION_TOAST_LIFESPAN_MS = 6000;
const NEW_LOCATION_TOAST_GAP_MS = 3000;

// Un seul toast récapitulatif par groupe concerné (ex. "3 new locations for BTS"),
// demande du 08/09/2026 : un toast par lieu ajouté s'empilait par-dessus la barre
// d'icônes du bas sur mobile. Icône SVG (pas d'emoji, convention du site).
function renderNewLocationsSummaryToast(count, group) {
    const container = document.getElementById('new-location-toast-container');
    if (!container) return;
    const title = t('newLocationsSummaryToast').replace('{n}', count).replace('{group}', group || '');

    const el = document.createElement('div');
    el.className = 'new-location-toast';
    el.innerHTML = `
        <div class="new-location-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="new-location-toast-body">
            <div class="new-location-toast-label">${t('newLocationToastLabel')}</div>
            <div class="new-location-toast-title"></div>
        </div>
        <button class="new-location-toast-close" type="button" aria-label="Close">&times;</button>
    `;
    el.querySelector('.new-location-toast-title').textContent = title;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    const dismiss = () => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 350);
    };
    el.querySelector('.new-location-toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, NEW_LOCATION_TOAST_LIFESPAN_MS);
}

// Purement informatif/public (comme le Mode Tournée) : ne dépend d'aucune donnée de
// compte, affiché à l'identique pour un visiteur en mode démo ou un compte réel.
window.showNewLocationToasts = function () {
    if (sessionStorage.getItem('newLocationToastsShown')) return;
    const container = document.getElementById('new-location-toast-container');
    if (!container) return;
    const pool = NEW_LOCATION_IDS.map(id => celebLocations.find(l => l.id === id)).filter(Boolean);
    if (!pool.length) return;
    sessionStorage.setItem('newLocationToastsShown', '1');

    // Regroupées par groupe/artiste concerné plutôt qu'une notification par lieu.
    const byGroup = new Map();
    pool.forEach(loc => {
        const key = loc.group || '';
        byGroup.set(key, (byGroup.get(key) || 0) + 1);
    });
    let i = 0;
    byGroup.forEach((count, group) => {
        setTimeout(() => renderNewLocationsSummaryToast(count, group), i * NEW_LOCATION_TOAST_GAP_MS + 1200);
        i++;
    });
};


// ==========================================
// 3. LOGIQUE UI ET TRADUCTIONS
// ==========================================
const translations = {
    en: { 
        btnGenerateIti: "Auto-Itinerary Generator", filterGroup: "GROUP", filterMember: "MEMBER", filterArea: "AREA", filterYear: "YEAR", filterCategories: "CATEGORIES", 
        locationsCount: "LOCATIONS", statsCountries: "COUNTRIES", cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", 
        cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept",
        exploreDestOption: "Explore Destinations", exploreArtistsOption: "Explore Artists", accountOption: "Your Account",
        visitedOption: "Visited", wishlistOption: "My Wishlist", tripsOption: "My Trips", friendsOption: "Friends", settingsOption: "Settings", logoutOption: "Logout",
        footerText: "Screen To Street is an independent fan-made guide.", footerMentions: "Legal Notice", footerAbout: "About Us", footerTOS: "Terms of Service", footerPrivacy: "Privacy Policy",
        allGroups: "All Groups", allMembers: "All Members", allAreas: "All Areas", allYears: "All Years", allCategories: "All Categories",
        checkVisited: "I visited this place", checkWishlist: "Add to Wishlist", tripWhich: "Which trip is this for?",
        tripName: "Trip name", tripWhen: "When are you planning to go?", tripFrom: "From", tripTo: "To", tripCreate: "Create trip", tripCancel: "Cancel",
        itiTitle: "Auto-Itinerary Generator", itiDesc: "Select a group, a country, and how many days you stay.", itiCreateBtn: "Create My Guide", itiCatLabel: "Categories (optional, select multiple)", itiExport: "Export Guide as PDF", itiSave: "Save to My Trips",
        searchTripsPlaceholder: "Search your trips...", noTripsFound: "No trips found.", selectTripToView: "Select a trip to view", deselectTripOption: "— No trip selected —", locationsWord: "location", locationsWordPlural: "locations",
        addAnotherVisit: "Add another visit",
        tabExplore: "Explore", tabMyItinerary: "My Itinerary", yourRating: "Your rating", foodQualityRating: "Food quality", valueForMoneyRating: "Value for money", accessibilityRating: "Easy to access?", siteQualityRating: "Site quality", wishlistStat: "{pct}% of users added this place to their wishlist", friendsVisitedStat: "{count} friends have visited this place", friendsVisitedStatOne: "1 friend has visited this place", whenDidYouVisit: "When did you visit?", saveMemory: "Save memory", myVisitTab: "My Visit", tabReviews: "Reviews", tabInfo: "Info", tabStory: "Story", lGroup: "Group:", lMembers: "Members:", lCountry: "Country:", lCity: "City:", lDate: "Date:", lEpisode: "Episode:", lWatch: "Watch:", lOfficialLink: "Official Link", lFollow: "Follow:", lWatchEpi: "On Screen", lPractical: "Practical information & access", lAddress: "Address", lOpenMap: "Open in Google Maps", lStoryPlace: "The story of this place", lStoryBts: "Following in BTS's footsteps", lTipsTitle: "THE \"SCREEN TO STREET\" TIPS", lHowToGetThere: "How to get there:", memoryNotesLabel: "Your notes (optional)", memoryNotesPlaceholder: "What do you remember about this place?", reviewsCountLabel: "{n} public reviews", reviewsWriteLabel: "Write your review", reviewsComposePlaceholder: "Share what you thought...", reviewsComposeMakePublic: "Make this public", reviewsComposePost: "Post review", memoryPhotoLabel: "Add a photo (optional)", memoryPhotoChoose: "Choose a photo", memoryPhotoRemove: "Remove", memoryMakePublic: "Make this review public (visible to other users)", reviewsLoading: "Loading reviews…", reviewsEmpty: "No public reviews yet for this place — be the first to share yours from the \"My Visit\" tab!", shareTripSub: "Plan it together", shareTripInvite: "Invite", shareTripHint: "Tap the icon next to a name to switch between edit and view-only access.",
        backToMap: "← Back to Map", moreDetails: "More details", openInMaps: "Open in Google Maps", detailsLabel: "Details", aboutPlaceLabel: "About this place",
        accTitle: "Your Account", accChangePhoto: "Change Profile Picture", accResetPhoto: "Reset profile picture", accNameLabel: "Username", accChangeUsernameHint: "Change username", accEmailLabel: "Email address", accBioLabel: "Bio", accBioPlaceholder: "Write a short bio...", accBioSaveBtn: "Save bio",
        accCountryLabel: "Country you're interested in", accCountryPlaceholder: "Select a country (optional)",
        accActivityTitle: "Your activity", accTrips: "Trips", accVisited: "Visited", accWishlist: "Wishlist", accPasses: "Passes & billing",
        friendsTitle: "Friends", openFriendsMessagesLink: "Open Friends & Messages →", friendsAddPlaceholder: "Add a friend by username", friendsAddBtn: "Add", friendsRequestsLabel: "Friend requests", friendsListLabel: "Your friends", friendsEmpty: "No friends yet — add one by their username above.", friendsAccept: "Accept", friendsDecline: "Decline", friendsCancel: "Cancel", friendsRemove: "Remove", friendsErrNotFound: "No user found with that username.", friendsErrSelf: "You can't add yourself.", friendsErrAlreadySent: "You already sent a friend request to this person.", friendsErrAlreadyFriends: "You're already friends.", friendsErrGeneric: "Couldn't send the request. Please try again.", friendsSentLabel: "Sent — waiting for a response", friendsRequestFrom: "{username} wants to be friends", shareWithFriendBtn: "Share", shareViaOption: "Share via...", shareNoFriends: "Add a friend first to share locations.", sharesEmpty: "Nothing shared with you yet.", sharedByLabel: "{username} shared {location}", friendsPageTitle: "Friends & Messages", tripGroupsLabel: "Trip groups", directMessagesLabel: "Direct messages", noTripGroups: "No shared trips yet — share one from a conversation.", noFriendsForDm: "Add a friend to start messaging.", selectConversationPrompt: "Select a conversation to start chatting", messagePlaceholder: "Message...", sendBtn: "Send", tripGroupOwner: "You created this trip", tripGroupMember: "Shared with you", shareTripBtn: "Share a trip", shareTripPickTitle: "Choose a trip to share", noOwnedTrips: "You don't have any trips yet.", viewItineraryLink: "View itinerary", chatForTripLabel: "Group chat for this trip", friendRequestSentToast: "Friend request sent", tripInvitesLabel: "Trip invites", tripInviteFrom: '{username} invited you to join "{tripname}"', addTripMemberOption: "Add member", renameTripGroupOption: "Rename group", leaveTripGroupOption: "Leave group", deleteConvoBtn: "Delete conversation", deleteMessageOption: "Delete message", attachLocationTitle: "Share a location", attachPollTitle: "Create a poll", attachPollCreateBtn: "Create poll", attachLocationOption: "Share a location", attachTripOption: "Share a trip", attachPollOption: "Create a poll",
        accEditBtn: "Edit Profile", accSaveBtn: "Save Changes", accSaved: "✓ Saved Successfully", accNoPasses: "No active passes", accAmountPaid: "Amount paid", accGuestUsername: "Not signed in",
        accDangerZone: "Danger zone",
        accDeleteConfirmTitle: "Are you sure you want to delete your account?",
        accDeleteConfirmBody: "This action is permanent. You will not be refunded for any unlocked passes, and all your data — trips, wishlist, and visited places — will be permanently lost.",
        accDeletePasswordLabel: "Confirm your password", accDeleteCancel: "Cancel", accDeleteConfirmBtn: "Yes, delete my account",
        accDeleteGoogleReauthNote: "For your security, Google needs to confirm it's really you before we permanently delete your account. Click \"Confirm with Google\" below.",
        setTitle: "Settings", setSecurity: "Account & Security", setPassword: "Password", setPasswordSub: "Last changed 3 months ago", setChange: "Change",
        setChangePwTitle: "Change your password", setChangePwGoogleNote: "Your account uses Google Sign-In, so it has no Screen To Street password to change — manage it from your Google Account instead.", setCurrentPwLabel: "Current password", setNewPwLabel: "New password", setConfirmPwLabel: "Confirm new password", setChangePwBtn: "Change password",
        setSignedWith: "Signed in with", setPreferences: "Preferences", setLanguage: "Language", setCurrency: "Currency", setUnits: "Distance units",
        setEmailNotif: "Email notifications", setPushNotif: "Push notifications", setPrivacy: "Privacy", setCookiePrefs: "Cookie Preferences",
        setResetBanners: "Reset Banners", setDownloadData: "Download my data", setExportSub: "Export everything in JSON", setExport: "Export",
        setManage: "Manage", setNotifConfirmTitle: "Enable email notifications?", setNotifConfirmBody: "By enabling this, you agree to receive an email whenever new locations are added — at an interval that depends on how active the artist currently is (more frequent during a comeback or tour, quieter otherwise). Choose which groups and countries you care about below.", setNotifEnableBtn: "Enable", setPushNotifConfirmTitle: "Enable push notifications?", setPushNotifConfirmBody: "By enabling this, you agree to receive a push notification whenever new locations are added — at an interval that depends on how active the artist currently is (more frequent during a comeback or tour, quieter otherwise). Choose which groups and countries you care about below.", setNotifGroupsLabel: "Notify me for these groups", setNotifCountryLabel: "Notify me for these countries", setNotifAllCountries: "All countries", setNotifSearchCountry: "Search countries...", setCookiePrefsTitle: "Cookie Preferences", setCookiePrefsBody: "Necessary cookies keep the site working (login, saved wishlist) and can't be turned off. You choose whether we also use cookies to remember your preferences across visits.", setCookieNecessary: "Necessary", setCookieNecessarySub: "Always active", setCookieAnalytics: "Preferences & analytics", setCookieAnalyticsSub: "Remember your choices between visits", setSavePreferences: "Save preferences",
        setDanger: "Danger zone", setDeleteAccTitle: "Delete account", setDeleteAccSub: "This permanently deletes your trips, wishlist and unlocked passes.", setDeleteAccBtn: "Delete Account",
        wishTitle: "My Wishlist", wishEmpty: "You haven't saved any places yet. Explore the map and click \"Add to Wishlist\"!", wishSomeday: "Someday / No trip yet",
        visitTitle: "Visited", visitEmpty: "You haven't marked any place as visited yet. Explore the map and check \"I visited this place\"!",
        destTitle: "Explore Destinations", destSub: "Browse every country and city featured on Screen To Street", destCountries: "Countries", destCities: "Cities", destLocations: "Locations", destViewMap: "View on Map →",
        artTitle: "Explore Artists", artSub: "Discover every group featured on Screen To Street", artGroups: "Groups", artFeatured: "Featured group",

        gateLoginTitle: "Log in to continue", gateLoginDesc: "Log in if you already have an account, or sign up if you don't. You can also continue without an account — 3 locations included, free.", gateContinueFreeText: "Prefer not to create an account?", gateContinueFreeLink: "Continue free — 3 locations included",
        gateEmailLabel: "Email address", gateEmailOrUsernameLabel: "Email or username", gatePasswordLabel: "Password", gateForgotPassword: "Forgot password?",
        gateLoginBtn: "Log in", gateOrDivider: "OR", gateGoogleBtn: "Continue with Google",
        gateSignupPrompt: "Don't have an account?", gateSignupLink: "Sign up",
        gateNoGroupsTitle: "Unlock a group to see the map", gateNoGroupsDesc: "You haven't unlocked any group yet. Click below to choose a pass and start exploring.",
        gateUnlockBtn: "Unlock a group", gateLogoutLink: "Log out",
        gateErrorInvalid: "Incorrect email or password.", gateErrorGeneric: "Something went wrong. Please try again.",
        gateResetSent: "Password reset email sent — check your inbox.", gateEnterEmailFirst: "Please enter your email address first.",
        tourModeLiveIn: "Live now — BTS is live in {city}", tourModeSchedule: "Tour Schedule", tourModeLive: "Live", tourModeDone: "Done", tourModeUpcoming: "Upcoming", tourModePrev: "Previous", tourModeNext: "Next",
        tourModeFooterNote: "Dates as announced by the tour — always double-check official ticketing sites before booking travel.",
        liveBadgeLabel: "Live", liveTimelineTitle: " & upcoming", liveTimelineEmpty: "Nothing scheduled right now — check back soon.", liveTimelineFooterNote: "Only official, publicly announced activities — dates as announced, always double-check official sources before booking travel.", liveViewList: "List", liveViewCalendar: "Calendar", liveFilterAll: "All", liveTodayLive: "Today · Live", liveKindGroup: "Group", liveKindSolo: "Solo", newBadgeLabel: "New", usernameCooldownNote: "You can only change this once every 7 days.", usernameConfirmTitle: "Change your username?", usernameConfirmCancel: "Cancel", usernameConfirmOk: "Yes, change it", subtitle: "Following the footsteps of your favorite artists", backToList: "← Back to list", chooserTourOption: "Tour route", chooserLiveOption: "All live activity", tripShareThis: "+ Share this trip", tripChangeCoverBtn: "Change cover", tripDepartureLabel: "Departure", tripReturnLabel: "Return", tripApplyDatesBtn: "Apply", tripLeaveTitle: "Leave this shared trip?", tripLeaveDesc: "Are you sure you want to leave this trip? You'll need a new invite to rejoin.", tripLeaveCancel: "Cancel", tripLeaveConfirm: "Leave", locationSharesLabel: "Shared with you", locationShareFrom: "{username} shared {location} with you", tabTourMode: "Tour", profileTabPhotos: "Photos", profileTabVisited: "Visited", profileTabReviews: "Reviews", profileTabMap: "Map", profileMapHeading: "Here's where I've been", profileStatVisited: "visited", profileStatPhotos: "photos", profileStatReviews: "reviews", profileStatFollowers: "followers", quickAddTitle: "Add to Screen To Street", quickAddPhoto: "Add a photo", quickAddVisited: "Add a visited place", quickAddReview: "Add a review", quickAddCancel: "Cancel", profileFollowBtn: "Follow", profileFollowingBtn: "Following", profileBioSaved: "Bio saved.", profileEditBtn: "Edit profile", addPhotoTitle: "Add a photo", addPhotoLocationLabel: "Location", addPhotoLocationPlaceholder: "Search a location...", addPhotoDateLabel: "Visit date", addPhotoPhotoLabel: "Photo", addPhotoChooseBtn: "Choose a photo", addPhotoChangeBtn: "Change photo", addPhotoCaptionLabel: "Caption (optional)", addPhotoCaptionPlaceholder: "Say something about this photo...", addPhotoSubmitBtn: "Publish", addPhotoErrorLocation: "Please pick a location.", addPhotoErrorPhoto: "Please choose a photo.", addPhotoErrorGeneric: "Couldn't publish this photo. Please try again.", addPhotoSuccess: "Photo published.", quickAddPickLocation: "Search for a place below to continue.", quickAddPickLocationPhoto: "Pick a place below to add a photo.", quickAddPickLocationVisited: "Pick a place below to mark it as visited.", quickAddPickLocationReview: "Pick a place below to write a review.", profileAddFriendBtn: "Add friend", profileFriendsLabel: "Friends", profileRequestSentLabel: "Request sent", profileAcceptRequestBtn: "Accept request", profileEmptyPhotos: "No public photos yet.", profileEmptyVisited: "No visited places yet.", profileEmptyReviews: "No public reviews yet.", profileNotFound: "This user could not be found.", profileLoading: "Loading profile…", backToFriends: "← Back to Friends", profileMenuOption: "Your Profile", switchArtistLabel: "Switch artist", groupNoDataYet: "No tour or live data available yet for {group} — check back soon.", tripInviteLabel: "Invite people (optional)", shareTripUsernamePlaceholder: "Their username",
        tourModeGenericLabel: "Tour", tourModeMemberLiveIn: "{member} is live now — {event} in {city}", tourModeLiveNowOne: "Live now", tourModeLiveNowCount: "{n} live now", tourModeMoreCount: "+{n} more",
        tourModeEyebrow: "Tour Mode", tourModeChooseTour: "Choose a tour", tourModeStep: "Step {n} of {total}",
        tourModeHighlights: "Highlights", tourModeSurpriseSong: "Surprise song:", tourModeNoHighlightsYet: "No highlights added yet for this show.", tourModeNoSurpriseSongYet: "Not announced yet.",
        mapLoading: "Loading map…",
        demoTourBtn: "Tour",
        newLocationToastLabel: "New location added", newLocationsSummaryToast: "{n} new locations for {group}",
        paywallTitle: "You've reached your free limit (3/3)", paywallBody: "Loving the secret map? There are still 500+ addresses left to discover! Unlock every filming location, iconic restaurant, and address your idols frequent to plan the trip of your dreams.",
        paywallMonthlyName: "TRAVEL PASS (1 Month)", paywallMonthlyDesc: "Perfect for planning a short trip.", paywallFeatureFullAccess: "Full access to 500+ addresses", paywallFeatureGPS: "Exact GPS coordinates", paywallMonthlyPrice: "€9.99 / month", paywallMonthlyTerms: "No commitment", paywallBuyMonthly: "Get the Travel Pass",
        paywallVipName: "VIP PASS (Lifetime Access)", paywallVipBadge: "BEST VALUE", paywallVipDesc: "For true fans. Pay once, enjoy forever.", paywallFeatureUpdates: "Updates included (new locations added monthly)", paywallFeatureOffline: "Offline mode (coming soon)", paywallVipPrice: "€19.99 (one-time payment)", paywallBuyVip: "Get the VIP Pass",
        paywallActiveTitle: "You already have an active pass",
        paywallActiveDescMonthly: "Your Travel Pass is active until {date}. Thanks for supporting Screen To Street!", paywallActiveDescVip: "Your VIP Pass gives you lifetime access. Thanks for supporting Screen To Street!",
        freeViewsCounter: "{remaining}/3 free locations left",
        paymentTitle: "Complete your purchase", paymentDesc: "Enter your payment details to unlock the full guide.", paymentSummaryLabel: "Selected pass:", paymentTotalLabel: "Total due:",
        cardNum: "Card Number", expiry: "Expiry Date", cvc: "CVC", paySecurely: "Pay securely", processing: "Processing securely…", paymentBackLink: "← Back to map",
        paymentNoAccountWarning: "You don't seem to be logged in — ", paymentNoAccountLink: "sign up first",
        privacyLabel: "Account privacy", privacyPublicLabel: "Public", privacyPublicDesc: "Anyone can follow you and see your posts.", privacyPrivateLabel: "Private", privacyPrivateDesc: "Only friends you accept can see your posts.", accPrivacySaved: "Privacy setting saved.",
        profilePrivateTitle: "This account is private", profilePrivateDesc: "Send a friend request to see their photos, map and reviews.", profileFollowingBtnShort: "Friends",
        friendsTabMessages: "Messages", friendsTabNotifications: "Notifications", friendsTabGroups: "Groups", notificationsEmpty: "Nothing new right now."
    },
    fr: {
        btnGenerateIti: "Générateur Itinéraire", filterGroup: "GROUPE", filterMember: "MEMBRE", filterArea: "RÉGION", filterYear: "ANNÉE", filterCategories: "CATÉGORIES", 
        locationsCount: "LIEUX", statsCountries: "PAYS", cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", 
        cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter",
        exploreDestOption: "Explorer les Destinations", exploreArtistsOption: "Explorer les Artistes", accountOption: "Mon Compte",
        visitedOption: "Mes Lieux Visités", wishlistOption: "Ma Wishlist", tripsOption: "Mes Voyages", friendsOption: "Amis", settingsOption: "Paramètres", logoutOption: "Déconnexion",
        footerText: "Screen To Street est un guide indépendant créé par des fans.", footerMentions: "Mentions légales", footerAbout: "Qui sommes-nous", footerTOS: "CGU", footerPrivacy: "Confidentialité",
        allGroups: "Tous les groupes", allMembers: "Tous les membres", allAreas: "Toutes les régions", allYears: "Toutes les années", allCategories: "Toutes les catégories",
        checkVisited: "J'ai visité ce lieu", checkWishlist: "Ajouter à ma Wishlist", tripWhich: "Pour quel voyage ?",
        tripName: "Nom du voyage", tripWhen: "Quand prévoyez-vous d'y aller ?", tripFrom: "De", tripTo: "À", tripCreate: "Créer", tripCancel: "Annuler",
        itiTitle: "Générateur Itinéraire", itiDesc: "Sélectionnez un groupe, un pays, et le nombre de jours.", itiCreateBtn: "Créer mon guide", itiCatLabel: "Catégories (facultatif, sélection multiple)", itiExport: "Exporter en PDF", itiSave: "Sauvegarder dans My Trips",
        searchTripsPlaceholder: "Rechercher vos voyages...", noTripsFound: "Aucun voyage trouvé.", selectTripToView: "Sélectionner un voyage", deselectTripOption: "— Aucun voyage sélectionné —", locationsWord: "lieu", locationsWordPlural: "lieux",
        addAnotherVisit: "Ajouter une autre visite",
        tabExplore: "Explorer", tabMyItinerary: "Mon Itinéraire", yourRating: "Votre note", foodQualityRating: "Qualité de la nourriture", valueForMoneyRating: "Rapport qualité/prix", accessibilityRating: "Facilement accessible ?", siteQualityRating: "Qualité du lieu", wishlistStat: "{pct}% des utilisateurs ont ajouté ce lieu à leur wishlist", friendsVisitedStat: "{count} amis ont visité cet endroit", friendsVisitedStatOne: "1 ami a visité cet endroit", whenDidYouVisit: "Quand avez-vous visité ce lieu ?", saveMemory: "Enregistrer le souvenir", myVisitTab: "Ma Visite", tabReviews: "Avis", tabInfo: "Infos", tabStory: "Histoire", lGroup: "Groupe :", lMembers: "Membres :", lCountry: "Pays :", lCity: "Ville :", lDate: "Date :", lEpisode: "Épisode :", lWatch: "Voir :", lOfficialLink: "Lien officiel", lFollow: "Suivre :", lWatchEpi: "À l'écran", lPractical: "Informations pratiques & accès", lAddress: "Adresse", lOpenMap: "Ouvrir dans Google Maps", lStoryPlace: "L'histoire de ce lieu", lStoryBts: "Sur les traces de BTS", lTipsTitle: "LES CONSEILS « SCREEN TO STREET »", lHowToGetThere: "Comment s'y rendre :", memoryNotesLabel: "Vos notes (facultatif)", memoryNotesPlaceholder: "Que retenez-vous de ce lieu ?", reviewsCountLabel: "{n} avis publics", reviewsWriteLabel: "Écrivez votre avis", reviewsComposePlaceholder: "Partagez votre avis...", reviewsComposeMakePublic: "Rendre cet avis public", reviewsComposePost: "Publier l'avis", memoryPhotoLabel: "Ajouter une photo (facultatif)", memoryPhotoChoose: "Choisir une photo", memoryPhotoRemove: "Retirer", memoryMakePublic: "Rendre cet avis public (visible par les autres utilisateurs)", reviewsLoading: "Chargement des avis…", reviewsEmpty: "Aucun avis public pour ce lieu pour l'instant — soyez le premier à partager le vôtre depuis l'onglet « Ma Visite » !", shareTripSub: "Organisez-le ensemble", shareTripInvite: "Inviter", shareTripHint: "Touchez l'icône à côté d'un nom pour basculer entre modification et lecture seule.",
        backToMap: "← Retour à la carte", moreDetails: "Plus de détails", openInMaps: "Ouvrir dans Google Maps", detailsLabel: "Détails", aboutPlaceLabel: "À propos de ce lieu",
        accTitle: "Votre compte", accChangePhoto: "Changer la photo de profil", accResetPhoto: "Réinitialiser la photo de profil", accNameLabel: "Identifiant", accChangeUsernameHint: "Changer d'identifiant", accEmailLabel: "Adresse e-mail",
        accCountryLabel: "Pays qui vous intéresse", accCountryPlaceholder: "Choisir un pays (optionnel)",
        accActivityTitle: "Votre activité", accTrips: "Voyages", accVisited: "Visités", accWishlist: "Wishlist", accPasses: "Pass et facturation",
        friendsTitle: "Amis", openFriendsMessagesLink: "Ouvrir Amis & Messages →", friendsAddPlaceholder: "Ajouter un ami par pseudo", friendsAddBtn: "Ajouter", friendsRequestsLabel: "Demandes d'ami", friendsListLabel: "Vos amis", friendsEmpty: "Pas encore d'ami — ajoutez-en un par son pseudo ci-dessus.", friendsAccept: "Accepter", friendsDecline: "Refuser", friendsCancel: "Annuler", friendsRemove: "Retirer", friendsErrNotFound: "Aucun utilisateur trouvé avec ce pseudo.", friendsErrSelf: "Vous ne pouvez pas vous ajouter vous-même.", friendsErrAlreadySent: "Vous avez déjà envoyé une demande d'ami à cette personne.", friendsErrAlreadyFriends: "Vous êtes déjà amis.", friendsErrGeneric: "Impossible d'envoyer la demande. Réessayez.", friendsSentLabel: "Envoyée — en attente de réponse", friendsRequestFrom: "{username} souhaite devenir votre ami", shareWithFriendBtn: "Partager", shareNoFriends: "Ajoutez d'abord un ami pour partager des lieux.", sharesEmpty: "Rien n'a encore été partagé avec vous.", sharedByLabel: "{username} a partagé {location}", friendsPageTitle: "Amis & Messages", tripGroupsLabel: "Groupes de voyage", directMessagesLabel: "Messages directs", noTripGroups: "Aucun voyage partagé pour l'instant — partagez-en un depuis une conversation.", noFriendsForDm: "Ajoutez un ami pour commencer à discuter.", selectConversationPrompt: "Sélectionnez une conversation pour commencer à discuter", messagePlaceholder: "Message...", sendBtn: "Envoyer", tripGroupOwner: "Vous avez créé ce voyage", tripGroupMember: "Partagé avec vous", shareTripBtn: "Partager un voyage", shareTripPickTitle: "Choisissez un voyage à partager", noOwnedTrips: "Vous n'avez pas encore de voyage.", viewItineraryLink: "Voir l'itinéraire", chatForTripLabel: "Discussion de groupe pour ce voyage", friendRequestSentToast: "Demande d'ami envoyée", tripInvitesLabel: "Invitations de voyage", tripInviteFrom: "{username} vous invite à rejoindre « {tripname} »", addTripMemberOption: "Ajouter un membre", renameTripGroupOption: "Renommer le groupe", leaveTripGroupOption: "Quitter le groupe", deleteConvoBtn: "Supprimer la conversation", deleteMessageOption: "Supprimer le message", attachLocationTitle: "Partager un lieu", attachPollTitle: "Créer un sondage", attachPollCreateBtn: "Créer le sondage", attachLocationOption: "Partager un lieu", attachTripOption: "Partager un voyage", attachPollOption: "Créer un sondage",
        accEditBtn: "Modifier le profil", accSaveBtn: "Enregistrer", accSaved: "✓ Enregistré avec succès", accNoPasses: "Aucun pass actif", accAmountPaid: "Montant payé", accGuestUsername: "Non connecté",
        accDangerZone: "Zone de danger",
        accDeleteConfirmTitle: "Êtes-vous sûr(e) de vouloir supprimer votre compte ?",
        accDeleteConfirmBody: "Cette action est définitive. Vous ne serez pas remboursé(e) pour les pass débloqués, et toutes vos données — voyages, wishlist et lieux visités — seront définitivement perdues.",
        accDeletePasswordLabel: "Confirmez votre mot de passe", accDeleteCancel: "Annuler", accDeleteConfirmBtn: "Oui, supprimer mon compte",
        accDeleteGoogleReauthNote: "Pour votre sécurité, Google doit confirmer qu'il s'agit bien de vous avant la suppression définitive de votre compte. Cliquez sur « Confirmer avec Google » ci-dessous.",
        setTitle: "Paramètres", setSecurity: "Compte et sécurité", setPassword: "Mot de passe", setPasswordSub: "Dernière modification il y a 3 mois", setChange: "Modifier",
        setChangePwTitle: "Changer votre mot de passe", setChangePwGoogleNote: "Votre compte utilise la connexion Google, il n'a donc pas de mot de passe Screen To Street à changer — gérez-le depuis votre compte Google.", setCurrentPwLabel: "Mot de passe actuel", setNewPwLabel: "Nouveau mot de passe", setConfirmPwLabel: "Confirmer le nouveau mot de passe", setChangePwBtn: "Changer le mot de passe",
        setSignedWith: "Connecté avec", setPreferences: "Préférences", setLanguage: "Langue", setCurrency: "Devise", setUnits: "Unités de distance",
        setEmailNotif: "Notifications par e-mail", setPushNotif: "Notifications push", setPrivacy: "Confidentialité", setCookiePrefs: "Préférences de cookies",
        setResetBanners: "Réinitialiser la bannière", setDownloadData: "Télécharger mes données", setExportSub: "Exporter toutes les données en JSON", setExport: "Exporter",
        setManage: "Gérer", setNotifConfirmTitle: "Activer les notifications par e-mail ?", setNotifConfirmBody: "En activant cette option, vous acceptez de recevoir un e-mail à chaque nouveau lieu ajouté — à une fréquence qui dépend de l'activité actuelle de l'artiste (plus fréquent lors d'un comeback ou d'une tournée, plus calme sinon). Choisissez ci-dessous les groupes et les pays qui vous intéressent.", setNotifEnableBtn: "Activer", setPushNotifConfirmTitle: "Activer les notifications push ?", setPushNotifConfirmBody: "En activant cette option, vous acceptez de recevoir une notification push à chaque nouveau lieu ajouté — à une fréquence qui dépend de l'activité actuelle de l'artiste (plus fréquent lors d'un comeback ou d'une tournée, plus calme sinon). Choisissez ci-dessous les groupes et les pays qui vous intéressent.", setNotifGroupsLabel: "Me notifier pour ces groupes", setNotifCountryLabel: "Me notifier pour ces pays", setNotifAllCountries: "Tous les pays", setNotifSearchCountry: "Rechercher un pays...", setCookiePrefsTitle: "Préférences de cookies", setCookiePrefsBody: "Les cookies nécessaires font fonctionner le site (connexion, wishlist sauvegardée) et ne peuvent pas être désactivés. Vous choisissez si on utilise aussi des cookies pour mémoriser vos préférences d'une visite à l'autre.", setCookieNecessary: "Nécessaires", setCookieNecessarySub: "Toujours actifs", setCookieAnalytics: "Préférences et analyse", setCookieAnalyticsSub: "Mémorise vos choix d'une visite à l'autre", setSavePreferences: "Enregistrer les préférences",
        setDanger: "Zone de danger", setDeleteAccTitle: "Supprimer le compte", setDeleteAccSub: "Ceci supprime définitivement vos voyages, votre wishlist et vos pass débloqués.", setDeleteAccBtn: "Supprimer le compte",
        wishTitle: "Ma Wishlist", wishEmpty: "Vous n'avez encore enregistré aucun lieu. Explorez la carte et cliquez sur « Ajouter à ma Wishlist » !", wishSomeday: "Un jour / Pas de voyage prévu",
        visitTitle: "Mes lieux visités", visitEmpty: "Vous n'avez marqué aucun lieu comme visité. Explorez la carte et cochez « J'ai visité ce lieu » !",
        destTitle: "Explorer les destinations", destSub: "Parcourez tous les pays et villes présents sur Screen To Street", destCountries: "Pays", destCities: "Villes", destLocations: "Lieux", destViewMap: "Voir sur la carte →",
        artTitle: "Explorer les artistes", artSub: "Découvrez tous les groupes présents sur Screen To Street", artGroups: "Groupes", artFeatured: "Groupe à la une",

        gateLoginTitle: "Se connecter pour continuer", gateLoginDesc: "Connectez-vous si vous avez déjà un compte, ou créez-en un si ce n'est pas le cas. Vous pouvez aussi continuer sans compte — 3 lieux inclus, gratuitement.", gateContinueFreeText: "Vous préférez ne pas créer de compte ?", gateContinueFreeLink: "Continuer gratuitement — 3 lieux inclus",
        gateEmailLabel: "Adresse e-mail", gateEmailOrUsernameLabel: "E-mail ou nom d'utilisateur", gatePasswordLabel: "Mot de passe", gateForgotPassword: "Mot de passe oublié ?",
        gateLoginBtn: "Se connecter", gateOrDivider: "OU", gateGoogleBtn: "Continuer avec Google",
        gateSignupPrompt: "Vous n'avez pas de compte ?", gateSignupLink: "S'inscrire",
        gateNoGroupsTitle: "Débloquez un groupe pour voir la carte", gateNoGroupsDesc: "Vous n'avez encore débloqué aucun groupe. Cliquez ci-dessous pour choisir un pass et commencer à explorer.",
        gateUnlockBtn: "Débloquer un groupe", gateLogoutLink: "Se déconnecter",
        gateErrorInvalid: "E-mail ou mot de passe incorrect.", gateErrorGeneric: "Une erreur est survenue. Réessayez.",
        gateResetSent: "E-mail de réinitialisation envoyé — vérifiez votre boîte de réception.", gateEnterEmailFirst: "Merci d'indiquer d'abord votre adresse e-mail.",
        tourModeLiveIn: "En direct — BTS est en concert à {city}", tourModeSchedule: "Calendrier de la tournée", tourModeLive: "En direct", tourModeDone: "Terminé", tourModeUpcoming: "À venir", tourModePrev: "Précédent", tourModeNext: "Suivant",
        tourModeFooterNote: "Dates annoncées par la tournée — vérifiez toujours les sites de billetterie officiels avant de réserver un voyage.",
        liveBadgeLabel: "Live", liveTimelineTitle: " et à venir", liveTimelineEmpty: "Rien de prévu pour le moment — revenez bientôt.", liveTimelineFooterNote: "Uniquement des activités officielles et rendues publiques — dates annoncées, vérifiez toujours les sources officielles avant de réserver un voyage.", liveViewList: "Liste", liveViewCalendar: "Calendrier", liveFilterAll: "Tous", liveTodayLive: "Aujourd'hui · En direct", liveKindGroup: "Groupe", liveKindSolo: "Solo", newBadgeLabel: "Nouveau", usernameCooldownNote: "Vous ne pouvez changer ceci qu'une fois tous les 7 jours.", usernameConfirmTitle: "Changer votre identifiant ?", usernameConfirmCancel: "Annuler", usernameConfirmOk: "Oui, changer", subtitle: "Sur les traces de vos artistes préférés", backToList: "← Retour à la liste", chooserTourOption: "Itinéraire de tournée", chooserLiveOption: "Toute l'activité en direct", tripShareThis: "+ Partager ce voyage", tripChangeCoverBtn: "Changer la couverture", tripDepartureLabel: "Départ", tripReturnLabel: "Retour", tripApplyDatesBtn: "Appliquer", tripLeaveTitle: "Quitter ce voyage partagé ?", tripLeaveDesc: "Voulez-vous vraiment quitter ce voyage ? Il vous faudra une nouvelle invitation pour le rejoindre.", tripLeaveCancel: "Annuler", tripLeaveConfirm: "Quitter", locationSharesLabel: "Partagé avec vous", locationShareFrom: "{username} vous a partagé « {location} »", tabTourMode: "Tournée", profileTabPhotos: "Photos", profileTabVisited: "Visités", profileTabReviews: "Avis", profileTabMap: "Carte", profileMapHeading: "Voici où j'ai été", profileStatVisited: "visités", profileStatPhotos: "photos", profileStatReviews: "avis", profileStatFollowers: "abonnés", profileAddFriendBtn: "Ajouter", profileFriendsLabel: "Amis", profileRequestSentLabel: "Demande envoyée", profileAcceptRequestBtn: "Accepter la demande", profileEmptyPhotos: "Aucune photo publique pour l'instant.", profileEmptyVisited: "Aucun lieu visité pour l'instant.", profileEmptyReviews: "Aucun avis public pour l'instant.", profileNotFound: "Cet utilisateur est introuvable.", profileLoading: "Chargement du profil…", backToFriends: "← Retour aux amis", profileMenuOption: "Votre profil", switchArtistLabel: "Changer d'artiste", groupNoDataYet: "Aucune donnée de tournée ou de live disponible pour {group} pour le moment — revenez bientôt.", tripInviteLabel: "Inviter des personnes (facultatif)", shareTripUsernamePlaceholder: "Leur pseudo",
        tourModeGenericLabel: "Tournée", tourModeMemberLiveIn: "{member} est en direct — {event} à {city}", tourModeLiveNowOne: "En direct maintenant", tourModeLiveNowCount: "{n} en direct maintenant", tourModeMoreCount: "+{n} autres",
        tourModeEyebrow: "Mode Tournée", tourModeChooseTour: "Choisir une tournée", tourModeStep: "Étape {n} sur {total}",
        tourModeHighlights: "Temps forts", tourModeSurpriseSong: "Chanson surprise :", tourModeNoHighlightsYet: "Aucun temps fort ajouté pour ce concert pour le moment.", tourModeNoSurpriseSongYet: "Pas encore annoncée.",
        mapLoading: "Chargement de la carte…",
        demoTourBtn: "Visite",
        newLocationToastLabel: "Nouveau lieu ajouté", newLocationsSummaryToast: "{n} nouveaux lieux pour {group}",
        paywallTitle: "Vous avez atteint votre limite gratuite (3/3)", paywallBody: "La carte secrète vous plaît ? Il reste encore plus de 500 adresses à découvrir ! Débloquez l'intégralité des lieux de tournages, restaurants iconiques et adresses fréquentées par vos idoles pour préparer le voyage de vos rêves.",
        paywallMonthlyName: "PASS VOYAGE (1 Mois)", paywallMonthlyDesc: "Parfait pour planifier un séjour court.", paywallFeatureFullAccess: "Accès total aux 500+ adresses", paywallFeatureGPS: "Coordonnées GPS exactes", paywallMonthlyPrice: "9,99 € / mois", paywallMonthlyTerms: "Sans engagement", paywallBuyMonthly: "Obtenir le Pass Voyage",
        paywallVipName: "PASS VIP (Accès à vie)", paywallVipBadge: "MEILLEUR CHOIX", paywallVipDesc: "Pour les vrais passionnés. Payez une fois, profitez-en pour toujours.", paywallFeatureUpdates: "Mises à jour incluses (nouveaux lieux ajoutés chaque mois)", paywallFeatureOffline: "Mode Hors-Ligne (bientôt disponible)", paywallVipPrice: "19,99 € (paiement unique)", paywallBuyVip: "Obtenir le Pass VIP",
        paywallActiveTitle: "Vous avez déjà un pass actif",
        paywallActiveDescMonthly: "Votre Pass Voyage est actif jusqu'au {date}. Merci de soutenir Screen To Street !", paywallActiveDescVip: "Votre Pass VIP vous donne un accès à vie. Merci de soutenir Screen To Street !",
        freeViewsCounter: "{remaining}/3 lieux gratuits restants",
        paymentTitle: "Finaliser votre achat", paymentDesc: "Renseignez vos informations de paiement pour débloquer le guide complet.", paymentSummaryLabel: "Pass sélectionné :", paymentTotalLabel: "Total dû :",
        cardNum: "Numéro de carte", expiry: "Date d'expiration", cvc: "CVC", paySecurely: "Payer en toute sécurité", processing: "Traitement sécurisé en cours…", paymentBackLink: "← Retour à la carte",
        paymentNoAccountWarning: "Vous ne semblez pas connecté(e) — ", paymentNoAccountLink: "inscrivez-vous d'abord",
        privacyLabel: "Confidentialité du compte", privacyPublicLabel: "Public", privacyPublicDesc: "Tout le monde peut vous suivre et voir vos publications.", privacyPrivateLabel: "Privé", privacyPrivateDesc: "Seuls les amis que vous acceptez peuvent voir vos publications.", accPrivacySaved: "Confidentialité enregistrée.",
        profilePrivateTitle: "Ce compte est privé", profilePrivateDesc: "Envoyez une demande d'ami pour voir ses photos, sa carte et ses avis.",
        friendsTabMessages: "Messages", friendsTabNotifications: "Notifications", friendsTabGroups: "Groupes", notificationsEmpty: "Rien de nouveau pour le moment."
    },
    es: {
        btnGenerateIti: "Generador de Itinerarios", filterGroup: "GRUPO", filterMember: "MIEMBRO", filterArea: "ZONA", filterYear: "AÑO", filterCategories: "CATEGORÍAS",
        locationsCount: "LUGARES", statsCountries: "PAÍSES", cookieText: "Utilizamos cookies para mejorar tu experiencia.", cookiePolicy: "Política de cookies",
        cookieManage: "Gestionar", cookieReject: "Rechazar", cookieAccept: "Aceptar",
        exploreDestOption: "Explorar Destinos", exploreArtistsOption: "Explorar Artistas", accountOption: "Tu Cuenta",
        visitedOption: "Lugares Visitados", wishlistOption: "Mi Lista de Deseos", tripsOption: "Mis Viajes", friendsOption: "Amigos", settingsOption: "Ajustes", logoutOption: "Cerrar sesión",
        footerText: "Screen To Street es una guía independiente creada por fans.", footerMentions: "Aviso Legal", footerAbout: "Sobre Nosotros", footerTOS: "Términos de Servicio", footerPrivacy: "Política de Privacidad",
        allGroups: "Todos los grupos", allMembers: "Todos los miembros", allAreas: "Todas las zonas", allYears: "Todos los años", allCategories: "Todas las categorías",
        checkVisited: "He visitado este lugar", checkWishlist: "Añadir a mi lista", tripWhich: "¿Para qué viaje es esto?",
        tripName: "Nombre del viaje", tripWhen: "¿Cuándo planeas ir?", tripFrom: "Desde", tripTo: "Hasta", tripCreate: "Crear viaje", tripCancel: "Cancelar",
        itiTitle: "Generador de Itinerarios", itiDesc: "Selecciona un grupo, un país y cuántos días te quedas.", itiCreateBtn: "Crear mi guía", itiCatLabel: "Categorías (opcional, selección múltiple)", itiExport: "Exportar guía en PDF", itiSave: "Guardar en Mis Viajes",
        searchTripsPlaceholder: "Buscar tus viajes...", noTripsFound: "No se encontraron viajes.", selectTripToView: "Selecciona un viaje para ver", deselectTripOption: "— Ningún viaje seleccionado —", locationsWord: "lugar", locationsWordPlural: "lugares",
        addAnotherVisit: "Añadir otra visita",
        tabExplore: "Explorar", tabMyItinerary: "Mi Itinerario", yourRating: "Tu valoración", foodQualityRating: "Calidad de la comida", valueForMoneyRating: "Relación calidad-precio", accessibilityRating: "¿Fácil acceso?", siteQualityRating: "Calidad del lugar", wishlistStat: "El {pct}% de los usuarios añadió este lugar a su lista de deseos", friendsVisitedStat: "{count} amigos han visitado este lugar", friendsVisitedStatOne: "1 amigo ha visitado este lugar", whenDidYouVisit: "¿Cuándo visitaste este lugar?", saveMemory: "Guardar recuerdo", myVisitTab: "Mi Visita", tabReviews: "Reseñas", tabInfo: "Info", tabStory: "Historia", lGroup: "Grupo:", lMembers: "Miembros:", lCountry: "País:", lCity: "Ciudad:", lDate: "Fecha:", lEpisode: "Episodio:", lWatch: "Ver:", lOfficialLink: "Enlace oficial", lFollow: "Seguir:", lWatchEpi: "En pantalla", lPractical: "Información práctica y acceso", lAddress: "Dirección", lOpenMap: "Abrir en Google Maps", lStoryPlace: "La historia de este lugar", lStoryBts: "Siguiendo los pasos de BTS", lTipsTitle: "LOS CONSEJOS DE «SCREEN TO STREET»", lHowToGetThere: "Cómo llegar:", memoryNotesLabel: "Tus notas (opcional)", memoryNotesPlaceholder: "¿Qué recuerdas de este lugar?", reviewsCountLabel: "{n} reseñas públicas", reviewsWriteLabel: "Escribe tu reseña", reviewsComposePlaceholder: "Comparte lo que pensaste...", reviewsComposeMakePublic: "Hacer esto público", reviewsComposePost: "Publicar reseña", memoryPhotoLabel: "Añadir una foto (opcional)", memoryPhotoChoose: "Elegir una foto", memoryPhotoRemove: "Quitar", memoryMakePublic: "Hacer pública esta reseña (visible para otros usuarios)", reviewsLoading: "Cargando reseñas…", reviewsEmpty: "Todavía no hay reseñas públicas para este lugar — ¡sé el primero en compartir la tuya desde la pestaña «Mi Visita»!",
        backToMap: "← Volver al mapa", moreDetails: "Más detalles", openInMaps: "Abrir en Google Maps", detailsLabel: "Detalles", aboutPlaceLabel: "Sobre este lugar",
        accTitle: "Tu cuenta", accChangePhoto: "Cambiar foto de perfil", accResetPhoto: "Restablecer foto de perfil", accNameLabel: "Nombre de usuario", accChangeUsernameHint: "Cambiar nombre de usuario", accEmailLabel: "Correo electrónico",
        accCountryLabel: "País que te interesa", accCountryPlaceholder: "Elige un país (opcional)",
        accActivityTitle: "Tu actividad", accTrips: "Viajes", accVisited: "Visitados", accWishlist: "Lista de deseos", accPasses: "Pases y facturación",
        friendsTitle: "Amigos", openFriendsMessagesLink: "Abrir Amigos y Mensajes →", friendsAddPlaceholder: "Añadir un amigo por nombre de usuario", friendsAddBtn: "Añadir", friendsRequestsLabel: "Solicitudes de amistad", friendsListLabel: "Tus amigos", friendsEmpty: "Aún no tienes amigos — añade uno por su nombre de usuario arriba.", friendsAccept: "Aceptar", friendsDecline: "Rechazar", friendsCancel: "Cancelar", friendsRemove: "Quitar", friendsErrNotFound: "No se encontró ningún usuario con ese nombre.", friendsErrSelf: "No puedes añadirte a ti mismo.", friendsErrAlreadySent: "Ya le has enviado una solicitud de amistad a esta persona.", friendsErrAlreadyFriends: "Ya sois amigos.", friendsErrGeneric: "No se pudo enviar la solicitud. Inténtalo de nuevo.", friendsSentLabel: "Enviada — esperando respuesta", friendsRequestFrom: "{username} quiere ser tu amigo", shareWithFriendBtn: "Compartir", shareNoFriends: "Añade primero un amigo para compartir lugares.", sharesEmpty: "Nadie ha compartido nada contigo todavía.", sharedByLabel: "{username} compartió {location}", friendsPageTitle: "Amigos y Mensajes", tripGroupsLabel: "Grupos de viaje", directMessagesLabel: "Mensajes directos", noTripGroups: "Aún no hay viajes compartidos — comparte uno desde una conversación.", noFriendsForDm: "Añade un amigo para empezar a chatear.", selectConversationPrompt: "Selecciona una conversación para empezar a chatear", messagePlaceholder: "Mensaje...", sendBtn: "Enviar", tripGroupOwner: "Creaste este viaje", tripGroupMember: "Compartido contigo", shareTripBtn: "Compartir un viaje", shareTripPickTitle: "Elige un viaje para compartir", noOwnedTrips: "Aún no tienes ningún viaje.", viewItineraryLink: "Ver itinerario", chatForTripLabel: "Chat de grupo para este viaje", friendRequestSentToast: "Solicitud de amistad enviada", tripInvitesLabel: "Invitaciones de viaje", tripInviteFrom: '{username} te invitó a unirte a "{tripname}"', addTripMemberOption: "Añadir miembro", renameTripGroupOption: "Renombrar grupo", leaveTripGroupOption: "Abandonar grupo", deleteConvoBtn: "Eliminar conversación", deleteMessageOption: "Eliminar mensaje", attachLocationTitle: "Compartir un lugar", attachPollTitle: "Crear una encuesta", attachPollCreateBtn: "Crear encuesta", attachLocationOption: "Compartir un lugar", attachTripOption: "Compartir un viaje", attachPollOption: "Crear una encuesta",
        accEditBtn: "Editar perfil", accSaveBtn: "Guardar cambios", accSaved: "✓ Guardado con éxito", accNoPasses: "Sin pases activos", accAmountPaid: "Importe pagado", accGuestUsername: "No conectado",
        accDangerZone: "Zona de peligro",
        accDeleteConfirmTitle: "¿Seguro que quieres eliminar tu cuenta?",
        accDeleteConfirmBody: "Esta acción es permanente. No se te reembolsará ningún pase desbloqueado, y todos tus datos — viajes, lista de deseos y lugares visitados — se perderán definitivamente.",
        accDeletePasswordLabel: "Confirma tu contraseña", accDeleteCancel: "Cancelar", accDeleteConfirmBtn: "Sí, eliminar mi cuenta",
        accDeleteGoogleReauthNote: "Por tu seguridad, Google debe confirmar que eres tú antes de eliminar tu cuenta de forma permanente. Haz clic en «Confirmar con Google» a continuación.",
        setTitle: "Ajustes", setSecurity: "Cuenta y seguridad", setPassword: "Contraseña", setPasswordSub: "Última modificación hace 3 meses", setChange: "Cambiar",
        setChangePwTitle: "Cambia tu contraseña", setChangePwGoogleNote: "Tu cuenta usa el inicio de sesión con Google, por lo que no tiene una contraseña de Screen To Street que cambiar — gestiónala desde tu cuenta de Google.", setCurrentPwLabel: "Contraseña actual", setNewPwLabel: "Nueva contraseña", setConfirmPwLabel: "Confirmar nueva contraseña", setChangePwBtn: "Cambiar contraseña",
        setSignedWith: "Sesión iniciada con", setPreferences: "Preferencias", setLanguage: "Idioma", setCurrency: "Moneda", setUnits: "Unidades de distancia",
        setEmailNotif: "Notificaciones por correo", setPushNotif: "Notificaciones push", setPrivacy: "Privacidad", setCookiePrefs: "Preferencias de cookies",
        setResetBanners: "Restablecer banner", setDownloadData: "Descargar mis datos", setExportSub: "Exportar todo en JSON", setExport: "Exportar",
        setManage: "Gestionar", setNotifConfirmTitle: "¿Activar las notificaciones por correo?", setNotifConfirmBody: "Al activarlo, aceptas recibir un correo cada vez que se añadan nuevos lugares — con una frecuencia que depende de la actividad actual del artista (más frecuente durante un comeback o gira, más tranquilo el resto del tiempo). Elige a continuación los grupos y los países que te interesan.", setNotifEnableBtn: "Activar", setPushNotifConfirmTitle: "¿Activar las notificaciones push?", setPushNotifConfirmBody: "Al activarlo, aceptas recibir una notificación push cada vez que se añadan nuevos lugares — con una frecuencia que depende de la actividad actual del artista (más frecuente durante un comeback o gira, más tranquilo el resto del tiempo). Elige a continuación los grupos y los países que te interesan.", setNotifGroupsLabel: "Notificarme para estos grupos", setNotifCountryLabel: "Notificarme para estos países", setNotifAllCountries: "Todos los países", setNotifSearchCountry: "Buscar países...", setCookiePrefsTitle: "Preferencias de cookies", setCookiePrefsBody: "Las cookies necesarias hacen que el sitio funcione (inicio de sesión, lista de deseos guardada) y no se pueden desactivar. Tú decides si también usamos cookies para recordar tus preferencias entre visitas.", setCookieNecessary: "Necesarias", setCookieNecessarySub: "Siempre activas", setCookieAnalytics: "Preferencias y análisis", setCookieAnalyticsSub: "Recuerda tus elecciones entre visitas", setSavePreferences: "Guardar preferencias",
        setDanger: "Zona de peligro", setDeleteAccTitle: "Eliminar cuenta", setDeleteAccSub: "Esto elimina permanentemente tus viajes, lista de deseos y pases desbloqueados.", setDeleteAccBtn: "Eliminar cuenta",
        wishTitle: "Mi Lista de Deseos", wishEmpty: "Aún no has guardado ningún lugar. ¡Explora el mapa y haz clic en «Añadir a mi lista»!", wishSomeday: "Algún día / Sin viaje aún",
        visitTitle: "Mis Lugares Visitados", visitEmpty: "Aún no has marcado ningún lugar como visitado. ¡Explora el mapa y marca «He visitado este lugar»!",
        destTitle: "Explorar Destinos", destSub: "Explora todos los países y ciudades de Screen To Street", destCountries: "Países", destCities: "Ciudades", destLocations: "Lugares", destViewMap: "Ver en el mapa →",
        artTitle: "Explorar Artistas", artSub: "Descubre todos los grupos presentes en Screen To Street", artGroups: "Grupos", artFeatured: "Grupo destacado",

        gateLoginTitle: "Inicia sesión para continuar", gateLoginDesc: "Inicia sesión si ya tienes una cuenta, o regístrate si no la tienes. También puedes continuar sin cuenta — 3 lugares incluidos, gratis.", gateContinueFreeText: "¿Prefieres no crear una cuenta?", gateContinueFreeLink: "Continuar gratis — 3 lugares incluidos",
        gateEmailLabel: "Correo electrónico", gateEmailOrUsernameLabel: "Correo electrónico o nombre de usuario", gatePasswordLabel: "Contraseña", gateForgotPassword: "¿Olvidaste tu contraseña?",
        gateLoginBtn: "Iniciar sesión", gateOrDivider: "O", gateGoogleBtn: "Continuar con Google",
        gateSignupPrompt: "¿No tienes cuenta?", gateSignupLink: "Regístrate",
        gateNoGroupsTitle: "Desbloquea un grupo para ver el mapa", gateNoGroupsDesc: "Aún no has desbloqueado ningún grupo. Haz clic abajo para elegir un pase y empezar a explorar.",
        gateUnlockBtn: "Desbloquear un grupo", gateLogoutLink: "Cerrar sesión",
        gateErrorInvalid: "Correo o contraseña incorrectos.", gateErrorGeneric: "Algo salió mal. Inténtalo de nuevo.",
        gateResetSent: "Correo de restablecimiento enviado — revisa tu bandeja de entrada.", gateEnterEmailFirst: "Indica primero tu correo electrónico.",
        tourModeLiveIn: "En directo — BTS está actuando en {city}", tourModeSchedule: "Calendario de la gira", tourModeLive: "En directo", tourModeDone: "Finalizado", tourModeUpcoming: "Próximamente", tourModePrev: "Anterior", tourModeNext: "Siguiente",
        tourModeFooterNote: "Fechas anunciadas por la gira — comprueba siempre los sitios oficiales de venta de entradas antes de reservar un viaje.",
        liveBadgeLabel: "En vivo", liveTimelineTitle: " y próximos", liveTimelineEmpty: "Nada programado por ahora — vuelve pronto.", liveTimelineFooterNote: "Solo actividades oficiales y anunciadas públicamente — fechas según lo anunciado, comprueba siempre las fuentes oficiales antes de reservar un viaje.", liveViewList: "Lista", liveViewCalendar: "Calendario", liveFilterAll: "Todos", liveTodayLive: "Hoy · En vivo", liveKindGroup: "Grupo", liveKindSolo: "Solo", newBadgeLabel: "Nuevo", usernameCooldownNote: "Solo puedes cambiar esto una vez cada 7 días.", usernameConfirmTitle: "¿Cambiar tu nombre de usuario?", usernameConfirmCancel: "Cancelar", usernameConfirmOk: "Sí, cambiarlo", subtitle: "Siguiendo los pasos de tus artistas favoritos", backToList: "← Volver a la lista", chooserTourOption: "Ruta de la gira", chooserLiveOption: "Toda la actividad en directo", tripShareThis: "+ Compartir este viaje", tripChangeCoverBtn: "Cambiar portada", tripDepartureLabel: "Salida", tripReturnLabel: "Regreso", tripApplyDatesBtn: "Aplicar", tripLeaveTitle: "¿Salir de este viaje compartido?", tripLeaveDesc: "¿Seguro que quieres salir de este viaje? Necesitarás una nueva invitación para volver a unirte.", tripLeaveCancel: "Cancelar", tripLeaveConfirm: "Salir", locationSharesLabel: "Compartido contigo", locationShareFrom: "{username} te compartió {location}", tabTourMode: "Gira", profileTabPhotos: "Fotos", profileTabVisited: "Visitados", profileTabReviews: "Reseñas", profileTabMap: "Mapa", profileMapHeading: "Aquí es donde he estado", profileStatVisited: "visitados", profileStatPhotos: "fotos", profileStatReviews: "reseñas", profileStatFollowers: "seguidores", profileAddFriendBtn: "Añadir amigo", profileFriendsLabel: "Amigos", profileRequestSentLabel: "Solicitud enviada", profileAcceptRequestBtn: "Aceptar solicitud", profileEmptyPhotos: "Aún no hay fotos públicas.", profileEmptyVisited: "Aún no hay lugares visitados.", profileEmptyReviews: "Aún no hay reseñas públicas.", profileNotFound: "No se encontró este usuario.", profileLoading: "Cargando perfil…", backToFriends: "← Volver a Amigos", profileMenuOption: "Tu perfil", switchArtistLabel: "Cambiar de artista", groupNoDataYet: "Aún no hay datos de gira ni de directo para {group} — vuelve pronto.", tripInviteLabel: "Invitar personas (opcional)", shareTripUsernamePlaceholder: "Su nombre de usuario",
        tourModeGenericLabel: "Gira", tourModeMemberLiveIn: "{member} está en directo — {event} en {city}", tourModeLiveNowOne: "En directo ahora", tourModeLiveNowCount: "{n} en directo ahora", tourModeMoreCount: "+{n} más",
        tourModeEyebrow: "Modo Gira", tourModeChooseTour: "Elegir una gira", tourModeStep: "Etapa {n} de {total}",
        tourModeHighlights: "Momentos destacados", tourModeSurpriseSong: "Canción sorpresa:", tourModeNoHighlightsYet: "Aún no se han añadido momentos destacados para este concierto.", tourModeNoSurpriseSongYet: "Aún no anunciada.",
        mapLoading: "Cargando el mapa…",
        demoTourBtn: "Recorrido",
        newLocationToastLabel: "Nuevo lugar añadido", newLocationsSummaryToast: "{n} nuevos lugares para {group}",
        paywallTitle: "Has alcanzado tu límite gratuito (3/3)", paywallBody: "¿Te gusta el mapa secreto? ¡Todavía quedan más de 500 direcciones por descubrir! Desbloquea todos los lugares de rodaje, restaurantes icónicos y direcciones que frecuentan tus ídolos para preparar el viaje de tus sueños.",
        paywallMonthlyName: "PASE VIAJE (1 Mes)", paywallMonthlyDesc: "Perfecto para planificar una estancia corta.", paywallFeatureFullAccess: "Acceso total a más de 500 direcciones", paywallFeatureGPS: "Coordenadas GPS exactas", paywallMonthlyPrice: "9,99 € / mes", paywallMonthlyTerms: "Sin compromiso", paywallBuyMonthly: "Obtener el Pase Viaje",
        paywallVipName: "PASE VIP (Acceso de por vida)", paywallVipBadge: "MEJOR OPCIÓN", paywallVipDesc: "Para los verdaderos fans. Paga una vez, disfruta para siempre.", paywallFeatureUpdates: "Actualizaciones incluidas (nuevos lugares cada mes)", paywallFeatureOffline: "Modo sin conexión (próximamente)", paywallVipPrice: "19,99 € (pago único)", paywallBuyVip: "Obtener el Pase VIP",
        paywallActiveTitle: "Ya tienes un pase activo",
        paywallActiveDescMonthly: "Tu Pase Viaje está activo hasta el {date}. ¡Gracias por apoyar a Screen To Street!", paywallActiveDescVip: "Tu Pase VIP te da acceso de por vida. ¡Gracias por apoyar a Screen To Street!",
        freeViewsCounter: "{remaining}/3 lugares gratuitos restantes",
        paymentTitle: "Finaliza tu compra", paymentDesc: "Introduce tus datos de pago para desbloquear la guía completa.", paymentSummaryLabel: "Pase seleccionado:", paymentTotalLabel: "Total a pagar:",
        cardNum: "Número de tarjeta", expiry: "Fecha de caducidad", cvc: "CVC", paySecurely: "Pagar de forma segura", processing: "Procesando de forma segura…", paymentBackLink: "← Volver al mapa"
    },
    it: {
        btnGenerateIti: "Generatore di Itinerari", filterGroup: "GRUPPO", filterMember: "MEMBRO", filterArea: "ZONA", filterYear: "ANNO", filterCategories: "CATEGORIE",
        locationsCount: "LUOGHI", statsCountries: "PAESI", cookieText: "Utilizziamo i cookie per migliorare la tua esperienza.", cookiePolicy: "Informativa sui cookie",
        cookieManage: "Gestisci", cookieReject: "Rifiuta", cookieAccept: "Accetta",
        exploreDestOption: "Esplora Destinazioni", exploreArtistsOption: "Esplora Artisti", accountOption: "Il Tuo Account",
        visitedOption: "Luoghi Visitati", wishlistOption: "La Mia Wishlist", tripsOption: "I Miei Viaggi", friendsOption: "Amici", settingsOption: "Impostazioni", logoutOption: "Esci",
        footerText: "Screen To Street è una guida indipendente creata dai fan.", footerMentions: "Note Legali", footerAbout: "Chi Siamo", footerTOS: "Termini di Servizio", footerPrivacy: "Privacy Policy",
        allGroups: "Tutti i gruppi", allMembers: "Tutti i membri", allAreas: "Tutte le zone", allYears: "Tutti gli anni", allCategories: "Tutte le categorie",
        checkVisited: "Ho visitato questo posto", checkWishlist: "Aggiungi alla wishlist", tripWhich: "Per quale viaggio è questo?",
        tripName: "Nome del viaggio", tripWhen: "Quando pensi di andarci?", tripFrom: "Da", tripTo: "A", tripCreate: "Crea viaggio", tripCancel: "Annulla",
        itiTitle: "Generatore di Itinerari", itiDesc: "Seleziona un gruppo, un paese e quanti giorni resti.", itiCreateBtn: "Crea la mia guida", itiCatLabel: "Categorie (opzionale, selezione multipla)", itiExport: "Esporta guida in PDF", itiSave: "Salva nei Miei Viaggi",
        searchTripsPlaceholder: "Cerca i tuoi viaggi...", noTripsFound: "Nessun viaggio trovato.", selectTripToView: "Seleziona un viaggio da vedere", deselectTripOption: "— Nessun viaggio selezionato —", locationsWord: "luogo", locationsWordPlural: "luoghi",
        addAnotherVisit: "Aggiungi un'altra visita",
        tabExplore: "Esplora", tabMyItinerary: "Il Mio Itinerario", yourRating: "La tua valutazione", foodQualityRating: "Qualità del cibo", valueForMoneyRating: "Rapporto qualità-prezzo", accessibilityRating: "Facile da raggiungere?", siteQualityRating: "Qualità del luogo", wishlistStat: "Il {pct}% degli utenti ha aggiunto questo posto alla propria wishlist", friendsVisitedStat: "{count} amici hanno visitato questo posto", friendsVisitedStatOne: "1 amico ha visitato questo posto", whenDidYouVisit: "Quando hai visitato questo posto?", saveMemory: "Salva ricordo", myVisitTab: "La Mia Visita", tabReviews: "Recensioni", tabInfo: "Info", tabStory: "Storia", lGroup: "Gruppo:", lMembers: "Membri:", lCountry: "Paese:", lCity: "Città:", lDate: "Data:", lEpisode: "Episodio:", lWatch: "Guarda:", lOfficialLink: "Link ufficiale", lFollow: "Segui:", lWatchEpi: "Sullo schermo", lPractical: "Informazioni pratiche e accesso", lAddress: "Indirizzo", lOpenMap: "Apri in Google Maps", lStoryPlace: "La storia di questo posto", lStoryBts: "Sulle orme dei BTS", lTipsTitle: "I CONSIGLI DI «SCREEN TO STREET»", lHowToGetThere: "Come arrivare:", memoryNotesLabel: "Le tue note (facoltativo)", memoryNotesPlaceholder: "Cosa ricordi di questo posto?", reviewsCountLabel: "{n} recensioni pubbliche", reviewsWriteLabel: "Scrivi la tua recensione", reviewsComposePlaceholder: "Condividi cosa ne pensi...", reviewsComposeMakePublic: "Rendi pubblica questa recensione", reviewsComposePost: "Pubblica recensione", memoryPhotoLabel: "Aggiungi una foto (facoltativo)", memoryPhotoChoose: "Scegli una foto", memoryPhotoRemove: "Rimuovi", memoryMakePublic: "Rendi pubblica questa recensione (visibile agli altri utenti)", reviewsLoading: "Caricamento recensioni…", reviewsEmpty: "Ancora nessuna recensione pubblica per questo posto — sii il primo a condividere la tua dalla scheda «La Mia Visita»!",
        backToMap: "← Torna alla mappa", moreDetails: "Maggiori dettagli", openInMaps: "Apri in Google Maps", detailsLabel: "Dettagli", aboutPlaceLabel: "Informazioni su questo luogo",
        accTitle: "Il tuo account", accChangePhoto: "Cambia foto profilo", accResetPhoto: "Ripristina foto profilo", accNameLabel: "Nome utente", accChangeUsernameHint: "Cambia nome utente", accEmailLabel: "Indirizzo email",
        accCountryLabel: "Paese che ti interessa", accCountryPlaceholder: "Scegli un paese (opzionale)",
        accActivityTitle: "La tua attività", accTrips: "Viaggi", accVisited: "Visitati", accWishlist: "Wishlist", accPasses: "Pass e fatturazione",
        friendsTitle: "Amici", openFriendsMessagesLink: "Apri Amici e Messaggi →", friendsAddPlaceholder: "Aggiungi un amico tramite username", friendsAddBtn: "Aggiungi", friendsRequestsLabel: "Richieste di amicizia", friendsListLabel: "I tuoi amici", friendsEmpty: "Ancora nessun amico — aggiungine uno tramite il suo username qui sopra.", friendsAccept: "Accetta", friendsDecline: "Rifiuta", friendsCancel: "Annulla", friendsRemove: "Rimuovi", friendsErrNotFound: "Nessun utente trovato con questo username.", friendsErrSelf: "Non puoi aggiungere te stesso.", friendsErrAlreadySent: "Hai già inviato una richiesta di amicizia a questa persona.", friendsErrAlreadyFriends: "Siete già amici.", friendsErrGeneric: "Impossibile inviare la richiesta. Riprova.", friendsSentLabel: "Inviata — in attesa di risposta", friendsRequestFrom: "{username} vuole essere tuo amico", shareWithFriendBtn: "Condividi", shareNoFriends: "Aggiungi prima un amico per condividere i luoghi.", sharesEmpty: "Nessuno ha ancora condiviso nulla con te.", sharedByLabel: "{username} ha condiviso {location}", friendsPageTitle: "Amici e Messaggi", tripGroupsLabel: "Gruppi di viaggio", directMessagesLabel: "Messaggi diretti", noTripGroups: "Ancora nessun viaggio condiviso — condividine uno da una conversazione.", noFriendsForDm: "Aggiungi un amico per iniziare a chattare.", selectConversationPrompt: "Seleziona una conversazione per iniziare a chattare", messagePlaceholder: "Messaggio...", sendBtn: "Invia", tripGroupOwner: "Hai creato questo viaggio", tripGroupMember: "Condiviso con te", shareTripBtn: "Condividi un viaggio", shareTripPickTitle: "Scegli un viaggio da condividere", noOwnedTrips: "Non hai ancora nessun viaggio.", viewItineraryLink: "Vedi l'itinerario", chatForTripLabel: "Chat di gruppo per questo viaggio", friendRequestSentToast: "Richiesta di amicizia inviata", tripInvitesLabel: "Inviti di viaggio", tripInviteFrom: '{username} ti ha invitato a unirti a "{tripname}"', addTripMemberOption: "Aggiungi membro", renameTripGroupOption: "Rinomina gruppo", leaveTripGroupOption: "Abbandona gruppo", deleteConvoBtn: "Elimina conversazione", deleteMessageOption: "Elimina messaggio", attachLocationTitle: "Condividi un luogo", attachPollTitle: "Crea un sondaggio", attachPollCreateBtn: "Crea sondaggio", attachLocationOption: "Condividi un luogo", attachTripOption: "Condividi un viaggio", attachPollOption: "Crea un sondaggio",
        accEditBtn: "Modifica profilo", accSaveBtn: "Salva modifiche", accSaved: "✓ Salvato con successo", accNoPasses: "Nessun pass attivo", accAmountPaid: "Importo pagato", accGuestUsername: "Non connesso",
        accDangerZone: "Zona pericolosa",
        accDeleteConfirmTitle: "Sei sicuro di voler eliminare il tuo account?",
        accDeleteConfirmBody: "Questa azione è permanente. Non riceverai rimborsi per i pass sbloccati e tutti i tuoi dati — viaggi, wishlist e luoghi visitati — andranno persi definitivamente.",
        accDeletePasswordLabel: "Conferma la tua password", accDeleteCancel: "Annulla", accDeleteConfirmBtn: "Sì, elimina il mio account",
        accDeleteGoogleReauthNote: "Per la tua sicurezza, Google deve confermare che sei davvero tu prima di eliminare definitivamente il tuo account. Fai clic su \"Conferma con Google\" qui sotto.",
        setTitle: "Impostazioni", setSecurity: "Account e sicurezza", setPassword: "Password", setPasswordSub: "Ultima modifica 3 mesi fa", setChange: "Modifica",
        setChangePwTitle: "Cambia la tua password", setChangePwGoogleNote: "Il tuo account usa l'accesso con Google, quindi non ha una password di Screen To Street da cambiare — gestiscila dal tuo Account Google.", setCurrentPwLabel: "Password attuale", setNewPwLabel: "Nuova password", setConfirmPwLabel: "Conferma nuova password", setChangePwBtn: "Cambia password",
        setSignedWith: "Accesso effettuato con", setPreferences: "Preferenze", setLanguage: "Lingua", setCurrency: "Valuta", setUnits: "Unità di distanza",
        setEmailNotif: "Notifiche email", setPushNotif: "Notifiche push", setPrivacy: "Privacy", setCookiePrefs: "Preferenze cookie",
        setResetBanners: "Reimposta banner", setDownloadData: "Scarica i miei dati", setExportSub: "Esporta tutto in JSON", setExport: "Esporta",
        setManage: "Gestisci", setNotifConfirmTitle: "Attivare le notifiche email?", setNotifConfirmBody: "Attivandole, accetti di ricevere un'email ogni volta che vengono aggiunti nuovi luoghi — con una frequenza che dipende dall'attività attuale dell'artista (più frequente durante un comeback o un tour, più tranquilla altrimenti). Scegli qui sotto i gruppi e i paesi che ti interessano.", setNotifEnableBtn: "Attiva", setPushNotifConfirmTitle: "Attivare le notifiche push?", setPushNotifConfirmBody: "Attivandole, accetti di ricevere una notifica push ogni volta che vengono aggiunti nuovi luoghi — con una frequenza che dipende dall'attività attuale dell'artista (più frequente durante un comeback o un tour, più tranquilla altrimenti). Scegli qui sotto i gruppi e i paesi che ti interessano.", setNotifGroupsLabel: "Notificami per questi gruppi", setNotifCountryLabel: "Notificami per questi paesi", setNotifAllCountries: "Tutti i paesi", setNotifSearchCountry: "Cerca paesi...", setCookiePrefsTitle: "Preferenze cookie", setCookiePrefsBody: "I cookie necessari fanno funzionare il sito (accesso, lista dei desideri salvata) e non possono essere disattivati. Puoi scegliere se usiamo anche cookie per ricordare le tue preferenze tra una visita e l'altra.", setCookieNecessary: "Necessari", setCookieNecessarySub: "Sempre attivi", setCookieAnalytics: "Preferenze e analisi", setCookieAnalyticsSub: "Ricorda le tue scelte tra una visita e l'altra", setSavePreferences: "Salva preferenze",
        setDanger: "Zona pericolosa", setDeleteAccTitle: "Elimina account", setDeleteAccSub: "Questo elimina definitivamente i tuoi viaggi, la wishlist e i pass sbloccati.", setDeleteAccBtn: "Elimina account",
        wishTitle: "La Mia Wishlist", wishEmpty: "Non hai ancora salvato nessun luogo. Esplora la mappa e clicca su «Aggiungi alla wishlist»!", wishSomeday: "Un giorno / Nessun viaggio ancora",
        visitTitle: "I Miei Luoghi Visitati", visitEmpty: "Non hai ancora segnato nessun luogo come visitato. Esplora la mappa e seleziona «Ho visitato questo posto»!",
        destTitle: "Esplora Destinazioni", destSub: "Esplora tutti i paesi e le città presenti su Screen To Street", destCountries: "Paesi", destCities: "Città", destLocations: "Luoghi", destViewMap: "Vedi sulla mappa →",
        artTitle: "Esplora Artisti", artSub: "Scopri tutti i gruppi presenti su Screen To Street", artGroups: "Gruppi", artFeatured: "Gruppo in evidenza",

        gateLoginTitle: "Accedi per continuare", gateLoginDesc: "Accedi se hai già un account, oppure registrati se non lo hai. Puoi anche continuare senza account — 3 luoghi inclusi, gratis.", gateContinueFreeText: "Preferisci non creare un account?", gateContinueFreeLink: "Continua gratis — 3 luoghi inclusi",
        gateEmailLabel: "Indirizzo email", gateEmailOrUsernameLabel: "Email o nome utente", gatePasswordLabel: "Password", gateForgotPassword: "Password dimenticata?",
        gateLoginBtn: "Accedi", gateOrDivider: "OPPURE", gateGoogleBtn: "Continua con Google",
        gateSignupPrompt: "Non hai un account?", gateSignupLink: "Registrati",
        gateNoGroupsTitle: "Sblocca un gruppo per vedere la mappa", gateNoGroupsDesc: "Non hai ancora sbloccato nessun gruppo. Clicca qui sotto per scegliere un pass e iniziare a esplorare.",
        gateUnlockBtn: "Sblocca un gruppo", gateLogoutLink: "Esci",
        gateErrorInvalid: "Email o password errati.", gateErrorGeneric: "Qualcosa è andato storto. Riprova.",
        gateResetSent: "Email di reimpostazione inviata — controlla la posta in arrivo.", gateEnterEmailFirst: "Inserisci prima il tuo indirizzo email.",
        tourModeLiveIn: "In diretta — I BTS si esibiscono a {city}", tourModeSchedule: "Calendario del tour", tourModeLive: "In diretta", tourModeDone: "Concluso", tourModeUpcoming: "In arrivo", tourModePrev: "Precedente", tourModeNext: "Successivo",
        tourModeFooterNote: "Date annunciate dal tour — verifica sempre i siti di biglietteria ufficiali prima di prenotare un viaggio.",
        liveBadgeLabel: "Live", liveTimelineTitle: " e prossimi", liveTimelineEmpty: "Nulla in programma al momento — torna a trovarci presto.", liveTimelineFooterNote: "Solo attività ufficiali e annunciate pubblicamente — date come annunciate, verifica sempre le fonti ufficiali prima di prenotare un viaggio.", liveViewList: "Lista", liveViewCalendar: "Calendario", liveFilterAll: "Tutti", liveTodayLive: "Oggi · Live", liveKindGroup: "Gruppo", liveKindSolo: "Solo", newBadgeLabel: "Nuovo", usernameCooldownNote: "Puoi modificarlo solo una volta ogni 7 giorni.", usernameConfirmTitle: "Vuoi cambiare il tuo nome utente?", usernameConfirmCancel: "Annulla", usernameConfirmOk: "Sì, cambialo", subtitle: "Sulle orme dei tuoi artisti preferiti", backToList: "← Torna alla lista", chooserTourOption: "Percorso del tour", chooserLiveOption: "Tutta l'attività dal vivo", tripShareThis: "+ Condividi questo viaggio", tripChangeCoverBtn: "Cambia copertina", tripDepartureLabel: "Partenza", tripReturnLabel: "Ritorno", tripApplyDatesBtn: "Applica", tripLeaveTitle: "Uscire da questo viaggio condiviso?", tripLeaveDesc: "Sei sicuro di voler uscire da questo viaggio? Ti servirà un nuovo invito per rientrare.", tripLeaveCancel: "Annulla", tripLeaveConfirm: "Esci", locationSharesLabel: "Condiviso con te", locationShareFrom: "{username} ti ha condiviso {location}", tabTourMode: "Tour", profileTabPhotos: "Foto", profileTabVisited: "Visitati", profileTabReviews: "Recensioni", profileTabMap: "Mappa", profileMapHeading: "Ecco dove sono stato/a", profileStatVisited: "visitati", profileStatPhotos: "foto", profileStatReviews: "recensioni", profileStatFollowers: "follower", profileAddFriendBtn: "Aggiungi amico", profileFriendsLabel: "Amici", profileRequestSentLabel: "Richiesta inviata", profileAcceptRequestBtn: "Accetta richiesta", profileEmptyPhotos: "Nessuna foto pubblica per ora.", profileEmptyVisited: "Nessun luogo visitato per ora.", profileEmptyReviews: "Nessuna recensione pubblica per ora.", profileNotFound: "Utente non trovato.", profileLoading: "Caricamento profilo…", backToFriends: "← Torna ad Amici", profileMenuOption: "Il tuo profilo", switchArtistLabel: "Cambia artista", groupNoDataYet: "Nessun dato di tour o live disponibile ancora per {group} — torna a trovarci presto.", tripInviteLabel: "Invita persone (facoltativo)", shareTripUsernamePlaceholder: "Il loro nome utente",
        tourModeGenericLabel: "Tour", tourModeMemberLiveIn: "{member} è in diretta — {event} a {city}", tourModeLiveNowOne: "In diretta ora", tourModeLiveNowCount: "{n} in diretta ora", tourModeMoreCount: "+{n} altri",
        tourModeEyebrow: "Modalità Tour", tourModeChooseTour: "Scegli un tour", tourModeStep: "Tappa {n} di {total}",
        tourModeHighlights: "Momenti salienti", tourModeSurpriseSong: "Canzone a sorpresa:", tourModeNoHighlightsYet: "Nessun momento saliente ancora aggiunto per questo concerto.", tourModeNoSurpriseSongYet: "Non ancora annunciata.",
        mapLoading: "Caricamento della mappa…",
        demoTourBtn: "Tour",
        newLocationToastLabel: "Nuovo luogo aggiunto", newLocationsSummaryToast: "{n} nuovi luoghi per {group}",
        paywallTitle: "Hai raggiunto il tuo limite gratuito (3/3)", paywallBody: "Ti piace la mappa segreta? Ci sono ancora più di 500 indirizzi da scoprire! Sblocca tutti i luoghi delle riprese, i ristoranti iconici e gli indirizzi frequentati dai tuoi idoli per preparare il viaggio dei tuoi sogni.",
        paywallMonthlyName: "PASS VIAGGIO (1 Mese)", paywallMonthlyDesc: "Perfetto per pianificare un soggiorno breve.", paywallFeatureFullAccess: "Accesso completo a oltre 500 indirizzi", paywallFeatureGPS: "Coordinate GPS esatte", paywallMonthlyPrice: "9,99 € / mese", paywallMonthlyTerms: "Senza vincoli", paywallBuyMonthly: "Ottieni il Pass Viaggio",
        paywallVipName: "PASS VIP (Accesso a vita)", paywallVipBadge: "SCELTA MIGLIORE", paywallVipDesc: "Per i veri appassionati. Paga una volta, goditelo per sempre.", paywallFeatureUpdates: "Aggiornamenti inclusi (nuovi luoghi ogni mese)", paywallFeatureOffline: "Modalità offline (presto disponibile)", paywallVipPrice: "19,99 € (pagamento unico)", paywallBuyVip: "Ottieni il Pass VIP",
        paywallActiveTitle: "Hai già un pass attivo",
        paywallActiveDescMonthly: "Il tuo Pass Viaggio è attivo fino al {date}. Grazie per sostenere Screen To Street!", paywallActiveDescVip: "Il tuo Pass VIP ti dà accesso a vita. Grazie per sostenere Screen To Street!",
        freeViewsCounter: "{remaining}/3 luoghi gratuiti rimasti",
        paymentTitle: "Completa il tuo acquisto", paymentDesc: "Inserisci i tuoi dati di pagamento per sbloccare la guida completa.", paymentSummaryLabel: "Pass selezionato:", paymentTotalLabel: "Totale dovuto:",
        cardNum: "Numero carta", expiry: "Data di scadenza", cvc: "CVC", paySecurely: "Paga in sicurezza", processing: "Elaborazione sicura in corso…", paymentBackLink: "← Torna alla mappa"
    },
    pt: {
        btnGenerateIti: "Gerador de Roteiros", filterGroup: "GRUPO", filterMember: "MEMBRO", filterArea: "REGIÃO", filterYear: "ANO", filterCategories: "CATEGORIAS",
        locationsCount: "LOCAIS", statsCountries: "PAÍSES", cookieText: "Usamos cookies para melhorar sua experiência.", cookiePolicy: "Política de Cookies",
        cookieManage: "Gerenciar", cookieReject: "Rejeitar", cookieAccept: "Aceitar",
        exploreDestOption: "Explorar Destinos", exploreArtistsOption: "Explorar Artistas", accountOption: "Sua Conta",
        visitedOption: "Locais Visitados", wishlistOption: "Minha Wishlist", tripsOption: "Minhas Viagens", friendsOption: "Amigos", settingsOption: "Configurações", logoutOption: "Sair",
        footerText: "Screen To Street é um guia independente feito por fãs.", footerMentions: "Aviso Legal", footerAbout: "Sobre Nós", footerTOS: "Termos de Serviço", footerPrivacy: "Política de Privacidade",
        allGroups: "Todos os grupos", allMembers: "Todos os membros", allAreas: "Todas as regiões", allYears: "Todos os anos", allCategories: "Todas as categorias",
        checkVisited: "Eu visitei este lugar", checkWishlist: "Adicionar à wishlist", tripWhich: "Para qual viagem é isso?",
        tripName: "Nome da viagem", tripWhen: "Quando você planeja ir?", tripFrom: "De", tripTo: "Até", tripCreate: "Criar viagem", tripCancel: "Cancelar",
        itiTitle: "Gerador de Roteiros", itiDesc: "Selecione um grupo, um país e quantos dias você fica.", itiCreateBtn: "Criar meu guia", itiCatLabel: "Categorias (opcional, seleção múltipla)", itiExport: "Exportar guia em PDF", itiSave: "Salvar em Minhas Viagens",
        searchTripsPlaceholder: "Buscar suas viagens...", noTripsFound: "Nenhuma viagem encontrada.", selectTripToView: "Selecione uma viagem para ver", deselectTripOption: "— Nenhuma viagem selecionada —", locationsWord: "local", locationsWordPlural: "locais",
        addAnotherVisit: "Adicionar outra visita",
        tabExplore: "Explorar", tabMyItinerary: "Meu Itinerário", yourRating: "Sua avaliação", foodQualityRating: "Qualidade da comida", valueForMoneyRating: "Custo-benefício", accessibilityRating: "Fácil acesso?", siteQualityRating: "Qualidade do lugar", wishlistStat: "{pct}% dos usuários adicionaram este lugar à lista de desejos", friendsVisitedStat: "{count} amigos visitaram este lugar", friendsVisitedStatOne: "1 amigo visitou este lugar", whenDidYouVisit: "Quando você visitou este lugar?", saveMemory: "Salvar lembrança", myVisitTab: "Minha Visita", tabReviews: "Avaliações", tabInfo: "Info", tabStory: "História", lGroup: "Grupo:", lMembers: "Membros:", lCountry: "País:", lCity: "Cidade:", lDate: "Data:", lEpisode: "Episódio:", lWatch: "Assistir:", lOfficialLink: "Link oficial", lFollow: "Seguir:", lWatchEpi: "Na tela", lPractical: "Informações práticas e acesso", lAddress: "Endereço", lOpenMap: "Abrir no Google Maps", lStoryPlace: "A história deste lugar", lStoryBts: "Nos passos do BTS", lTipsTitle: "AS DICAS «SCREEN TO STREET»", lHowToGetThere: "Como chegar:", memoryNotesLabel: "Suas notas (opcional)", memoryNotesPlaceholder: "O que você lembra deste lugar?", reviewsCountLabel: "{n} avaliações públicas", reviewsWriteLabel: "Escreva sua avaliação", reviewsComposePlaceholder: "Compartilhe sua opinião...", reviewsComposeMakePublic: "Tornar isso público", reviewsComposePost: "Publicar avaliação", memoryPhotoLabel: "Adicionar uma foto (opcional)", memoryPhotoChoose: "Escolher uma foto", memoryPhotoRemove: "Remover", memoryMakePublic: "Tornar esta avaliação pública (visível para outros usuários)", reviewsLoading: "Carregando avaliações…", reviewsEmpty: "Ainda não há avaliações públicas para este lugar — seja o primeiro a compartilhar a sua na aba «Minha Visita»!",
        backToMap: "← Voltar ao mapa", moreDetails: "Mais detalhes", openInMaps: "Abrir no Google Maps", detailsLabel: "Detalhes", aboutPlaceLabel: "Sobre este local",
        accTitle: "Sua conta", accChangePhoto: "Alterar foto de perfil", accResetPhoto: "Redefinir foto de perfil", accNameLabel: "Nome de usuário", accChangeUsernameHint: "Alterar nome de usuário", accEmailLabel: "Endereço de e-mail",
        accCountryLabel: "País de interesse", accCountryPlaceholder: "Escolha um país (opcional)",
        accActivityTitle: "Sua atividade", accTrips: "Viagens", accVisited: "Visitados", accWishlist: "Wishlist", accPasses: "Passes e faturamento",
        friendsTitle: "Amigos", openFriendsMessagesLink: "Abrir Amigos e Mensagens →", friendsAddPlaceholder: "Adicionar um amigo pelo nome de usuário", friendsAddBtn: "Adicionar", friendsRequestsLabel: "Pedidos de amizade", friendsListLabel: "Seus amigos", friendsEmpty: "Ainda sem amigos — adicione um pelo nome de usuário acima.", friendsAccept: "Aceitar", friendsDecline: "Recusar", friendsCancel: "Cancelar", friendsRemove: "Remover", friendsErrNotFound: "Nenhum usuário encontrado com esse nome.", friendsErrSelf: "Você não pode se adicionar.", friendsErrAlreadySent: "Você já enviou uma solicitação de amizade para essa pessoa.", friendsErrAlreadyFriends: "Vocês já são amigos.", friendsErrGeneric: "Não foi possível enviar o pedido. Tente novamente.", friendsSentLabel: "Enviado — aguardando resposta", friendsRequestFrom: "{username} quer ser seu amigo", shareWithFriendBtn: "Compartilhar", shareNoFriends: "Adicione um amigo primeiro para compartilhar lugares.", sharesEmpty: "Ainda ninguém compartilhou nada com você.", sharedByLabel: "{username} compartilhou {location}", friendsPageTitle: "Amigos e Mensagens", tripGroupsLabel: "Grupos de viagem", directMessagesLabel: "Mensagens diretas", noTripGroups: "Ainda sem viagens compartilhadas — compartilhe uma a partir de uma conversa.", noFriendsForDm: "Adicione um amigo para começar a conversar.", selectConversationPrompt: "Selecione uma conversa para começar a conversar", messagePlaceholder: "Mensagem...", sendBtn: "Enviar", tripGroupOwner: "Você criou esta viagem", tripGroupMember: "Compartilhado com você", shareTripBtn: "Compartilhar uma viagem", shareTripPickTitle: "Escolha uma viagem para compartilhar", noOwnedTrips: "Você ainda não tem nenhuma viagem.", viewItineraryLink: "Ver itinerário", chatForTripLabel: "Chat em grupo para esta viagem", friendRequestSentToast: "Pedido de amizade enviado", tripInvitesLabel: "Convites de viagem", tripInviteFrom: '{username} convidou você para "{tripname}"', addTripMemberOption: "Adicionar membro", renameTripGroupOption: "Renomear grupo", leaveTripGroupOption: "Sair do grupo", deleteConvoBtn: "Excluir conversa", deleteMessageOption: "Excluir mensagem", attachLocationTitle: "Compartilhar um local", attachPollTitle: "Criar uma enquete", attachPollCreateBtn: "Criar enquete", attachLocationOption: "Compartilhar um local", attachTripOption: "Compartilhar uma viagem", attachPollOption: "Criar uma enquete",
        accEditBtn: "Editar perfil", accSaveBtn: "Salvar alterações", accSaved: "✓ Salvo com sucesso", accNoPasses: "Nenhum passe ativo", accAmountPaid: "Valor pago", accGuestUsername: "Não conectado",
        accDangerZone: "Zona de perigo",
        accDeleteConfirmTitle: "Tem certeza de que deseja excluir sua conta?",
        accDeleteConfirmBody: "Esta ação é permanente. Você não será reembolsado por nenhum passe desbloqueado, e todos os seus dados — viagens, wishlist e locais visitados — serão perdidos definitivamente.",
        accDeletePasswordLabel: "Confirme sua senha", accDeleteCancel: "Cancelar", accDeleteConfirmBtn: "Sim, excluir minha conta",
        accDeleteGoogleReauthNote: "Para sua segurança, o Google precisa confirmar que é realmente você antes de excluirmos sua conta permanentemente. Clique em \"Confirmar com o Google\" abaixo.",
        setTitle: "Configurações", setSecurity: "Conta e segurança", setPassword: "Senha", setPasswordSub: "Última alteração há 3 meses", setChange: "Alterar",
        setChangePwTitle: "Altere sua senha", setChangePwGoogleNote: "Sua conta usa login com Google, portanto não tem uma senha do Screen To Street para alterar — gerencie-a na sua Conta Google.", setCurrentPwLabel: "Senha atual", setNewPwLabel: "Nova senha", setConfirmPwLabel: "Confirmar nova senha", setChangePwBtn: "Alterar senha",
        setSignedWith: "Conectado com", setPreferences: "Preferências", setLanguage: "Idioma", setCurrency: "Moeda", setUnits: "Unidades de distância",
        setEmailNotif: "Notificações por e-mail", setPushNotif: "Notificações push", setPrivacy: "Privacidade", setCookiePrefs: "Preferências de cookies",
        setResetBanners: "Redefinir banner", setDownloadData: "Baixar meus dados", setExportSub: "Exportar tudo em JSON", setExport: "Exportar",
        setManage: "Gerenciar", setNotifConfirmTitle: "Ativar notificações por e-mail?", setNotifConfirmBody: "Ao ativar, você concorda em receber um e-mail sempre que novos locais forem adicionados — com uma frequência que depende da atividade atual do artista (mais frequente durante um comeback ou turnê, mais tranquila fora disso). Escolha abaixo os grupos e os países do seu interesse.", setNotifEnableBtn: "Ativar", setPushNotifConfirmTitle: "Ativar notificações push?", setPushNotifConfirmBody: "Ao ativar, você concorda em receber uma notificação push sempre que novos locais forem adicionados — com uma frequência que depende da atividade atual do artista (mais frequente durante um comeback ou turnê, mais tranquila fora disso). Escolha abaixo os grupos e os países do seu interesse.", setNotifGroupsLabel: "Notificar-me para estes grupos", setNotifCountryLabel: "Notificar-me para estes países", setNotifAllCountries: "Todos os países", setNotifSearchCountry: "Buscar países...", setCookiePrefsTitle: "Preferências de cookies", setCookiePrefsBody: "Os cookies necessários fazem o site funcionar (login, lista de desejos salva) e não podem ser desativados. Você escolhe se também usamos cookies para lembrar suas preferências entre visitas.", setCookieNecessary: "Necessários", setCookieNecessarySub: "Sempre ativos", setCookieAnalytics: "Preferências e análise", setCookieAnalyticsSub: "Lembra suas escolhas entre visitas", setSavePreferences: "Salvar preferências",
        setDanger: "Zona de perigo", setDeleteAccTitle: "Excluir conta", setDeleteAccSub: "Isso exclui permanentemente suas viagens, wishlist e passes desbloqueados.", setDeleteAccBtn: "Excluir conta",
        wishTitle: "Minha Wishlist", wishEmpty: "Você ainda não salvou nenhum local. Explore o mapa e clique em «Adicionar à wishlist»!", wishSomeday: "Algum dia / Ainda sem viagem",
        visitTitle: "Meus Locais Visitados", visitEmpty: "Você ainda não marcou nenhum local como visitado. Explore o mapa e marque «Eu visitei este lugar»!",
        destTitle: "Explorar Destinos", destSub: "Explore todos os países e cidades do Screen To Street", destCountries: "Países", destCities: "Cidades", destLocations: "Locais", destViewMap: "Ver no mapa →",
        artTitle: "Explorar Artistas", artSub: "Descubra todos os grupos presentes no Screen To Street", artGroups: "Grupos", artFeatured: "Grupo em destaque",

        gateLoginTitle: "Entre para continuar", gateLoginDesc: "Entre se já tiver uma conta, ou cadastre-se se não tiver. Você também pode continuar sem conta — 3 locais incluídos, grátis.", gateContinueFreeText: "Prefere não criar uma conta?", gateContinueFreeLink: "Continuar grátis — 3 locais incluídos",
        gateEmailLabel: "Endereço de e-mail", gateEmailOrUsernameLabel: "E-mail ou nome de usuário", gatePasswordLabel: "Senha", gateForgotPassword: "Esqueceu a senha?",
        gateLoginBtn: "Entrar", gateOrDivider: "OU", gateGoogleBtn: "Continuar com Google",
        gateSignupPrompt: "Não tem uma conta?", gateSignupLink: "Cadastre-se",
        gateNoGroupsTitle: "Desbloqueie um grupo para ver o mapa", gateNoGroupsDesc: "Você ainda não desbloqueou nenhum grupo. Clique abaixo para escolher um passe e começar a explorar.",
        gateUnlockBtn: "Desbloquear um grupo", gateLogoutLink: "Sair",
        gateErrorInvalid: "E-mail ou senha incorretos.", gateErrorGeneric: "Algo deu errado. Tente novamente.",
        gateResetSent: "E-mail de redefinição enviado — verifique sua caixa de entrada.", gateEnterEmailFirst: "Informe primeiro seu endereço de e-mail.",
        tourModeLiveIn: "Ao vivo — BTS está se apresentando em {city}", tourModeSchedule: "Calendário da turnê", tourModeLive: "Ao vivo", tourModeDone: "Concluído", tourModeUpcoming: "Em breve", tourModePrev: "Anterior", tourModeNext: "Próximo",
        tourModeFooterNote: "Datas anunciadas pela turnê — sempre confira os sites oficiais de venda de ingressos antes de reservar uma viagem.",
        liveBadgeLabel: "Ao vivo", liveTimelineTitle: " e próximos", liveTimelineEmpty: "Nada programado no momento — volte em breve.", liveTimelineFooterNote: "Apenas atividades oficiais e anunciadas publicamente — datas conforme anunciadas, sempre confira as fontes oficiais antes de reservar uma viagem.", liveViewList: "Lista", liveViewCalendar: "Calendário", liveFilterAll: "Todos", liveTodayLive: "Hoje · Ao vivo", liveKindGroup: "Grupo", liveKindSolo: "Solo", newBadgeLabel: "Novo", usernameCooldownNote: "Você só pode alterar isso uma vez a cada 7 dias.", usernameConfirmTitle: "Alterar seu nome de usuário?", usernameConfirmCancel: "Cancelar", usernameConfirmOk: "Sim, alterar", subtitle: "Nos passos dos seus artistas favoritos", backToList: "← Voltar à lista", chooserTourOption: "Rota da turnê", chooserLiveOption: "Toda a atividade ao vivo", tripShareThis: "+ Compartilhar esta viagem", tripChangeCoverBtn: "Alterar capa", tripDepartureLabel: "Partida", tripReturnLabel: "Volta", tripApplyDatesBtn: "Aplicar", tripLeaveTitle: "Sair desta viagem compartilhada?", tripLeaveDesc: "Tem certeza de que deseja sair desta viagem? Você precisará de um novo convite para participar novamente.", tripLeaveCancel: "Cancelar", tripLeaveConfirm: "Sair", locationSharesLabel: "Compartilhado com você", locationShareFrom: "{username} compartilhou {location} com você", tabTourMode: "Turnê", profileTabPhotos: "Fotos", profileTabVisited: "Visitados", profileTabReviews: "Avaliações", profileTabMap: "Mapa", profileMapHeading: "Aqui é onde estive", profileStatVisited: "visitados", profileStatPhotos: "fotos", profileStatReviews: "avaliações", profileStatFollowers: "seguidores", profileAddFriendBtn: "Adicionar amigo", profileFriendsLabel: "Amigos", profileRequestSentLabel: "Pedido enviado", profileAcceptRequestBtn: "Aceitar pedido", profileEmptyPhotos: "Ainda sem fotos públicas.", profileEmptyVisited: "Ainda sem lugares visitados.", profileEmptyReviews: "Ainda sem avaliações públicas.", profileNotFound: "Utilizador não encontrado.", profileLoading: "A carregar perfil…", backToFriends: "← Voltar a Amigos", profileMenuOption: "O seu perfil", switchArtistLabel: "Trocar de artista", groupNoDataYet: "Ainda não há dados de turnê ou ao vivo para {group} — volte em breve.", tripInviteLabel: "Convidar pessoas (opcional)", shareTripUsernamePlaceholder: "O nome de usuário deles",
        tourModeGenericLabel: "Turnê", tourModeMemberLiveIn: "{member} está ao vivo agora — {event} em {city}", tourModeLiveNowOne: "Ao vivo agora", tourModeLiveNowCount: "{n} ao vivo agora", tourModeMoreCount: "+{n} mais",
        tourModeEyebrow: "Modo Turnê", tourModeChooseTour: "Escolher uma turnê", tourModeStep: "Etapa {n} de {total}",
        tourModeHighlights: "Melhores momentos", tourModeSurpriseSong: "Música surpresa:", tourModeNoHighlightsYet: "Nenhum destaque adicionado ainda para este show.", tourModeNoSurpriseSongYet: "Ainda não anunciada.",
        mapLoading: "Carregando o mapa…",
        demoTourBtn: "Tour guiado",
        newLocationToastLabel: "Novo local adicionado", newLocationsSummaryToast: "{n} novos locais para {group}",
        paywallTitle: "Você atingiu seu limite gratuito (3/3)", paywallBody: "Está gostando do mapa secreto? Ainda há mais de 500 endereços para descobrir! Desbloqueie todos os locais de filmagem, restaurantes icônicos e endereços frequentados pelos seus ídolos para planejar a viagem dos seus sonhos.",
        paywallMonthlyName: "PASSE VIAGEM (1 Mês)", paywallMonthlyDesc: "Perfeito para planejar uma estadia curta.", paywallFeatureFullAccess: "Acesso total a mais de 500 endereços", paywallFeatureGPS: "Coordenadas GPS exatas", paywallMonthlyPrice: "€9,99 / mês", paywallMonthlyTerms: "Sem compromisso", paywallBuyMonthly: "Obter o Passe Viagem",
        paywallVipName: "PASSE VIP (Acesso vitalício)", paywallVipBadge: "MELHOR ESCOLHA", paywallVipDesc: "Para os verdadeiros fãs. Pague uma vez, aproveite para sempre.", paywallFeatureUpdates: "Atualizações incluídas (novos locais todo mês)", paywallFeatureOffline: "Modo offline (em breve)", paywallVipPrice: "€19,99 (pagamento único)", paywallBuyVip: "Obter o Passe VIP",
        paywallActiveTitle: "Você já tem um passe ativo",
        paywallActiveDescMonthly: "Seu Passe Viagem está ativo até {date}. Obrigado por apoiar o Screen To Street!", paywallActiveDescVip: "Seu Passe VIP te dá acesso vitalício. Obrigado por apoiar o Screen To Street!",
        freeViewsCounter: "{remaining}/3 locais gratuitos restantes",
        paymentTitle: "Finalize sua compra", paymentDesc: "Insira seus dados de pagamento para desbloquear o guia completo.", paymentSummaryLabel: "Passe selecionado:", paymentTotalLabel: "Total devido:",
        cardNum: "Número do cartão", expiry: "Data de validade", cvc: "CVC", paySecurely: "Pagar com segurança", processing: "Processando com segurança…", paymentBackLink: "← Voltar ao mapa"
    },
    ko: {
        btnGenerateIti: "자동 일정 생성기", filterGroup: "그룹", filterMember: "멤버", filterArea: "지역", filterYear: "연도", filterCategories: "카테고리",
        locationsCount: "장소", statsCountries: "국가", cookieText: "더 나은 경험을 위해 쿠키를 사용합니다.", cookiePolicy: "쿠키 정책",
        cookieManage: "관리", cookieReject: "거부", cookieAccept: "수락",
        exploreDestOption: "여행지 둘러보기", exploreArtistsOption: "아티스트 둘러보기", accountOption: "내 계정",
        visitedOption: "방문한 장소", wishlistOption: "위시리스트", tripsOption: "내 여행", friendsOption: "친구", settingsOption: "설정", logoutOption: "로그아웃",
        footerText: "Screen To Street는 팬이 만든 독립적인 가이드입니다.", footerMentions: "법적 고지", footerAbout: "소개", footerTOS: "이용약관", footerPrivacy: "개인정보처리방침",
        allGroups: "모든 그룹", allMembers: "모든 멤버", allAreas: "모든 지역", allYears: "모든 연도", allCategories: "모든 카테고리",
        checkVisited: "이 장소를 방문했어요", checkWishlist: "위시리스트에 추가", tripWhich: "어떤 여행을 위한 건가요?",
        tripName: "여행 이름", tripWhen: "언제 갈 계획인가요?", tripFrom: "부터", tripTo: "까지", tripCreate: "여행 만들기", tripCancel: "취소",
        itiTitle: "자동 일정 생성기", itiDesc: "그룹, 국가, 체류 일수를 선택하세요.", itiCreateBtn: "가이드 만들기", itiCatLabel: "카테고리 (선택 사항, 다중 선택 가능)", itiExport: "가이드 PDF로 내보내기", itiSave: "내 여행에 저장",
        searchTripsPlaceholder: "여행 검색...", noTripsFound: "여행을 찾을 수 없습니다.", selectTripToView: "볼 여행을 선택하세요", deselectTripOption: "— 선택된 여행 없음 —", locationsWord: "장소", locationsWordPlural: "장소",
        addAnotherVisit: "다른 방문 추가",
        tabExplore: "탐색", tabMyItinerary: "내 일정", yourRating: "평점", foodQualityRating: "음식 품질", valueForMoneyRating: "가성비", accessibilityRating: "접근이 쉬운가요?", siteQualityRating: "장소의 품질", wishlistStat: "사용자의 {pct}%가 이 장소를 위시리스트에 추가했습니다", friendsVisitedStat: "친구 {count}명이 이곳을 방문했어요", friendsVisitedStatOne: "친구 1명이 이곳을 방문했어요", whenDidYouVisit: "언제 방문하셨나요?", saveMemory: "추억 저장", myVisitTab: "내 방문", tabReviews: "후기", tabInfo: "정보", tabStory: "스토리", lGroup: "그룹:", lMembers: "멤버:", lCountry: "국가:", lCity: "도시:", lDate: "날짜:", lEpisode: "에피소드:", lWatch: "시청:", lOfficialLink: "공식 링크", lFollow: "팔로우:", lWatchEpi: "화면 속", lPractical: "실용 정보 및 접근 방법", lAddress: "주소", lOpenMap: "구글 지도에서 열기", lStoryPlace: "이 장소의 이야기", lStoryBts: "BTS의 발자취를 따라", lTipsTitle: "'SCREEN TO STREET' 팁", lHowToGetThere: "가는 방법:", memoryNotesLabel: "나의 메모 (선택 사항)", memoryNotesPlaceholder: "이 장소에 대해 기억나는 것이 있나요?", reviewsCountLabel: "공개 후기 {n}개", reviewsWriteLabel: "후기 작성하기", reviewsComposePlaceholder: "느낀 점을 공유해보세요...", reviewsComposeMakePublic: "이 후기를 공개로 설정", reviewsComposePost: "후기 게시", memoryPhotoLabel: "사진 추가 (선택 사항)", memoryPhotoChoose: "사진 선택", memoryPhotoRemove: "제거", memoryMakePublic: "이 후기를 공개로 설정 (다른 사용자에게 표시됨)", reviewsLoading: "후기를 불러오는 중…", reviewsEmpty: "아직 이 장소에 대한 공개 후기가 없습니다 — '내 방문' 탭에서 첫 후기를 남겨보세요!",
        backToMap: "← 지도로 돌아가기", moreDetails: "자세히 보기", openInMaps: "구글 지도에서 열기", detailsLabel: "상세 정보", aboutPlaceLabel: "이 장소에 대해",
        accTitle: "내 계정", accChangePhoto: "프로필 사진 변경", accResetPhoto: "프로필 사진 재설정", accNameLabel: "아이디", accChangeUsernameHint: "아이디 변경", accEmailLabel: "이메일 주소",
        accCountryLabel: "관심 있는 국가", accCountryPlaceholder: "국가 선택 (선택 사항)",
        accActivityTitle: "내 활동", accTrips: "여행", accVisited: "방문함", accWishlist: "위시리스트", accPasses: "이용권 및 결제",
        friendsTitle: "친구", openFriendsMessagesLink: "친구 및 메시지 열기 →", friendsAddPlaceholder: "사용자 이름으로 친구 추가", friendsAddBtn: "추가", friendsRequestsLabel: "친구 요청", friendsListLabel: "내 친구", friendsEmpty: "아직 친구가 없습니다 — 위에서 사용자 이름으로 친구를 추가해보세요.", friendsAccept: "수락", friendsDecline: "거절", friendsCancel: "취소", friendsRemove: "삭제", friendsErrNotFound: "해당 사용자 이름을 가진 사용자를 찾을 수 없습니다.", friendsErrSelf: "자기 자신은 추가할 수 없습니다.", friendsErrAlreadySent: "이미 이 사람에게 친구 요청을 보냈습니다.", friendsErrAlreadyFriends: "이미 친구입니다.", friendsErrGeneric: "요청을 보낼 수 없습니다. 다시 시도해 주세요.", friendsSentLabel: "전송됨 — 응답 대기 중", friendsRequestFrom: "{username}님이 친구가 되고 싶어합니다", shareWithFriendBtn: "공유", shareNoFriends: "장소를 공유하려면 먼저 친구를 추가하세요.", sharesEmpty: "아직 공유받은 것이 없습니다.", sharedByLabel: "{username}님이 {location}을(를) 공유했습니다", friendsPageTitle: "친구 및 메시지", tripGroupsLabel: "여행 그룹", directMessagesLabel: "다이렉트 메시지", noTripGroups: "아직 공유된 여행이 없습니다 — 대화에서 여행을 공유해보세요.", noFriendsForDm: "메시지를 보내려면 먼저 친구를 추가하세요.", selectConversationPrompt: "채팅을 시작하려면 대화를 선택하세요", messagePlaceholder: "메시지...", sendBtn: "전송", tripGroupOwner: "이 여행을 만드셨습니다", tripGroupMember: "공유받은 여행", shareTripBtn: "여행 공유하기", shareTripPickTitle: "공유할 여행을 선택하세요", noOwnedTrips: "아직 여행이 없습니다.", viewItineraryLink: "일정 보기", chatForTripLabel: "이 여행의 그룹 채팅", friendRequestSentToast: "친구 요청을 보냈습니다", tripInvitesLabel: "여행 초대", tripInviteFrom: '{username}님이 "{tripname}" 여행에 초대했습니다', addTripMemberOption: "멤버 추가", renameTripGroupOption: "그룹 이름 변경", leaveTripGroupOption: "그룹 나가기", deleteConvoBtn: "대화 삭제", deleteMessageOption: "메시지 삭제", attachLocationTitle: "장소 공유", attachPollTitle: "설문조사 만들기", attachPollCreateBtn: "설문조사 만들기", attachLocationOption: "장소 공유", attachTripOption: "여행 공유", attachPollOption: "설문조사 만들기",
        accEditBtn: "프로필 수정", accSaveBtn: "변경사항 저장", accSaved: "✓ 저장되었습니다", accNoPasses: "활성화된 이용권 없음", accAmountPaid: "결제 금액", accGuestUsername: "로그인하지 않음",
        accDangerZone: "위험 구역",
        accDeleteConfirmTitle: "정말 계정을 삭제하시겠습니까?",
        accDeleteConfirmBody: "이 작업은 되돌릴 수 없습니다. 잠금 해제한 이용권에 대한 환불은 제공되지 않으며, 여행·위시리스트·방문한 장소를 포함한 모든 데이터가 영구적으로 사라집니다.",
        accDeletePasswordLabel: "비밀번호를 확인해주세요", accDeleteCancel: "취소", accDeleteConfirmBtn: "네, 계정을 삭제합니다",
        accDeleteGoogleReauthNote: "보안을 위해 계정을 영구 삭제하기 전에 Google에서 본인 확인이 필요합니다. 아래의 'Google로 확인'을 클릭하세요.",
        setTitle: "설정", setSecurity: "계정 및 보안", setPassword: "비밀번호", setPasswordSub: "3개월 전에 마지막으로 변경됨", setChange: "변경",
        setChangePwTitle: "비밀번호 변경", setChangePwGoogleNote: "이 계정은 Google 로그인을 사용하므로 변경할 Screen To Street 비밀번호가 없습니다 — Google 계정에서 관리해 주세요.", setCurrentPwLabel: "현재 비밀번호", setNewPwLabel: "새 비밀번호", setConfirmPwLabel: "새 비밀번호 확인", setChangePwBtn: "비밀번호 변경",
        setSignedWith: "로그인 방식", setPreferences: "환경설정", setLanguage: "언어", setCurrency: "통화", setUnits: "거리 단위",
        setEmailNotif: "이메일 알림", setPushNotif: "푸시 알림", setPrivacy: "개인정보", setCookiePrefs: "쿠키 설정",
        setResetBanners: "배너 초기화", setDownloadData: "내 데이터 다운로드", setExportSub: "모든 데이터를 JSON으로 내보내기", setExport: "내보내기",
        setManage: "관리", setNotifConfirmTitle: "이메일 알림을 활성화할까요?", setNotifConfirmBody: "이 옵션을 켜면 새 장소가 추가될 때마다 이메일을 받는 것에 동의하는 것입니다 — 빈도는 아티스트의 현재 활동량에 따라 달라집니다(컴백이나 투어 중에는 더 자주, 그 외에는 더 조용하게). 아래에서 관심 있는 그룹과 국가를(를) 선택하세요.", setNotifEnableBtn: "활성화", setPushNotifConfirmTitle: "푸시 알림을 활성화할까요?", setPushNotifConfirmBody: "이 옵션을 켜면 새 장소가 추가될 때마다 푸시 알림을 받는 것에 동의하는 것입니다 — 빈도는 아티스트의 현재 활동량에 따라 달라집니다(컴백이나 투어 중에는 더 자주, 그 외에는 더 조용하게). 아래에서 관심 있는 그룹과 국가를(를) 선택하세요.", setNotifGroupsLabel: "알림을 받을 그룹", setNotifCountryLabel: "알림을 받을 국가(복수 선택 가능)", setNotifAllCountries: "모든 국가", setNotifSearchCountry: "국가 검색...", setCookiePrefsTitle: "쿠키 설정", setCookiePrefsBody: "필수 쿠키는 사이트가 작동하는 데 필요하며(로그인, 저장된 위시리스트) 끌 수 없습니다. 방문 간에 선호도를 기억하는 쿠키를 추가로 사용할지는 직접 선택할 수 있습니다.", setCookieNecessary: "필수", setCookieNecessarySub: "항상 활성화됨", setCookieAnalytics: "선호도 및 분석", setCookieAnalyticsSub: "방문 간 선택 사항을 기억합니다", setSavePreferences: "환경설정 저장",
        setDanger: "위험 구역", setDeleteAccTitle: "계정 삭제", setDeleteAccSub: "여행, 위시리스트, 잠금 해제된 이용권이 영구적으로 삭제됩니다.", setDeleteAccBtn: "계정 삭제",
        wishTitle: "내 위시리스트", wishEmpty: "아직 저장한 장소가 없습니다. 지도를 둘러보고 「위시리스트에 추가」를 클릭해보세요!", wishSomeday: "언젠가 / 아직 정해진 여행 없음",
        visitTitle: "내가 방문한 장소", visitEmpty: "아직 방문으로 표시한 장소가 없습니다. 지도를 둘러보고 「이 장소를 방문했어요」를 체크해보세요!",
        destTitle: "여행지 둘러보기", destSub: "Screen To Street에 소개된 모든 국가와 도시를 살펴보세요", destCountries: "국가", destCities: "도시", destLocations: "장소", destViewMap: "지도에서 보기 →",
        artTitle: "아티스트 둘러보기", artSub: "Screen To Street에 소개된 모든 그룹을 만나보세요", artGroups: "그룹", artFeatured: "추천 그룹",

        gateLoginTitle: "계속하려면 로그인하세요", gateLoginDesc: "이미 계정이 있다면 로그인하고, 없다면 가입하세요. 계정 없이도 계속할 수 있습니다 — 무료로 3곳 이용 가능.", gateContinueFreeText: "계정을 만들고 싶지 않으신가요?", gateContinueFreeLink: "무료로 계속하기 — 3곳 포함",
        gateEmailLabel: "이메일 주소", gateEmailOrUsernameLabel: "이메일 또는 아이디", gatePasswordLabel: "비밀번호", gateForgotPassword: "비밀번호를 잊으셨나요?",
        gateLoginBtn: "로그인", gateOrDivider: "또는", gateGoogleBtn: "Google로 계속하기",
        gateSignupPrompt: "계정이 없으신가요?", gateSignupLink: "회원가입",
        gateNoGroupsTitle: "지도를 보려면 그룹을 잠금 해제하세요", gateNoGroupsDesc: "아직 잠금 해제한 그룹이 없습니다. 아래를 클릭해 이용권을 선택하고 둘러보기를 시작하세요.",
        gateUnlockBtn: "그룹 잠금 해제하기", gateLogoutLink: "로그아웃",
        gateErrorInvalid: "이메일 또는 비밀번호가 올바르지 않습니다.", gateErrorGeneric: "문제가 발생했습니다. 다시 시도해주세요.",
        gateResetSent: "비밀번호 재설정 이메일을 보냈습니다 — 받은편지함을 확인해주세요.", gateEnterEmailFirst: "먼저 이메일 주소를 입력해주세요.",
        tourModeLiveIn: "라이브 중 — BTS가 {city}에서 공연 중입니다", tourModeSchedule: "투어 일정", tourModeLive: "라이브", tourModeDone: "종료", tourModeUpcoming: "예정", tourModePrev: "이전", tourModeNext: "다음",
        tourModeFooterNote: "투어 측이 발표한 날짜입니다 — 여행 예약 전 공식 티켓 판매 사이트를 꼭 확인하세요.",
        liveBadgeLabel: "라이브", liveTimelineTitle: " 및 예정", liveTimelineEmpty: "지금은 예정된 일정이 없습니다 — 곧 다시 확인해주세요.", liveTimelineFooterNote: "공식적으로 공개된 활동만 표시됩니다 — 발표된 날짜 기준이며, 여행 예약 전 항상 공식 출처를 확인하세요.", liveViewList: "목록", liveViewCalendar: "달력", liveFilterAll: "전체", liveTodayLive: "오늘 · 라이브", liveKindGroup: "그룹", liveKindSolo: "솔로", newBadgeLabel: "신규", usernameCooldownNote: "7일에 한 번만 변경할 수 있습니다.", usernameConfirmTitle: "아이디를 변경하시겠습니까?", usernameConfirmCancel: "취소", usernameConfirmOk: "네, 변경합니다", subtitle: "당신이 좋아하는 아티스트의 발자취를 따라", backToList: "← 목록으로 돌아가기", chooserTourOption: "투어 경로", chooserLiveOption: "모든 라이브 활동", tripShareThis: "+ 이 여행 공유하기", tripChangeCoverBtn: "커버 변경", tripDepartureLabel: "출발", tripReturnLabel: "귀국", tripApplyDatesBtn: "적용", tripLeaveTitle: "공유된 여행에서 나가시겠습니까?", tripLeaveDesc: "정말로 이 여행에서 나가시겠습니까? 다시 참여하려면 새 초대가 필요합니다.", tripLeaveCancel: "취소", tripLeaveConfirm: "나가기", locationSharesLabel: "공유받은 항목", locationShareFrom: "{username}님이 {location}을(를) 공유했습니다", tabTourMode: "투어", profileTabPhotos: "사진", profileTabVisited: "방문", profileTabReviews: "리뷰", profileTabMap: "지도", profileMapHeading: "제가 다녀온 곳이에요", profileStatVisited: "방문", profileStatPhotos: "사진", profileStatReviews: "리뷰", profileStatFollowers: "팔로워", profileAddFriendBtn: "친구 추가", profileFriendsLabel: "친구", profileRequestSentLabel: "요청 전송됨", profileAcceptRequestBtn: "요청 수락", profileEmptyPhotos: "아직 공개된 사진이 없습니다.", profileEmptyVisited: "아직 방문한 장소가 없습니다.", profileEmptyReviews: "아직 공개 리뷰가 없습니다.", profileNotFound: "이 사용자를 찾을 수 없습니다.", profileLoading: "프로필 로딩 중…", backToFriends: "← 친구로 돌아가기", profileMenuOption: "내 프로필", switchArtistLabel: "아티스트 변경", groupNoDataYet: "{group}의 투어 또는 라이브 정보가 아직 없습니다 — 곧 다시 확인해주세요.", tripInviteLabel: "사람 초대하기 (선택 사항)", shareTripUsernamePlaceholder: "상대방 아이디",
        tourModeGenericLabel: "투어", tourModeMemberLiveIn: "{member} 라이브 중 — {city}에서 {event}", tourModeLiveNowOne: "지금 라이브", tourModeLiveNowCount: "지금 {n}건 라이브", tourModeMoreCount: "+{n}개 더보기",
        tourModeEyebrow: "투어 모드", tourModeChooseTour: "투어 선택", tourModeStep: "{total}단계 중 {n}단계",
        tourModeHighlights: "하이라이트", tourModeSurpriseSong: "깜짝 곡:", tourModeNoHighlightsYet: "이 공연의 하이라이트가 아직 등록되지 않았습니다.", tourModeNoSurpriseSongYet: "아직 발표되지 않았습니다.",
        mapLoading: "지도를 불러오는 중…",
        demoTourBtn: "투어",
        newLocationToastLabel: "새로운 장소 추가됨", newLocationsSummaryToast: "{group}의 새로운 장소 {n}개",
        paywallTitle: "무료 열람 한도에 도달했습니다 (3/3)", paywallBody: "비밀 지도가 마음에 드시나요? 아직 500개 이상의 주소가 더 남아있어요! 촬영지, 인기 맛집, 그리고 아이돌이 자주 찾는 장소까지 모두 잠금 해제하고 꿈꾸던 여행을 준비해 보세요.",
        paywallMonthlyName: "트래블 패스 (1개월)", paywallMonthlyDesc: "짧은 여행 계획에 딱이에요.", paywallFeatureFullAccess: "500개 이상 주소 전체 이용 가능", paywallFeatureGPS: "정확한 GPS 좌표", paywallMonthlyPrice: "월 9.99€", paywallMonthlyTerms: "약정 없음", paywallBuyMonthly: "트래블 패스 구매",
        paywallVipName: "VIP 패스 (평생 이용)", paywallVipBadge: "최고의 선택", paywallVipDesc: "진짜 팬을 위한 패스. 한 번 결제로 평생 이용하세요.", paywallFeatureUpdates: "업데이트 포함 (매달 새로운 장소 추가)", paywallFeatureOffline: "오프라인 모드 (출시 예정)", paywallVipPrice: "19.99€ (일회성 결제)", paywallBuyVip: "VIP 패스 구매",
        paywallActiveTitle: "이미 이용 중인 패스가 있습니다",
        paywallActiveDescMonthly: "트래블 패스가 {date}까지 활성화되어 있습니다. Screen To Street를 응원해 주셔서 감사합니다!", paywallActiveDescVip: "VIP 패스로 평생 이용이 가능합니다. Screen To Street를 응원해 주셔서 감사합니다!",
        freeViewsCounter: "무료 열람 {remaining}/3곳 남음",
        paymentTitle: "결제 완료하기", paymentDesc: "전체 가이드를 이용하려면 결제 정보를 입력하세요.", paymentSummaryLabel: "선택한 패스:", paymentTotalLabel: "결제 금액:",
        cardNum: "카드 번호", expiry: "유효 기간", cvc: "CVC", paySecurely: "안전하게 결제하기", processing: "안전하게 처리 중…", paymentBackLink: "← 지도로 돌아가기"
    },
    ja: {
        btnGenerateIti: "自動旅程ジェネレーター", filterGroup: "グループ", filterMember: "メンバー", filterArea: "エリア", filterYear: "年", filterCategories: "カテゴリー",
        locationsCount: "スポット", statsCountries: "国", cookieText: "より良い体験のためにクッキーを使用しています。", cookiePolicy: "クッキーポリシー",
        cookieManage: "管理", cookieReject: "拒否", cookieAccept: "同意",
        exploreDestOption: "旅先を探す", exploreArtistsOption: "アーティストを探す", accountOption: "アカウント",
        visitedOption: "訪れた場所", wishlistOption: "ウィッシュリスト", tripsOption: "マイトリップ", friendsOption: "フレンド", settingsOption: "設定", logoutOption: "ログアウト",
        footerText: "Screen To Streetはファンによる独立系ガイドです。", footerMentions: "特定商取引法に基づく表記", footerAbout: "私たちについて", footerTOS: "利用規約", footerPrivacy: "プライバシーポリシー",
        allGroups: "すべてのグループ", allMembers: "すべてのメンバー", allAreas: "すべてのエリア", allYears: "すべての年", allCategories: "すべてのカテゴリー",
        checkVisited: "この場所を訪れました", checkWishlist: "ウィッシュリストに追加", tripWhich: "どの旅行のためですか？",
        tripName: "旅行の名前", tripWhen: "いつ行く予定ですか？", tripFrom: "開始", tripTo: "終了", tripCreate: "旅行を作成", tripCancel: "キャンセル",
        itiTitle: "自動旅程ジェネレーター", itiDesc: "グループ、国、滞在日数を選択してください。", itiCreateBtn: "ガイドを作成", itiCatLabel: "カテゴリー（任意、複数選択可）", itiExport: "ガイドをPDFで出力", itiSave: "マイトリップに保存",
        searchTripsPlaceholder: "旅行を検索...", noTripsFound: "旅行が見つかりません。", selectTripToView: "表示する旅行を選択", deselectTripOption: "— 選択された旅行はありません —", locationsWord: "スポット", locationsWordPlural: "スポット",
        addAnotherVisit: "別の訪問を追加",
        tabExplore: "探索", tabMyItinerary: "マイ旅程", yourRating: "評価", foodQualityRating: "料理の質", valueForMoneyRating: "コストパフォーマンス", accessibilityRating: "アクセスしやすさ", siteQualityRating: "場所の質", wishlistStat: "ユーザーの{pct}%がこの場所をウィッシュリストに追加しました", friendsVisitedStat: "{count}人の友達がここを訪れました", friendsVisitedStatOne: "1人の友達がここを訪れました", whenDidYouVisit: "いつ訪れましたか？", saveMemory: "思い出を保存", myVisitTab: "マイビジット", tabReviews: "レビュー", tabInfo: "情報", tabStory: "ストーリー", lGroup: "グループ：", lMembers: "メンバー：", lCountry: "国：", lCity: "都市：", lDate: "日付：", lEpisode: "エピソード：", lWatch: "視聴：", lOfficialLink: "公式リンク", lFollow: "フォロー:", lWatchEpi: "画面の中", lPractical: "実用情報とアクセス", lAddress: "住所", lOpenMap: "Googleマップで開く", lStoryPlace: "この場所の物語", lStoryBts: "BTSの足跡をたどって", lTipsTitle: "「SCREEN TO STREET」のヒント", lHowToGetThere: "行き方：", memoryNotesLabel: "メモ（任意）", memoryNotesPlaceholder: "この場所について覚えていることは？", reviewsCountLabel: "公開レビュー{n}件", reviewsWriteLabel: "レビューを書く", reviewsComposePlaceholder: "感想をシェアしましょう…", reviewsComposeMakePublic: "このレビューを公開する", reviewsComposePost: "レビューを投稿", memoryPhotoLabel: "写真を追加（任意）", memoryPhotoChoose: "写真を選択", memoryPhotoRemove: "削除", memoryMakePublic: "このレビューを公開する（他のユーザーに表示されます）", reviewsLoading: "レビューを読み込み中…", reviewsEmpty: "この場所にはまだ公開レビューがありません —「マイビジット」タブから最初のレビューを共有しましょう！",
        backToMap: "← 地図に戻る", moreDetails: "詳細を見る", openInMaps: "Googleマップで開く", detailsLabel: "詳細", aboutPlaceLabel: "この場所について",
        accTitle: "アカウント", accChangePhoto: "プロフィール写真を変更", accResetPhoto: "プロフィール写真をリセット", accNameLabel: "ユーザー名", accChangeUsernameHint: "ユーザー名を変更", accEmailLabel: "メールアドレス",
        accCountryLabel: "興味のある国", accCountryPlaceholder: "国を選択（任意）",
        accActivityTitle: "アクティビティ", accTrips: "旅行", accVisited: "訪問済み", accWishlist: "ウィッシュリスト", accPasses: "パスとお支払い",
        friendsTitle: "フレンド", openFriendsMessagesLink: "フレンド＆メッセージを開く →", friendsAddPlaceholder: "ユーザー名でフレンドを追加", friendsAddBtn: "追加", friendsRequestsLabel: "フレンド申請", friendsListLabel: "フレンド一覧", friendsEmpty: "まだフレンドがいません — 上のユーザー名で追加しましょう。", friendsAccept: "承認", friendsDecline: "拒否", friendsCancel: "キャンセル", friendsRemove: "削除", friendsErrNotFound: "そのユーザー名のユーザーが見つかりません。", friendsErrSelf: "自分自身は追加できません。", friendsErrAlreadySent: "この人にはすでにフレンド申請を送信済みです。", friendsErrAlreadyFriends: "すでに友達です。", friendsErrGeneric: "リクエストを送信できませんでした。もう一度お試しください。", friendsSentLabel: "送信済み — 返信待ち", friendsRequestFrom: "{username}さんがフレンド申請をしています", shareWithFriendBtn: "共有", shareNoFriends: "場所を共有するには、まずフレンドを追加してください。", sharesEmpty: "まだ何も共有されていません。", sharedByLabel: "{username}さんが{location}を共有しました", friendsPageTitle: "フレンド＆メッセージ", tripGroupsLabel: "旅行グループ", directMessagesLabel: "ダイレクトメッセージ", noTripGroups: "共有された旅行はまだありません — 会話から旅行を共有しましょう。", noFriendsForDm: "メッセージを送るにはまずフレンドを追加してください。", selectConversationPrompt: "チャットを始めるには会話を選択してください", messagePlaceholder: "メッセージ...", sendBtn: "送信", tripGroupOwner: "あなたが作成した旅行です", tripGroupMember: "共有された旅行", shareTripBtn: "旅行を共有", shareTripPickTitle: "共有する旅行を選択", noOwnedTrips: "まだ旅行がありません。", viewItineraryLink: "旅程を見る", chatForTripLabel: "この旅行のグループチャット", friendRequestSentToast: "フレンドリクエストを送信しました", tripInvitesLabel: "旅行の招待", tripInviteFrom: "{username}さんが「{tripname}」への参加に招待しました", addTripMemberOption: "メンバーを追加", renameTripGroupOption: "グループ名を変更", leaveTripGroupOption: "グループを退出", deleteConvoBtn: "会話を削除", deleteMessageOption: "メッセージを削除", attachLocationTitle: "場所を共有", attachPollTitle: "投票を作成", attachPollCreateBtn: "投票を作成", attachLocationOption: "場所を共有", attachTripOption: "旅行を共有", attachPollOption: "投票を作成",
        accEditBtn: "プロフィールを編集", accSaveBtn: "変更を保存", accSaved: "✓ 保存しました", accNoPasses: "有効なパスはありません", accAmountPaid: "お支払い金額", accGuestUsername: "未ログイン",
        accDangerZone: "危険ゾーン",
        accDeleteConfirmTitle: "本当にアカウントを削除しますか？",
        accDeleteConfirmBody: "この操作は取り消せません。解除済みのパスは返金されず、旅行・ウィッシュリスト・訪れた場所を含むすべてのデータが完全に失われます。",
        accDeletePasswordLabel: "パスワードを確認してください", accDeleteCancel: "キャンセル", accDeleteConfirmBtn: "はい、アカウントを削除します",
        accDeleteGoogleReauthNote: "セキュリティのため、アカウントを完全に削除する前にGoogleでご本人確認が必要です。下の「Googleで確認」をクリックしてください。",
        setTitle: "設定", setSecurity: "アカウントとセキュリティ", setPassword: "パスワード", setPasswordSub: "3か月前に変更済み", setChange: "変更",
        setChangePwTitle: "パスワードを変更", setChangePwGoogleNote: "このアカウントはGoogleログインを使用しているため、変更できるScreen To Streetのパスワードはありません — Googleアカウントから管理してください。", setCurrentPwLabel: "現在のパスワード", setNewPwLabel: "新しいパスワード", setConfirmPwLabel: "新しいパスワード（確認）", setChangePwBtn: "パスワードを変更",
        setSignedWith: "ログイン方法", setPreferences: "環境設定", setLanguage: "言語", setCurrency: "通貨", setUnits: "距離の単位",
        setEmailNotif: "メール通知", setPushNotif: "プッシュ通知", setPrivacy: "プライバシー", setCookiePrefs: "クッキー設定",
        setResetBanners: "バナーをリセット", setDownloadData: "データをダウンロード", setExportSub: "すべてのデータをJSONで出力", setExport: "出力",
        setManage: "管理", setNotifConfirmTitle: "メール通知を有効にしますか？", setNotifConfirmBody: "有効にすると、新しい場所が追加されるたびにメールを受け取ることに同意したことになります — 頻度はアーティストの現在の活動状況によって変わります（カムバックやツアー中は頻繁に、それ以外は控えめに）。以下で興味のあるグループと国を選んでください。", setNotifEnableBtn: "有効にする", setPushNotifConfirmTitle: "プッシュ通知を有効にしますか？", setPushNotifConfirmBody: "有効にすると、新しい場所が追加されるたびにプッシュ通知を受け取ることに同意したことになります — 頻度はアーティストの現在の活動状況によって変わります（カムバックやツアー中は頻繁に、それ以外は控えめに）。以下で興味のあるグループと国を選んでください。", setNotifGroupsLabel: "通知を受け取るグループ", setNotifCountryLabel: "通知を受け取る国（複数選択可）", setNotifAllCountries: "すべての国", setNotifSearchCountry: "国を検索...", setCookiePrefsTitle: "クッキー設定", setCookiePrefsBody: "必須クッキーはサイトの動作（ログイン、保存されたウィッシュリスト）に必要で、無効にはできません。訪問間で設定を記憶するクッキーを追加で使うかどうかは選択できます。", setCookieNecessary: "必須", setCookieNecessarySub: "常に有効", setCookieAnalytics: "設定と分析", setCookieAnalyticsSub: "訪問間で選択内容を記憶します", setSavePreferences: "設定を保存",
        setDanger: "危険ゾーン", setDeleteAccTitle: "アカウントを削除", setDeleteAccSub: "旅行、ウィッシュリスト、解除済みパスが完全に削除されます。", setDeleteAccBtn: "アカウントを削除",
        wishTitle: "ウィッシュリスト", wishEmpty: "まだ保存した場所がありません。地図を見て「ウィッシュリストに追加」をクリックしてみましょう！", wishSomeday: "いつか / まだ旅行の予定なし",
        visitTitle: "訪れた場所", visitEmpty: "まだ訪問済みにした場所がありません。地図を見て「この場所を訪れました」にチェックしてみましょう！",
        destTitle: "旅先を探す", destSub: "Screen To Streetで紹介されているすべての国と都市をチェック", destCountries: "国", destCities: "都市", destLocations: "スポット", destViewMap: "地図で見る →",
        artTitle: "アーティストを探す", artSub: "Screen To Streetで紹介されているすべてのグループを見る", artGroups: "グループ", artFeatured: "注目のグループ",

        gateLoginTitle: "続けるにはログインしてください", gateLoginDesc: "アカウントをお持ちの場合はログイン、お持ちでない場合は新規登録してください。アカウントなしで続けることもできます — 無料で3件まで閲覧可能です。", gateContinueFreeText: "アカウントを作成したくない場合は？", gateContinueFreeLink: "無料で続ける — 3件まで閲覧可能",
        gateEmailLabel: "メールアドレス", gateEmailOrUsernameLabel: "メールアドレスまたはユーザー名", gatePasswordLabel: "パスワード", gateForgotPassword: "パスワードをお忘れですか？",
        gateLoginBtn: "ログイン", gateOrDivider: "または", gateGoogleBtn: "Googleで続ける",
        gateSignupPrompt: "アカウントをお持ちでないですか？", gateSignupLink: "新規登録",
        gateNoGroupsTitle: "地図を見るにはグループを解除してください", gateNoGroupsDesc: "まだグループを解除していません。下のボタンからパスを選んで探索を始めましょう。",
        gateUnlockBtn: "グループを解除する", gateLogoutLink: "ログアウト",
        gateErrorInvalid: "メールアドレスまたはパスワードが正しくありません。", gateErrorGeneric: "問題が発生しました。もう一度お試しください。",
        gateResetSent: "パスワード再設定メールを送信しました — 受信トレイをご確認ください。", gateEnterEmailFirst: "先にメールアドレスを入力してください。",
        tourModeLiveIn: "ライブ配信中 — BTSは{city}で公演中です", tourModeSchedule: "ツアースケジュール", tourModeLive: "ライブ", tourModeDone: "終了", tourModeUpcoming: "開催予定", tourModePrev: "前へ", tourModeNext: "次へ",
        tourModeFooterNote: "ツアー側が発表した日程です — 旅行の予約前に必ず公式チケットサイトをご確認ください。",
        liveBadgeLabel: "ライブ", liveTimelineTitle: "・今後の予定", liveTimelineEmpty: "現在予定はありません — また後でご確認ください。", liveTimelineFooterNote: "公式に発表された活動のみを表示しています — 発表された日程です。旅行の予約前に必ず公式情報をご確認ください。", liveViewList: "リスト", liveViewCalendar: "カレンダー", liveFilterAll: "すべて", liveTodayLive: "本日・ライブ", liveKindGroup: "グループ", liveKindSolo: "ソロ", newBadgeLabel: "新着", usernameCooldownNote: "この変更は7日に1回だけ行えます。", usernameConfirmTitle: "ユーザー名を変更しますか？", usernameConfirmCancel: "キャンセル", usernameConfirmOk: "はい、変更します", subtitle: "お気に入りのアーティストの足跡をたどって", backToList: "← リストに戻る", chooserTourOption: "ツアールート", chooserLiveOption: "すべてのライブ活動", tripShareThis: "+ この旅行を共有", tripChangeCoverBtn: "カバーを変更", tripDepartureLabel: "出発", tripReturnLabel: "帰着", tripApplyDatesBtn: "適用", tripLeaveTitle: "この共有旅行から退出しますか？", tripLeaveDesc: "本当にこの旅行から退出しますか？再参加するには新しい招待が必要です。", tripLeaveCancel: "キャンセル", tripLeaveConfirm: "退出", locationSharesLabel: "共有されたアイテム", locationShareFrom: "{username}さんが{location}を共有しました", tabTourMode: "ツアー", profileTabPhotos: "写真", profileTabVisited: "訪問済み", profileTabReviews: "レビュー", profileTabMap: "マップ", profileMapHeading: "訪れた場所はこちら", profileStatVisited: "訪問済み", profileStatPhotos: "写真", profileStatReviews: "レビュー", profileStatFollowers: "フォロワー", profileAddFriendBtn: "友達に追加", profileFriendsLabel: "友達", profileRequestSentLabel: "リクエスト送信済み", profileAcceptRequestBtn: "リクエストを承認", profileEmptyPhotos: "公開されている写真はまだありません。", profileEmptyVisited: "訪問した場所はまだありません。", profileEmptyReviews: "公開レビューはまだありません。", profileNotFound: "このユーザーが見つかりません。", profileLoading: "プロフィールを読み込み中…", backToFriends: "← 友達に戻る", profileMenuOption: "自分のプロフィール", switchArtistLabel: "アーティストを変更", groupNoDataYet: "{group}のツアー・ライブ情報はまだありません — また後でご確認ください。", tripInviteLabel: "メンバーを招待（任意）", shareTripUsernamePlaceholder: "相手のユーザー名",
        tourModeGenericLabel: "ツアー", tourModeMemberLiveIn: "{member}がライブ配信中 — {city}で{event}", tourModeLiveNowOne: "現在ライブ中", tourModeLiveNowCount: "現在{n}件ライブ中", tourModeMoreCount: "他+{n}件",
        tourModeEyebrow: "ツアーモード", tourModeChooseTour: "ツアーを選択", tourModeStep: "ステップ {n}/{total}",
        tourModeHighlights: "ハイライト", tourModeSurpriseSong: "サプライズソング：", tourModeNoHighlightsYet: "この公演のハイライトはまだ追加されていません。", tourModeNoSurpriseSongYet: "まだ発表されていません。",
        mapLoading: "地図を読み込み中…",
        demoTourBtn: "ツアー",
        newLocationToastLabel: "新しい場所が追加されました", newLocationsSummaryToast: "{group}の新しいスポット{n}件",
        paywallTitle: "無料閲覧の上限に達しました (3/3)", paywallBody: "シークレットマップは気に入りましたか？まだ500件以上の住所が残っています！ロケ地、人気レストラン、推しがよく訪れる場所をすべて解放して、夢の旅行を計画しましょう。",
        paywallMonthlyName: "トラベルパス（1ヶ月）", paywallMonthlyDesc: "短期旅行の計画にぴったり。", paywallFeatureFullAccess: "500件以上の住所に完全アクセス", paywallFeatureGPS: "正確なGPS座標", paywallMonthlyPrice: "月額 9.99€", paywallMonthlyTerms: "契約縛りなし", paywallBuyMonthly: "トラベルパスを購入",
        paywallVipName: "VIPパス（生涯アクセス）", paywallVipBadge: "ベストチョイス", paywallVipDesc: "本気のファンのために。一度の支払いでずっと利用できます。", paywallFeatureUpdates: "アップデート込み（毎月新しい場所を追加）", paywallFeatureOffline: "オフラインモード（近日公開）", paywallVipPrice: "19.99€（一括払い）", paywallBuyVip: "VIPパスを購入",
        paywallActiveTitle: "すでに有効なパスをお持ちです",
        paywallActiveDescMonthly: "トラベルパスは{date}まで有効です。Screen To Streetを応援いただきありがとうございます！", paywallActiveDescVip: "VIPパスで生涯アクセスが可能です。Screen To Streetを応援いただきありがとうございます！",
        freeViewsCounter: "無料閲覧 残り{remaining}/3件",
        paymentTitle: "お支払いを完了する", paymentDesc: "ガイド全体を利用するにはお支払い情報を入力してください。", paymentSummaryLabel: "選択したパス：", paymentTotalLabel: "お支払い金額：",
        cardNum: "カード番号", expiry: "有効期限", cvc: "CVC", paySecurely: "安全に支払う", processing: "安全に処理中…", paymentBackLink: "← 地図に戻る"
    },
    zh: {
        btnGenerateIti: "自动行程生成器", filterGroup: "团体", filterMember: "成员", filterArea: "地区", filterYear: "年份", filterCategories: "分类",
        locationsCount: "地点", statsCountries: "国家", cookieText: "我们使用 Cookie 来改善您的体验。", cookiePolicy: "Cookie 政策",
        cookieManage: "管理", cookieReject: "拒绝", cookieAccept: "接受",
        exploreDestOption: "探索目的地", exploreArtistsOption: "探索艺人", accountOption: "我的账户",
        visitedOption: "已访问的地点", wishlistOption: "我的收藏清单", tripsOption: "我的行程", friendsOption: "好友", settingsOption: "设置", logoutOption: "退出登录",
        footerText: "Screen To Street 是由粉丝创建的独立指南。", footerMentions: "法律声明", footerAbout: "关于我们", footerTOS: "服务条款", footerPrivacy: "隐私政策",
        allGroups: "所有团体", allMembers: "所有成员", allAreas: "所有地区", allYears: "所有年份", allCategories: "所有分类",
        checkVisited: "我去过这个地方", checkWishlist: "添加到收藏清单", tripWhich: "这是为哪次行程添加的？",
        tripName: "行程名称", tripWhen: "您计划什么时候出发？", tripFrom: "开始日期", tripTo: "结束日期", tripCreate: "创建行程", tripCancel: "取消",
        itiTitle: "自动行程生成器", itiDesc: "选择一个团体、一个国家，以及停留天数。", itiCreateBtn: "生成我的指南", itiCatLabel: "类别（可选，可多选）", itiExport: "导出指南为 PDF", itiSave: "保存到我的行程",
        searchTripsPlaceholder: "搜索您的行程...", noTripsFound: "未找到任何行程。", selectTripToView: "选择要查看的行程", deselectTripOption: "— 未选择行程 —", locationsWord: "个地点", locationsWordPlural: "个地点",
        addAnotherVisit: "添加另一次访问",
        tabExplore: "探索", tabMyItinerary: "我的行程", yourRating: "你的评分", foodQualityRating: "食物质量", valueForMoneyRating: "性价比", accessibilityRating: "是否容易到达？", siteQualityRating: "场地质量", wishlistStat: "{pct}%的用户将这个地方加入了心愿单", friendsVisitedStat: "{count}位好友到访过这里", friendsVisitedStatOne: "1位好友到访过这里", whenDidYouVisit: "你什么时候去的？", saveMemory: "保存回忆", myVisitTab: "我的到访", tabReviews: "评价", tabInfo: "信息", tabStory: "故事", lGroup: "组合：", lMembers: "成员：", lCountry: "国家：", lCity: "城市：", lDate: "日期：", lEpisode: "集数：", lWatch: "观看：", lOfficialLink: "官方链接", lFollow: "关注：", lWatchEpi: "画面中", lPractical: "实用信息与交通", lAddress: "地址", lOpenMap: "在谷歌地图中打开", lStoryPlace: "这个地方的故事", lStoryBts: "追随BTS的足迹", lTipsTitle: "「SCREEN TO STREET」小贴士", lHowToGetThere: "交通方式：", memoryNotesLabel: "你的备注（可选）", memoryNotesPlaceholder: "你还记得这个地方的什么？", reviewsCountLabel: "{n}条公开评价", reviewsWriteLabel: "写下你的评价", reviewsComposePlaceholder: "分享你的感受…", reviewsComposeMakePublic: "公开此评价", reviewsComposePost: "发布评价", memoryPhotoLabel: "添加照片（可选）", memoryPhotoChoose: "选择照片", memoryPhotoRemove: "移除", memoryMakePublic: "公开此评价（其他用户可见）", reviewsLoading: "正在加载评价…", reviewsEmpty: "该地点暂无公开评价——从「我的到访」标签页分享第一条评价吧！",
        backToMap: "← 返回地图", moreDetails: "更多详情", openInMaps: "在 Google 地图中打开", detailsLabel: "详情", aboutPlaceLabel: "关于这个地方",
        accTitle: "我的账户", accChangePhoto: "更换头像", accResetPhoto: "重置头像", accNameLabel: "用户名", accChangeUsernameHint: "更改用户名", accEmailLabel: "电子邮箱",
        accCountryLabel: "感兴趣的国家", accCountryPlaceholder: "选择国家（可选）",
        accActivityTitle: "我的动态", accTrips: "行程", accVisited: "已访问", accWishlist: "收藏清单", accPasses: "通行证与账单",
        friendsTitle: "好友", openFriendsMessagesLink: "打开好友与消息 →", friendsAddPlaceholder: "通过用户名添加好友", friendsAddBtn: "添加", friendsRequestsLabel: "好友请求", friendsListLabel: "你的好友", friendsEmpty: "还没有好友——在上方通过用户名添加一个吧。", friendsAccept: "接受", friendsDecline: "拒绝", friendsCancel: "取消", friendsRemove: "移除", friendsErrNotFound: "未找到该用户名对应的用户。", friendsErrSelf: "不能添加自己。", friendsErrAlreadySent: "你已经向此人发送过好友请求。", friendsErrAlreadyFriends: "你们已经是好友了。", friendsErrGeneric: "无法发送请求，请重试。", friendsSentLabel: "已发送——等待回应", friendsRequestFrom: "{username} 想加你为好友", shareWithFriendBtn: "分享", shareNoFriends: "请先添加好友才能分享地点。", sharesEmpty: "还没有人与你分享任何内容。", sharedByLabel: "{username} 分享了 {location}", friendsPageTitle: "好友与消息", tripGroupsLabel: "行程群组", directMessagesLabel: "私信", noTripGroups: "还没有共享的行程——从对话中分享一个吧。", noFriendsForDm: "先添加好友才能开始聊天。", selectConversationPrompt: "选择一个对话开始聊天", messagePlaceholder: "消息...", sendBtn: "发送", tripGroupOwner: "你创建了这个行程", tripGroupMember: "与你共享", shareTripBtn: "分享行程", shareTripPickTitle: "选择要分享的行程", noOwnedTrips: "你还没有任何行程。", viewItineraryLink: "查看行程", chatForTripLabel: "该行程的群聊", friendRequestSentToast: "好友请求已发送", tripInvitesLabel: "行程邀请", tripInviteFrom: "{username} 邀请你加入行程「{tripname}」", addTripMemberOption: "添加成员", renameTripGroupOption: "重命名群组", leaveTripGroupOption: "退出群组", deleteConvoBtn: "删除对话", deleteMessageOption: "删除消息", attachLocationTitle: "分享地点", attachPollTitle: "创建投票", attachPollCreateBtn: "创建投票", attachLocationOption: "分享地点", attachTripOption: "分享行程", attachPollOption: "创建投票",
        accEditBtn: "编辑资料", accSaveBtn: "保存更改", accSaved: "✓ 保存成功", accNoPasses: "暂无有效通行证", accAmountPaid: "已支付金额", accGuestUsername: "未登录",
        accDangerZone: "危险区域",
        accDeleteConfirmTitle: "确定要删除您的账户吗？",
        accDeleteConfirmBody: "此操作不可撤销。已解锁的通行证不会退款，且您的所有数据——行程、收藏清单和已访问地点——都将被永久删除。",
        accDeletePasswordLabel: "请确认您的密码", accDeleteCancel: "取消", accDeleteConfirmBtn: "是的，删除我的账户",
        accDeleteGoogleReauthNote: "出于安全考虑，在永久删除您的账户之前，需要通过 Google 确认您的身份。请点击下方的「通过 Google 确认」。",
        setTitle: "设置", setSecurity: "账户与安全", setPassword: "密码", setPasswordSub: "上次修改于 3 个月前", setChange: "修改",
        setChangePwTitle: "修改密码", setChangePwGoogleNote: "您的账户使用 Google 登录，因此没有需要修改的 Screen To Street 密码——请通过您的 Google 账户进行管理。", setCurrentPwLabel: "当前密码", setNewPwLabel: "新密码", setConfirmPwLabel: "确认新密码", setChangePwBtn: "修改密码",
        setSignedWith: "登录方式", setPreferences: "偏好设置", setLanguage: "语言", setCurrency: "货币", setUnits: "距离单位",
        setEmailNotif: "邮件通知", setPushNotif: "推送通知", setPrivacy: "隐私", setCookiePrefs: "Cookie 偏好设置",
        setResetBanners: "重置提示横幅", setDownloadData: "下载我的数据", setExportSub: "以 JSON 格式导出全部数据", setExport: "导出",
        setManage: "管理", setNotifConfirmTitle: "开启邮件通知？", setNotifConfirmBody: "开启后，即表示您同意在新增地点时收到邮件通知——频率取决于该艺人当前的活跃程度（回归或巡演期间更频繁，其余时间较少）。请在下方选择您关心的组合和国家。", setNotifEnableBtn: "开启", setPushNotifConfirmTitle: "开启推送通知？", setPushNotifConfirmBody: "开启后，即表示您同意在新增地点时收到推送通知——频率取决于该艺人当前的活跃程度（回归或巡演期间更频繁，其余时间较少）。请在下方选择您关心的组合和国家。", setNotifGroupsLabel: "为以下组合通知我", setNotifCountryLabel: "为以下国家通知我（可多选）", setNotifAllCountries: "所有国家", setNotifSearchCountry: "搜索国家...", setCookiePrefsTitle: "Cookie 偏好设置", setCookiePrefsBody: "必要 Cookie 用于保证网站正常运行（登录、已保存的心愿单），无法关闭。您可以选择是否同时使用 Cookie 来记住您在不同访问之间的偏好设置。", setCookieNecessary: "必要", setCookieNecessarySub: "始终启用", setCookieAnalytics: "偏好与分析", setCookieAnalyticsSub: "记住您在不同访问之间的选择", setSavePreferences: "保存偏好设置",
        setDanger: "危险区域", setDeleteAccTitle: "删除账户", setDeleteAccSub: "此操作将永久删除您的行程、收藏清单和已解锁的通行证。", setDeleteAccBtn: "删除账户",
        wishTitle: "我的收藏清单", wishEmpty: "您还没有收藏任何地点。快去地图上点击「添加到收藏清单」吧！", wishSomeday: "以后再说 / 暂无行程",
        visitTitle: "我已访问的地点", visitEmpty: "您还没有标记任何已访问的地点。快去地图上勾选「我去过这个地方」吧！",
        destTitle: "探索目的地", destSub: "浏览 Screen To Street 收录的所有国家和城市", destCountries: "国家", destCities: "城市", destLocations: "地点", destViewMap: "在地图上查看 →",
        artTitle: "探索艺人", artSub: "了解 Screen To Street 收录的所有团体", artGroups: "团体", artFeatured: "精选团体",

        gateLoginTitle: "登录以继续", gateLoginDesc: "如果您已有账户，请登录；如果没有，请注册。您也可以不注册账户直接继续——免费包含3个地点。", gateContinueFreeText: "不想创建账户？", gateContinueFreeLink: "免费继续 —— 包含3个地点",
        gateEmailLabel: "电子邮箱", gateEmailOrUsernameLabel: "邮箱或用户名", gatePasswordLabel: "密码", gateForgotPassword: "忘记密码？",
        gateLoginBtn: "登录", gateOrDivider: "或", gateGoogleBtn: "使用 Google 继续",
        gateSignupPrompt: "还没有账户？", gateSignupLink: "注册",
        gateNoGroupsTitle: "解锁一个团体以查看地图", gateNoGroupsDesc: "您还没有解锁任何团体。点击下方选择通行证，开始探索吧。",
        gateUnlockBtn: "解锁一个团体", gateLogoutLink: "退出登录",
        gateErrorInvalid: "邮箱或密码不正确。", gateErrorGeneric: "出现了一些问题，请重试。",
        gateResetSent: "密码重置邮件已发送——请查收您的收件箱。", gateEnterEmailFirst: "请先输入您的电子邮箱。",
        tourModeLiveIn: "直播中 — BTS 正在{city}演出", tourModeSchedule: "巡演日程", tourModeLive: "直播中", tourModeDone: "已结束", tourModeUpcoming: "即将开始", tourModePrev: "上一个", tourModeNext: "下一个",
        tourModeFooterNote: "日期以巡演方公布为准——预订行程前请务必查看官方售票网站确认。",
        liveBadgeLabel: "直播", liveTimelineTitle: "与即将到来", liveTimelineEmpty: "目前暂无安排——请稍后再来查看。", liveTimelineFooterNote: "仅显示官方公开发布的活动——日期以官方公布为准，预订行程前请务必核实官方信息来源。", liveViewList: "列表", liveViewCalendar: "日历", liveFilterAll: "全部", liveTodayLive: "今天 · 直播中", liveKindGroup: "团体", liveKindSolo: "单人", newBadgeLabel: "新增", usernameCooldownNote: "每7天只能更改一次。", usernameConfirmTitle: "要更改你的用户名吗？", usernameConfirmCancel: "取消", usernameConfirmOk: "是的，更改", subtitle: "追随你喜爱的艺人的足迹", backToList: "← 返回列表", chooserTourOption: "巡演路线", chooserLiveOption: "全部直播动态", tripShareThis: "+ 分享此行程", tripChangeCoverBtn: "更换封面", tripDepartureLabel: "出发", tripReturnLabel: "返回", tripApplyDatesBtn: "应用", tripLeaveTitle: "要退出这个共享行程吗？", tripLeaveDesc: "确定要退出此行程吗？再次加入需要新的邀请。", tripLeaveCancel: "取消", tripLeaveConfirm: "退出", locationSharesLabel: "与你分享", locationShareFrom: "{username}与你分享了{location}", tabTourMode: "巡演", profileTabPhotos: "照片", profileTabVisited: "已访问", profileTabReviews: "评价", profileTabMap: "地图", profileMapHeading: "这是我去过的地方", profileStatVisited: "已访问", profileStatPhotos: "照片", profileStatReviews: "评价", profileStatFollowers: "粉丝", profileAddFriendBtn: "添加好友", profileFriendsLabel: "好友", profileRequestSentLabel: "请求已发送", profileAcceptRequestBtn: "接受请求", profileEmptyPhotos: "暂无公开照片。", profileEmptyVisited: "暂无已访问地点。", profileEmptyReviews: "暂无公开评价。", profileNotFound: "找不到该用户。", profileLoading: "正在加载个人资料…", backToFriends: "← 返回好友", profileMenuOption: "我的主页", switchArtistLabel: "切换艺人", groupNoDataYet: "{group}暂无巡演或直播数据——请稍后再来查看。", tripInviteLabel: "邀请他人（可选）", shareTripUsernamePlaceholder: "对方的用户名",
        tourModeGenericLabel: "巡演", tourModeMemberLiveIn: "{member} 直播中 — 于{city}参加{event}", tourModeLiveNowOne: "现在直播中", tourModeLiveNowCount: "现在{n}个直播中", tourModeMoreCount: "+{n}个更多",
        tourModeEyebrow: "巡演模式", tourModeChooseTour: "选择巡演", tourModeStep: "第 {n} 步，共 {total} 步",
        tourModeHighlights: "精彩瞬间", tourModeSurpriseSong: "惊喜曲目：", tourModeNoHighlightsYet: "该场演出暂无精彩瞬间记录。", tourModeNoSurpriseSongYet: "尚未公布。",
        mapLoading: "地图加载中…",
        demoTourBtn: "导览",
        newLocationToastLabel: "新增地点", newLocationsSummaryToast: "{group}的{n}个新地点",
        paywallTitle: "已达到免费浏览上限 (3/3)", paywallBody: "喜欢这份秘密地图吗？还有500多个地址等你发现！解锁全部取景地、人气餐厅和爱豆常去的地方，规划你的梦想之旅。",
        paywallMonthlyName: "旅行通行证（1个月）", paywallMonthlyDesc: "适合规划短途旅行。", paywallFeatureFullAccess: "解锁全部500+地址", paywallFeatureGPS: "精确GPS坐标", paywallMonthlyPrice: "€9.99 / 月", paywallMonthlyTerms: "随时可取消", paywallBuyMonthly: "获取旅行通行证",
        paywallVipName: "VIP通行证（终身访问）", paywallVipBadge: "最超值", paywallVipDesc: "为真正的粉丝打造。一次付款，永久使用。", paywallFeatureUpdates: "包含更新（每月新增地点）", paywallFeatureOffline: "离线模式（即将推出）", paywallVipPrice: "€19.99（一次性付款）", paywallBuyVip: "获取VIP通行证",
        paywallActiveTitle: "您已拥有有效的通行证",
        paywallActiveDescMonthly: "您的旅行通行证有效期至{date}。感谢您支持 Screen To Street！", paywallActiveDescVip: "您的VIP通行证享有终身访问权限。感谢您支持 Screen To Street！",
        freeViewsCounter: "剩余免费地点 {remaining}/3",
        paymentTitle: "完成购买", paymentDesc: "输入您的支付信息以解锁完整指南。", paymentSummaryLabel: "已选通行证：", paymentTotalLabel: "应付总额：",
        cardNum: "卡号", expiry: "有效期", cvc: "CVC", paySecurely: "安全支付", processing: "正在安全处理…", paymentBackLink: "← 返回地图"
    }
};

const catTranslations = {
    "Run BTS": "Run BTS", "Bon Voyage": "Bon Voyage", 
    "Restaurants": {en: "Restaurants", fr: "Restaurants"}, 
    "Cafe": {en: "Cafe", fr: "Café"}, 
    "Museums": {en: "Museums", fr: "Musées"}, 
    "MV Location": "MV Location", "Concerts": "Concerts", 
    "Fashion": {en: "Fashion", fr: "Mode"}, 
    "Landmarks": {en: "Landmarks", fr: "Lieux mythiques"}, 
    "Pop-up Store": "Pop-up Store"
};

function getCatName(cat) {
    if (catTranslations[cat] && typeof catTranslations[cat] === 'object') { return catTranslations[cat][currentLang]; }
    return catTranslations[cat] || cat;
}
// Repli automatique vers l'anglais : si une clé n'existe pas encore pour la langue
// choisie (ex : contenu pas encore traduit dans les 6 nouvelles langues), on affiche
// la version anglaise plutôt que la clé brute ou un texte vide.
function t(key) {
    if (translations[currentLang] && translations[currentLang][key]) return translations[currentLang][key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return key;
}
function getLocText(field) { return field ? (field[currentLang] || field.en || "") : ""; }

window.changeLang = function(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateUI();
};

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(translations[currentLang] && translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if(translations[currentLang] && translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if(translations[currentLang] && translations[currentLang][key]) el.title = translations[currentLang][key];
    });
    if (typeof window.refreshReviewsHeaderLanguage === 'function') window.refreshReviewsHeaderLanguage();

    if(document.getElementById('edit-trip-name')) {
        const isFr = currentLang === 'fr';
        const eSub = document.getElementById('i18n-sub'); if(eSub) eSub.textContent = isFr ? "Sur les traces de vos artistes préférés" : "Following the footsteps of your favorite artists";
        const eOpen = document.getElementById('i18n-open-iti'); if(eOpen) eOpen.textContent = isFr ? "Ouvrir le Générateur" : "Open Auto-Itinerary Generator";
        const eNeed = document.getElementById('i18n-need-magic'); if(eNeed) eNeed.textContent = isFr ? "Besoin de magie ?" : "Need some magic?";
        const eDur = document.getElementById('i18n-trip-duration'); if(eDur) eDur.textContent = isFr ? "Durée & Dates" : "Trip Duration & Dates";
        const eAdd = document.getElementById('i18n-add-more'); if(eAdd) eAdd.textContent = isFr ? "+ Ajouter des lieux" : "+ Add more locations";
        const eReco = document.getElementById('i18n-reco'); if(eReco) eReco.textContent = isFr ? "RECOMMANDÉ POUR CE VOYAGE (MÊME PAYS)" : "RECOMMENDED FOR THIS TRIP (SAME COUNTRY)";
        const eIti = document.getElementById('i18n-your-iti'); if(eIti) eIti.textContent = isFr ? "VOTRE ITINÉRAIRE" : "YOUR ITINERARY";
        const eAddDay = document.getElementById('i18n-add-day'); if(eAddDay) eAddDay.textContent = isFr ? "Ajouter un jour" : "Add an empty day";
        const eCancel = document.getElementById('i18n-cancel'); if(eCancel) eCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eModAdd = document.getElementById('i18n-modal-add'); if(eModAdd) eModAdd.textContent = isFr ? "Ajouter au voyage" : "Add to this Trip";
        const eCreateTitle = document.getElementById('i18n-create-title'); if(eCreateTitle) eCreateTitle.textContent = isFr ? "Créer un nouveau voyage" : "Create a new trip";
        const eBtnCreate = document.getElementById('i18n-btn-create'); if(eBtnCreate) eBtnCreate.textContent = isFr ? "Créer" : "Create";
        const eDelTitle = document.getElementById('i18n-del-title'); if(eDelTitle) eDelTitle.textContent = isFr ? "Supprimer ce voyage ?" : "Delete this trip?";
        const eDelDesc = document.getElementById('i18n-del-desc'); if(eDelDesc) eDelDesc.textContent = isFr ? "Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible." : "Are you sure you want to delete this trip? This cannot be undone.";
        const eDelCancel = document.getElementById('i18n-del-cancel'); if(eDelCancel) eDelCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eDelConfirm = document.getElementById('i18n-del-confirm'); if(eDelConfirm) eDelConfirm.textContent = isFr ? "Supprimer" : "Delete";
        
        const eRmLocTitle = document.getElementById('i18n-rm-loc-title'); if(eRmLocTitle) eRmLocTitle.textContent = isFr ? "Retirer ce lieu ?" : "Remove location?";
        const eRmLocDesc = document.getElementById('i18n-rm-loc-desc'); if(eRmLocDesc) eRmLocDesc.textContent = isFr ? "Êtes-vous sûr de vouloir retirer ce lieu de votre voyage ?" : "Are you sure you want to remove this location from your trip?";
        const eRmLocCancel = document.getElementById('i18n-rm-loc-cancel'); if(eRmLocCancel) eRmLocCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eRmLocConfirm = document.getElementById('i18n-rm-loc-confirm'); if(eRmLocConfirm) eRmLocConfirm.textContent = isFr ? "Retirer" : "Remove";

        const eRmDayTitle = document.getElementById('i18n-rm-day-title'); if(eRmDayTitle) eRmDayTitle.textContent = isFr ? "Supprimer ce jour ?" : "Delete this day?";
        const eRmDayDesc = document.getElementById('i18n-rm-day-desc'); if(eRmDayDesc) eRmDayDesc.textContent = isFr ? "Les lieux retourneront dans les non assignés." : "Locations will return to unassigned.";
        const eRmDayCancel = document.getElementById('i18n-rm-day-cancel'); if(eRmDayCancel) eRmDayCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eRmDayConfirm = document.getElementById('i18n-rm-day-confirm'); if(eRmDayConfirm) eRmDayConfirm.textContent = isFr ? "Supprimer" : "Delete";

        if(typeof window.initTrips === 'function') window.initTrips();
    }

    const yearSelect = document.getElementById('year-select');
    if(yearSelect) {
        const yearOpt = yearSelect.querySelector('option[value="All"]');
        if(yearOpt) yearOpt.textContent = t('allYears');
    }

    if(document.getElementById('group-select')) {
        initializeFilters();
        renderLocations(true);
    }
    
    window.initItineraryGenerator();

    // Rafraîchit la liste de l'onglet "My Itinerary" (noms/compteurs traduits) si elle
    // est déjà affichée — voir renderItineraryTripList() plus bas.
    if (document.getElementById('itinerary-trip-list')) renderItineraryTripList();

    // Fiche lieu actuellement ouverte (Story, Watch, infos pratiques, conseils...) :
    // renderLocationRichContent() n'était appelée qu'à l'ouverture (openDetailsPanel), donc
    // changer de langue pendant qu'une fiche est déjà affichée ne mettait jamais à jour son
    // contenu, même quand une traduction existait réellement (demande du 06/09/2026, onglet
    // Story notamment). Même logique en deux temps qu'à l'ouverture : rendu local immédiat,
    // puis re-rendu si le contenu Firestore répond.
    const detailsPanelEl = document.getElementById('sidebar-details');
    if (currentLocationIdForMemory !== null && detailsPanelEl && !detailsPanelEl.classList.contains('hidden')) {
        const openLoc = celebLocations.find(l => l.id === currentLocationIdForMemory);
        if (openLoc) {
            renderLocationRichContent(openLoc);
            if (typeof window.fetchLocationContent === 'function') {
                window.fetchLocationContent(openLoc.id).then(remote => {
                    if (remote && currentLocationIdForMemory === openLoc.id) renderLocationRichContent(Object.assign({}, openLoc, remote));
                });
            }
        }
    }

    if (typeof window.initTourModeBadge === 'function') window.initTourModeBadge();
    if (typeof window.refreshTourModeLanguage === 'function') window.refreshTourModeLanguage();
    if (typeof window.updateFreeViewsCounter === 'function') window.updateFreeViewsCounter();
    if (typeof window.initLiveBadge === 'function') window.initLiveBadge();
    const livePanelEl = document.getElementById('live-panel');
    if (livePanelEl && livePanelEl.classList.contains('open')) { renderLiveAvatars(); renderLiveTimeline(); }
}

window.openItineraryModal = function() {
    document.getElementById('iti-result').classList.add('hidden');
    document.getElementById('itinerary-modal').classList.remove('hidden');
    window.initItineraryGenerator();
}

window.initItineraryGenerator = function() {
    const unlockedGroups = getUnlockedGroups();
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    const gSelectIti = document.getElementById('iti-group');
    const cSelectIti = document.getElementById('iti-country');
    const citySelectIti = document.getElementById('iti-city');

    if(gSelectIti && gSelectIti.options.length === 0) {
        const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
        availableGroups.forEach(g => gSelectIti.innerHTML += `<option value="${g}">${g}</option>`);
        [...new Set(availableLocs.map(l => l.country))].sort().forEach(c => cSelectIti.innerHTML += `<option value="${c}">${c}</option>`);
        if(citySelectIti) window.updateItiCity();

        if(!gSelectIti._hasCatListener) {
            gSelectIti._hasCatListener = true;
            // Les catégories dépendent uniquement du groupe sélectionné (BTS et Blackpink n'ont
            // pas les mêmes catégories) : on les régénère à chaque changement de groupe.
            gSelectIti.addEventListener('change', window.updateItiCategories);
        }
    }
    window.updateItiCategories();
};

window.updateItiCity = function() {
    const country = document.getElementById('iti-country').value;
    const citySel = document.getElementById('iti-city');
    if(!citySel) return;

    const unlockedGroups = getUnlockedGroups();
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let locs = availableLocs;
    if(country) locs = locs.filter(l => l.country === country);

    citySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Toutes les villes (Optionnel)' : 'All Cities (Optional)'}</option>`;
    const cities = [...new Set(locs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySel.innerHTML += `<option value="${c}">${c}</option>`);
}

// Multi-select des catégories de lieux pour l'Auto-Itinerary Generator : les options
// affichées dépendent du groupe choisi (ex : seules les catégories propres à BTS si BTS est
// sélectionné), pour ne jamais proposer un filtre qui ne donnerait aucun résultat.
window.updateItiCategories = function() {
    const group = document.getElementById('iti-group')?.value;
    const catContainer = document.getElementById('iti-categories');
    if(!catContainer || !group) return;

    const cats = (filterData[group] && filterData[group].categories) ? filterData[group].categories : filterData["General"].categories;
    // Une sélection existante qui ne fait plus partie des catégories du (nouveau) groupe est
    // abandonnée ; celle qui reste valable (ex: simple rafraîchissement de langue) est conservée.
    itiSelectedCategories = itiSelectedCategories.filter(c => cats.includes(c));

    catContainer.innerHTML = cats.map(cat =>
        `<div class="cat-card iti-cat-pill${itiSelectedCategories.includes(cat) ? ' active' : ''}" data-cat="${cat}">${getCatName(cat)}</div>`
    ).join('');

    catContainer.querySelectorAll('.iti-cat-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            const cat = this.getAttribute('data-cat');
            if(itiSelectedCategories.includes(cat)) {
                itiSelectedCategories = itiSelectedCategories.filter(c => c !== cat);
                this.classList.remove('active');
            } else {
                itiSelectedCategories.push(cat);
                this.classList.add('active');
            }
        });
    });
};

// Même principe que updateItiCategories, pour la modale "Create New Trip" (My Trips) —
// voir createNewTripAdvanced().
window.updateCreateTripCategories = function() {
    const group = document.getElementById('create-trip-group')?.value;
    const catContainer = document.getElementById('create-trip-categories');
    if(!catContainer || !group) { if (catContainer) catContainer.innerHTML = ''; return; }

    const cats = (filterData[group] && filterData[group].categories) ? filterData[group].categories : filterData["General"].categories;
    createTripSelectedCategories = createTripSelectedCategories.filter(c => cats.includes(c));

    catContainer.innerHTML = cats.map(cat =>
        `<div class="cat-card create-trip-cat-pill${createTripSelectedCategories.includes(cat) ? ' active' : ''}" data-cat="${cat}">${getCatName(cat)}</div>`
    ).join('');

    catContainer.querySelectorAll('.create-trip-cat-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            const cat = this.getAttribute('data-cat');
            if(createTripSelectedCategories.includes(cat)) {
                createTripSelectedCategories = createTripSelectedCategories.filter(c => c !== cat);
                this.classList.remove('active');
            } else {
                createTripSelectedCategories.push(cat);
                this.classList.add('active');
            }
        });
    });
};

// ==========================================
// 4. AFFICHAGE DES LIEUX ET FILTRES (MAP.HTML)
// ==========================================
function initializeFilters() {
    const groupSelect = document.getElementById('group-select');
    const memberSelect = document.getElementById('member-select');
    const countrySelect = document.getElementById('country-select');
    const categoryButtonsContainer = document.getElementById('category-buttons');
    if(!groupSelect) return;
    
    const unlockedGroups = getUnlockedGroups();
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
    
    if(groupSelect.options.length === 0 || groupSelect.options[0].text !== t('allGroups')) {
        groupSelect.innerHTML = `<option value="All">${t('allGroups')}</option>`;
        availableGroups.forEach(g => groupSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }

    const selectedGroup = groupSelect.value;
    memberSelect.innerHTML = `<option value="All">${t('allMembers')}</option>`;
    countrySelect.innerHTML = `<option value="All">${t('allAreas')}</option>`;
    
    categoryButtonsContainer.innerHTML = `<div class="cat-card active" data-cat="All">${t('allCategories')}</div>`;
    activeCategory = "All";
    
    const filteredByGroup = selectedGroup === "All" ? availableLocs : availableLocs.filter(l => l.group === selectedGroup);
    [...new Set(filteredByGroup.map(loc => loc.country))].sort().forEach(c => countrySelect.innerHTML += `<option value="${c}">${c}</option>`);

    let catsToShow = (selectedGroup !== "All" && filterData[selectedGroup]) ? filterData[selectedGroup].categories : filterData["General"].categories;
    if(selectedGroup !== "All" && filterData[selectedGroup]) filterData[selectedGroup].members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    
    catsToShow.forEach(cat => categoryButtonsContainer.innerHTML += `<div class="cat-card" data-cat="${cat}">${getCatName(cat)}</div>`);

    document.querySelectorAll('.cat-card').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.cat-card').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.getAttribute('data-cat');
            renderLocations();
        });
    });

    if(!groupSelect._hasListener) {
        groupSelect._hasListener = true;
        [groupSelect, memberSelect, document.getElementById('year-select'), countrySelect].forEach(el => {
            if(el) el.addEventListener('change', () => { if(el===groupSelect) initializeFilters(); renderLocations(); });
        });
        const sInput = document.getElementById('search-input');
        if(sInput) sInput.addEventListener('input', renderLocations);
    }
}

// Icône gomme du bloc filtres (demande du 11/09/2026) : réinitialise Group/Member/Year/
// Area en un clic. initializeFilters() régénère les listes MEMBER/AREA pour group="All"
// (comportement déjà utilisé au changement de groupe, voir ci-dessus) et remet aussi la
// catégorie active à "All".
window.resetMapFilters = function () {
    const groupSelect = document.getElementById('group-select');
    const yearSelect = document.getElementById('year-select');
    if (!groupSelect) return;
    groupSelect.value = 'All';
    if (yearSelect) yearSelect.value = 'All';
    initializeFilters();
    renderLocations();
};

// Pastille "NEW" sur les lieux récemment ajoutés au catalogue (menu de gauche) : sans
// date de création par lieu, l'id (assigné dans l'ordre d'ajout) est le seul repère
// fiable de nouveauté — les NEW_BADGE_COUNT ids les plus élevés sont considérés récents.
const NEW_BADGE_COUNT = 8;
function getNewLocationIds() {
    return celebLocations.map(l => l.id).sort((a, b) => b - a).slice(0, NEW_BADGE_COUNT);
}
function getDismissedNewLocationIds() {
    try { return JSON.parse(localStorage.getItem('dismissedNewLocationIds') || '[]'); }
    catch (e) { return []; }
}
// Une fois cliqué, la pastille disparaît DÉFINITIVEMENT pour cette personne (pas juste
// pour cette session) — jamais liée à une date de dernière visite du site.
function dismissNewLocationBadge(locId) {
    const dismissed = getDismissedNewLocationIds();
    if (!dismissed.includes(locId)) {
        dismissed.push(locId);
        localStorage.setItem('dismissedNewLocationIds', JSON.stringify(dismissed));
    }
}

// `skipFitBounds` : au tout premier rendu après connexion (voir map.html), on ne veut
// SURTOUT PAS que la carte se recadre sur l'étendue de TOUS les lieux affichés (Corée,
// Japon, USA, Europe...) — ça écrasait immédiatement le centrage sur le pays choisi à
// l'inscription par une vue dézoomée sur le monde entier, ce qui était la vraie cause du
// "la carte ne zoome pas sur mon pays" / "grandes zones grises" remontés plusieurs fois.
// Tous les autres appels (changement de filtre, recherche...) gardent le comportement
// habituel : recadrer sur ce qui est maintenant affiché.
function renderLocations(skipFitBounds) {
    const groupSelect = document.getElementById('group-select');
    const memberSelect = document.getElementById('member-select');
    const yearSelect = document.getElementById('year-select');
    const countrySelect = document.getElementById('country-select');
    const searchInput = document.getElementById('search-input');
    
    if(!groupSelect || !map) return; 
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    if(!locationListElement) return;
    locationListElement.innerHTML = '';

    const unlockedGroups = getUnlockedGroups();
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    const fGroup = groupSelect.value, fMember = memberSelect.value, fYear = yearSelect.value, fCountry = countrySelect.value, searchTerm = searchInput.value.toLowerCase();

    const filteredLocations = availableLocs.filter(loc => {
        return (fGroup === "All" || loc.group === fGroup) && (fMember === "All" || loc.member === fMember || loc.member === "All") && 
               (activeCategory === "All" || loc.category === activeCategory) && (fYear === "All" || loc.year === fYear) &&
               (fCountry === "All" || loc.country === fCountry) && (loc.name.toLowerCase().includes(searchTerm) || (loc.city && loc.city.toLowerCase().includes(searchTerm)));
    });

    // Tri par ordre de nouveauté (les lieux les plus récemment ajoutés au site en
    // premier) : l'id d'un lieu suit l'ordre dans lequel il a été ajouté au catalogue,
    // c'est donc le seul repère de "nouveauté" disponible sans dates factices.
    filteredLocations.sort((a, b) => b.id - a.id);

    currentFilteredLocations = filteredLocations;

    const cSidebar = document.getElementById('location-count-sidebar');
    if(cSidebar) cSidebar.textContent = filteredLocations.length;
    
    const sLocations = document.getElementById('stat-locations');
    if(sLocations) sLocations.textContent = filteredLocations.length;
    
    const sCountries = document.getElementById('stat-countries');
    if(sCountries) sCountries.textContent = new Set(filteredLocations.map(l => l.country)).size;

    let visitedData = getVisitedLocs();
    const newLocationIds = getNewLocationIds();
    const dismissedNewIds = getDismissedNewLocationIds();

    filteredLocations.forEach(loc => {
        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        const isVisited = visitedData.some(v => v.id === loc.id || v === loc.id);
        const baseColor = groupColors[loc.group] || '#334e68';

        const cardBgColor = isVisited ? `${baseColor}15` : '#faf9fc';
        const card = document.createElement('div');
        card.className = 'loc-item';
        card.style.background = cardBgColor;
        const commAvg = communityRatingAvg(loc.id);
        const ratingBadgeHtml = commAvg !== null
            ? `<div class="loc-rating" style="margin-left:auto; flex-shrink:0; display:flex; align-items:center; gap:3px; font-size:11.5px; font-weight:700; color:#D42759;">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
                 ${commAvg.toFixed(1)}
               </div>`
            : '';
        // Pastille "NEW" : reste affichée tant que la personne n'a pas cliqué sur ce
        // lieu précis (voir dismissNewLocationBadge), une seule fois pour de bon —
        // jamais liée à une session ou une date, purement à l'action de la personne.
        const isNew = newLocationIds.includes(loc.id) && !dismissedNewIds.includes(loc.id);
        const newBadgeHtml = isNew ? `<span class="loc-new-badge">${t('newBadgeLabel')}</span>` : '';
        card.innerHTML = `
            <div class="loc-icon-box" style="color:${baseColor}; background:${baseColor}1A;">${catIconSvg}</div>
            <div class="loc-info">
                <div class="loc-cat">${getCatName(loc.category)} &middot; ${loc.city || ''}</div>
                <div class="loc-name">${loc.name}${newBadgeHtml}</div>
            </div>
            ${ratingBadgeHtml}
        `;
        card.addEventListener('click', () => {
            if (isNew) dismissNewLocationBadge(loc.id);
            map.flyTo([loc.lat, loc.lng], 16, { duration: 0.6 });
            // Recherche active (demande du 11/09/2026) : "juste une aide pour rediriger
            // vers le lieu sur la map", donc PAS d'ouverture de la fiche détail dans ce
            // cas précis — seulement quand on clique depuis la liste normale (parcours
            // par filtres, champ de recherche vide), comportement inchangé.
            if (!searchInput.value.trim()) window.openDetailsPanel(loc.id);
        });
        locationListElement.appendChild(card);
    });

    renderMapMarkers(filteredLocations, { fitBounds: !skipFitBounds });
}

// ==========================================
// 4bis. REGROUPEMENT DES MARQUEURS TROP PROCHES (CLUSTERING)
// ==========================================
// Quand on dézoome (ex: toute la Corée du Sud visible d'un coup), des dizaines de lieux
// très proches géographiquement finissent en pixels quasi au même endroit et deviennent
// une bouillie d'icônes illisible. On les regroupe alors en un seul marqueur avec un
// badge "×N" ; recalculé à chaque changement de zoom (les lieux qui se séparent
// suffisamment en zoomant redeviennent des marqueurs individuels).
//
// Le rayon de fusion suit désormais la taille RÉELLE des marqueurs à ce zoom (mêmes
// paliers que --marker-size plus haut) au lieu d'un rayon fixe de 45px : avec un rayon
// fixe plus grand que le plus grand marqueur (32px), deux lieux encore visiblement
// espacés (un peu d'espace blanc entre les deux icônes) se retrouvaient déjà fusionnés
// en "×2" — le badge de regroupement doit au contraire n'apparaître que lorsque les
// marqueurs se chevaucheraient réellement à l'écran.
function clusterPixelRadiusForZoom(zoom) {
    if (zoom < 4) return 14;
    if (zoom < 6) return 19;
    if (zoom < 9) return 22;
    return 28;
}
// Au zoom maximal (limite de la tuile OSM, voir maxZoom du tileLayer plus bas), deux
// lieux réellement distincts mais très proches en vrai (ex: deux cafés de la même rue)
// peuvent encore projeter à moins du rayon ci-dessus l'un de l'autre et rester fusionnés
// en un cluster "×2" — trompeur puisque l'utilisateur est déjà au niveau de zoom maximum
// et ne peut pas zoomer davantage pour les séparer. On désactive donc le clustering dès
// ce niveau : chaque lieu redevient son propre marqueur individuel.
const MAP_MAX_ZOOM = 19;

function clusterLocationsForZoom(locations, zoom) {
    if (zoom >= MAP_MAX_ZOOM) return locations.map(loc => ({ locs: [loc], center: [loc.lat, loc.lng] }));
    // clusterPixelRadiusForZoom() donne le DIAMÈTRE du marqueur à ce zoom : à une
    // distance centre-à-centre égale à ce diamètre, deux cercles sont seulement
    // TANGENTS (un unique point de contact, pas un vrai chevauchement visible) — dans
    // les faits ça donnait quand même l'impression de lieux "collés" fusionnés trop tôt.
    // On applique donc un facteur < 1 pour n'exiger la fusion qu'en cas de réel
    // chevauchement des cercles, pas d'un simple contact au dernier pixel.
    const clusterRadius = clusterPixelRadiusForZoom(zoom) * 0.6;

    const points = locations.map(loc => ({ loc, px: map.project([loc.lat, loc.lng], zoom) }));
    const used = new Array(points.length).fill(false);
    const clusters = [];

    for (let i = 0; i < points.length; i++) {
        if (used[i]) continue;
        const group = [points[i]];
        used[i] = true;
        for (let j = i + 1; j < points.length; j++) {
            if (used[j]) continue;
            if (points[i].px.distanceTo(points[j].px) <= clusterRadius) {
                group.push(points[j]);
                used[j] = true;
            }
        }
        const avgLat = group.reduce((sum, g) => sum + g.loc.lat, 0) / group.length;
        const avgLng = group.reduce((sum, g) => sum + g.loc.lng, 0) / group.length;
        clusters.push({ locs: group.map(g => g.loc), center: [avgLat, avgLng] });
    }
    return clusters;
}

// Bulle résumé au survol d'un pin (demande du 05/09/2026) : très peu d'infos (nom,
// catégorie, ville/pays), même style visuel que la bulle du Mode Tournée mais purement
// informative — le clic garde son comportement habituel (ouvre la fiche complète).
function positionMapHoverTip(marker) {
    const tip = document.getElementById('map-hover-tip');
    if (!tip || !map || !marker) return;
    const point = map.latLngToContainerPoint(marker.getLatLng());
    tip.style.left = point.x + 'px';
    tip.style.top = (point.y - 16) + 'px';
}
function showMapHoverTip(loc, marker) {
    const tip = document.getElementById('map-hover-tip');
    const iconEl = document.getElementById('map-hover-tip-icon');
    const artistEl = document.getElementById('map-hover-tip-artist');
    const titleEl = document.getElementById('map-hover-tip-title');
    const metaEl = document.getElementById('map-hover-tip-meta');
    if (!tip || !iconEl || !artistEl || !titleEl || !metaEl) return;

    const baseColor = groupColors[loc.group] || '#334e68';
    iconEl.style.background = baseColor;
    iconEl.style.color = '#fff';
    iconEl.innerHTML = iconsSVG[loc.category] || iconsSVG["Default"];
    artistEl.style.color = baseColor;
    artistEl.textContent = (loc.member && loc.member !== 'All') ? `${loc.group} · ${loc.member}` : (loc.group || '');
    titleEl.textContent = loc.name || '';
    metaEl.textContent = [loc.category, [loc.city, loc.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

    positionMapHoverTip(marker);
    tip.classList.add('open');
}
function hideMapHoverTip() {
    const tip = document.getElementById('map-hover-tip');
    if (tip) tip.classList.remove('open');
}

function addSingleLocationMarker(loc) {
    // Demande du 07/09/2026 : le marqueur n'affiche plus l'icône de catégorie du lieu
    // (ex: une tasse de café pour les cafés) mais un simple point coloré à la couleur du
    // groupe. Demande du 08/09/2026, en suite directe : même le contour blanc/rempli
    // (visité vs non visité) est retiré — juste un tout petit point plein, uniformément
    // coloré, sans distinction visuelle sur la carte (l'info "visité" reste disponible
    // au survol/clic). Le survol et le repère de sélection (.custom-category-marker:hover,
    // highlightSelectedLocationMarker()) restent inchangés.
    const baseColor = groupColors[loc.group] || '#334e68';
    const inlineStyle = `background-color: ${baseColor}; --marker-color: ${baseColor};`;

    // Badge "×N publications" (demande du 11/09/2026) : appliqué dès la création si
    // l'index photos/lieu (voir ensureLocPostsIndex plus bas) est déjà prêt — sinon un
    // marqueur sans photos aujourd'hui n'en aura pas tant que la carte n'est pas
    // re-rendue (changement de filtre) après coup ; applyLocPostBadges() rattrape ce cas
    // une fois l'index chargé pour la première fois.
    const postCount = locPostsIndexSync ? (locPostsIndexSync.get(Number(loc.id)) || []).length : 0;
    const html = postCount > 0
        ? `<span style="position:relative; display:inline-block;"><div style="${inlineStyle}"></div><span class="loc-post-badge">${postCount > 9 ? '9+' : postCount}</span></span>`
        : `<div style="${inlineStyle}"></div>`;

    const customIcon = L.divIcon({ className: 'custom-category-marker location-dot-marker', html, iconSize: [12,12], iconAnchor: [6,6] });
    const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markerGroup);
    marker.__locId = loc.id;
    marker.__baseColor = baseColor;
    marker.on('click', () => window.openDetailsPanel(loc.id));
    marker.on('mouseover', () => showMapHoverTip(loc, marker));
    marker.on('mouseout', () => hideMapHoverTip());
}

function addClusterMarker(cluster) {
    const count = cluster.locs.length;

    // Groupes distincts présents dans ce cluster : un même lieu réel (mêmes coordonnées,
    // ex: BTS ET Blackpink ayant tous deux tourné au Stade de France) finit dans le même
    // cluster que "plusieurs lieux proches regroupés au dézoom", donc systématiquement
    // via addClusterMarker — mais jusqu'ici le marqueur affichait toujours la couleur d'UN
    // seul groupe "dominant", masquant les autres. On distingue maintenant les deux cas :
    // un seul groupe -> couleur pleine comme avant ; plusieurs groupes -> le disque du
    // marqueur est divisé en parts égales, une couleur par groupe présent, pour qu'aucun
    // des groupes ayant visité ce lieu ne disparaisse visuellement derrière un autre.
    const distinctGroups = [...new Set(cluster.locs.map(l => l.group))];
    let discStyle;
    if (distinctGroups.length === 1) {
        // Un seul groupe dans ce cluster (ex: 2 lieux BTS superposés) : même traitement
        // qu'un marqueur individuel de ce groupe.
        const baseColor = groupColors[distinctGroups[0]] || '#334e68';
        discStyle = `background-color:${baseColor}; --marker-color:${baseColor};`;
    } else {
        const step = 360 / distinctGroups.length;
        const slices = distinctGroups.map((g, i) => `${groupColors[g] || '#334e68'} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`).join(', ');
        discStyle = `--marker-color:#fff; background:conic-gradient(${slices}); box-shadow:0 2px 8px rgba(0,0,0,.3);`;
    }
    // Demande du 08/09/2026 : plus d'icône à l'intérieur du disque de cluster (juste un
    // point coloré, comme un marqueur simple) — seul le badge "×N" ("symbole puissance")
    // distingue un cluster d'un lieu unique. Le badge (span, pas div) et le conteneur
    // (span aussi) évitent volontairement le sélecteur CSS ".custom-category-marker div",
    // qui appliquerait sinon le style rond du marqueur à tout div descendant, y compris le
    // conteneur et le badge.
    const html = `
        <span style="position:relative; display:inline-block;">
            <div style="${discStyle}"></div>
            <span class="cluster-badge">×${count}</span>
        </span>
    `;
    const clusterIcon = L.divIcon({ className: 'custom-category-marker cluster-dot-marker', html, iconSize: [16, 16], iconAnchor: [8, 8] });
    const marker = L.marker(cluster.center, { icon: clusterIcon }).addTo(markerGroup);
    marker.on('click', () => { map.setView(cluster.center, Math.min(map.getZoom() + 3, 18)); });
}

function renderMapMarkers(locations, opts) {
    if (!map || !markerGroup) return;
    markerGroup.clearLayers();
    const clusters = clusterLocationsForZoom(locations, map.getZoom());

    clusters.forEach(cluster => {
        if (cluster.locs.length === 1) addSingleLocationMarker(cluster.locs[0]);
        else addClusterMarker(cluster);
    });

    // Badges "×N publications" (demande du 11/09/2026) : ne bloque jamais ce rendu —
    // ensureLocPostsIndex() ne fait une vraie lecture Firestore qu'une seule fois (mise en
    // cache par fetchGlobalPhotoFeed), les rendus suivants (changement de filtre, zoom)
    // profitent alors immédiatement de l'index déjà chargé via locPostsIndexSync (voir
    // addSingleLocationMarker ci-dessus) — ce .then() ne fait qu'un rattrapage pour les
    // marqueurs déjà affichés avant que l'index n'ait fini de charger la toute première
    // fois.
    if (typeof ensureLocPostsIndex === 'function') ensureLocPostsIndex().then(applyLocPostBadges);

    // Le fitBounds initial doit couvrir les vraies coordonnées de chaque lieu (pas les
    // centres de cluster, qui donneraient un cadrage trop serré) — seulement au premier
    // rendu / changement de filtre, jamais depuis le ré-agencement au zoom.
    if (opts && opts.fitBounds && locations.length > 0) {
        map.fitBounds(L.latLngBounds(locations.map(l => [l.lat, l.lng])), { padding: [50, 50], maxZoom: 16 });
    }
}

// ==========================================
// 5. ONGLETS EXPLORE / MY ITINERARY (MAP.HTML)
// ==========================================
window.switchMainTab = function(tabName) {
    document.querySelectorAll('.top-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sidebar-main-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
    });
    
    if (tabName === 'explore') {
        document.getElementById('tab-explore-btn').classList.add('active');
        const p = document.getElementById('sidebar-explore');
        if(p) { p.classList.remove('hidden'); p.classList.add('active'); }
        clearTripFromMainMap();
        renderLocations(true);
    } else if (tabName === 'itinerary') {
        document.getElementById('tab-itinerary-btn').classList.add('active');
        const p = document.getElementById('sidebar-itinerary');
        if(p) { p.classList.remove('hidden'); p.classList.add('active'); }
        loadItineraryTabOptions();
    } else if (tabName === 'visited') {
        // Onglet "Visited" (demande du 10/09/2026), à côté de "My Itinerary" :
        // filtre la carte pour n'afficher QUE les lieux visités, et les liste dans le
        // menu — voir renderVisitedTabList() plus bas.
        document.getElementById('tab-visited-btn').classList.add('active');
        const p = document.getElementById('sidebar-visited');
        if(p) { p.classList.remove('hidden'); p.classList.add('active'); }
        clearTripFromMainMap();
        renderVisitedTabList();
    }
}

// Liste + filtrage carte de l'onglet "Visited" (demande du 10/09/2026) : même
// principe que renderLocations() pour Explore, mais sans les filtres (Group/Member/Area/
// Year) — juste les lieux déjà marqués visités (getVisitedLocs(), voir plus haut),
// affichés à la fois dans le menu et comme SEULS marqueurs sur la carte tant que cet
// onglet reste actif (renderMapMarkers() remplace entièrement les marqueurs précédents).
function renderVisitedTabList() {
    const listEl = document.getElementById('visited-tab-list');
    const emptyEl = document.getElementById('visited-tab-empty');
    const countEl = document.getElementById('visited-tab-count');
    if (!listEl) return;

    const visitedData = getVisitedLocs();
    const visitedIds = visitedData.map(v => (v && typeof v === 'object') ? v.id : v);
    const visitedLocations = celebLocations.filter(loc => visitedIds.includes(loc.id));
    visitedLocations.sort((a, b) => a.name.localeCompare(b.name));

    if (countEl) countEl.textContent = visitedLocations.length + (visitedLocations.length === 1 ? ' location' : ' locations');

    listEl.innerHTML = '';
    if (visitedLocations.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        renderMapMarkers([], { fitBounds: false });
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    visitedLocations.forEach(loc => {
        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        const baseColor = groupColors[loc.group] || '#334e68';
        const commAvg = communityRatingAvg(loc.id);
        const ratingBadgeHtml = commAvg !== null
            ? `<div class="loc-rating" style="margin-left:auto; flex-shrink:0; display:flex; align-items:center; gap:3px; font-size:11.5px; font-weight:700; color:#D42759;">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
                 ${commAvg.toFixed(1)}
               </div>`
            : '';
        const card = document.createElement('div');
        card.className = 'loc-item';
        card.style.background = `${baseColor}15`;
        card.innerHTML = `
            <div class="loc-icon-box" style="color:${baseColor}; background:${baseColor}1A;">${catIconSvg}</div>
            <div class="loc-info">
                <div class="loc-cat">${getCatName(loc.category)} &middot; ${loc.city || ''}</div>
                <div class="loc-name">${loc.name}</div>
            </div>
            ${ratingBadgeHtml}
        `;
        card.addEventListener('click', () => {
            // duration:0.6 (demande du 11/09/2026, "la redirection est trop lente") : sans
            // options, Leaflet calcule sa propre durée de vol en fonction de la distance —
            // souvent 1.5 à 4s pour un lieu éloigné du centre actuel. Même valeur fixe
            // partout où flyTo() est appelé sur ce fichier, pour une sensation cohérente.
            map.flyTo([loc.lat, loc.lng], 16, { duration: 0.6 }); window.openDetailsPanel(loc.id);
        });
        listEl.appendChild(card);
    });

    renderMapMarkers(visitedLocations, { fitBounds: true });
}
window.renderVisitedTabList = renderVisitedTabList;

// LISTE ÉPURÉE DES VOYAGES DE L'ONGLET "MY ITINERARY" (remplace l'ancien menu
// déroulant — demande du 06/09/2026). Un simple filtre texte côté client sur le nom du
// voyage (pas de requête réseau), et un clic sur une ligne sélectionne/désélectionne
// (toggle) ce voyage plutôt que d'exiger de rouvrir un menu.
function renderItineraryTripList() {
    const listEl = document.getElementById('itinerary-trip-list');
    if(!listEl) return;

    const trips = getMyTripsList();
    const activeId = localStorage.getItem('activeTripId');
    const searchInput = document.getElementById('itinerary-search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = query ? trips.filter(tr => (tr.name || '').toLowerCase().includes(query)) : trips;

    listEl.innerHTML = '';
    if(trips.length === 0 || filtered.length === 0) {
        listEl.innerHTML = `<div class="itinerary-empty">${t('noTripsFound')}</div>`;
        return;
    }

    filtered.forEach(tr => {
        const allAssignedIds = (tr.days || []).flat().map(Number);
        const locWord = allAssignedIds.length > 1 ? t('locationsWordPlural') : t('locationsWord');
        const isActive = tr.id === activeId;

        // Création d'élément dynamique pour éviter tout bug lié aux apostrophes/guillemets dans le nom du trip
        const row = document.createElement('div');
        row.className = 'itin-trip-row' + (isActive ? ' selected' : '');
        row.onclick = () => window.toggleItineraryTripSelection(tr.id);

        const body = document.createElement('div');
        body.className = 'itin-trip-row-body';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'itin-trip-row-name';
        nameDiv.textContent = tr.name;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'itin-trip-row-meta';
        metaDiv.textContent = `${allAssignedIds.length} ${locWord}`;

        body.appendChild(nameDiv);
        body.appendChild(metaDiv);
        row.appendChild(body);

        if(isActive) {
            const check = document.createElement('div');
            check.className = 'itin-trip-row-check';
            check.innerHTML = '✓';
            row.appendChild(check);
        }

        listEl.appendChild(row);
    });
}
// Reliée à l'input de recherche (oninput) dans map.html.
window.filterItineraryTripList = renderItineraryTripList;

window.loadItineraryTabOptions = function() {
    renderItineraryTripList();

    // Jamais de voyage présélectionné par défaut (demande du 07/09/2026 : "à défaut ne
    // sélectionne pas l'affichage de trips, ni dans explore ni dans my itinerary") — même
    // si activeTripId contient encore la valeur d'une session précédente (ex: dernier
    // voyage ouvert dans trips.html), la carte démarre neutre tant que la personne n'a pas
    // cliqué explicitement sur un voyage dans cette liste. Avant ce correctif, ce
    // comportement "restaure le dernier voyage actif" se déclenchait aussi bien à
    // l'ouverture de cet onglet qu'à chaque synchronisation cloud des données (voir plus
    // haut, sur reçoit event 'firebase-ready'/cloudData.myTrips) — y compris pendant que
    // l'onglet "Explore" était affiché, faisant apparaître silencieusement l'itinéraire
    // d'un voyage par-dessus la carte normale.
    document.getElementById('itinerary-content-container').classList.add('hidden');
    window.clearTripFromMainMap();
};

// Clic sur une ligne de la liste : sélectionne ce voyage pour l'afficher sur la carte,
// ou le désélectionne s'il l'était déjà (recliquer un voyage déjà actif le retire de la
// carte — demande du 06/09/2026). Sur mobile (demande du 12/09/2026) : redirige plutôt
// directement vers la fiche du voyage sur trips.html — l'aperçu superposé sur la petite
// carte mobile a moins de sens que sur desktop, où la place ne manque pas pour la liste
// ET la carte en même temps. trips.html lit déjà activeTripId au chargement
// (window.initTrips(), voir script.js) pour savoir quel voyage ouvrir en premier — poser
// cette même clé avant de naviguer suffit, sans avoir besoin d'un nouveau paramètre d'URL.
window.toggleItineraryTripSelection = function(tripId) {
    if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
        localStorage.setItem('activeTripId', tripId);
        window.location.href = 'trips.html';
        return;
    }
    if(localStorage.getItem('activeTripId') === tripId) {
        window.deselectItineraryTrip();
    } else {
        localStorage.setItem('activeTripId', tripId);
        window.loadItineraryView(tripId);
        renderItineraryTripList();
    }
};

window.loadItineraryView = function(tripId) {
    if(!tripId) {
        tripId = localStorage.getItem('activeTripId');
    }
    if(!tripId) {
        document.getElementById('itinerary-content-container').classList.add('hidden');
        window.clearTripFromMainMap();
        return;
    }

    let trips = getMyTripsList();
    const trip = trips.find(t => t.id === tripId);
    if(!trip) return;

    localStorage.setItem('activeTripId', trip.id);
    document.getElementById('itinerary-content-container').classList.remove('hidden');

    document.getElementById('iti-view-name').textContent = trip.name;
    
    let allAssignedIds = (trip.days || []).flat().map(Number);
    document.getElementById('iti-view-loc-count').textContent = `${allAssignedIds.length} location${allAssignedIds.length > 1 ? 's' : ''}`;

    let wList = getWishlistLocs();
    let totalSaved = wList.filter(w => w.tripId === trip.id).length;
    
    let countries = [...new Set(allAssignedIds.map(id => {
        let loc = celebLocations.find(l => Number(l.id) === id);
        return loc ? loc.country : null;
    }).filter(Boolean))];
    
    document.getElementById('iti-view-meta').textContent = `${countries.length} countr${countries.length > 1 ? 'ies' : 'y'} · ${totalSaved} total locations saved`;

    const timelineContainer = document.getElementById('iti-view-timeline');
    let timelineHtml = '';
    const dayColors = ['#D42759', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

    (trip.days || []).forEach((dayIds, idx) => {
        const color = dayColors[idx % dayColors.length];
        
        timelineHtml += `
            <div class="timeline-day">
                <div class="timeline-header">
                    <div class="timeline-dot" style="background:${color};"></div>
                    <span style="color:#212832;">Day ${idx + 1}</span>
                </div>
                <div class="timeline-body" style="border-left: 2px dashed ${color};">
        `;
        
        if (dayIds.length === 0) {
            timelineHtml += `<div class="timeline-loc-city" style="font-style:italic; text-align:left;">No locations planned</div>`;
        } else {
            dayIds.forEach(id => {
                const loc = celebLocations.find(l => Number(l.id) === Number(id));
                if(loc) {
                    timelineHtml += `
                        <div class="timeline-loc" onclick="map.flyTo([${loc.lat}, ${loc.lng}], 16, { duration: 0.6 }); window.openDetailsPanel(${loc.id});" style="cursor:pointer;">
                            <span class="timeline-loc-name">${loc.name}</span>
                            <span class="timeline-loc-city">${loc.city || ''}</span>
                        </div>
                    `;
                }
            });
        }
        timelineHtml += `</div></div>`;
    });

    timelineContainer.innerHTML = timelineHtml;

    if(markerGroup) markerGroup.clearLayers();
    if(!tripMainLayerGroup) tripMainLayerGroup = L.featureGroup().addTo(map);
    else tripMainLayerGroup.clearLayers();

    // Tant qu'un itinéraire est affiché sur la carte principale, le handler 'zoomend'
    // (plus bas) ne doit PAS relancer renderMapMarkers() : sinon, dès qu'on zoome ou
    // dézoome, les marqueurs/clusters normaux de TOUS les lieux étaient réinjectés
    // par-dessus les pins numérotés de l'itinéraire, créant un carte illisible.
    window.__tripViewActive = true;

    drawTripOnMap(trip, map, tripMainLayerGroup);
}

window.clearTripFromMainMap = function() {
    window.__tripViewActive = false;
    if(tripMainLayerGroup) {
        tripMainLayerGroup.clearLayers();
    }

    const cont = document.getElementById('itinerary-content-container');
    if(cont) cont.classList.add('hidden');

    if(document.getElementById('tab-explore-btn')) {
        renderLocations(true);
    }
}

// Reclic sur le voyage déjà actif dans la liste de l'onglet My Itinerary (voir
// toggleItineraryTripSelection ci-dessus) : oublie le voyage actif (sans ça, rouvrir
// l'onglet le re-sélectionnait automatiquement — voir loadItineraryTabOptions) et
// rafraîchit la liste pour retirer la coche.
window.deselectItineraryTrip = function() {
    localStorage.removeItem('activeTripId');
    const cont = document.getElementById('itinerary-content-container');
    if(cont) cont.classList.add('hidden');
    window.clearTripFromMainMap();
    renderItineraryTripList();
};

const TRIP_DAY_COLORS = ['#D42759', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

function drawTripOnMap(trip, targetMap, targetLayerGroup) {
    if(!targetLayerGroup) return;
    targetLayerGroup.clearLayers();
    if(!trip || !trip.days || trip.days.length === 0) return;

    let allPoints = [];

    trip.days.forEach((dayIds, idx) => {
        const color = TRIP_DAY_COLORS[idx % TRIP_DAY_COLORS.length];
        let coords = [];
        dayIds.forEach((id, locIdx) => {
            const loc = celebLocations.find(l => Number(l.id) === Number(id));
            if(loc) {
                coords.push([loc.lat, loc.lng]);
                allPoints.push([loc.lat, loc.lng]);
                
                const markerHtml = `<div style="background:${color}; width:28px; height:28px; border-radius:50%; border:2px solid #fff; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold; box-shadow:0 3px 6px rgba(0,0,0,0.3);">${idx+1}.${locIdx + 1}</div>`;
                // zIndexOffset élevé : les pins de l'itinéraire doivent TOUJOURS rester au
                // premier plan par rapport aux marqueurs/clusters normaux de la carte,
                // même si ceux-ci sont réaffichés par erreur pendant qu'un voyage est
                // affiché (ex: une synchronisation cloud asynchrone qui arrive en retard).
                const icon = L.divIcon({ className: '', html: markerHtml, iconSize: [28,28], iconAnchor: [14,14] });
                const m = L.marker([loc.lat, loc.lng], {icon: icon, zIndexOffset: 5000}).addTo(targetLayerGroup);
                
                m.on('click', () => { if(window.openDetailsPanel) window.openDetailsPanel(loc.id); });
            }
        });
        if(coords.length > 1) {
            L.polyline(coords, { color: color, weight: 4, opacity: 0.8, dashArray: '8, 6' }).addTo(targetLayerGroup);
        }
    });
    
    if(allPoints.length > 0 && targetMap) {
        targetMap.fitBounds(L.polyline(allPoints).getBounds(), { padding: [40, 40], maxZoom: 16 });
    }
}

// Recrée les mini-cartes par jour affichées dans chaque .day-card. Appelée après chaque
// re-render de l'itinéraire : les anciennes instances Leaflet sont détruites au préalable
// (leur conteneur DOM a été supprimé par box.innerHTML='' dans renderTrip, ce qui ne libère
// pas la mémoire ni le "._leaflet_id" du conteneur tant qu'on n'appelle pas .remove()).
function renderDayMiniMaps(trip) {
    dayMiniMaps.forEach(m => { if(m) m.remove(); });
    dayMiniMaps = [];
    if(!trip || !trip.days) return;

    trip.days.forEach((dayIds, idx) => {
        const container = document.getElementById(`day-map-${idx}`);
        if(!container) return;

        const color = TRIP_DAY_COLORS[idx % TRIP_DAY_COLORS.length];
        const coords = dayIds
            .map(id => celebLocations.find(l => Number(l.id) === Number(id)))
            .filter(Boolean)
            .map(loc => [loc.lat, loc.lng]);

        if(coords.length === 0) {
            dayMiniMaps[idx] = null;
            return;
        }

        // zoomControl:true + dragging:true (contrairement à avant) : la mini-carte de
        // chaque jour était entièrement figée, impossible d'en sortir du cadrage
        // automatique pour vérifier un détail — les boutons +/- de Leaflet suffisent
        // pour zoomer sans avoir à activer aussi le défilement à la molette (qui
        // capturerait le scroll de la page au survol de la carte).
        const dayMap = L.map(container, { zoomControl: true, dragging: true, scrollWheelZoom: false, doubleClickZoom: true, attributionControl: false }).setView(coords[0], 13);
        createOSMTileLayer(dayMap).addTo(dayMap);
        const dayLayer = L.featureGroup().addTo(dayMap);

        coords.forEach((c, locIdx) => {
            const markerHtml = `<div style="background:${color}; width:22px; height:22px; border-radius:50%; border:2px solid #fff; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10.5px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${locIdx + 1}</div>`;
            const icon = L.divIcon({ className: '', html: markerHtml, iconSize: [22,22], iconAnchor: [11,11] });
            L.marker(c, { icon: icon }).addTo(dayLayer);
        });
        if(coords.length > 1) {
            L.polyline(coords, { color: color, weight: 3, opacity: 0.8, dashArray: '7, 5' }).addTo(dayLayer);
        }

        setTimeout(() => {
            dayMap.invalidateSize();
            if(coords.length > 1) {
                dayMap.fitBounds(L.polyline(coords).getBounds(), { padding: [24, 24], maxZoom: 15 });
            } else {
                dayMap.setView(coords[0], 14);
            }
        }, 50);

        dayMiniMaps[idx] = dayMap;
    });
}


// ==========================================
// 6. DETAILS PANEL, WISHLIST, ETC.
// ==========================================
function loadTripOptions() {
    const select = document.getElementById('trip-select');
    if(!select) return;
    
    select.innerHTML = '';
    const trips = getMyTripsList();
    const noTripTxt = currentLang === 'fr' ? "Un jour / Pas de voyage prévu" : "Someday / no trip yet";
    const newTripTxt = currentLang === 'fr' ? "+ Créer un nouveau voyage..." : "+ Create a new trip...";
    
    select.innerHTML = `<option value="none">${noTripTxt}</option>`;
    trips.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
    select.innerHTML += `<option value="new">${newTripTxt}</option>`;
}

// Construit les options du sélecteur de voyage dans le popup "Add to Wishlist"
// (voyages existants + "Créer un nouveau voyage"). Appelée à la fois quand on coche
// la case (toggleWishlist) et quand le panneau s'ouvre avec la case déjà cochée
// (openDetailsPanel) — avant, seul le second cas la remplissait, donc cocher la case
// laissait le menu vide, sans option "Create a new trip".
function populateTripSelectOptions(selectedTripId) {
    const select = document.getElementById('trip-select');
    if (!select) return;
    const trips = getMyTripsList();
    select.innerHTML = `<option value="none">${currentLang === 'fr' ? "Un jour / Pas de voyage prévu" : "Someday / no trip yet"}</option>`;
    trips.forEach(tr => { select.innerHTML += `<option value="${tr.id}">${tr.name}</option>`; });
    select.innerHTML += `<option value="new">${currentLang === 'fr' ? "+ Créer un nouveau voyage..." : "+ Create a new trip..."}</option>`;
    if (selectedTripId && select.querySelector(`option[value="${selectedTripId}"]`)) {
        select.value = selectedTripId;
    } else {
        select.value = 'none';
    }
}

window.toggleWishlist = function() {
    const checked = document.getElementById('details-wishlist').checked;
    const box = document.getElementById('trip-box');
    let wList = getWishlistLocs();
    
    if (checked) {
        box.classList.add('open');
        if(!wList.some(w => w.id === currentLocationIdForMemory)) {
            wList.push({id: currentLocationIdForMemory, dateAdded: new Date().toLocaleDateString(), tripId: 'none'});
        }
        populateTripSelectOptions('none');
    } else {
        box.classList.remove('open');
        window.cancelNewTrip();
        wList = wList.filter(w => w.id !== currentLocationIdForMemory && w !== currentLocationIdForMemory);
    }
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    if(map) renderLocations(true);
};

window.handleTripSelect = function() {
    const value = document.getElementById('trip-select').value;
    const field = document.getElementById('new-trip-field');
    
    if (value === 'new') {
        field.classList.add('open');
    } else {
        field.classList.remove('open');
        let wList = getWishlistLocs();
        let idx = wList.findIndex(w => w.id === currentLocationIdForMemory);
        if(idx !== -1) {
            wList[idx].tripId = value;
            localStorage.setItem('wishlistLocs', JSON.stringify(wList));
            syncWishlist(wList);
        }
    }
};

window.validateNewTrip = function() {
    const name = document.getElementById('new-trip-name').value.trim();
    document.getElementById('create-trip-btn').disabled = !name;
};

window.createTrip = function() {
    const name = document.getElementById('new-trip-name').value.trim();
    if (!name) return;

    const start = document.getElementById('new-trip-start').value;
    const end = document.getElementById('new-trip-end').value;

    let label = name;
    if (start) {
        const langCode = currentLang === 'fr' ? 'fr-FR' : 'en-US';
        const fmt = (m) => { const [y,mo] = m.split('-'); return new Date(y, mo-1).toLocaleDateString(langCode,{month:'short', year:'numeric'}); };
        label += ` (${fmt(start)}${end && end !== start ? ' – ' + fmt(end) : ''})`;
    }

    const newTripId = 'trip-' + Date.now();
    let trips = getMyTripsList();
    trips.push({ id: newTripId, name: label, dateType: 'specific', startDate: start, endDate: end, days: [] });
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);

    populateTripSelectOptions(newTripId);
    window.handleTripSelect(); 
    window.cancelNewTrip();
};

window.cancelNewTrip = function() {
    const field = document.getElementById('new-trip-field');
    if(field) field.classList.remove('open');
    if(document.getElementById('new-trip-name')) document.getElementById('new-trip-name').value = '';
    if(document.getElementById('new-trip-start')) document.getElementById('new-trip-start').value = '';
    if(document.getElementById('new-trip-end')) document.getElementById('new-trip-end').value = '';
    if(document.getElementById('create-trip-btn')) document.getElementById('create-trip-btn').disabled = true;
    
    const select = document.getElementById('trip-select');
    if (select && select.value === 'new') {
        select.value = 'none';
        window.handleTripSelect();
    }
};

// Repère temporaire (deux anneaux qui s'étendent en boucle + un point plein) posé sur le
// marqueur du lieu qu'on vient d'ouvrir — voir openDetailsPanel() ci-dessous. Sans ça,
// dans une zone où plusieurs lieux sont proches, rien ne distingue visuellement le
// marqueur visé de ses voisins une fois le flyTo() terminé. Un simple marqueur Leaflet
// séparé plutôt qu'une classe sur le marqueur normal : ça marche même si le lieu est
// pour l'instant caché dans un cluster (le repère apparaît à ses coordonnées exactes dès
// que le zoom l'en fait sortir), sans avoir à retrouver/modifier le marqueur existant.
function findMarkerForLocId(locId) {
    if (!markerGroup) return null;
    let found = null;
    markerGroup.eachLayer(m => { if (m.__locId === locId) found = m; });
    return found;
}

function highlightSelectedLocationMarker(loc) {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
    if (window.__selectedLocMarkerTimeout) clearTimeout(window.__selectedLocMarkerTimeout);
    if (window.__selectedLocMarker) { map.removeLayer(window.__selectedLocMarker); window.__selectedLocMarker = null; }
    // Restaure le point normal éventuellement masqué par un highlight précédent avant d'en
    // masquer un nouveau — sinon un clic rapide sur un 2e lieu laisse le point du 1er lieu
    // invisible indéfiniment.
    if (window.__selectedLocMarkerHidden) { window.__selectedLocMarkerHidden.setOpacity(1); window.__selectedLocMarkerHidden = null; }
    // Masque le point normal de CE lieu tant que l'anneau pulsé est affiché, pour que les
    // deux marqueurs ne se superposent jamais visuellement (demande du 08/09/2026). Pas
    // d'effet si le lieu est pour l'instant regroupé dans un cluster (aucun marqueur
    // individuel à trouver) — c'est un no-op sans risque dans ce cas.
    const ownMarker = findMarkerForLocId(loc.id);
    if (ownMarker) { ownMarker.setOpacity(0); window.__selectedLocMarkerHidden = ownMarker; }

    const pulseIcon = L.divIcon({
        className: '',
        html: `<div class="selected-loc-pulse-wrap"><span class="selected-loc-pulse-ring"></span><span class="selected-loc-pulse-ring selected-loc-pulse-ring2"></span><span class="selected-loc-pulse-dot"></span></div>`,
        iconSize: [40, 40], iconAnchor: [20, 20]
    });
    window.__selectedLocMarker = L.marker([loc.lat, loc.lng], { icon: pulseIcon, zIndexOffset: 9000, interactive: false }).addTo(map);
    window.__selectedLocMarkerTimeout = setTimeout(() => {
        if (window.__selectedLocMarker) { map.removeLayer(window.__selectedLocMarker); window.__selectedLocMarker = null; }
        if (window.__selectedLocMarkerHidden) { window.__selectedLocMarkerHidden.setOpacity(1); window.__selectedLocMarkerHidden = null; }
        window.__selectedLocMarkerTimeout = null;
    }, 3500);
}
window.highlightSelectedLocationMarker = highlightSelectedLocationMarker;

// ==========================================
// "Photos des visiteurs" par lieu (demande du 11/09/2026, captures d'écran fournies) :
// badge "×N" sur chaque pastille de la carte, mini-aperçu (collage de 3 photos + nombre
// de publications) juste au-dessus de la nav du bas quand on sélectionne un lieu, et
// chevron qui ouvre un tiroir listant toutes les photos des visiteurs de ce lieu.
// Réutilise fetchGlobalPhotoFeed() (firebase-init.js) — déjà l'agrégat de TOUTES les
// photos (autonomes + avis avec photo) de TOUS les comptes — plutôt qu'une nouvelle
// requête Firestore dédiée par lieu.
// ==========================================
let locPostsIndexPromise = null;
let locPostsIndexSync = null; // rempli une fois la promesse résolue — lu de façon synchrone par addSingleLocationMarker() aux rendus suivants
function ensureLocPostsIndex() {
    // BUG évité : firebase-init.js est un <script type="module">, donc différé — il peut
    // s'exécuter APRÈS ce script.js classique (non différé). Un premier appel trop
    // précoce (avant que window.fetchGlobalPhotoFeed n'existe) ne doit JAMAIS mettre en
    // cache un résultat vide pour de bon : seul un appel qui a RÉELLEMENT pu lire
    // Firestore met locPostsIndexPromise en cache ; sinon on retente au prochain appel
    // (voir renderMapMarkers, qui rappelle ensureLocPostsIndex() à chaque rendu).
    if (locPostsIndexPromise) return locPostsIndexPromise;
    if (typeof window.fetchGlobalPhotoFeed !== 'function') return Promise.resolve(new Map());
    locPostsIndexPromise = (async () => {
        const map = new Map();
        let photos = [];
        try { photos = await window.fetchGlobalPhotoFeed(); } catch (e) { photos = []; }
        photos.forEach(p => {
            if (p.locationId == null) return;
            const key = Number(p.locationId);
            if (Number.isNaN(key)) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(p);
        });
        locPostsIndexSync = map;
        return map;
    })();
    return locPostsIndexPromise;
}
window.getLocPosts = function (locId) {
    if (!locPostsIndexSync) return [];
    return locPostsIndexSync.get(Number(locId)) || [];
};

// Badge "×N" sur la pastille d'un lieu — même principe visuel que le badge "×N" des
// clusters (.cluster-badge), mais compte les PUBLICATIONS déposées à ce lieu plutôt que
// le nombre de lieux regroupés. Patch les marqueurs déjà affichés une fois l'index prêt,
// sans attendre un changement de filtre — reconstruit l'icône avec la même couleur que
// addSingleLocationMarker() lui avait posée à sa création (marker.__baseColor).
function applyLocPostBadges() {
    if (!markerGroup || !locPostsIndexSync || typeof L === 'undefined') return;
    markerGroup.eachLayer(marker => {
        if (marker.__locId == null || !marker.__baseColor) return;
        const count = (locPostsIndexSync.get(Number(marker.__locId)) || []).length;
        if (!count) return;
        const inlineStyle = `background-color: ${marker.__baseColor}; --marker-color: ${marker.__baseColor};`;
        const html = `<span style="position:relative; display:inline-block;"><div style="${inlineStyle}"></div><span class="loc-post-badge">${count > 9 ? '9+' : count}</span></span>`;
        marker.setIcon(L.divIcon({ className: 'custom-category-marker location-dot-marker', html, iconSize: [12,12], iconAnchor: [6,6] }));
    });
}

// Chevron PERMANENT intégré à la nav du bas (demande du 11/09/2026, redemandé le
// 12/09/2026 : "tu n'as pas ajouté le chevron sur mobile... j'avais même envoyé une
// capture d'écran") — contrairement au bandeau collage+compteur ci-dessous (qui n'existe
// dans le DOM que lorsque le lieu ouvert a des photos, donc invisible tant qu'aucun lieu
// avec photos n'a jamais été sélectionné), ce petit onglet est un vrai élément permanent
// de l'interface, injecté une fois au chargement de la page et visible en continu,
// superposé au bord haut de la nav du bas — jamais absent, pour qu'il soit toujours
// repérable comme demandé, même avant d'avoir consulté un lieu avec photos.
function injectLocVisitorsChevron() {
    if (document.getElementById('loc-visitors-chevron-tab')) return;
    // map.html uniquement : le tiroir a besoin de celebLocations/getLocPosts (voir
    // ensureLocPostsIndex), sans objet ailleurs — #live-panel n'existe que sur cette
    // page (même repère déjà utilisé pour le bouton "Live" de la nav, plus haut).
    if (!document.getElementById('live-panel')) return;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'loc-visitors-chevron-tab';
    tab.className = 'loc-visitors-chevron-tab';
    tab.title = 'Visitor photos';
    tab.setAttribute('aria-label', 'Visitor photos for the selected location');
    tab.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    document.body.appendChild(tab);
    tab.addEventListener('click', async () => {
        // Fonctionne n'importe où sur la carte (demande du 12/09/2026 : "il faut qu'on
        // puisse cliquer sur la flèche n'importe où, sans devoir cliquer sur un lieu") —
        // avant ce correctif, un clic sans lieu sélectionné n'affichait qu'un message
        // "sélectionnez d'abord un lieu". Le comportement dépend maintenant de ce qui est
        // effectivement visible/centré à l'écran, voir findNearbyOrAreaVisitorContent().
        await ensureLocPostsIndex();
        findNearbyOrAreaVisitorContent();
    });
    positionLocVisitorsChevron();
    window.addEventListener('resize', positionLocVisitorsChevron);
    window.addEventListener('orientationchange', () => setTimeout(positionLocVisitorsChevron, 300));
}

// BUG rapporté à plusieurs reprises (11, 12 et 13/09/2026) : "la flèche chevauche le +,
// mal alignée". Le vertical (chevauchement) a été corrigé le 12/09/2026 en mesurant la
// position RÉELLE de la nav plutôt qu'une constante CSS devinée — voir ceilingTop
// ci-dessous. L'horizontal restait cependant mal aligné malgré left:50%/translateX(-50%)
// identique sur les deux éléments : les 5 icônes de la nav n'ont pas toutes la même
// largeur (l'avatar en particulier a une largeur EXPLICITE de 26px qui, avec le
// box-sizing:border-box global, absorbe le padding de .mbn-item au lieu de s'y ajouter —
// voir le commentaire sur .mbn-avatar plus haut), donc le centre géométrique de la nav
// n'est PAS exactement au-dessus du bouton "+" malgré les apparences. Plutôt que recalculer
// ces largeurs à la main, on centre maintenant le chevron sur le vrai bouton #mbn-add-btn,
// mesuré avec getBoundingClientRect() — impossible de dévier d'un élément réellement
// affiché, quel que soit le nombre/la largeur des icônes voisines.
function positionLocVisitorsChevron() {
    const tab = document.getElementById('loc-visitors-chevron-tab');
    const nav = document.getElementById('mobile-bottom-nav');
    if (!tab || !nav) return;
    if (window.matchMedia && !window.matchMedia('(max-width: 760px)').matches) return;
    const GAP = 10;
    let ceilingTop = nav.getBoundingClientRect().top;
    const bar = document.getElementById('loc-visitors-bar');
    if (bar && bar.classList.contains('open')) {
        ceilingTop = bar.getBoundingClientRect().top;
    }
    tab.style.bottom = Math.round(window.innerHeight - ceilingTop + GAP) + 'px';

    const addBtn = document.getElementById('mbn-add-btn');
    if (addBtn) {
        const addRect = addBtn.getBoundingClientRect();
        tab.style.left = Math.round(addRect.left + addRect.width / 2) + 'px';
        tab.style.transform = 'translateX(-50%)';
    }
}

// Détermine quoi ouvrir au clic sur le chevron (demande du 12/09/2026) : soit un lieu
// précis si le centre de la carte en frôle un, soit une liste groupée de tout ce qui est
// publié dans le pays le plus représenté parmi les lieux actuellement visibles à l'écran
// (ex: centré sur la France -> tout ce que les utilisateurs ont publié en France).
// currentFilteredLocations (pas celebLocations) pour rester cohérent avec les marqueurs
// RÉELLEMENT affichés (filtres Groupe/Membre/Année... déjà appliqués, voir renderMarkers()).
function findNearbyOrAreaVisitorContent() {
    if (!map || !Array.isArray(currentFilteredLocations) || currentFilteredLocations.length === 0) return;
    const bounds = map.getBounds();
    const visibleLocs = currentFilteredLocations.filter(l => bounds.contains([l.lat, l.lng]));
    if (!visibleLocs.length) {
        if (typeof window.showSimpleToast === 'function') window.showSimpleToast(currentLang === 'fr' ? 'Aucun lieu visible sur cette portion de carte.' : 'No locations visible in this part of the map.');
        return;
    }
    // "Proche d'un lieu en particulier" : distance à l'écran (pixels), pas en degrés de
    // latitude/longitude — sans ça, un lieu au même point géographique mais hors zoom
    // paraîtrait "loin" ou l'inverse selon le niveau de zoom.
    const centerPt = map.latLngToContainerPoint(map.getCenter());
    let nearest = null, nearestDist = Infinity;
    visibleLocs.forEach(loc => {
        const pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
        const dist = pt.distanceTo(centerPt);
        if (dist < nearestDist) { nearestDist = dist; nearest = loc; }
    });
    const NEARBY_PX_THRESHOLD = 70;
    if (nearest && nearestDist <= NEARBY_PX_THRESHOLD) {
        const posts = window.getLocPosts(nearest.id);
        if (posts.length) { openLocVisitorsDrawer(nearest); return; }
    }
    // Sinon : pays le plus représenté parmi les lieux visibles à l'écran.
    const countryCounts = {};
    visibleLocs.forEach(l => { if (l.country) countryCounts[l.country] = (countryCounts[l.country] || 0) + 1; });
    const topCountry = Object.keys(countryCounts).sort((a, b) => countryCounts[b] - countryCounts[a])[0];
    if (!topCountry) {
        if (typeof window.showSimpleToast === 'function') window.showSimpleToast(currentLang === 'fr' ? 'Aucun lieu visible sur cette portion de carte.' : 'No locations visible in this part of the map.');
        return;
    }
    const countryLocs = visibleLocs.filter(l => l.country === topCountry);
    const hasAnyPost = countryLocs.some(l => window.getLocPosts(l.id).length > 0);
    if (!hasAnyPost) {
        if (typeof window.showSimpleToast === 'function') window.showSimpleToast(currentLang === 'fr' ? `Pas encore de photo de visiteur publiée en ${topCountry}.` : `No visitor photos published in ${topCountry} yet.`);
        return;
    }
    openAreaVisitorsDrawer(topCountry, countryLocs);
}

// Mini-aperçu (bandeau juste au-dessus de la nav du bas, mobile uniquement comme la nav
// elle-même) : collage de jusqu'à 3 photos superposées + nombre de publications, affiché
// quand le lieu sélectionné (marqueur cliqué OU carte de la liste — les deux passent par
// openDetailsPanel) a au moins une photo. Le bandeau entier ouvre le tiroir complet (voir
// openLocVisitorsDrawer plus bas). Complète le chevron permanent ci-dessus (toujours
// visible) sans le remplacer : celui-ci reste l'indicateur "il y a quelque chose ici".
async function updateLocVisitorsBar(loc) {
    await ensureLocPostsIndex();
    // Le lieu affiché a pu changer pendant l'attente Firestore (clic rapide sur un autre
    // lieu juste après) — n'affiche l'aperçu que s'il correspond toujours au lieu ouvert.
    if (currentLocationIdForMemory !== loc.id) return;
    const posts = window.getLocPosts(loc.id);
    const chevronTab = document.getElementById('loc-visitors-chevron-tab');
    if (chevronTab) {
        chevronTab.classList.toggle('has-posts', posts.length > 0);
    }
    let bar = document.getElementById('loc-visitors-bar');
    if (!posts.length) {
        if (bar) bar.classList.remove('open');
        positionLocVisitorsChevron();
        return;
    }
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'loc-visitors-bar';
        bar.className = 'loc-visitors-bar';
        document.body.appendChild(bar);
    }
    const collage = posts.slice(0, 3).map((p, i) => `<div class="loc-visitors-thumb" style="background-image:url('${p.photo}'); z-index:${3 - i};"></div>`).join('');
    const label = posts.length === 1
        ? (currentLang === 'fr' ? '1 publication' : '1 post')
        : `${posts.length} ${currentLang === 'fr' ? 'publications' : 'posts'}`;
    bar.innerHTML = `
        <div class="loc-visitors-collage">${collage}</div>
        <span class="loc-visitors-count">${label}</span>
        <button type="button" class="loc-visitors-chevron" aria-label="Show visitor photos">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </button>
    `;
    bar.onclick = () => openLocVisitorsDrawer(loc);
    bar.classList.add('open');
    positionLocVisitorsChevron();
}
window.updateLocVisitorsBar = updateLocVisitorsBar;

// Tiroir plein ("chevron intégré à la nav ... ouvre un menu déroulant vers le haut") :
// liste toutes les photos des visiteurs du lieu sélectionné. Réutilise le même
// habillage que le volet "+" (.qa-sheet-overlay/.qa-sheet, voir style.css) pour rester
// cohérent avec le reste du site plutôt que d'inventer un nouveau composant. Chaque
// tuile ouvre la publication complète via openLocModal() (même modale que
// feed.html/profile.html).
// Rendu partagé du tiroir "photos des visiteurs" (demande du 12/09/2026, extrait de
// l'ancien openLocVisitorsDrawer) — accepte maintenant des publications de PLUSIEURS lieux
// (postsWithLoc: [{post, locId}]), pas juste un seul lieu, pour servir aussi bien
// openLocVisitorsDrawer() (un lieu précis) que openAreaVisitorsDrawer() (tout un pays).
function renderVisitorsDrawerContent(title, postsWithLoc) {
    let overlay = document.getElementById('loc-visitors-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loc-visitors-overlay';
        overlay.className = 'qa-sheet-overlay';
        overlay.innerHTML = `
            <div class="qa-sheet loc-visitors-sheet">
                <div class="qa-sheet-handle"></div>
                <div class="loc-visitors-sheet-title" id="loc-visitors-sheet-title"></div>
                <div class="loc-visitors-grid" id="loc-visitors-grid"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) window.closeLocVisitorsDrawer(); });
    }
    document.getElementById('loc-visitors-sheet-title').textContent = title;
    const grid = document.getElementById('loc-visitors-grid');
    grid.innerHTML = postsWithLoc.map(({ post: p }, i) => `
        <div class="loc-visitors-tile" data-i="${i}" style="background-image:url('${p.photo}');">
            <div class="loc-visitors-tile-avatar" style="background:${window.avatarColorForUsername(p.username)};">${escapeHtml((p.username || 'U').charAt(0).toUpperCase())}</div>
        </div>
    `).join('');
    grid.querySelectorAll('.loc-visitors-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const { post: p, locId } = postsWithLoc[Number(tile.dataset.i)];
            window.closeLocVisitorsDrawer();
            window.openLocModal(locId, {
                username: p.username,
                uid: p.uid,
                avatarColor: window.avatarColorForUsername(p.username),
                photo: p.photo,
                caption: p.caption,
                photoKey: p.uid + '_' + p.id,
                photoId: p.standalone ? p.id : null
            });
        });
    });
    overlay.classList.add('open');
}

function openLocVisitorsDrawer(loc) {
    const posts = window.getLocPosts(loc.id);
    const title = (currentLang === 'fr' ? 'Photos des visiteurs — ' : 'Visitor photos — ') + loc.name;
    renderVisitorsDrawerContent(title, posts.map(post => ({ post, locId: loc.id })));
}

// Tiroir "tout un pays" (demande du 12/09/2026, clic sur le chevron sans lieu précis
// à proximité) : agrège les publications de plusieurs lieux, triées des plus récentes
// aux plus anciennes (comme le fil global, voir fetchGlobalPhotoFeed() dans
// firebase-init.js), chaque vignette ouvrant son propre lieu au clic (locId par post).
function openAreaVisitorsDrawer(countryName, locs) {
    const postsWithLoc = [];
    locs.forEach(loc => {
        window.getLocPosts(loc.id).forEach(post => postsWithLoc.push({ post, locId: loc.id }));
    });
    postsWithLoc.sort((a, b) => (b.post.updatedAt || 0) - (a.post.updatedAt || 0));
    const title = (currentLang === 'fr' ? 'Publications — ' : 'Posts — ') + countryName;
    renderVisitorsDrawerContent(title, postsWithLoc);
}
window.closeLocVisitorsDrawer = function () {
    const overlay = document.getElementById('loc-visitors-overlay');
    if (overlay) overlay.classList.remove('open');
};

// Story, infos pratiques, vidéo et conseils d'un lieu — regroupés ici pour pouvoir être
// rendus une première fois avec les données locales de script.js (immédiat, jamais de
// délai), PUIS une seconde fois si une lecture Firestore répond avec une version plus à
// jour (voir l'appel à window.fetchLocationContent() dans openDetailsPanel ci-dessous).
function renderLocationRichContent(loc) {
    // Story tab : le fullDescription (1er paragraphe = le lieu, paragraphes suivants = le lien avec BTS)
    // est découpé automatiquement par balises <p>, sans toucher aux données des lieux.
    const descPlaceEl = document.getElementById('details-desc-place');
    const descBtsSection = document.getElementById('story-section-bts');
    const descBtsEl = document.getElementById('details-desc-bts');
    if(descPlaceEl) {
        const descHtml = getLocText(loc.fullDescription);
        const temp = document.createElement('div');
        temp.innerHTML = descHtml || '';
        let paragraphs = Array.from(temp.querySelectorAll('p'));
        if(paragraphs.length === 0 && descHtml) {
            const onlyP = document.createElement('p');
            onlyP.innerHTML = descHtml;
            paragraphs = [onlyP];
        }
        descPlaceEl.innerHTML = paragraphs.length > 0 ? paragraphs[0].outerHTML : '';
        if(paragraphs.length > 1) {
            descBtsEl.innerHTML = paragraphs.slice(1).map(p => p.outerHTML).join('');
            if(descBtsSection) descBtsSection.classList.remove('hidden');
        } else {
            descBtsEl.innerHTML = '';
            if(descBtsSection) descBtsSection.classList.add('hidden');
        }
    }

    // Practical information & access : un lieu peut fournir plusieurs items TITRÉS
    // (loc.practicalInfo — ex: statut du lieu, comment s'y rendre, quoi faire alentour),
    // chacun affiché avec un titre de section comme "The story of this place" (même
    // classe .story-heading). Sans ce champ, on retombe sur l'ancien rendu à un seul
    // item dérivé de loc.directions, pour ne pas casser les lieux qui n'ont que ça.
    const practicalList = document.getElementById('details-practical-list');
    if(practicalList) {
        if (Array.isArray(loc.practicalInfo) && loc.practicalInfo.length > 0) {
            practicalList.innerHTML = loc.practicalInfo.map(item => {
                const title = getLocText(item.title);
                const text = getLocText(item.text);
                if (!text) return '';
                return `<div class="practical-item-titled"><div class="story-heading"><span class="dot"></span><span>${title}</span></div><div class="practical-item-text">${text}</div></div>`;
            }).join('');
        } else {
            const directionsText = getLocText(loc.directions);
            practicalList.innerHTML = directionsText ? `<div class="practical-item"><b>${t('lHowToGetThere')}</b> ${directionsText}</div>` : '';
        }
    }

    const videoContainer = document.getElementById('details-video-container');
    const videoSection = document.getElementById('details-video-section');
    const tweetContainer = document.getElementById('details-tweet-container');
    const instagramContainer = document.getElementById('details-instagram-container');
    // Réutilisé plus bas dans la section "Liens sociaux" : si le post est déjà embarqué
    // ici, le lien "Follow: Instagram" ne doit pas être répété en double en dessous.
    let instagramEmbedded = false;
    if (videoContainer && videoSection) {
        // Chacun des trois types de média a son propre conteneur, affiché ou masqué
        // INDÉPENDAMMENT des deux autres (demande du 07/09/2026 : un lien YouTube ET un lien
        // Twitter tous les deux renseignés n'affichaient jusqu'ici que YouTube, à cause d'un
        // if/else-if qui ne permettait qu'un seul média à la fois). La section entière ne
        // reste masquée que si AUCUN des trois n'a de contenu.
        videoContainer.innerHTML = "";
        videoContainer.classList.add('hidden');
        if (tweetContainer) { tweetContainer.innerHTML = ""; tweetContainer.classList.add('hidden'); }
        if (instagramContainer) { instagramContainer.innerHTML = ""; instagramContainer.classList.add('hidden'); }
        let anyMedia = false;

        // Vidéo(s)/YouTube : les deux restent mutuellement exclusifs ENTRE EUX (ils partagent
        // le même conteneur "vidéo"), videoEmbeds prenant la priorité — ce sont deux façons de
        // renseigner la MÊME sorte de média, contrairement à Twitter/Instagram qui sont des
        // types de contenu distincts.
        if (loc.videoEmbeds && loc.videoEmbeds.length > 0) {
            loc.videoEmbeds.forEach(vidSrc => { videoContainer.innerHTML += `<div class="video-wrapper"><iframe src="${vidSrc}" frameborder="0" allowfullscreen></iframe></div>`; });
            videoContainer.classList.remove('hidden');
            anyMedia = true;
        } else if (loc.ytId) {
            videoContainer.innerHTML = `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${loc.ytId}" frameborder="0" allowfullscreen></iframe></div>`;
            videoContainer.classList.remove('hidden');
            anyMedia = true;
        }
        if (loc.tweetUrl && tweetContainer) {
            // Post Twitter/X embarqué (voir admin.html, champ "Tweet / X post URL") : rendu
            // dans son propre conteneur, PAS .video-wrapper — celui-ci impose un ratio 16:9
            // fixe + overflow:hidden pensé pour un <iframe> vidéo, ce qui écrasait/rognait
            // le widget Twitter (bien plus haut que large), d'où l'affichage "moche" signalé
            // (demande du 06/09/2026). Le widget officiel garde ici sa hauteur naturelle, et
            // cliquer dessus renvoie naturellement vers Twitter (comportement natif).
            tweetContainer.classList.remove('hidden');
            renderTweetEmbedOnDetails(tweetContainer, loc.tweetUrl);
            anyMedia = true;
        }
        if (loc.instagramUrl && isInstagramPostUrl(loc.instagramUrl) && instagramContainer) {
            // Même chose pour un post/reel Instagram précis (demande du 07/09/2026) — un
            // simple lien de profil (pas de post) n'a pas d'équivalent embarquable, voir
            // isInstagramPostUrl(), et reste donc affiché comme lien "Follow" plus bas.
            instagramContainer.classList.remove('hidden');
            renderInstagramEmbedOnDetails(instagramContainer, loc.instagramUrl);
            instagramEmbedded = true;
            anyMedia = true;
        }
        videoSection.classList.toggle('hidden', !anyMedia);
    }

    // Tips box : un lieu peut fournir plusieurs conseils TITRÉS (loc.tipsList — titre en
    // gras + texte, un rond numéroté rose par conseil via .tip-line/.num déjà existants).
    // Sans ce champ, on retombe sur l'ancien conseil unique (loc.tip, sans titre), pour
    // ne pas casser les lieux qui n'ont que ça.
    const tipSection = document.getElementById('details-tip-section');
    const tipsListEl = document.getElementById('details-tips-list');
    if(tipSection && tipsListEl) {
        let tips = [];
        if (Array.isArray(loc.tipsList) && loc.tipsList.length > 0) {
            tips = loc.tipsList.map(item => {
                const title = getLocText(item.title);
                const text = getLocText(item.text);
                return title ? `<b>${title}</b> ${text}` : text;
            }).filter(Boolean);
        } else {
            const tipText = getLocText(loc.tip);
            if (tipText) tips = [tipText];
        }
        if(tips.length > 0) {
            tipsListEl.innerHTML = tips.map((tip, i) => `<div class="tip-line"><div class="num">${i + 1}</div><div>${tip}</div></div>`).join('');
            tipSection.classList.remove('hidden');
        } else {
            tipsListEl.innerHTML = '';
            tipSection.classList.add('hidden');
        }
    }

    const dLink = document.getElementById('details-episode-link');
    const dLinkCont = document.getElementById('details-link-container');
    if (dLink && dLinkCont) { if(loc.episodeLink) { dLink.href = loc.episodeLink; dLinkCont.style.display = 'inline'; } else { dLinkCont.style.display = 'none'; } }

    // Liens sociaux (Instagram/Facebook/TikTok, voir admin.html) : chacun n'apparaît que
    // s'il a été renseigné, et redirige simplement vers le réseau au clic — pas d'embed ici
    // pour Facebook/TikTok (aucune méthode fiable sans clé API), et pas pour Instagram non
    // plus SI le post est déjà embarqué juste au-dessus (voir instagramEmbedded, sinon un
    // lien de simple profil, qui lui n'a pas d'embed possible, reste affiché normalement).
    const socialCont = document.getElementById('details-social-links');
    if (socialCont) {
        const socialLinks = [
            ['details-instagram-link', instagramEmbedded ? null : loc.instagramUrl],
            ['details-facebook-link', loc.facebookUrl],
            ['details-tiktok-link', loc.tiktokUrl]
        ];
        let anySocial = false;
        socialLinks.forEach(([elId, url]) => {
            const el = document.getElementById(elId);
            if (!el) return;
            if (url) { el.href = url; el.classList.remove('hidden'); anySocial = true; }
            else { el.classList.add('hidden'); }
        });
        socialCont.classList.toggle('hidden', !anySocial);

        // Liens supplémentaires par réseau (demande du 11/09/2026, "+", voir admin.html et
        // la modale crayon) : injectés en JS après les liens "principaux" ci-dessus plutôt
        // que codés en dur dans le HTML de chaque page (leur NOMBRE varie d'un lieu à
        // l'autre) — même approche que le reste des éléments injectés dynamiquement sur ce
        // site (nav du bas, etc). Le tweet "principal" a déjà son embed plus haut ; ses
        // liens en plus n'ont pas d'embed, juste un lien texte, comme Facebook/TikTok.
        let extraCont = document.getElementById('details-social-extra-links');
        if (!extraCont) {
            extraCont = document.createElement('span');
            extraCont.id = 'details-social-extra-links';
            socialCont.insertAdjacentElement('afterend', extraCont);
        }
        const extraLinkDefs = [
            ['tweetUrls', 'X/Twitter'],
            ['instagramUrls', 'Instagram'],
            ['facebookUrls', 'Facebook'],
            ['tiktokUrls', 'TikTok']
        ];
        const extraHtml = extraLinkDefs.map(([field, label]) => {
            const urls = Array.isArray(loc[field]) ? loc[field] : [];
            return urls.map((url, i) => `<a href="${url}" target="_blank" rel="noopener">${label}${urls.length > 1 ? ' (' + (i + 1) + ')' : ''}</a>`).join(' ');
        }).filter(Boolean).join(' ');
        extraCont.innerHTML = extraHtml;
        extraCont.classList.toggle('hidden', !extraHtml);
    }
}

// ==========================================
// ÉDITION DIRECTE D'UN LIEU PAR UN ADMIN (icône crayon sur la fiche du lieu, demande du
// 06/09/2026) — contourne la file de soumissions/approbation d'admin.html : un admin qui
// modifie un lieu déjà publié n'a pas besoin de se re-approuver lui-même. N'écrit QUE dans
// locationContent/{locationId} via window.adminUpdateLocationContent() (firebase-init.js) —
// jamais les champs "squelette" (nom, coordonnées...), qui restent dans
// script.js/celebLocations (voir la stratégie hybride : squelette gratuit sur GitHub,
// contenu riche chargé à la demande depuis Firestore). Textes non traduits (8 langues) :
// fonction réservée aux admins, comme admin.html lui-même.
function extractYouTubeIdForEdit(url) {
    const s = (url || '').trim();
    if (!s) return null;
    const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return m ? m[1] : (/^[a-zA-Z0-9_-]{10,15}$/.test(s) ? s : null);
}
function extractTweetUrlForEdit(url) {
    const s = (url || '').trim();
    return /^https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/status\/\d+/.test(s) ? s : null;
}
function extractSocialUrlForEdit(url, domainRe) {
    const s = (url || '').trim();
    return new RegExp(`^https?:\\/\\/(www\\.)?${domainRe}\\/.+`).test(s) ? s : null;
}
// Convertit un fullDescription HTML (<p>...</p><p>...</p>) en texte simple éditable
// (un paragraphe par ligne vide), et inversement à la sauvegarde.
function htmlParagraphsToPlainText(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const paragraphs = Array.from(temp.querySelectorAll('p'));
    if (paragraphs.length === 0) return temp.textContent || '';
    return paragraphs.map(p => p.textContent.trim()).join('\n\n');
}
function plainTextToHtmlParagraphs(text) {
    return (text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

function ensureLocationEditModal() {
    let modal = document.getElementById('location-edit-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'location-edit-modal';
    modal.className = 'modal hidden';
    modal.style.zIndex = '10600';
    const fieldStyle = "width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 12px; font-size:12.5px; font-family:'Poppins',sans-serif; margin-bottom:4px;";
    const labelStyle = "font-size:11px; font-weight:700; color:#64748b; display:block; margin-bottom:4px;";
    const errStyle = "font-size:10.5px; color:#D42759; margin-bottom:10px;";
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
            <span class="close-btn" onclick="document.getElementById('location-edit-modal').classList.add('hidden')">&times;</span>
            <div style="font-size:15px; font-weight:700; color:#212832; margin-bottom:2px;" id="location-edit-title">Edit location</div>
            <div style="font-size:11px; color:#94a3b8; margin-bottom:16px;">Admin only — changes are published immediately.</div>

            <label style="${labelStyle}">Header photo</label>
            <div id="location-edit-photo-preview" style="margin-bottom:8px; border-radius:10px; overflow:hidden; display:none;"><img style="display:block; width:100%; max-height:180px; object-fit:cover;"></div>
            <input type="url" id="location-edit-photo-url" style="${fieldStyle}" placeholder="Photo URL (optional)">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <button type="button" id="location-edit-photo-upload-btn" style="background:#faf9fc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; font-size:11.5px; font-weight:700; color:#64748b; cursor:pointer; font-family:'Poppins',sans-serif;">Upload from device</button>
                <input type="file" id="location-edit-photo-file-input" accept="image/*,.heic,.heif" class="hidden">
                <span id="location-edit-photo-name" style="font-size:10.5px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></span>
            </div>
            <div id="location-edit-photo-error" class="hidden" style="${errStyle}"></div>
            <div style="font-size:10px; color:#94a3b8; margin-bottom:14px;">A URL or an uploaded photo both override the header photo — leave both empty to fall back to the YouTube thumbnail, if a video is set.</div>

            <label style="${labelStyle}">Story (English)</label>
            <textarea id="location-edit-story" rows="6" style="${fieldStyle} margin-bottom:14px; resize:vertical;" placeholder="One paragraph per blank line"></textarea>

            <!-- Group/Members/Country/City/Date (demande du 11/09/2026) : contrairement aux
                 champs au-dessus, ceux-ci ne vivent pas dans locationContent mais dans
                 locationSkeletonOverrides (voir saveLocationEdit() plus bas) — un lieu
                 existant a ces champs codés en dur dans script.js, jamais éditables avant
                 ce correctif. Doivent correspondre EXACTEMENT à une valeur déjà utilisée
                 ailleurs (ex: le nom d'un groupe) pour que les filtres Explore continuent de
                 fonctionner — pas de validation stricte ici, panneau réservé aux admins. -->
            <div style="display:flex; gap:8px;">
                <div style="flex:1;"><label style="${labelStyle}">Group</label><input type="text" id="location-edit-group" style="${fieldStyle}"></div>
                <div style="flex:1;"><label style="${labelStyle}">Member(s)</label><input type="text" id="location-edit-member" style="${fieldStyle}"></div>
            </div>
            <div style="display:flex; gap:8px;">
                <div style="flex:1;"><label style="${labelStyle}">Country</label><input type="text" id="location-edit-country" style="${fieldStyle}"></div>
                <div style="flex:1;"><label style="${labelStyle}">City</label><input type="text" id="location-edit-city" style="${fieldStyle}"></div>
            </div>
            <label style="${labelStyle}">Date</label>
            <input type="text" id="location-edit-year" style="${fieldStyle} margin-bottom:14px;" placeholder="e.g. 2020">

            <label style="${labelStyle}">YouTube video URL</label>
            <input type="url" id="location-edit-youtube" style="${fieldStyle}" placeholder="https://www.youtube.com/watch?v=...">
            <div id="location-edit-youtube-error" class="hidden" style="${errStyle}">Doesn't look like a YouTube URL.</div>

            <label style="${labelStyle}">Twitter / X post URL</label>
            <input type="url" id="location-edit-tweet" style="${fieldStyle}" placeholder="https://x.com/.../status/...">
            <div id="location-edit-tweet-error" class="hidden" style="${errStyle}">Doesn't look like a twitter.com/x.com status URL.</div>
            <div id="location-edit-tweet-extra" style="margin-bottom:8px;"></div>

            <label style="${labelStyle}">Instagram URL</label>
            <input type="url" id="location-edit-instagram" style="${fieldStyle}" placeholder="https://instagram.com/...">
            <div id="location-edit-instagram-error" class="hidden" style="${errStyle}">Doesn't look like an instagram.com URL.</div>
            <div id="location-edit-instagram-extra" style="margin-bottom:8px;"></div>

            <label style="${labelStyle}">Facebook URL</label>
            <input type="url" id="location-edit-facebook" style="${fieldStyle}" placeholder="https://facebook.com/...">
            <div id="location-edit-facebook-error" class="hidden" style="${errStyle}">Doesn't look like a facebook.com URL.</div>
            <div id="location-edit-facebook-extra" style="margin-bottom:8px;"></div>

            <label style="${labelStyle}">TikTok URL</label>
            <input type="url" id="location-edit-tiktok" style="${fieldStyle}" placeholder="https://tiktok.com/...">
            <div id="location-edit-tiktok-error" class="hidden" style="${errStyle}">Doesn't look like a tiktok.com URL.</div>
            <div id="location-edit-tiktok-extra" style="margin-bottom:14px;"></div>

            <button id="location-edit-save-btn" style="width:100%; background:#D42759; color:#fff; border:none; border-radius:100px; padding:11px; font-size:13px; font-weight:700; font-family:'Poppins',sans-serif; cursor:pointer;">Save changes</button>
            <div id="location-edit-result" class="hidden" style="font-size:12px; font-weight:600; margin-top:10px; text-align:center;"></div>

            <!-- Supprimer le lieu (demande du 11/09/2026) : un lieu codé en dur ne peut pas
                 être réellement effacé (script.js n'est pas réécrit en direct) — même
                 mécanisme de "soft delete" que le bouton "Remove from map" d'admin.html
                 (adminSetLocationHidden), avec la même confirmation window.confirm() native. -->
            <button type="button" id="location-edit-delete-btn" style="width:100%; background:none; color:#94a3b8; border:1.5px solid #e2e8f0; border-radius:100px; padding:10px; font-size:12.5px; font-weight:700; font-family:'Poppins',sans-serif; cursor:pointer; margin-top:10px;">Delete location</button>
        </div>`;
    document.body.appendChild(modal);
    wireLocationEditPhotoInputOnce(modal);
    return modal;
}

// Un fichier .heic/.heif (format par défaut de l'appareil photo iPhone) ne peut être décodé
// par AUCUN navigateur autre que Safari — ni <img>, ni canvas — donc resizeTripCoverDataUrl()
// (qui dessine dans un canvas) échouait en silence dessus, et son filet de secours
// (img.onerror renvoyant le dataURL HEIC brut tel quel) produisait une "photo" totalement
// inutilisable ailleurs que sur Safari (bug rapporté le 07/09/2026 : "je n'arrive pas à
// importer une photo format .heic"). heic2any (bibliothèque JS pure, chargée à la demande
// depuis un CDN comme les widgets Twitter/Instagram plus haut) convertit d'abord en JPEG.
function isHeicFile(file) {
    const name = (file.name || '').toLowerCase();
    return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
}
let _heic2anyLoadPromise = null;
function loadHeic2AnyScriptOnce() {
    if (window.heic2any) return Promise.resolve();
    if (_heic2anyLoadPromise) return _heic2anyLoadPromise;
    _heic2anyLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/heic2any/dist/heic2any.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('heic2any failed to load'));
        document.body.appendChild(s);
    });
    return _heic2anyLoadPromise;
}
// Convertit un fichier photo (HEIC compris) en dataURL JPEG redimensionnée — utilisée aussi
// bien ici que, potentiellement, par tout futur champ d'upload de photo sur ce site.
async function fileToResizedDataUrl(file, maxSize) {
    let blob = file;
    if (isHeicFile(file)) {
        await loadHeic2AnyScriptOnce();
        if (!window.heic2any) throw new Error('heic2any unavailable');
        const converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
        blob = Array.isArray(converted) ? converted[0] : converted;
    }
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(blob);
    });
    return typeof resizeTripCoverDataUrl === 'function' ? resizeTripCoverDataUrl(dataUrl, maxSize) : dataUrl;
}

// Import direct depuis la galerie pour la photo d'en-tête (demande du 07/09/2026 : ce
// modal "crayon" n'avait jusqu'ici aucun champ photo du tout) — pas de Firebase Storage sur
// ce site 100% statique, donc redimensionnée/compressée côté client en dataURL, même
// technique que la photo de couverture d'un voyage (resizeTripCoverDataUrl, voir plus haut)
// et que l'upload équivalent dans admin.html. Un champ URL est proposé EN PLUS (demande du
// 07/09/2026) : le champ modifié EN DERNIER gagne — remplir l'URL vide le champ importé et
// inversement, jamais les deux en même temps (voir updateLocationEditPhotoPreview).
// Écouteurs attachés une seule fois : le modal n'est créé qu'une fois par
// ensureLocationEditModal (dataset.wired protège d'un double upload par fichier choisi si
// jamais cette fonction était rappelée).
let locationEditPendingImg = null; // dataURL d'une photo tout juste importée, ou null
let locationEditImgTouched = false; // true dès que l'URL ou l'upload a été modifié cette session
function updateLocationEditPhotoPreview(src) {
    const preview = document.getElementById('location-edit-photo-preview');
    if (src) { preview.style.display = 'block'; preview.querySelector('img').src = src; }
    else { preview.style.display = 'none'; preview.querySelector('img').src = ''; }
}
function wireLocationEditPhotoInputOnce(modal) {
    const btn = modal.querySelector('#location-edit-photo-upload-btn');
    const input = modal.querySelector('#location-edit-photo-file-input');
    const urlInput = modal.querySelector('#location-edit-photo-url');
    const errorEl = modal.querySelector('#location-edit-photo-error');
    if (!btn || !input || input.dataset.wired) return;
    input.dataset.wired = '1';
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        errorEl.classList.add('hidden');
        btn.disabled = true;
        try {
            const resized = await fileToResizedDataUrl(file, 1200);
            locationEditPendingImg = resized;
            locationEditImgTouched = true;
            if (urlInput) urlInput.value = '';
            updateLocationEditPhotoPreview(resized);
            document.getElementById('location-edit-photo-name').textContent = file.name;
        } catch (err) {
            console.warn('Import de la photo échoué :', err);
            errorEl.textContent = isHeicFile(file)
                ? "Couldn't convert this HEIC photo. Try exporting it as JPEG first, or paste a Photo URL instead."
                : "Couldn't read this photo. Try a different file, or paste a Photo URL instead.";
            errorEl.classList.remove('hidden');
        }
        btn.disabled = false;
    });
    if (urlInput) {
        urlInput.addEventListener('input', () => {
            const val = urlInput.value.trim();
            locationEditPendingImg = val || null;
            locationEditImgTouched = true;
            document.getElementById('location-edit-photo-name').textContent = '';
            updateLocationEditPhotoPreview(val || null);
        });
    }
}

let locationEditCurrentId = null;
let locationEditExistingFullDescription = {};
let locationEditExistingImg = '';
let locationEditExtraWidgets = {};
window.openLocationEditModal = async function (locId) {
    if (!window.__isAdminUser || locId === null || locId === undefined) return;
    const loc = celebLocations.find(l => l.id === locId);
    if (!loc) return;
    locationEditCurrentId = locId;

    const modal = ensureLocationEditModal();
    document.getElementById('location-edit-title').textContent = `Edit — ${loc.name}`;
    ['youtube', 'tweet', 'instagram', 'facebook', 'tiktok'].forEach(k => document.getElementById(`location-edit-${k}-error`).classList.add('hidden'));
    document.getElementById('location-edit-photo-error').classList.add('hidden');
    const resultEl = document.getElementById('location-edit-result');
    resultEl.classList.add('hidden');
    modal.classList.remove('hidden');

    // Pré-remplit d'abord avec les données locales (immédiat), puis tente une lecture
    // Firestore qui, si elle répond, remplace le pré-remplissage par la version
    // réellement affichée aux visiteurs (même logique que openDetailsPanel).
    const fillForm = (data) => {
        document.getElementById('location-edit-story').value = htmlParagraphsToPlainText(getLocText(data.fullDescription));
        document.getElementById('location-edit-youtube').value = data.ytId ? `https://www.youtube.com/watch?v=${data.ytId}` : '';
        document.getElementById('location-edit-tweet').value = data.tweetUrl || '';
        document.getElementById('location-edit-instagram').value = data.instagramUrl || '';
        document.getElementById('location-edit-facebook').value = data.facebookUrl || '';
        document.getElementById('location-edit-tiktok').value = data.tiktokUrl || '';
        document.getElementById('location-edit-group').value = data.group || '';
        document.getElementById('location-edit-member').value = data.member || '';
        document.getElementById('location-edit-country').value = data.country || '';
        document.getElementById('location-edit-city').value = data.city || '';
        document.getElementById('location-edit-year').value = data.year || '';
        locationEditExistingFullDescription = data.fullDescription || {};
        locationEditExistingImg = data.img || '';
        locationEditPendingImg = null;
        locationEditImgTouched = false;
        document.getElementById('location-edit-photo-name').textContent = '';
        // Une dataURL importée ne va jamais dans le champ URL (illisible, énorme) — même
        // convention que admin.html pour ce même champ.
        document.getElementById('location-edit-photo-url').value = locationEditExistingImg.startsWith('data:') ? '' : locationEditExistingImg;
        updateLocationEditPhotoPreview(locationEditExistingImg || null);
        // Liens supplémentaires par réseau (demande du 11/09/2026, "+") — voir la même
        // logique côté admin.html (fiches de review/édition).
        if (typeof window.createMultiUrlField === 'function') {
            ['tweet', 'instagram', 'facebook', 'tiktok'].forEach(k => {
                const el = document.getElementById(`location-edit-${k}-extra`);
                if (el) locationEditExtraWidgets[k + 'Urls'] = window.createMultiUrlField(el, { values: data[k + 'Urls'] || [], placeholder: `Additional ${k.charAt(0).toUpperCase() + k.slice(1)} URL`, fieldStyle: "width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 12px; font-size:12.5px; font-family:'Poppins',sans-serif;" });
            });
        }
    };
    fillForm(loc);

    if (typeof window.fetchLocationContent === 'function') {
        const remote = await window.fetchLocationContent(locId);
        if (remote && locationEditCurrentId === locId) fillForm(Object.assign({}, loc, remote));
    }

    const saveBtn = document.getElementById('location-edit-save-btn');
    saveBtn.onclick = () => saveLocationEdit(locId, modal);

    const deleteBtn = document.getElementById('location-edit-delete-btn');
    deleteBtn.onclick = () => deleteLocationFromEditModal(locId, modal);
};

async function deleteLocationFromEditModal(locId, modal) {
    const loc = celebLocations.find(l => l.id === locId);
    if (!loc) return;
    if (!window.confirm(`Remove "${loc.name}" from the map? This can be undone later from admin.html.`)) return;
    const deleteBtn = document.getElementById('location-edit-delete-btn');
    deleteBtn.disabled = true;
    const res = await window.adminSetLocationHidden(locId, true);
    if (res && res.success) {
        modal.classList.add('hidden');
        if (typeof window.closeDetailsPanel === 'function') window.closeDetailsPanel();
        if (typeof renderLocations === 'function') renderLocations(true);
    } else {
        window.alert('Could not delete this location. Please try again.');
        deleteBtn.disabled = false;
    }
}

async function saveLocationEdit(locId, modal) {
    const saveBtn = document.getElementById('location-edit-save-btn');
    const resultEl = document.getElementById('location-edit-result');
    saveBtn.disabled = true;

    const storyText = document.getElementById('location-edit-story').value;
    const youtubeVal = document.getElementById('location-edit-youtube').value.trim();
    const tweetVal = document.getElementById('location-edit-tweet').value.trim();
    const instagramVal = document.getElementById('location-edit-instagram').value.trim();
    const facebookVal = document.getElementById('location-edit-facebook').value.trim();
    const tiktokVal = document.getElementById('location-edit-tiktok').value.trim();
    const groupVal = document.getElementById('location-edit-group').value.trim();
    const memberVal = document.getElementById('location-edit-member').value.trim();
    const countryVal = document.getElementById('location-edit-country').value.trim();
    const cityVal = document.getElementById('location-edit-city').value.trim();
    const yearVal = document.getElementById('location-edit-year').value.trim();

    let hasError = false;
    const checkField = (val, extracted, errId) => {
        const errEl = document.getElementById(errId);
        if (val && !extracted) { errEl.classList.remove('hidden'); hasError = true; }
        else errEl.classList.add('hidden');
    };
    const ytId = youtubeVal ? extractYouTubeIdForEdit(youtubeVal) : null;
    checkField(youtubeVal, ytId, 'location-edit-youtube-error');
    const tweetUrl = tweetVal ? extractTweetUrlForEdit(tweetVal) : null;
    checkField(tweetVal, tweetUrl, 'location-edit-tweet-error');
    const instagramUrl = instagramVal ? extractSocialUrlForEdit(instagramVal, 'instagram\\.com') : null;
    checkField(instagramVal, instagramUrl, 'location-edit-instagram-error');
    const facebookUrl = facebookVal ? extractSocialUrlForEdit(facebookVal, 'facebook\\.com') : null;
    checkField(facebookVal, facebookUrl, 'location-edit-facebook-error');
    const tiktokUrl = tiktokVal ? extractSocialUrlForEdit(tiktokVal, 'tiktok\\.com') : null;
    checkField(tiktokVal, tiktokUrl, 'location-edit-tiktok-error');

    const extraValidators = {
        tweetUrls: extractTweetUrlForEdit,
        instagramUrls: (v) => extractSocialUrlForEdit(v, 'instagram\\.com'),
        facebookUrls: (v) => extractSocialUrlForEdit(v, 'facebook\\.com'),
        tiktokUrls: (v) => extractSocialUrlForEdit(v, 'tiktok\\.com')
    };
    const extraCollected = {};
    Object.keys(locationEditExtraWidgets).forEach(field => {
        const { values, hasError: extraErr } = locationEditExtraWidgets[field].collect(extraValidators[field]);
        if (extraErr) hasError = true; else extraCollected[field] = values;
    });

    if (hasError) { saveBtn.disabled = false; return; }

    // Ne remplace QUE la clé "en" de fullDescription, jamais les autres langues déjà
    // traduites (locationEditExistingFullDescription posé par openLocationEditModal).
    const fullDescription = Object.assign({}, locationEditExistingFullDescription, { en: plainTextToHtmlParagraphs(storyText) });
    const fields = Object.assign({
        fullDescription,
        ytId: ytId || '',
        tweetUrl: tweetUrl || '',
        instagramUrl: instagramUrl || '',
        facebookUrl: facebookUrl || '',
        tiktokUrl: tiktokUrl || ''
    }, extraCollected);
    // Priorité de la photo d'en-tête (demande du 07/09/2026) : URL ou import — tous deux
    // suivis via locationEditPendingImg/locationEditImgTouched (voir
    // wireLocationEditPhotoInputOnce), le dernier des deux champs modifié gagnant — sinon,
    // si ni l'un ni l'autre n'a jamais été renseigné ET qu'une vidéo YouTube est indiquée,
    // repli automatique sur sa vignette (même convention que admin.html à la création
    // d'une nouvelle fiche) ; sinon, on ne touche pas au champ existant.
    if (locationEditImgTouched) {
        fields.img = locationEditPendingImg || '';
    } else if (!locationEditExistingImg && ytId) {
        fields.img = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }

    // group/member/country/city/year : hors de locationContent (voir la note dans
    // ensureLocationEditModal) — écrits dans locationSkeletonOverrides via un second appel,
    // uniquement pour les champs réellement remplis (un champ laissé vide ne doit pas
    // écraser la valeur codée en dur dans celebLocations).
    const skeletonFields = {};
    if (groupVal) skeletonFields.group = groupVal;
    if (memberVal) skeletonFields.member = memberVal;
    if (countryVal) skeletonFields.country = countryVal;
    if (cityVal) skeletonFields.city = cityVal;
    if (yearVal) skeletonFields.year = yearVal;
    const hasSkeletonChanges = Object.keys(skeletonFields).length > 0;

    const res = await window.adminUpdateLocationContent(locId, fields);
    const skeletonRes = (hasSkeletonChanges && typeof window.adminUpdateLocationSkeleton === 'function')
        ? await window.adminUpdateLocationSkeleton(locId, skeletonFields)
        : { success: true };
    resultEl.classList.remove('hidden');
    if (res.success && skeletonRes.success) {
        resultEl.textContent = '✓ Saved.';
        resultEl.style.color = '#10b981';
        // Reflète immédiatement le changement dans la fiche déjà ouverte, sans recharger
        // la page ni attendre le prochain fetchLocationContent().
        const loc = celebLocations.find(l => l.id === locId);
        if (loc) {
            Object.assign(loc, fields, skeletonFields);
            if (currentLocationIdForMemory === locId) renderLocationRichContent(loc);
            // group/city/country affectent aussi la liste/les marqueurs (pas seulement le
            // panneau de détail ouvert) — même convention que adminSetLocationHidden.
            if (hasSkeletonChanges && typeof renderLocations === 'function') renderLocations(true);
        }
        setTimeout(() => modal.classList.add('hidden'), 900);
    } else {
        resultEl.textContent = 'Failed: ' + (res.code || skeletonRes.code);
        resultEl.style.color = '#ef4444';
    }
    saveBtn.disabled = false;
}

// Bannière en haut de la fiche lieu — extraite pour être rappelable une seconde fois une
// fois la lecture Firestore résolue (voir l'appel à fetchLocationContent() plus bas), sans
// quoi une photo d'en-tête changée depuis le modal "crayon" (admin.html) restait invisible
// tant qu'on n'avait pas rechargé complètement la page (bug rapporté le 07/09/2026).
// `loc.img` (URL collée OU photo importée) est désormais TOUJOURS prioritaire sur la
// vignette YouTube automatique plutôt que l'inverse — avant ce correctif, un ytId présent
// (le cas de la quasi-totalité des lieux de ce site) faisait ignorer purement et simplement
// tout changement du champ photo, quoi qu'on y mette.
function renderLocationHeroBg(loc) {
    const heroBg = document.getElementById('detail-hero-bg');
    if (!heroBg) return;
    const bgImg = loc.img || (loc.ytId ? `https://img.youtube.com/vi/${loc.ytId}/maxresdefault.jpg` : '');
    heroBg.style.backgroundImage = `linear-gradient(180deg, rgba(20,16,30,.15) 0%, rgba(20,16,30,.75) 100%), url('${bgImg}')`;
}

window.openDetailsPanel = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;

    // Mur de paiement : 3 fiches lieu différentes consultables gratuitement (comptées
    // une seule fois par lieu, pas par clic — revoir un lieu déjà vu ne consomme rien),
    // au-delà : paywall plutôt que la fiche. Voir hasGuidePass()/getViewedLocationIds()
    // plus haut — jamais de blocage lié à un groupe/artiste précis.
    if (!hasGuidePass()) {
        const viewed = getViewedLocationIds();
        if (!viewed.includes(id)) {
            if (viewed.length >= FREE_LOCATION_VIEW_LIMIT) {
                window.__pendingPaywallLocId = id;
                window.openGuidePaywallModal();
                updateFreeViewsCounter();
                return;
            }
            viewed.push(id);
            localStorage.setItem('viewedLocationIds', JSON.stringify(viewed));
            if (typeof window.syncUserData === 'function') window.syncUserData({ viewedLocationIds: viewed });
            updateFreeViewsCounter();
        }
    }

    currentLocationIdForMemory = loc.id;
    highlightSelectedLocationMarker(loc);
    if (typeof updateLocVisitorsBar === 'function') updateLocVisitorsBar(loc);

    renderLocationHeroBg(loc);

    const badge = document.getElementById('detail-badge');
    if(badge) badge.textContent = `${loc.group} · ${getCatName(loc.category)}`;

    const dTitle = document.getElementById('details-title');
    if(dTitle) dTitle.textContent = loc.name;

    const dSub = document.getElementById('details-location-sub');
    if(dSub) dSub.textContent = `${loc.city}, ${loc.country}`;
    
    renderLocationRichContent(loc);

    // Étape 1 de la migration vers Firestore (voir fetchLocationContent() dans
    // firebase-init.js) : le rendu ci-dessus utilise déjà les données locales de
    // script.js (aucun changement de comportement, aucun délai), puis on tente EN PLUS
    // une lecture Firestore qui, si elle répond, complète/remplace ce rendu avec une
    // version plus à jour — sans jamais bloquer ni faire clignoter la fiche pour les
    // lieux qui n'ont pas encore de document Firestore. Le garde-fou sur
    // currentLocationIdForMemory évite d'écraser la fiche par une réponse tardive si la
    // personne a entre-temps cliqué sur un AUTRE lieu.
    if (typeof window.fetchLocationContent === 'function') {
        window.fetchLocationContent(id).then(remote => {
            if (remote && currentLocationIdForMemory === id) {
                const merged = Object.assign({}, loc, remote);
                renderLocationRichContent(merged);
                // La bannière est posée plus haut de façon synchrone, à partir des seules
                // données locales de script.js — sans ce second appel, un `img` changé
                // depuis le modal "crayon" (admin.html) n'apparaissait jamais tant qu'on
                // n'avait pas complètement rechargé la page, malgré une lecture Firestore
                // qui répondait pourtant correctement (bug rapporté le 07/09/2026).
                renderLocationHeroBg(merged);
            }
        });
    }

    const wishlistStatIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-.5-2 2 1 3.5 3.5 3.5 6a7 7 0 0 1-14 0c0-5 3-6 5-11z"></path></svg>`;
    const wishlistStatBox = document.getElementById('details-wishlist-stat');
    if (wishlistStatBox) {
        const pct = wishlistPercentForLocation(loc.id);
        if (pct != null) {
            wishlistStatBox.innerHTML = `<span>${wishlistStatIcon}</span><span>${t('wishlistStat').replace('{pct}', pct)}</span>`;
            wishlistStatBox.classList.remove('hidden');
        } else {
            wishlistStatBox.classList.add('hidden');
        }
    }

    // Pile d'avatars + compteur plutôt qu'une liste de pseudos (demande du 06/09/2026) :
    // même palette de couleurs déterministe que renderTripBuddiesAvatars() (basée sur la
    // position dans la liste, pas sur l'uid — l'ordre de myFriendsList étant stable pour
    // une session donnée, la couleur d'un ami reste cohérente d'une fiche lieu à l'autre).
    const friendVisitBox = document.getElementById('details-friend-visits');
    if (friendVisitBox) {
        const visitors = friendsWhoVisited(loc.id);
        if (visitors.length > 0) {
            const palette = ['#D42759', '#8B5CF6', '#F06090', '#10b981', '#3b82f6', '#f59e0b'];
            const shown = visitors.slice(0, 4);
            const extra = visitors.length - shown.length;
            const avatarsHtml = shown.map((f, i) => `<div class="friend-visit-avatar" style="background:${palette[i % palette.length]}; cursor:pointer;" title="${escapeHtml(f.username)}" onclick="event.stopPropagation(); window.location.href='profile.html?uid=' + encodeURIComponent('${f.uid}')">${escapeHtml((f.username || '?').charAt(0).toUpperCase())}</div>`).join('')
                + (extra > 0 ? `<div class="friend-visit-avatar friend-visit-avatar-more" title="${extra} more">+${extra}</div>` : '');
            const label = visitors.length === 1 ? t('friendsVisitedStatOne') : t('friendsVisitedStat').replace('{count}', visitors.length);
            friendVisitBox.innerHTML = `<div class="friend-visit-avatars">${avatarsHtml}</div><span>${label}</span>`;
            friendVisitBox.classList.remove('hidden');
        } else {
            friendVisitBox.classList.add('hidden');
        }
    }

    const dGroup = document.getElementById('details-group');
    if(dGroup) dGroup.textContent = loc.group;

    const dMember = document.getElementById('details-member');
    if(dMember) dMember.textContent = loc.member === "All" ? "All" : loc.member;
    
    const dCountry = document.getElementById('details-country');
    if(dCountry) dCountry.textContent = loc.country;
    
    const dCity = document.getElementById('details-city');
    if(dCity) dCity.textContent = loc.city;
    
    const dAddr = document.getElementById('details-full-address');
    if(dAddr) dAddr.textContent = loc.address;
    
    const dDate = document.getElementById('details-date');
    if(dDate) dDate.textContent = loc.year;

    const dEpi = document.getElementById('details-episode');
    const dEpiCont = document.getElementById('details-episode-container');
    if (dEpi && dEpiCont) { if(loc.episode) { dEpi.textContent = loc.episode; dEpiCont.style.display = 'inline'; } else { dEpiCont.style.display = 'none'; } }

    const mapLink = document.getElementById('details-map-link');
    if(mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    const vCheck = document.getElementById('details-visited');
    const memoryDropdown = document.getElementById('memory-dropdown');
    const tabBtnVisit = document.getElementById('tab-btn-visit');
    
    if(vCheck) {
        let vList = getVisitedLocs();
        let rawEntry = vList.find(v => v.id === loc.id || v === loc.id);
        let memoryData = rawEntry ? normalizeVisitEntry(rawEntry) : null;
        
        vCheck.checked = !!memoryData;
        
        if(vCheck.checked && memoryData && memoryData.visits.length > 0) {
            tabBtnVisit.classList.remove('hidden');
            memoryDropdown.classList.remove('open');
            window.renderVisitsList(memoryData.visits);
        } else {
            tabBtnVisit.classList.add('hidden');
            memoryDropdown.classList.remove('open');
        }

        window.refreshLocationRating(loc.id);

        vCheck.onchange = function() {
            let list = getVisitedLocs();
            if(this.checked) {
                let idx = list.findIndex(v => (v.id === loc.id || v === loc.id));
                if(idx === -1) {
                    list.push({ id: loc.id, visits: [] });
                } else {
                    list[idx] = normalizeVisitEntry(list[idx]);
                }
                localStorage.setItem('visitedLocs', JSON.stringify(list));
                syncVisited(list);
                openMemoryEditor(null); // ouvre le formulaire pour la première visite
            } else {
                // On retire la contribution de toutes les visites notées de CET utilisateur
                // à la moyenne communautaire avant de les supprimer localement.
                const removedEntry = list.find(v => (v.id === loc.id || v === loc.id));
                const removedVisits = removedEntry ? normalizeVisitEntry(removedEntry).visits : [];
                const hasAnyRating = removedVisits.some(v => v.rating > 0 || v.ratingFood != null || v.ratingValue != null);
                if (hasAnyRating) {
                    applyCommunityRatingDelta(loc.id, buildRemovalDeltas(removedVisits));
                }

                list = list.filter(v => v.id !== loc.id && v !== loc.id);
                memoryDropdown.classList.remove('open');
                tabBtnVisit.classList.add('hidden');

                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.querySelector('.tab-btn[data-tab="info"]').classList.add('active');
                document.getElementById('tab-info').classList.add('active');

                localStorage.setItem('visitedLocs', JSON.stringify(list));
                syncVisited(list);
                window.refreshLocationRating(loc.id);
            }
            if(map) renderLocations(true);
        };
    }

    const wCheck = document.getElementById('details-wishlist');
    const tripBox = document.getElementById('trip-box');
    
    if(wCheck) {
        let wList = getWishlistLocs();
        let wishData = wList.find(w => w.id === loc.id || w === loc.id);
        
        wCheck.checked = !!wishData;
        
        if(wCheck.checked) {
            tripBox.classList.add('open');
            populateTripSelectOptions(wishData && wishData.tripId);
        } else {
            tripBox.classList.remove('open');
            window.cancelNewTrip();
        }
    }

    // MASQUER LES ONGLETS EXPLORE/ITINERARY ET LE BLOC PRINCIPAL
    const topTabs = document.querySelector('.sidebar-top-tabs');
    if(topTabs) topTabs.style.display = 'none';

    const mainSidebar = document.getElementById('sidebar-main');
    if(mainSidebar) mainSidebar.style.display = 'none';
    
    const detailsSidebar = document.getElementById('sidebar-details');
    if(detailsSidebar) {
        detailsSidebar.classList.remove('hidden');
        detailsSidebar.style.display = 'flex';
    }
    
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) { sidebar.classList.add('open'); sidebar.classList.add('expanded'); }
    
    setTimeout(() => { if(map) map.invalidateSize(); }, 450);
};

// Catégories pour lesquelles on demande, en plus de la note générale, une note de
// qualité de la nourriture et de rapport qualité/prix (demande du 06/09/2026).
const FOOD_RELATED_CATEGORIES = ['Cafe', 'Restaurants'];

// Widget d'étoiles générique : plusieurs coexistent maintenant dans le formulaire "I
// visited this place" (note générale + food/valeur pour les Cafe/Restaurants), tous
// pilotés par la même logique de coloration plutôt que trois copies quasi identiques.
function setStarsGeneric(containerId, inputId, val) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = val;
    document.querySelectorAll('#' + containerId + ' .star').forEach((star, index) => {
        if (index < val) {
            star.setAttribute('fill', '#D42759');
            star.setAttribute('stroke', '#D42759');
        } else {
            star.setAttribute('fill', '#e2e8f0');
            star.setAttribute('stroke', '#e2e8f0');
        }
    });
}
window.setStars = function(val) { setStarsGeneric('memory-stars', 'memory-rating-val', val); };
window.setFoodStars = function(val) { setStarsGeneric('memory-food-stars', 'memory-food-rating-val', val); };
window.setValueStars = function(val) { setStarsGeneric('memory-value-stars', 'memory-value-rating-val', val); };
window.setAccessibilityStars = function(val) { setStarsGeneric('memory-accessibility-stars', 'memory-accessibility-rating-val', val); };
window.setSiteQualityStars = function(val) { setStarsGeneric('memory-sitequality-stars', 'memory-sitequality-rating-val', val); };
[
    ['memory-stars', window.setStars],
    ['memory-food-stars', window.setFoodStars],
    ['memory-value-stars', window.setValueStars],
    ['memory-accessibility-stars', window.setAccessibilityStars],
    ['memory-sitequality-stars', window.setSiteQualityStars],
].forEach(([containerId, setter]) => {
    document.querySelectorAll('#' + containerId + ' .star').forEach(star => {
        star.addEventListener('click', function() { setter(parseInt(this.getAttribute('data-val'))); });
    });
});

// editingVisitIndex : null = on ajoute une NOUVELLE visite ; un nombre = on modifie
// la visite existante à cet index dans le tableau "visits" du lieu courant.
let editingVisitIndex = null;

// Redimensionne/compresse une photo (via canvas) avant de l'enregistrer, comme pour la
// photo de profil (account.html) : une photo de téléphone à pleine résolution
// dépasserait largement la limite de 1 Mo par champ Firestore.
function resizeImageDataUrl(dataUrl, maxSize) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Photo en attente de sauvegarde pour la visite en cours d'édition (data URL déjà
// redimensionnée), remise à zéro à chaque ouverture du formulaire.
let pendingMemoryPhoto = null;

const memoryPhotoInput = document.getElementById('memory-photo-input');
if (memoryPhotoInput) {
    memoryPhotoInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        // fileToResizedDataUrl() (voir plus haut, déjà utilisée par l'upload photo de
        // admin.html) gère le format .heic/.heif — celui par défaut de l'appareil photo
        // iPhone — que l'ancien resizeImageDataUrl() ne savait pas décoder (Image()/canvas
        // échouent dessus en silence et renvoyaient le dataURL HEIC BRUT, plusieurs Mo,
        // non compressé). C'est ce qui causait "Your visit was saved, but publishing the
        // public review failed" pour toute photo publiée depuis un iPhone (bug rapporté le
        // 08/09/2026, compte "josyine") : le document dépassait la limite de 1 Mo de
        // Firestore au moment d'écrire l'avis public dans locationReviews.
        try {
            pendingMemoryPhoto = await fileToResizedDataUrl(file, 700);
            const preview = document.getElementById('memory-photo-preview');
            const previewImg = document.getElementById('memory-photo-preview-img');
            const removeBtn = document.getElementById('memory-photo-remove');
            if (previewImg) previewImg.src = pendingMemoryPhoto;
            if (preview) preview.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.remove('hidden');
        } catch (err) {
            console.warn('Import de la photo échoué :', err);
            pendingMemoryPhoto = null;
            alert(currentLang === 'fr'
                ? "Impossible d'importer cette photo. Essayez un autre fichier (format JPEG/PNG)."
                : "Couldn't import this photo. Try a different file (JPEG/PNG format).");
        }
        e.target.value = '';
    });
}
const memoryPhotoRemoveBtn = document.getElementById('memory-photo-remove');
if (memoryPhotoRemoveBtn) {
    memoryPhotoRemoveBtn.addEventListener('click', () => {
        pendingMemoryPhoto = null;
        const preview = document.getElementById('memory-photo-preview');
        const removeBtn = document.getElementById('memory-photo-remove');
        const input = document.getElementById('memory-photo-input');
        if (preview) preview.classList.add('hidden');
        if (removeBtn) removeBtn.classList.add('hidden');
        if (input) input.value = '';
    });
}

// Ouvre le formulaire (étoiles / date / notes / photo / public) pour ajouter une
// nouvelle visite (visitIndex = null) ou modifier une visite existante (visitIndex =
// un nombre).
function openMemoryEditor(visitIndex) {
    editingVisitIndex = visitIndex;
    const dropdown = document.getElementById('memory-dropdown');
    pendingMemoryPhoto = null;
    const preview = document.getElementById('memory-photo-preview');
    const removeBtn = document.getElementById('memory-photo-remove');
    const photoInput = document.getElementById('memory-photo-input');
    const publicCheck = document.getElementById('memory-public-check');
    if (preview) preview.classList.add('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
    if (photoInput) photoInput.value = '';
    if (publicCheck) publicCheck.checked = false;

    const loc = celebLocations.find(l => l.id === currentLocationIdForMemory);
    const isFoodCategory = !!(loc && FOOD_RELATED_CATEGORIES.includes(loc.category));
    const foodBlock = document.getElementById('memory-food-rating-block');
    if (foodBlock) foodBlock.classList.toggle('hidden', !isFoodCategory);

    if (visitIndex === null) {
        // Nouvelle visite : date du jour, note vierge, 4 étoiles par défaut.
        document.getElementById('memory-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('memory-notes').value = '';
        window.setStars(4);
        window.setValueStars(4);
        window.setAccessibilityStars(4);
        window.setSiteQualityStars(4);
        if (isFoodCategory) window.setFoodStars(4);
    } else {
        let list = getVisitedLocs();
        let entry = list.find(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);
        entry = entry ? normalizeVisitEntry(entry) : null;
        const visit = entry && entry.visits[visitIndex];
        if (visit) {
            document.getElementById('memory-date').value = visit.date || '';
            document.getElementById('memory-notes').value = visit.notes || '';
            window.setStars(visit.rating || 4);
            window.setValueStars(visit.ratingValue || 4);
            window.setAccessibilityStars(visit.ratingAccessibility || 4);
            window.setSiteQualityStars(visit.ratingSiteQuality || 4);
            if (isFoodCategory) window.setFoodStars(visit.ratingFood || 4);
            if (visit.photo) {
                pendingMemoryPhoto = visit.photo;
                const previewImg = document.getElementById('memory-photo-preview-img');
                if (previewImg) previewImg.src = visit.photo;
                if (preview) preview.classList.remove('hidden');
                if (removeBtn) removeBtn.classList.remove('hidden');
            }
            if (publicCheck) publicCheck.checked = !!visit.isPublic;
        }
    }

    document.querySelector('.tab-btn[data-tab="info"]').click();
    dropdown.classList.add('open');
}
window.openMemoryEditor = openMemoryEditor;

const saveMemoryBtn = document.getElementById('save-memory-btn');
if(saveMemoryBtn) {
    saveMemoryBtn.addEventListener('click', async () => {
        const rating = Number(document.getElementById('memory-rating-val').value);
        const date = document.getElementById('memory-date').value;
        const notes = document.getElementById('memory-notes').value;
        const photo = pendingMemoryPhoto || null;
        const isPublic = !!(document.getElementById('memory-public-check') && document.getElementById('memory-public-check').checked);
        const loc = celebLocations.find(l => l.id === currentLocationIdForMemory);
        const isFoodCategory = !!(loc && FOOD_RELATED_CATEGORIES.includes(loc.category));
        const ratingFood = isFoodCategory ? Number(document.getElementById('memory-food-rating-val').value) : null;
        const ratingValue = Number(document.getElementById('memory-value-rating-val').value);
        const ratingAccessibility = Number(document.getElementById('memory-accessibility-rating-val').value);
        const ratingSiteQuality = Number(document.getElementById('memory-sitequality-rating-val').value);

        let list = getVisitedLocs();
        const idx = list.findIndex(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);

        if(idx !== -1) {
            list[idx] = normalizeVisitEntry(list[idx]);
            const visitData = { date, rating, notes, photo, isPublic, ratingValue, ratingAccessibility, ratingSiteQuality };
            if (ratingFood != null) visitData.ratingFood = ratingFood;

            // Nouvelle visite : la note s'ajoute intégralement à la moyenne communautaire.
            // Modification d'une visite existante : seule la différence avec l'ancienne
            // note compte (le nombre de visites, lui, ne change pas).
            if (editingVisitIndex === null) {
                list[idx].visits.push(visitData);
                applyCommunityRatingDelta(currentLocationIdForMemory, buildRatingDeltas(visitData, true));
            } else {
                const oldVisit = list[idx].visits[editingVisitIndex];
                list[idx].visits[editingVisitIndex] = visitData;
                applyCommunityRatingDelta(currentLocationIdForMemory, buildRatingDeltas(visitData, false, oldVisit));
            }

            localStorage.setItem('visitedLocs', JSON.stringify(list));
            syncVisited(list);

            // Avis public (voir setLocationReview()/deleteLocationReview() dans
            // firebase-init.js) : un seul avis public par personne et par lieu, dérivé
            // de CETTE visite (la plus récemment enregistrée avec la case cochée) —
            // publié/retiré/mis à jour à chaque sauvegarde selon l'état de la case.
            if (isPublic) {
                if (typeof window.setLocationReview === 'function') {
                    const publishResult = await window.setLocationReview(String(currentLocationIdForMemory), Object.assign({
                        rating, notes, photo, ratingValue, ratingAccessibility, ratingSiteQuality,
                        userName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
                        userPhoto: localStorage.getItem('userPhoto') || null,
                        locationName: loc ? loc.name : null, category: loc ? loc.category : null
                    }, ratingFood != null ? { ratingFood } : {}));
                    // Sans ça, un échec de publication (règles Firestore pas encore
                    // déployées, hors-ligne...) passait totalement inaperçu : la case
                    // "rendre public" restait cochée dans l'interface comme si tout
                    // s'était bien passé, alors que rien n'était réellement publié.
                    if (publishResult && !publishResult.success) {
                        alert(currentLang === 'fr'
                            ? "Votre visite a bien été enregistrée, mais la publication de l'avis public a échoué (problème de connexion ou de configuration). Réessayez plus tard."
                            : "Your visit was saved, but publishing the public review failed (connection or configuration issue). Please try again later.");
                    }
                }
            } else if (typeof window.deleteLocationReview === 'function') {
                window.deleteLocationReview(String(currentLocationIdForMemory));
            }

            document.getElementById('memory-dropdown').classList.remove('open');
            document.getElementById('tab-btn-visit').classList.remove('hidden');

            window.renderVisitsList(list[idx].visits);
            window.refreshLocationRating(currentLocationIdForMemory);
            document.getElementById('tab-btn-visit').click();
        }
    });
}

// Affiche la liste de toutes les visites d'un lieu (les plus récentes en premier),
// chacune avec son propre bouton "Edit", plus un bouton pour ajouter une nouvelle
// visite en bas de la liste.
window.renderVisitsList = function(visits) {
    const starSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#D42759" stroke="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const emptyStarSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#e2e8f0" stroke="#e2e8f0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const smallStarSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#D42759" stroke="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const smallEmptyStarSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#e2e8f0" stroke="#e2e8f0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const editSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    // Ligne "label + petites étoiles" pour une dimension de note optionnelle (food/value) —
    // absente du HTML si cette visite n'a pas cette dimension (lieux non Cafe/Restaurants).
    function dimensionRow(label, value) {
        if (value == null) return '';
        let stars = '';
        for (let i = 0; i < 5; i++) stars += (i < value) ? smallStarSvg : smallEmptyStarSvg;
        return `<div style="display:flex; align-items:center; gap:6px; margin-top:4px; font-size:10.5px; color:#64748b; font-weight:600;">${label} <span style="display:inline-flex; gap:2px;">${stars}</span></div>`;
    }

    // On garde une trace de l'index d'origine (dans le tableau non trié) pour que
    // "Edit"/"Supprimer" modifient bien la bonne visite, même une fois la liste triée à
    // l'affichage.
    const withIndex = visits.map((v, i) => ({ ...v, __idx: i }));
    withIndex.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const container = document.getElementById('visits-list');
    if (!container) return;
    container.innerHTML = '';

    withIndex.forEach(v => {
        let starsHtml = '';
        for (let i = 0; i < 5; i++) { starsHtml += (i < v.rating) ? starSvg : emptyStarSvg; }

        let formattedDate = v.date;
        if (v.date) {
            const d = new Date(v.date);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }

        const notesText = v.notes ? `"${v.notes}"` : (currentLang === 'fr' ? "Aucune note pour cette visite." : "No notes for this visit.");
        const editLabel = currentLang === 'fr' ? 'Modifier' : 'Edit memory';
        const deleteLabel = currentLang === 'fr' ? 'Supprimer cette visite' : 'Delete this visit';
        const publicLabel = currentLang === 'fr' ? 'Publique' : 'Public';
        const photoHtml = v.photo ? `<img src="${v.photo}" style="width:100%; max-height:160px; object-fit:cover; border-radius:8px; margin-top:10px; display:block;">` : '';
        const publicBadgeHtml = v.isPublic ? `<span style="display:inline-block; margin-left:8px; font-size:9.5px; font-weight:700; color:#10b981; background:#10b98118; padding:2px 8px; border-radius:100px; vertical-align:middle;">${publicLabel}</span>` : '';

        const card = document.createElement('div');
        card.className = 'memory-card';
        card.style.position = 'relative';
        card.innerHTML = `
            <div class="delete-memory-btn" data-idx="${v.__idx}" title="${deleteLabel}" style="position:absolute; top:10px; right:10px; width:22px; height:22px; border-radius:50%; background:#f1f5f9; color:#94a3b8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; line-height:1; font-weight:700;">&times;</div>
            <div class="memory-card-header">
                <div class="stars" style="pointer-events:none;">${starsHtml}</div>
                <div class="memory-date">${formattedDate || (currentLang === 'fr' ? 'Date inconnue' : 'Unknown date')}${publicBadgeHtml}</div>
            </div>
            ${dimensionRow(t('foodQualityRating'), v.ratingFood)}
            ${dimensionRow(t('valueForMoneyRating'), v.ratingValue)}
            ${dimensionRow(t('accessibilityRating'), v.ratingAccessibility)}
            ${dimensionRow(t('siteQualityRating'), v.ratingSiteQuality)}
            <div class="memory-notes">${notesText}</div>
            ${photoHtml}
            <button class="edit-memory-btn" data-idx="${v.__idx}" style="background:transparent; border:1.5px solid #cbd5e1; color:#64748b; font-size:11px; font-weight:700; padding:6px 12px; border-radius:100px; margin-top:20px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">${editSvg} ${editLabel}</button>
        `;
        card.querySelector('.edit-memory-btn').addEventListener('click', () => openMemoryEditor(v.__idx));
        card.querySelector('.delete-memory-btn').addEventListener('click', () => window.confirmDeleteVisit(v.__idx));
        container.appendChild(card);
    });
};

// Popup de confirmation générique "Supprimer cette visite ?" — injectée en JS (plutôt que
// dupliquée en HTML statique sur map.html ET visited.html/wishlist.html, qui partagent
// tous renderVisitsList) pour n'exister qu'une fois, peu importe la page.
function ensureDeleteVisitModal() {
    let modal = document.getElementById('delete-visit-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'delete-visit-modal';
    modal.className = 'modal hidden';
    modal.style.zIndex = '10500';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:380px; text-align:center;">
            <h3 style="margin-bottom:10px; color:#212832;" id="delete-visit-title">${currentLang === 'fr' ? 'Supprimer cette visite ?' : 'Delete this visit?'}</h3>
            <p style="font-size:13px; color:#64748b; margin-bottom:20px;" id="delete-visit-desc">${currentLang === 'fr' ? 'Cette action est définitive et ne peut pas être annulée.' : 'This action is permanent and cannot be undone.'}</p>
            <div style="display:flex; gap:10px;">
                <button class="gen-btn ghost" style="flex:1; justify-content:center;" id="delete-visit-cancel">${currentLang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button class="gen-btn" style="background:#ef4444; border-color:#ef4444; flex:1; justify-content:center;" id="delete-visit-confirm">${currentLang === 'fr' ? 'Supprimer' : 'Delete'}</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#delete-visit-cancel').addEventListener('click', () => modal.classList.add('hidden'));
    return modal;
}

let __pendingDeleteVisitIdx = null;
window.confirmDeleteVisit = function(idx) {
    __pendingDeleteVisitIdx = idx;
    const modal = ensureDeleteVisitModal();
    const titleEl = document.getElementById('delete-visit-title');
    const descEl = document.getElementById('delete-visit-desc');
    if (titleEl) titleEl.textContent = currentLang === 'fr' ? 'Supprimer cette visite ?' : 'Delete this visit?';
    if (descEl) descEl.textContent = currentLang === 'fr' ? 'Cette action est définitive et ne peut pas être annulée.' : 'This action is permanent and cannot be undone.';
    const confirmBtn = document.getElementById('delete-visit-confirm');
    confirmBtn.onclick = () => { window.deleteVisit(idx); modal.classList.add('hidden'); };
    modal.classList.remove('hidden');
};

// Supprime UNE visite (pas tout le lieu) : retire l'entrée du tableau "visits" du lieu
// actuellement affiché (currentLocationIdForMemory), retire sa contribution à la note
// communautaire, et décoche complètement "J'ai visité ce lieu" si c'était la dernière
// visite restante (repasse le lieu en "non visité" plutôt que de garder une case cochée
// sans aucune visite dessous, ce qui serait incohérent).
window.deleteVisit = function(idx) {
    let list = getVisitedLocs();
    const listIdx = list.findIndex(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);
    if (listIdx === -1) return;
    list[listIdx] = normalizeVisitEntry(list[listIdx]);
    const removed = list[listIdx].visits[idx];
    if (!removed) return;
    list[listIdx].visits.splice(idx, 1);
    applyCommunityRatingDelta(currentLocationIdForMemory, buildRemovalDeltas([removed]));

    if (list[listIdx].visits.length === 0) {
        list.splice(listIdx, 1);
    }
    localStorage.setItem('visitedLocs', JSON.stringify(list));
    syncVisited(list);

    const vCheck = document.getElementById('details-visited');
    const tabBtnVisit = document.getElementById('tab-btn-visit');
    const remaining = list.find(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);
    if (remaining) {
        window.renderVisitsList(normalizeVisitEntry(remaining).visits);
    } else {
        if (vCheck) vCheck.checked = false;
        if (tabBtnVisit) {
            tabBtnVisit.classList.add('hidden');
            const infoTabBtn = document.querySelector('.tab-btn[data-tab="info"]');
            if (infoTabBtn) infoTabBtn.click();
        }
    }
    window.refreshLocationRating(currentLocationIdForMemory);
    if (typeof window.refreshVisitedFromCloud === 'function') window.refreshVisitedFromCloud();
    // Supprimer la dernière visite peut faire repasser le lieu en "non visité" (voir plus
    // haut) : le marqueur carte doit refléter ça immédiatement (remplissage = visité).
    if (map) renderLocations(true);
};

const addVisitBtn = document.getElementById('add-visit-btn');
if (addVisitBtn) {
    addVisitBtn.addEventListener('click', () => openMemoryEditor(null));
}

// Onglet "Reviews" du détail d'un lieu : charge et affiche les avis PUBLICS laissés par
// d'autres utilisateurs (voir setLocationReview()/fetchLocationReviews() dans
// firebase-init.js) — chargé à la demande, au clic sur l'onglet plutôt qu'au chargement
// de la fiche, pour ne pas payer une lecture Firestore par lieu survolé.
// Nombre d'avis publics affiché en ce moment dans l'en-tête de l'onglet Reviews — gardé
// à part pour pouvoir juste re-formater le libellé (voir refreshReviewsHeaderLanguage)
// au changement de langue, sans re-déclencher une lecture Firestore.
let lastReviewsCount = 0;
window.refreshReviewsHeaderLanguage = function() {
    const countLabel = document.getElementById('reviews-count-label');
    if (countLabel) countLabel.textContent = t('reviewsCountLabel').replace('{n}', lastReviewsCount);
};

window.loadLocationReviews = async function(locationId) {
    const loadingEl = document.getElementById('reviews-loading');
    const emptyEl = document.getElementById('reviews-empty');
    const listEl = document.getElementById('reviews-list');
    const headerEl = document.getElementById('reviews-header');
    if (!listEl) return;
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (headerEl) headerEl.classList.add('hidden');
    listEl.innerHTML = '';

    const reviews = typeof window.fetchLocationReviews === 'function' ? await window.fetchLocationReviews(locationId) : [];
    if (loadingEl) loadingEl.classList.add('hidden');

    if (!reviews || reviews.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    // En-tête "N avis publics" + note moyenne : calculée à partir des avis publics
    // affichés eux-mêmes (pas de la moyenne communautaire globale, qui inclut aussi les
    // visites privées) pour que les deux chiffres restent toujours cohérents entre eux.
    if (headerEl) {
        const rated = reviews.filter(r => r.rating > 0);
        const avg = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : null;
        const avgBadge = document.getElementById('reviews-avg-badge');
        const avgValue = document.getElementById('reviews-avg-value');
        lastReviewsCount = reviews.length;
        window.refreshReviewsHeaderLanguage();
        if (avgBadge) avgBadge.classList.toggle('hidden', avg === null);
        if (avgValue && avg !== null) avgValue.textContent = avg.toFixed(1);
        headerEl.classList.remove('hidden');
    }

    const starSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#D42759" stroke="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const emptyStarSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#e2e8f0" stroke="#e2e8f0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const smallStarSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="#D42759" stroke="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const smallEmptyStarSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="#e2e8f0" stroke="#e2e8f0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    function reviewDimensionRow(label, value) {
        if (value == null) return '';
        let stars = '';
        for (let i = 0; i < 5; i++) stars += (i < value) ? smallStarSvg : smallEmptyStarSvg;
        return `<div style="display:flex; align-items:center; gap:6px; margin-top:3px; font-size:10px; color:#94a3b8; font-weight:600;">${label} <span style="display:inline-flex; gap:2px;">${stars}</span></div>`;
    }

    reviews
        .sort((a, b) => (b.updatedAt && b.updatedAt.seconds || 0) - (a.updatedAt && a.updatedAt.seconds || 0))
        .forEach(r => {
            let starsHtml = '';
            for (let i = 0; i < 5; i++) { starsHtml += (i < (r.rating || 0)) ? starSvg : emptyStarSvg; }
            const initial = (r.userName || 'A').trim().charAt(0).toUpperCase();
            const avatarHtml = r.userPhoto
                ? `<img src="${r.userPhoto}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">`
                : `<div style="width:32px; height:32px; border-radius:50%; background:#FCE7F0; color:#D42759; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px;">${initial}</div>`;
            const notesHtml = r.notes ? `<div class="memory-notes" style="margin-top:8px;">"${r.notes}"</div>` : '';
            const photoHtml = r.photo ? `<img src="${r.photo}" style="width:100%; max-height:160px; object-fit:cover; border-radius:8px; margin-top:10px; display:block;">` : '';

            const card = document.createElement('div');
            card.className = 'memory-card';
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    ${avatarHtml}
                    <div style="flex:1;">
                        <div style="font-size:12.5px; font-weight:700; color:#212832;">${r.userName || (currentLang === 'fr' ? 'ARMY' : 'ARMY')}</div>
                        <div class="stars" style="pointer-events:none; margin-top:2px;">${starsHtml}</div>
                        ${reviewDimensionRow(t('foodQualityRating'), r.ratingFood)}
                        ${reviewDimensionRow(t('valueForMoneyRating'), r.ratingValue)}
                        ${reviewDimensionRow(t('accessibilityRating'), r.ratingAccessibility)}
                        ${reviewDimensionRow(t('siteQualityRating'), r.ratingSiteQuality)}
                    </div>
                </div>
                ${notesHtml}
                ${photoHtml}
            `;
            listEl.appendChild(card);
        });
};

// Formulaire "Write your review" en bas de l'onglet Reviews : écrire ici directement
// (sans devoir d'abord passer par l'onglet "My Visit") crée/complète la même visite
// privée que celle de "My Visit" (voir openMemoryEditor/saveMemoryBtn plus haut) — les
// deux onglets restent une seule et même source de vérité, seule la présentation change.
window.setReviewComposeStars = function(val) {
    const ratingVal = document.getElementById('review-compose-rating-val');
    if (!ratingVal) return;
    ratingVal.value = val;
    document.querySelectorAll('#review-compose-stars .star').forEach((star, index) => {
        if (index < val) { star.setAttribute('fill', '#D42759'); star.setAttribute('stroke', '#D42759'); }
        else { star.setAttribute('fill', '#e2e8f0'); star.setAttribute('stroke', '#e2e8f0'); }
    });
};
document.querySelectorAll('#review-compose-stars .star').forEach(star => {
    star.addEventListener('click', function() { window.setReviewComposeStars(parseInt(this.getAttribute('data-val'))); });
});

window.postQuickReview = async function() {
    const notesEl = document.getElementById('review-compose-notes');
    const notes = notesEl ? notesEl.value.trim() : '';
    const rating = Number((document.getElementById('review-compose-rating-val') || {}).value) || 0;
    if (!notes && !rating) return;
    // Option "ajouter une photo" retirée du formulaire d'avis (demande du 13/09/2026) —
    // setLocationReview()/la visite elle-même acceptent toujours un champ `photo` (des avis
    // plus anciens en ont), donc null ici plutôt que supprimer le paramètre partout.
    const photo = null;
    const isPublic = !!(document.getElementById('review-compose-public-check') && document.getElementById('review-compose-public-check').checked);
    const date = new Date().toISOString().split('T')[0];
    const locId = currentLocationIdForMemory;
    if (locId === null || locId === undefined) return;

    let list = getVisitedLocs();
    let idx = list.findIndex(v => v.id === locId || v === locId);
    if (idx === -1) { list.push({ id: locId, visits: [] }); idx = list.length - 1; }
    list[idx] = normalizeVisitEntry(list[idx]);
    list[idx].visits.push({ date, rating, notes, photo, isPublic });
    applyCommunityRatingDelta(locId, { sum: rating, count: 1 });

    localStorage.setItem('visitedLocs', JSON.stringify(list));
    syncVisited(list);

    if (isPublic && typeof window.setLocationReview === 'function') {
        const quickReviewLoc = celebLocations.find(l => l.id === locId);
        const publishResult = await window.setLocationReview(String(locId), {
            rating, notes, photo,
            userName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
            userPhoto: localStorage.getItem('userPhoto') || null,
            locationName: quickReviewLoc ? quickReviewLoc.name : null, category: quickReviewLoc ? quickReviewLoc.category : null
        });
        if (publishResult && !publishResult.success) {
            alert(currentLang === 'fr'
                ? "Votre visite a bien été enregistrée, mais la publication de l'avis public a échoué (problème de connexion ou de configuration). Réessayez plus tard."
                : "Your visit was saved, but publishing the public review failed (connection or configuration issue). Please try again later.");
        }
    }

    const vCheck = document.getElementById('details-visited');
    if (vCheck) vCheck.checked = true;
    const tabBtnVisit = document.getElementById('tab-btn-visit');
    if (tabBtnVisit) tabBtnVisit.classList.remove('hidden');
    window.renderVisitsList(list[idx].visits);
    window.refreshLocationRating(locId);
    // Un avis rapide peut marquer le lieu comme visité pour la première fois (idx === -1
    // ci-dessus) : le marqueur carte doit refléter ça immédiatement (remplissage = visité).
    if (map) renderLocations(true);

    if (notesEl) notesEl.value = '';
    window.setReviewComposeStars(4);
    const publicCheck = document.getElementById('review-compose-public-check');
    if (publicCheck) publicCheck.checked = true;

    window.loadLocationReviews(locId);
};
const reviewComposePostBtn = document.getElementById('review-compose-post-btn');
if (reviewComposePostBtn) reviewComposePostBtn.addEventListener('click', () => window.postQuickReview());

window.closeDetailsPanel = function() {
    const dDetails = document.getElementById('sidebar-details');
    if(dDetails) {
        dDetails.classList.add('hidden');
        dDetails.style.display = 'none';
    }
    const visitorsBar = document.getElementById('loc-visitors-bar');
    if (visitorsBar) visitorsBar.classList.remove('open');
    const dMain = document.getElementById('sidebar-main');
    if(dMain) dMain.style.display = 'flex'; 
    
    const topTabs = document.querySelector('.sidebar-top-tabs');
    if(topTabs) topTabs.style.display = 'flex';

    // On retire aussi "open" (pas seulement "expanded") : sur mobile, ouvrir la fiche d'un
    // lieu force la sidebar en plein écran (voir openDetailsPanel plus haut) — sans ce
    // retrait, fermer la fiche laissait la sidebar bloquée en plein écran par-dessus la
    // carte (et, dans le guide de démo, par-dessus le menu profil des étapes suivantes).
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) { sidebar.classList.remove('expanded'); sidebar.classList.remove('open'); }

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    const tabInfo = document.querySelector('.tab-btn[data-tab="info"]');
    if(tabInfo) tabInfo.classList.add('active');
    const panelInfo = document.getElementById('tab-info');
    if(panelInfo) panelInfo.classList.add('active');
    
    setTimeout(() => { if(map) map.invalidateSize(); }, 450);
}

// ==========================================
// 7. POPUP LIEU PARTAGEE POUR visited.html ET wishlist.html
//    (reprend la charte graphique de map.html : marqueur coloré par
//    catégorie/groupe + carte CartoDB "light_all" + fiche d'infos complète)
// ==========================================
let popupMap = null;
let popupMarker = null;

// postContext (optionnel, demande du 09/09/2026) : rempli uniquement par les tuiles de
// l'onglet Photos de profile.html, pour afficher un en-tête "publication" façon réseau
// social (avatar/pseudo + like + légende) au-dessus des infos du lieu déjà existantes —
// {username, avatarColor, photo, caption, photoKey}. Tous les nouveaux éléments DOM
// qu'il alimente sont if(el)-gardés : absents sur les autres pages (map.html,
// visited.html...) qui partagent cette même modale, ils n'y ont simplement aucun effet.
window.openLocModal = function(id, postContext) {
    const loc = celebLocations.find(l => l.id == id);
    if(!loc) return;

    const modalTitle = document.getElementById('modal-title');
    const modalMeta = document.getElementById('modal-meta');
    const modalHero = document.getElementById('modal-hero');
    const modalDesc = document.getElementById('modal-desc');
    const modalMapLink = document.getElementById('modal-map-link');
    const modalMetaBox = document.getElementById('modal-meta-box');

    if(modalTitle) modalTitle.textContent = loc.name;
    if(modalMeta) modalMeta.textContent = `${loc.city}, ${loc.country} • ${getCatName(loc.category)}`;
    // La photo de la publication (si on vient d'une tuile de profile.html) prime sur
    // l'image générique du lieu, pour que le hero montre bien LA photo cliquée.
    const heroImgUrl = (postContext && postContext.photo) || loc.img || ('https://img.youtube.com/vi/' + loc.ytId + '/hqdefault.jpg');
    if(modalHero) modalHero.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.8), transparent), url('${heroImgUrl}')`;

    const modalPostHeader = document.getElementById('modal-post-header');
    const modalPostCaption = document.getElementById('modal-post-caption');
    if (modalPostHeader) {
        if (postContext) {
            modalPostHeader.classList.remove('hidden');
            const avatarEl = document.getElementById('modal-post-avatar');
            const usernameEl = document.getElementById('modal-post-username');
            if (avatarEl) {
                avatarEl.textContent = (postContext.username || 'U').charAt(0).toUpperCase();
                avatarEl.style.background = postContext.avatarColor || '#D42759';
            }
            if (usernameEl) usernameEl.textContent = postContext.username || '';
            // Avatar/pseudo -> profil public de l'auteur (demande du 11/09/2026) : posé sur
            // les deux (même cible cliquable), seulement quand postContext transporte un uid
            // (feed.html/profile.html le fournissent désormais ; les autres appelants de
            // openLocModal, ex: fiche d'avis sans auteur identifié, ne l'ont pas — pas de
            // lien dans ce cas plutôt qu'un lien cassé).
            [avatarEl, usernameEl].forEach(el => {
                if (!el) return;
                el.style.cursor = postContext.uid ? 'pointer' : '';
                el.onclick = postContext.uid
                    ? (e) => { e.stopPropagation(); window.location.href = 'profile.html?uid=' + encodeURIComponent(postContext.uid); }
                    : null;
            });

            const likeBtn = document.getElementById('modal-post-like-btn');
            const likeCount = document.getElementById('modal-post-like-count');
            if (likeBtn && likeCount && postContext.photoKey) {
                const photoKey = postContext.photoKey;
                likeBtn.classList.remove('liked');
                likeCount.textContent = '…';
                // Repère la photo affichée au moment de la requête : si une autre photo est
                // ouverte avant que getPhotoLikeState() ait répondu, on ignore le résultat
                // périmé (même garde-fou que feed.html/openFeedPost()).
                modalPostHeader.dataset.photoKey = photoKey;
                if (typeof window.getPhotoLikeState === 'function') {
                    window.getPhotoLikeState(photoKey).then(state => {
                        if (modalPostHeader.dataset.photoKey !== photoKey) return;
                        likeCount.textContent = state.count;
                        likeBtn.classList.toggle('liked', state.likedByMe);
                    });
                }
                likeBtn.onclick = async () => {
                    const nowLiked = !likeBtn.classList.contains('liked');
                    likeBtn.classList.toggle('liked', nowLiked);
                    likeCount.textContent = Math.max(0, (parseInt(likeCount.textContent, 10) || 0) + (nowLiked ? 1 : -1));
                    if (typeof window.togglePhotoLike === 'function') await window.togglePhotoLike(photoKey, nowLiked);
                };
            }

            // Enregistrement (demande du 13/09/2026, onglet "Saved" de feed.html) : même
            // schéma que le bouton like juste au-dessus, à côté de lui.
            const saveBtn = document.getElementById('modal-post-save-btn');
            if (saveBtn && postContext.photoKey) {
                const photoKey = postContext.photoKey;
                saveBtn.classList.remove('saved');
                if (typeof window.isPhotoSaved === 'function') {
                    window.isPhotoSaved(photoKey).then(saved => {
                        if (modalPostHeader.dataset.photoKey !== photoKey) return;
                        saveBtn.classList.toggle('saved', saved);
                    });
                }
                saveBtn.onclick = async () => {
                    const nowSaved = !saveBtn.classList.contains('saved');
                    saveBtn.classList.toggle('saved', nowSaved);
                    if (typeof window.togglePhotoSave === 'function') await window.togglePhotoSave(photoKey, nowSaved);
                    if (typeof window.onPhotoSaveToggled === 'function') window.onPhotoSaveToggled(photoKey, nowSaved);
                };
            }
        } else {
            modalPostHeader.classList.add('hidden');
        }
    }
    if (modalPostCaption) {
        if (postContext && postContext.caption) {
            modalPostCaption.textContent = `"${postContext.caption}"`;
            modalPostCaption.classList.remove('hidden');
        } else {
            modalPostCaption.classList.add('hidden');
        }
    }

    // Modale plein-écran mobile + icône crayon "modifier" (demande du 10/09/2026,
    // profile.html) : `.post-modal` déclenche le style plein écran mobile (voir le CSS
    // local de profile.html/feed.html) pour TOUTE publication (postContext présent),
    // qu'elle soit modifiable ou non. `postContext.editable` (uniquement pour ses
    // propres photos autonomes, voir renderProfilePhotos() dans profile.html) bascule en
    // plus la croix de fermeture vers un bouton crayon (#modal-post-edit-btn) — la
    // fermeture reste possible via le bouton retour (#modal-back-btn, chevron, affiché
    // uniquement pour une publication). Éléments absents sur les autres pages/modales
    // (comme d'habitude, if(el)-gardé) : aucun effet ailleurs.
    const modalOverlayEl = document.getElementById('loc-modal');
    const modalCloseBtn = document.querySelector('#loc-modal .close-btn');
    const modalBackBtn = document.getElementById('modal-back-btn');
    const modalEditBtn = document.getElementById('modal-post-edit-btn');
    if (modalOverlayEl) modalOverlayEl.classList.toggle('post-modal', !!postContext);
    if (modalBackBtn) modalBackBtn.classList.toggle('hidden', !postContext);
    if (postContext && postContext.editable) {
        if (modalCloseBtn) modalCloseBtn.classList.add('hidden');
        if (modalEditBtn) {
            modalEditBtn.classList.remove('hidden');
            modalEditBtn.onclick = () => {
                if (typeof window.openPostEditSheet === 'function') window.openPostEditSheet(postContext);
            };
        }
    } else {
        if (modalCloseBtn) modalCloseBtn.classList.remove('hidden');
        if (modalEditBtn) modalEditBtn.classList.add('hidden');
    }

    // Modération admin (demande du 11/09/2026, "en mode admin, je veux avoir la
    // possibilité de supprimer des publications qui me déplaisent") : bouton "corbeille"
    // injecté en JS (pas de HTML dédié par page, contrairement à modal-back-btn/
    // modal-post-edit-btn ci-dessus) pour fonctionner sur toute page partageant #loc-modal
    // sans avoir à dupliquer son balisage partout — même look que ces deux boutons. Réservé
    // aux publications autonomes identifiables (postContext.photoId, même périmètre que
    // deleteProfilePhoto/openPostEditSheet) et jamais affiché sur ses PROPRES publications
    // (déjà couvertes par le volet crayon -> Supprimer existant, voir openPostEditSheet).
    (function () {
        let btn = document.getElementById('modal-post-admin-delete-btn');
        if (postContext && postContext.uid && postContext.photoId && !postContext.editable && modalOverlayEl) {
            if (typeof window.isCurrentUserAdmin !== 'function') return;
            window.isCurrentUserAdmin().then(isAdmin => {
                // Le clic sur un autre lieu / la fermeture de la modale pendant l'attente
                // du round-trip admin doit annuler l'affichage — sinon le bouton peut
                // apparaître sur une publication qui n'est plus celle affichée.
                if (modalOverlayEl.classList.contains('hidden') || !isAdmin) {
                    if (btn) btn.classList.add('hidden');
                    return;
                }
                if (!btn) {
                    btn = document.createElement('button');
                    btn.type = 'button';
                    btn.id = 'modal-post-admin-delete-btn';
                    btn.title = 'Delete post (admin)';
                    btn.setAttribute('aria-label', 'Delete post (admin)');
                    btn.style.cssText = 'position:absolute; top:12px; right:14px; background:rgba(0,0,0,.35); border:none; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10;';
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
                    (document.querySelector('#loc-modal .modal-content') || modalOverlayEl).appendChild(btn);
                }
                btn.classList.remove('hidden');
                btn.onclick = async () => {
                    const msg = currentLang === 'fr' ? 'Supprimer définitivement cette publication ?' : 'Permanently delete this post?';
                    if (!confirm(msg)) return;
                    const result = await window.adminDeleteProfilePhoto(postContext.uid, postContext.photoId);
                    if (result && result.success) {
                        window.closeLocModal();
                        window.location.reload();
                    } else {
                        alert(currentLang === 'fr' ? 'Suppression impossible.' : 'Could not delete this post.');
                    }
                };
            });
        } else if (btn) {
            btn.classList.add('hidden');
        }
    })();

    if(modalDesc) {
        const desc = getLocText(loc.fullDescription) || "No description available.";
        modalDesc.innerHTML = desc;
    }

    // Fiche d'informations, identique à celle de map.html (Group / Members / Country / City / Address / Date)
    if(modalMetaBox) {
        modalMetaBox.innerHTML = `
            <b>${currentLang === 'fr' ? 'Groupe' : 'Group'}:</b> ${loc.group}<br>
            <b>${currentLang === 'fr' ? 'Membre(s)' : 'Members'}:</b> ${loc.member === "All" ? "All" : loc.member}<br>
            <b>${currentLang === 'fr' ? 'Pays' : 'Country'}:</b> ${loc.country}<br>
            <b>${currentLang === 'fr' ? 'Ville' : 'City'}:</b> ${loc.city}<br>
            <b>${currentLang === 'fr' ? 'Adresse' : 'Address'}:</b> ${loc.address || '—'}<br>
            <b>${currentLang === 'fr' ? 'Date' : 'Date'}:</b> ${loc.year || '—'}
        `;
    }

    if(modalMapLink) modalMapLink.href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    // Bouton "Plus de détails" -> renvoie vers la fiche complète du lieu sur map.html
    const modalMoreDetails = document.getElementById('modal-more-details');
    if(modalMoreDetails) {
        modalMoreDetails.href = `map.html?loc=${loc.id}`;
        modalMoreDetails.textContent = t('moreDetails');
    }

    // Traduction des petits libellés statiques de la modale (si présents sur la page)
    const modalDetailsLabel = document.getElementById('modal-details-label');
    if(modalDetailsLabel) modalDetailsLabel.textContent = t('detailsLabel');
    const modalAboutLabel = document.getElementById('modal-about-label');
    if(modalAboutLabel) modalAboutLabel.textContent = t('aboutPlaceLabel');
    const modalMapLinkText = document.getElementById('modal-map-link-text');
    if(modalMapLinkText) modalMapLinkText.textContent = t('openInMaps');

    const modalOverlay = document.getElementById('loc-modal');
    if(modalOverlay) modalOverlay.classList.remove('hidden');

    setTimeout(() => {
        const mapEl = document.getElementById('modal-map');
        if(!mapEl || typeof L === 'undefined') return;

        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        const baseColor = groupColors[loc.group] || '#D42759';
        const markerHtml = `<div class="popup-marker-icon" style="background:${baseColor}; color:#fff;">${catIconSvg}</div>`;
        const customIcon = L.divIcon({ className: '', html: markerHtml, iconSize: [34,34], iconAnchor: [17,17] });

        if(!popupMap) {
            popupMap = L.map('modal-map', { zoomControl: false, attributionControl: false }).setView([loc.lat, loc.lng], 15);
            createOSMTileLayer(popupMap).addTo(popupMap);
            popupMarker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(popupMap);
        } else {
            popupMap.setView([loc.lat, loc.lng], 15);
            popupMarker.setLatLng([loc.lat, loc.lng]);
            popupMarker.setIcon(customIcon);
            popupMap.invalidateSize();
        }
    }, 150);
};

window.closeLocModal = function() {
    const modalOverlay = document.getElementById('loc-modal');
    if(modalOverlay) modalOverlay.classList.add('hidden');
};

// ==========================================
// 8. AUTO-ITINERARY GENERATOR LOGIC
// ==========================================
// Distance à vol d'oiseau entre deux lieux (formule de Haversine), utilisée pour estimer
// un temps de trajet plausible entre deux étapes consécutives de l'itinéraire généré.
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Convertit une adresse/quartier tapé en clair (ex: "Myeongdong, Seoul") en coordonnées
// réelles, via l'API Nominatim d'OpenStreetMap (gratuite, sans clé). Utilisée pour le
// champ optionnel "hôtel / quartier d'hébergement" de My Trips, afin que le premier
// trajet de chaque journée parte réellement de là plutôt que du premier lieu de la liste.
// Ce n'est PAS testable dans le sandbox de développement (réseau restreint) — retourne
// null en cas d'échec (adresse introuvable, réseau bloqué...) plutôt que d'inventer des
// coordonnées, et l'appelant doit alors continuer sans point de départ.
async function geocodeAddress(query) {
    if (!query || !query.trim()) return null;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`, {
            headers: { 'Accept-Language': currentLang || 'en' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (e) {
        console.warn('Géocodage de l\'adresse échoué :', e);
        return null;
    }
}

// Suggestions d'adresses réelles (hôtel/quartier) pendant la saisie dans My Trips — même
// API Nominatim que geocodeAddress, mais avec plusieurs résultats affichés en liste
// cliquable, pour choisir un vrai lieu (ex: "Ritz Paris") plutôt que de taper une adresse
// à l'aveugle sans savoir si elle correspond à quelque chose de réel. Non testable en
// direct dans ce sandbox (réseau restreint vers nominatim.openstreetmap.org).
let createTripHotelSelected = null; // { lat, lng, label } une fois une suggestion choisie
let createTripHotelSearchTimer = null;
window.onCreateTripHotelInput = function() {
    createTripHotelSelected = null;
    const input = document.getElementById('create-trip-hotel');
    const box = document.getElementById('create-trip-hotel-suggestions');
    if (!input || !box) return;
    const query = input.value.trim();
    clearTimeout(createTripHotelSearchTimer);
    if (query.length < 3) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    createTripHotelSearchTimer = setTimeout(() => searchHotelSuggestions(query), 400);
};

async function searchHotelSuggestions(query) {
    const box = document.getElementById('create-trip-hotel-suggestions');
    if (!box) return;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`, {
            headers: { 'Accept-Language': currentLang || 'en' }
        });
        if (!res.ok) { box.classList.add('hidden'); return; }
        const results = await res.json();
        // La recherche est asynchrone : si la personne a continué à taper entre-temps, ce
        // résultat ne correspond plus à ce qui est affiché à l'écran — on l'ignore.
        const input = document.getElementById('create-trip-hotel');
        if (!input || input.value.trim() !== query) return;
        if (!Array.isArray(results) || results.length === 0) { box.classList.add('hidden'); box.innerHTML = ''; return; }
        box.innerHTML = results.map((r, i) => `
            <div class="create-trip-hotel-option" data-idx="${i}" style="padding:10px 12px; font-size:12.5px; color:#334155; cursor:pointer; border-bottom:1px solid #f1f5f9;">${r.display_name}</div>
        `).join('');
        box.querySelectorAll('.create-trip-hotel-option').forEach(el => {
            el.addEventListener('mouseenter', () => el.style.background = '#f8fafc');
            el.addEventListener('mouseleave', () => el.style.background = '');
            el.addEventListener('click', () => {
                const r = results[parseInt(el.dataset.idx)];
                input.value = r.display_name;
                createTripHotelSelected = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name };
                box.classList.add('hidden');
                box.innerHTML = '';
            });
        });
        box.classList.remove('hidden');
    } catch (e) {
        console.warn('Recherche de suggestions d\'adresse échouée :', e);
        box.classList.add('hidden');
    }
}
document.addEventListener('click', (e) => {
    const box = document.getElementById('create-trip-hotel-suggestions');
    const input = document.getElementById('create-trip-hotel');
    if (box && !box.classList.contains('hidden') && e.target !== input && !box.contains(e.target)) {
        box.classList.add('hidden');
    }
});

// On n'a pas d'API d'itinéraire en temps réel (pas de clé, réseau restreint) : plutôt que
// d'inventer un temps de trajet dans le vide, on combine deux informations réelles —
// la distance à vol d'oiseau entre les deux lieux (pour choisir un mode de transport
// plausible et estimer une durée) et le champ "directions" déjà rédigé pour le lieu
// d'arrivée (ligne de métro/bus réelle, nom de station, temps de marche) quand il existe.
//
// Un premier essai ne calculait que le temps "en mouvement" (distance / vitesse de
// croisière), ce qui affichait presque toujours "5 min" même pour deux lieux à 2-3 km
// l'un de l'autre — un trajet en transport en commun réel inclut aussi la marche
// jusqu'à l'arrêt/la station, l'attente, puis la marche de sortie, largement plus long
// que le seul temps "sur le véhicule". On ajoute donc un temps d'accès fixe réaliste, et
// on renvoie une fourchette plutôt qu'un chiffre unique faussement précis puisqu'on ne
// connaît pas le trajet réel.
function estimateTransitLeg(fromLoc, toLoc) {
    const distKm = haversineKm(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
    const isFr = currentLang === 'fr';
    let mode, minMinutes, maxMinutes;
    if (distKm < 1) {
        mode = isFr ? 'À pied' : 'On foot';
        minMinutes = Math.max(3, Math.round(distKm / 5.5 * 60));
        maxMinutes = Math.max(minMinutes + 5, Math.round(distKm / 3.5 * 60));
    } else if (distKm < 8) {
        mode = isFr ? 'Métro / bus' : 'Subway / bus';
        minMinutes = 12 + Math.round(distKm / 25 * 60);
        maxMinutes = 18 + Math.round(distKm / 15 * 60);
    } else {
        mode = isFr ? 'Taxi ou métro' : 'Taxi or subway';
        minMinutes = 15 + Math.round(distKm / 35 * 60);
        maxMinutes = 25 + Math.round(distKm / 20 * 60);
    }
    return { mode, minMinutes, maxMinutes, distKm };
}

// Pas de données d'horaires d'ouverture réelles par lieu dans celebLocations — plutôt
// que d'inventer des horaires précis pour tel ou tel endroit précis, on utilise des
// horaires TYPIQUES par catégorie (mêmes catégories que les filtres du site) : une
// estimation générale assumée comme telle, pas les vraies heures d'ouverture. Sert aussi
// à donner une durée de visite réaliste par type de lieu (un musée prend plus de temps
// qu'un café) plutôt qu'un créneau fixe unique pour tous, comme c'était le cas avant.
const ITI_CATEGORY_PROFILE = {
    'Cafe':         { openHour: 8,  closeHour: 20, visitMinutes: 45 },
    'Restaurants':  { openHour: 11, closeHour: 22, visitMinutes: 75 },
    'Museums':      { openHour: 10, closeHour: 18, visitMinutes: 100 },
    'Pop-up Store': { openHour: 10, closeHour: 20, visitMinutes: 45 },
    'Fashion':      { openHour: 10, closeHour: 20, visitMinutes: 40 },
    'Concerts':     { openHour: 9,  closeHour: 19, visitMinutes: 30 },
    'Run BTS':      { openHour: 9,  closeHour: 19, visitMinutes: 30 },
    'Bon Voyage':   { openHour: 9,  closeHour: 19, visitMinutes: 30 },
    'MV Location':  { openHour: 9,  closeHour: 19, visitMinutes: 30 },
    'Landmarks':    { openHour: 9,  closeHour: 19, visitMinutes: 40 }
};
const ITI_DEFAULT_PROFILE = { openHour: 9, closeHour: 19, visitMinutes: 45 };
function getCategoryProfile(cat) { return ITI_CATEGORY_PROFILE[cat] || ITI_DEFAULT_PROFILE; }

// La catégorie seule ne suffit pas : certains lieux ne sont pas de simples arrêts de
// quelques dizaines de minutes mais des destinations à part entière où l'on passe
// naturellement une demi-journée, voire la journée complète (un parc à thème classé "Run
// BTS" au même titre qu'un café de quartier, par exemple). On les repère par mots-clés
// dans leur nom plutôt que d'exiger un champ dédié sur chacune des dizaines de lieux —
// et un lieu peut toujours définir son propre "visitMinutes" pour un cas particulier.
const ITI_FULL_DAY_KEYWORDS = ['lotte world', 'everland', 'caribbean bay', 'universal studios', 'disneyland', 'disney world', 'ocean park', 'seoul land', 'e-world', 'wolmi'];
const ITI_HALF_DAY_KEYWORDS = ['folk village', 'hanok village', 'zoo', 'aquarium', 'theme park', 'amusement park', 'national park', 'botanical garden', 'water park', 'safari'];
function getLocationVisitProfile(loc) {
    const base = getCategoryProfile(loc.category);
    if (typeof loc.visitMinutes === 'number') return Object.assign({}, base, { visitMinutes: loc.visitMinutes });
    const name = (loc.name || '').toLowerCase();
    if (ITI_FULL_DAY_KEYWORDS.some(k => name.includes(k))) return Object.assign({}, base, { visitMinutes: 480 });
    if (ITI_HALF_DAY_KEYWORDS.some(k => name.includes(k))) return Object.assign({}, base, { visitMinutes: 180 });
    return base;
}

// Constantes de planification partagées par l'Auto-Itinerary Generator ET par My Trips
// (voir computeDayTimeline / buildDayPlans juste en dessous) : la journée démarre à
// 9h30, ne dépasse jamais 20h, et une pause déjeuner d'1h s'insère automatiquement la
// première fois que l'horaire tombe entre midi et 14h.
const ITI_DAY_START_MIN = 9 * 60 + 30;
const ITI_DAY_HARD_END_MIN = 20 * 60;
const ITI_LUNCH_WINDOW_START = 12 * 60, ITI_LUNCH_WINDOW_END = 14 * 60, ITI_LUNCH_DURATION_MIN = 60;

// Calcule les horaires réalistes (arrivée/départ, trajet, pause déjeuner) d'UNE journée à
// partir d'une liste de lieux DÉJÀ DANS L'ORDRE souhaité — ne décide pas quels lieux vont
// ensemble ni dans quel ordre (voir buildDayPlans pour la répartition automatique). Sert
// aussi à recalculer les horaires d'un jour de My Trips après une réorganisation manuelle
// par glisser-déposer, en respectant l'ordre choisi par la personne : les lieux qui ne
// tiennent plus dans la journée ne sont jamais retirés ici (ce serait surprenant pour un
// jour édité à la main), juste signalés via pastClose/pastHardEnd. homeBase (optionnel,
// {lat,lng}) sert de point de départ du premier trajet de la journée — hôtel ou quartier
// d'hébergement renseigné pour le voyage.
function computeDayTimeline(dayLocs, homeBase) {
    const items = [];
    let curTime = ITI_DAY_START_MIN;
    let lunchTaken = false;
    let prevPoint = homeBase || null;
    dayLocs.forEach(loc => {
        const profile = getLocationVisitProfile(loc);
        let arrival = curTime;
        let leg = null;
        if (prevPoint) {
            leg = estimateTransitLeg(prevPoint, loc);
            arrival = curTime + Math.round((leg.minMinutes + leg.maxMinutes) / 2);
        }
        let lunchBefore = false;
        if (!lunchTaken && arrival >= ITI_LUNCH_WINDOW_START && arrival <= ITI_LUNCH_WINDOW_END) {
            arrival += ITI_LUNCH_DURATION_MIN;
            lunchTaken = true;
            lunchBefore = true;
        }
        if (arrival < profile.openHour * 60) arrival = profile.openHour * 60;
        const departure = arrival + profile.visitMinutes;
        items.push({
            loc, arrival, departure, leg, lunchBefore,
            pastClose: arrival >= profile.closeHour * 60,
            pastHardEnd: departure > ITI_DAY_HARD_END_MIN
        });
        curTime = departure;
        prevPoint = loc;
    });
    return items;
}

// Répartit une liste de lieux (déjà ordonnée, ex: itinéraire du plus proche voisin) sur
// le nombre de jours demandé, en ne plaçant un lieu que si la journée en cours peut
// vraiment l'accueillir (voir computeDayTimeline). Si tous les lieux ne tiennent pas dans
// le nombre de jours choisi, le surplus est retourné dans `unplaced` plutôt que forcé —
// ce générateur reste un exemple d'itinéraire, pas une promesse de tout faire tenir.
function buildDayPlans(orderedLocs, days, homeBase) {
    let pool = orderedLocs.slice();
    const dayPlans = [];
    // BUG rapporté le 12/09/2026 ("j'ai précisé 3 jours mais un seul jour généré") : sans
    // plafond, cette boucle remplissait chaque journée au MAXIMUM que le budget horaire
    // autorise avant de passer à la suivante — avec peu de lieux (qui tiennent tous, en
    // temps, dans une seule journée), tout finissait sur le Jour 1 et `days` était
    // ignoré. maxPerDay répartit plutôt le total sur le nombre de jours demandé (part
    // égale, arrondie au-dessus) ; le budget horaire (computeDayTimeline) reste
    // prioritaire et peut toujours placer MOINS qu'un jour plein, jamais plus.
    const maxPerDay = Math.max(1, Math.ceil(orderedLocs.length / days));
    for (let d = 0; d < days && pool.length > 0; d++) {
        const dayLocs = [];
        while (pool.length > 0 && dayLocs.length < maxPerDay) {
            const trial = dayLocs.concat([pool[0]]);
            const timeline = computeDayTimeline(trial, homeBase);
            const lastItem = timeline[timeline.length - 1];
            if (lastItem.pastClose || lastItem.pastHardEnd) break;
            dayLocs.push(pool.shift());
        }
        if (dayLocs.length === 0) break; // rien n'a pu être placé même en tout début de journée : inutile de continuer
        dayPlans.push(dayLocs);
    }
    return { dayPlans, unplaced: pool };
}

window.generateItinerary = function() {
    const group = document.getElementById('iti-group').value;
    const country = document.getElementById('iti-country').value;
    const city = document.getElementById('iti-city') ? document.getElementById('iti-city').value : "";
    const days = parseInt(document.getElementById('iti-days').value);

    const unlockedGroups = getUnlockedGroups();
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let validLocs = availableLocs.filter(l => l.group === group && l.country === country);
    if(city) validLocs = validLocs.filter(l => l.city === city);
    if(itiSelectedCategories.length > 0) validLocs = validLocs.filter(l => itiSelectedCategories.includes(l.category));

    if(validLocs.length === 0) { alert('No locations found for this selection.'); return; }

    let route = [validLocs.shift()];
    while(validLocs.length > 0) {
        let lastLoc = route[route.length - 1], nearestIdx = 0, minDist = Infinity;
        for(let i=0; i<validLocs.length; i++) {
            let d = Math.hypot(lastLoc.lat - validLocs[i].lat, lastLoc.lng - validLocs[i].lng);
            if(d < minDist) { minDist = d; nearestIdx = i; }
        }
        route.push(validLocs.splice(nearestIdx, 1)[0]);
    }

    // Répartition réaliste des lieux sur les jours demandés (voir buildDayPlans /
    // computeDayTimeline ci-dessus, partagées avec My Trips).
    const { dayPlans: dayLocGroups, unplaced } = buildDayPlans(route, days, null);
    const dayPlans = dayLocGroups.map(dayLocs => computeDayTimeline(dayLocs, null));
    const unplacedCount = unplaced.length;

    const resultDiv = document.getElementById('iti-days-list');
    if(!resultDiv) return;

    resultDiv.innerHTML = "";

    let coordsForMap = [];
    currentGeneratedItinerary = [];

    const ITI_TXT_DICT = {
        en: { day: "Day", lunchBreak: "Lunch break (~1h)", mapBtn: "Open Route in Google Maps", cancel: "Cancel", add: "Add Selected Days", export: "Export PDF", save: "Save Trip", notAllFit: "location(s) couldn't fit in this schedule (opening hours / time) and were left out — this is just an example itinerary, feel free to adjust it." },
        fr: { day: "Jour", lunchBreak: "Pause déjeuner (~1h)", mapBtn: "Ouvrir l'itinéraire sur Google Maps", cancel: "Annuler", add: "Ajouter la sélection", export: "Exporter en PDF", save: "Sauvegarder", notAllFit: "lieu(x) n'ont pas pu tenir dans ce planning (horaires d'ouverture / temps) et ont été laissés de côté — ceci reste un exemple d'itinéraire, libre à vous de l'ajuster." }
    };
    const txt = ITI_TXT_DICT[currentLang] || ITI_TXT_DICT.en;

    const isTripsPage = !!document.getElementById('edit-trip-name');
    const formatMin = (mins) => {
        const d = new Date();
        d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    dayPlans.forEach((items, i) => {
        const dayLocs = items.map(it => it.loc);
        currentGeneratedItinerary.push(dayLocs);

        let mapLink = "";
        if(dayLocs.length === 1) {
            mapLink = `https://www.google.com/maps/search/?api=1&query=${dayLocs[0].lat},${dayLocs[0].lng}`;
            coordsForMap.push({ dayIdx: i, locIdx: 0, lat: dayLocs[0].lat, lng: dayLocs[0].lng });
        } else {
            let waypoints = dayLocs.map(l => `${l.lat},${l.lng}`).join('|');
            mapLink = `https://www.google.com/maps/dir/?api=1&origin=${dayLocs[0].lat},${dayLocs[0].lng}&destination=${dayLocs[dayLocs.length-1].lat},${dayLocs[dayLocs.length-1].lng}&waypoints=${waypoints}&travelmode=driving`;
            dayLocs.forEach((l, locIdx) => coordsForMap.push({ dayIdx: i, locIdx, lat: l.lat, lng: l.lng }));
        }

        // Même couleur que ce jour sur la carte de l'itinéraire juste en dessous (voir
        // TRIP_DAY_COLORS, réutilisées telles quelles) : le jour 1 est en rose partout
        // (titre, puce, ligne de temps du détail), le jour 2 en violet, etc. — plus
        // besoin de faire l'aller-retour avec la carte pour savoir quel jour est lequel.
        const dayColor = TRIP_DAY_COLORS[i % TRIP_DAY_COLORS.length];

        let html = `<div class="iti-day-card" style="padding: 18px 16px;">
            <div class="iti-day-title" style="display:flex; justify-content:space-between; align-items:center; font-size:16px; color:${dayColor}; margin-bottom:20px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                <span>${txt.day} ${i + 1}</span>
                ${isTripsPage ? `<input type="checkbox" class="iti-day-checkbox" value="${i}" checked style="width:18px; height:18px; cursor:pointer; accent-color:${dayColor};">` : ''}
            </div>`;

        items.forEach((it, idx) => {
            const l = it.loc;

            if (idx > 0) {
                // Pas d'API d'itinéraire disponible : le mode de transport et la durée sont
                // estimés à partir de la distance réelle entre les deux lieux (voir
                // estimateTransitLeg), et on réutilise le champ "directions" déjà rédigé pour
                // le lieu d'arrivée (ligne de métro/bus réelle) quand il en a un, plutôt que
                // le texte générique "Transit to next location" affiché jusqu'ici.
                const nextDirections = getLocText(l.directions);
                const legLabel = `${it.leg.mode} · ~${it.leg.minMinutes}-${it.leg.maxMinutes} min${nextDirections ? ' — ' + nextDirections : ''}`;
                html += `<div style="padding-left:18px; border-left: 2px dashed #cbd5e1; margin-bottom:15px; padding-top:5px; padding-bottom:5px;"><span style="display:inline-block; background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:10.5px; font-weight:600; color:#64748b; line-height:1.5;">${legLabel}</span></div>`;
            }

            if (it.lunchBefore) {
                html += `<div style="padding-left:18px; border-left: 2px dashed #cbd5e1; margin-bottom:15px; padding-top:5px; padding-bottom:5px;"><span style="display:inline-block; background:#FFF7F8; padding:4px 8px; border-radius:6px; font-size:10.5px; font-weight:600; color:#D42759; line-height:1.5;">${txt.lunchBreak}</span></div>`;
            }

            html += `
                <div style="padding-left:18px; border-left: 2px solid ${dayColor}; position:relative; margin-bottom:15px;">
                    <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; border-radius:50%; background:${dayColor}; border:2px solid #fff;"></div>
                    <div style="font-size:11px; font-weight:700; color:${dayColor}; margin-bottom:3px;">${formatMin(it.arrival)} - ${formatMin(it.departure)}</div>
                    <div style="font-size:14px; font-weight:700; color:#212832; margin-bottom:4px;">${idx+1}. ${l.name}</div>
                    <div style="font-size:11.5px; color:#64748b; margin-bottom:8px;">${getCatName(l.category)}</div>
                </div>`;
        });

        html += `<a href="${mapLink}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; padding:10px 16px; margin-top:5px; font-size:12px; color:#2E3644; border:1px solid #cbd5e1; border-radius:100px; background:white; font-weight:600; text-decoration:none; transition:0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            ${txt.mapBtn}
        </a></div>`;
        resultDiv.innerHTML += html;
    });

    if (unplacedCount > 0) {
        resultDiv.innerHTML += `<div style="text-align:center; font-size:11.5px; color:#94a3b8; padding:6px 16px 4px; line-height:1.5;">⚠️ ${unplacedCount} ${txt.notAllFit}</div>`;
    }

    document.getElementById('iti-result').classList.remove('hidden');

    let actionsContainer = document.getElementById('iti-actions-container');
    if (!actionsContainer) {
        const saveBtn = document.getElementById('save-trip-btn');
        if (saveBtn) {
            actionsContainer = saveBtn.parentElement;
            actionsContainer.id = 'iti-actions-container';
        }
    }
    
    if (actionsContainer) {
        if (isTripsPage) {
            actionsContainer.innerHTML = `
                <button class="gen-btn ghost" onclick="closeModal('itinerary-modal')" style="flex:1; justify-content:center;">${txt.cancel}</button>
                <button class="gen-btn" onclick="addSelectedDaysToTrip()" style="flex:1; justify-content:center;">${txt.add}</button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <button id="export-pdf-btn" class="gen-btn ghost" onclick="exportItineraryPDF()" style="flex:1; justify-content:center;">${txt.export}</button>
                <button id="save-trip-btn" class="gen-btn" onclick="saveItineraryToTrips()" style="flex:1; justify-content:center;">${txt.save}</button>
            `;
        }
    }

    const modalContent = document.querySelector('#itinerary-modal .modal-content');
    if(modalContent) modalContent.scrollTo({ top: modalContent.scrollHeight, behavior: 'smooth' });

    if(document.getElementById('iti-map-container')) {
        setTimeout(() => {
            if(typeof itiLeafletMap !== 'undefined' && itiLeafletMap) {
                itiLeafletMap.remove();
                itiLeafletMap = null;
            }
            itiLeafletMap = L.map('iti-map-container', { zoomControl: false }).setView([0,0], 2);
            createOSMTileLayer(itiLeafletMap).addTo(itiLeafletMap);
            itiLayerGroup = L.featureGroup().addTo(itiLeafletMap);

            // Un tracé par jour, dans la couleur de ce jour (mêmes couleurs que la carte
            // globale de My Trips) : plus lisible qu'une seule ligne continue qui mélangeait
            // tous les jours ensemble sans distinction visuelle.
            const allLatLngs = [];
            const byDay = {};
            coordsForMap.forEach(c => { (byDay[c.dayIdx] = byDay[c.dayIdx] || []).push(c); allLatLngs.push([c.lat, c.lng]); });

            Object.keys(byDay).forEach(dayIdx => {
                const color = TRIP_DAY_COLORS[dayIdx % TRIP_DAY_COLORS.length];
                const pts = byDay[dayIdx];
                pts.forEach(c => {
                    L.circleMarker([c.lat, c.lng], { color: color, weight: 2, radius: 8, fillColor: color, fillOpacity: 1 }).addTo(itiLayerGroup)
                     .bindTooltip(`${Number(dayIdx)+1}.${c.locIdx+1}`, {permanent: true, direction: 'center', className: 'iti-map-label'});
                });
                if(pts.length > 1) {
                    L.polyline(pts.map(c => [c.lat, c.lng]), { color: color, weight: 3, dashArray: '5, 5' }).addTo(itiLayerGroup);
                }
            });

            if(allLatLngs.length > 1) {
                itiLeafletMap.fitBounds(L.polyline(allLatLngs).getBounds(), { padding: [20, 20], maxZoom: 15 });
            } else if (allLatLngs.length === 1) {
                itiLeafletMap.setView(allLatLngs[0], 12);
            }

            itiLeafletMap.invalidateSize();
        }, 250);
    }
}

window.addSelectedDaysToTrip = function() {
    const checkboxes = document.querySelectorAll('.iti-day-checkbox:checked');
    if (checkboxes.length === 0) { 
        alert(currentLang === 'fr' ? 'Sélectionnez au moins un jour.' : 'Select at least one day.'); 
        return; 
    }
    
    window.saveTrip(); 
    let wList = getWishlistLocs();
    
    checkboxes.forEach(cb => {
        const dayIndex = parseInt(cb.value);
        const dayLocs = currentGeneratedItinerary[dayIndex];
        if (dayLocs && dayLocs.length > 0) {
            let dayIds = [];
            dayLocs.forEach(loc => {
                dayIds.push(loc.id);
                if (!wList.some(w => Number(w.id) === Number(loc.id) && w.tripId === currentTrip.id)) {
                    wList.push({ id: loc.id, dateAdded: new Date().toLocaleDateString(), tripId: currentTrip.id });
                }
            });
            currentTrip.days.push(dayIds);
        }
    });
    
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    
    let trips = getMyTripsList();
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
    
    window.renderTrip(); 
    closeModal('itinerary-modal');
};

window.saveItineraryToTrips = async function() {
    const country = document.getElementById('iti-country').value;
    const daysCount = parseInt(document.getElementById('iti-days').value);
    const newTripId = 'trip-' + Date.now();
    const tripName = `${country} Trip (${daysCount} ${currentLang === 'fr' ? 'Jours' : 'Days'})`;

    let newTrip = {
        id: newTripId,
        name: tripName,
        dateType: 'duration',
        duration: daysCount + (currentLang === 'fr' ? ' Jours' : ' Days'),
        days: []
    };

    let wList = getWishlistLocs();

    currentGeneratedItinerary.forEach((dayLocs) => {
        let dayIds = [];
        dayLocs.forEach(loc => {
            dayIds.push(loc.id);
            let existing = wList.find(w => w.id === loc.id && w.tripId === newTripId);
            if (!existing) {
                wList.push({ id: loc.id, dateAdded: new Date().toLocaleDateString(), tripId: newTripId });
            }
        });
        newTrip.days.push(dayIds);
    });

    let trips = getMyTripsList();
    trips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(trips));
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    localStorage.setItem('activeTripId', newTripId);
    applyWishlistCountDeltas(wList);

    // On ATTEND que la synchronisation Firestore soit vraiment terminée avant de
    // continuer (redirection comprise) : sinon, la navigation vers trips.html pouvait
    // devancer l'écriture cloud encore en vol, et le firebase-ready de trips.html
    // écrasait alors le localStorage tout juste mis à jour avec d'anciennes données
    // cloud ne contenant pas encore ce nouveau voyage — qui semblait alors "ne pas se
    // créer" alors qu'il avait bien été généré un instant plus tôt.
    if (typeof window.syncUserData === 'function') {
        await window.syncUserData({ myTrips: trips, wishlistLocs: wList });
    }

    if(document.getElementById('trip-name-display')) {
        document.getElementById('itinerary-modal').classList.add('hidden');
        window.initTrips();
    } else {
        window.location.href = 'trips.html';
    }
};

window.exportItineraryPDF = function() {
    const daysListEl = document.getElementById('iti-days-list');
    const btn = document.getElementById('export-pdf-btn');
    const saveBtn = document.getElementById('save-trip-btn');
    if(!daysListEl) return;
    if(typeof html2pdf === 'undefined') {
        alert(currentLang === 'fr' ? "L'export PDF n'a pas pu se charger. Vérifiez votre connexion et réessayez." : 'The PDF export library failed to load. Check your connection and try again.');
        return;
    }
    if(btn) btn.style.display = 'none';
    if(saveBtn) saveBtn.style.display = 'none';
    const restore = () => {
        if(btn) btn.style.display = 'block';
        if(saveBtn) saveBtn.style.display = 'block';
    };

    // Deux tentatives précédentes avaient déjà échoué à produire autre chose qu'un PDF
    // entièrement blanc :
    // 1) #iti-result contient la carte Leaflet en direct (#iti-map-container), dont les
    //    tuiles OpenStreetMap chargées cross-origin "tainted" le canvas sans erreur visible.
    // 2) Un simple clone repositionné (même caché derrière le reste de la page plutôt que
    //    hors-écran) restait un DOM VIVANT héritant de tout le CSS de la page — variables
    //    CSS, .hidden en display:none!important à retirer soi-même, et surtout le
    //    max-height:40vh + overflow-y:auto de #iti-days-list lui-même, qui ne laissait
    //    html2canvas capturer que la portion visible avant scroll, jamais tout le contenu.
    // On construit donc une chaîne HTML autonome (aucune classe externe, uniquement du
    // style inline déjà présent dans le HTML généré par displayGeneratedItinerary — voir
    // plus haut), qu'on laisse html2pdf gérer lui-même de bout en bout : c'est l'usage le
    // plus simple et le plus éprouvé de cette librairie (from(string) plutôt que
    // from(élémentDuDOMVivant)), sans aucune des sources de blocage ci-dessus.
    const isFr = currentLang === 'fr';
    const title = isFr ? 'Mon itinéraire Screen To Street' : 'My Screen To Street itinerary';
    const exportHtml = `
        <div style="font-family:'Poppins',Arial,sans-serif; background:#fff; color:#212832; padding:6px; width:700px;">
            <div style="font-size:20px; font-weight:700; margin-bottom:4px;">${title}</div>
            <div style="font-size:11px; color:#94a3b8; margin-bottom:18px;">Screen To Street</div>
            ${daysListEl.innerHTML}
        </div>`;

    html2pdf().set({ margin: 10, filename: 'ScreenToStreet_Guide.pdf', jsPDF: { format: 'a4' }, html2canvas: { useCORS: true, allowTaint: true, backgroundColor: '#ffffff' } }).from(exportHtml).save()
        .then(restore)
        .catch((err) => {
            console.error('Export PDF failed:', err);
            restore();
            alert(currentLang === 'fr' ? "L'export PDF a échoué. Réessayez." : 'PDF export failed. Please try again.');
        });
};

// ==========================================
// 9. MODAL PANIER DEPUIS LA CARTE
// ==========================================
// window.openCartModal / openGuidePaywallModal / buyGuidePass sont définies plus haut,
// à côté de getUnlockedGroups() / hasGuidePass() (voir le paywall "Pass Guide" du
// 30/08/2026) — l'ancienne logique par groupe (checkboxes, prix par groupe) a été
// entièrement retirée d'ici.

// ==========================================
// 10. GESTION DES MODALES "LIST" (Depuis KPI)
// ==========================================
// Clic sur un pays dans le KPI "Countries" (demande du 11/09/2026) : centre la carte sur
// ce pays plutôt que de se contenter d'afficher son décompte — même lookup
// (window.getMapCenterForCountry, countries.js) que le centrage automatique sur le pays
// d'intérêt du compte, voir plus haut dans ce fichier.
window.flyMapToCountry = function(countryName) {
    window.closeModal('list-modal');
    if (!map || typeof window.getMapCenterForCountry !== 'function') return;
    const c = window.getMapCenterForCountry(countryName);
    map.flyTo([c[0], c[1]], c[2], { duration: 0.6 });
};

// Bouton "localiser" bas-droite de la carte : recentrait sur le pays d'intérêt du compte
// (demande du 11/09/2026) — remplacé le 13/09/2026 par la VRAIE position de l'appareil,
// mise à jour en temps réel, pour voir les lieux à proximité immédiate plutôt qu'un simple
// centrage sur un pays entier. Le premier appel à getCurrentPosition() déclenche la demande
// de permission NATIVE du navigateur (Safari/iOS affiche alors son propre dialogue
// "Autoriser une fois"/"Toujours autoriser lors de l'utilisation de l'app" — entièrement
// géré par le système, rien à construire côté site pour cette partie-là).
let myLocationMarker = null;
let myLocationAccuracyCircle = null;
let myLocationWatchId = null;

window.locateMyPosition = function() {
    if (!map || !navigator.geolocation) {
        if (typeof window.showSimpleToast === 'function') window.showSimpleToast(currentLang === 'fr' ? "La géolocalisation n'est pas disponible sur cet appareil." : 'Geolocation is not available on this device.');
        return;
    }
    // Le suivi (watchPosition) ne doit démarrer qu'une fois : un second clic sur le bouton
    // recentre simplement sur la dernière position connue au lieu de relancer une demande.
    if (myLocationWatchId !== null && myLocationMarker) {
        map.flyTo(myLocationMarker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.6 });
        return;
    }
    const btn = document.getElementById('locate-country-btn');
    if (btn) btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            if (btn) btn.disabled = false;
            updateMyLocationMarker(pos);
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 0.8 });
            startWatchingMyLocation();
        },
        (err) => {
            if (btn) btn.disabled = false;
            console.warn('Géolocalisation refusée/échouée :', err);
            const isFr = currentLang === 'fr';
            const msg = err.code === err.PERMISSION_DENIED
                ? (isFr ? "Localisation refusée. Autorisez-la dans les réglages de votre navigateur pour voir votre position." : 'Location access denied. Enable it in your browser settings to see your position.')
                : (isFr ? "Impossible d'obtenir votre position pour le moment." : "Couldn't get your position right now.");
            if (typeof window.showSimpleToast === 'function') window.showSimpleToast(msg, { isError: true });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};

function startWatchingMyLocation() {
    if (myLocationWatchId !== null || !navigator.geolocation) return;
    myLocationWatchId = navigator.geolocation.watchPosition(
        updateMyLocationMarker,
        (err) => console.warn('Suivi de position interrompu :', err),
        { enableHighAccuracy: true, maximumAge: 5000 }
    );
}

// Point bleu "vous êtes ici" + cercle de précision, convention établie (Google/Apple
// Plans) — mis à jour à chaque évènement watchPosition plutôt que recréé, pour un
// déplacement fluide sur la carte au lieu d'un marqueur qui clignote/disparaît.
function updateMyLocationMarker(pos) {
    if (!map || typeof L === 'undefined') return;
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    if (!myLocationMarker) {
        myLocationMarker = L.circleMarker(latlng, {
            radius: 8, color: '#fff', weight: 3, fillColor: '#4285F4', fillOpacity: 1, interactive: false
        }).addTo(map);
    } else {
        myLocationMarker.setLatLng(latlng);
    }
    if (pos.coords.accuracy) {
        if (!myLocationAccuracyCircle) {
            myLocationAccuracyCircle = L.circle(latlng, { radius: pos.coords.accuracy, color: '#4285F4', weight: 1, fillColor: '#4285F4', fillOpacity: 0.12, interactive: false }).addTo(map);
        } else {
            myLocationAccuracyCircle.setLatLng(latlng);
            myLocationAccuracyCircle.setRadius(pos.coords.accuracy);
        }
    }
}

window.openFilteredListModal = function(type) {
    const modal = document.getElementById('list-modal');
    const title = document.getElementById('list-modal-title');
    const content = document.getElementById('list-modal-content');
    if (!modal || !content) return;

    content.innerHTML = '';
    
    if (type === 'locations') {
        title.textContent = currentLang === 'fr' ? "Lieux filtrés" : "Filtered Locations";
        currentFilteredLocations.forEach(loc => {
            content.innerHTML += `
                <div style="padding: 12px; background: #faf9fc; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#D42759'" onmouseout="this.style.borderColor='#e2e8f0'" onclick="closeModal('list-modal'); window.openDetailsPanel(${loc.id}); map.flyTo([${loc.lat}, ${loc.lng}], 16, { duration: 0.6 });">
                    <div style="font-weight: 700; color: #2E3644; font-size:14px; margin-bottom:2px;">${loc.name}</div>
                    <div style="font-size: 11px; color: #64748b; text-transform:uppercase; font-weight:600;">${loc.city}, ${loc.country} &middot; <span style="color:#D42759;">${getCatName(loc.category)}</span></div>
                </div>
            `;
        });
    } else if (type === 'countries') {
        title.textContent = currentLang === 'fr' ? "Pays filtrés" : "Filtered Countries";
        const countries = [...new Set(currentFilteredLocations.map(l => l.country))].sort();
        countries.forEach(c => {
            const count = currentFilteredLocations.filter(l => l.country === c).length;
            const textLoc = count > 1 ? (currentLang === 'fr' ? "lieux" : "locations") : (currentLang === 'fr' ? "lieu" : "location");
            content.innerHTML += `
                <div style="padding: 12px; background: #faf9fc; border-radius: 8px; border: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#D42759'" onmouseout="this.style.borderColor='#e2e8f0'" onclick="window.flyMapToCountry('${c.replace(/'/g, "\\'")}');">
                    <div style="font-weight: 700; color: #D42759; font-size:15px;">${c}</div>
                    <div style="font-size: 12px; color: #64748b; font-weight:600;">${count} ${textLoc}</div>
                </div>
            `;
        });
    }
    
    modal.classList.remove('hidden');
}

window.closeModal = function(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden'); 
};
window.onclick = function(e) { 
    if (e.target.classList.contains('modal')) e.target.classList.add('hidden'); 
};

if(!localStorage.getItem('cookiesAccepted') && document.getElementById('cookie-banner')) { 
    document.getElementById('cookie-banner').classList.remove('hidden'); 
}
function closeCookies() { 
    localStorage.setItem('cookiesAccepted', 'true'); 
    if(document.getElementById('cookie-banner')) document.getElementById('cookie-banner').classList.add('hidden'); 
}
const btnAccept = document.getElementById('cookie-accept');
if(btnAccept) btnAccept.addEventListener('click', closeCookies);
const btnReject = document.getElementById('cookie-reject');
if(btnReject) btnReject.addEventListener('click', closeCookies);

// ==========================================
// 12. LOGIQUE SPECIFIQUE POUR TRIPS.HTML
// ==========================================
// Voyages partagés par D'AUTRES personnes avec ce compte (jamais dans myTrips, voir
// listSharedTripsForMe() dans firebase-init.js) — chargés une fois au démarrage de
// trips.html, réutilisés à chaque rendu de la liste de voyages dans la sidebar.
// Carte(s) d'invitation à un voyage tout en haut de la sidebar "MY TRIPS" (demande du
// 07/09/2026, même source que la section "Trip invites" de friends.html — voir
// listMyTripInvites()/acceptTripInvite()/declineTripInvite() dans firebase-init.js).
window.refreshTripInvitesSidebar = async function() {
    const container = document.getElementById('trip-invites-sidebar');
    if (!container || typeof window.listMyTripInvites !== 'function') return;
    const { incoming } = await window.listMyTripInvites();
    container.innerHTML = incoming.map(inv => {
        // t('tripInviteFrom') porte "{username}"/"{tripname}" comme espaces réservés —
        // remplacés APRÈS échappement pour ne jamais casser le <b> voulu autour du pseudo
        // (voir le même schéma dans friends.html, source de vérité du même texte).
        const text = t('tripInviteFrom').replace('{username}', `<b>${escapeHtml(inv.fromUsername)}</b>`).replace('{tripname}', escapeHtml(inv.tripName || ''));
        return `
        <div class="trip-invite-card">
            <div class="trip-invite-card-avatar">${escapeHtml((inv.fromUsername || '?').charAt(0).toUpperCase())}</div>
            <div style="flex:1; min-width:0;">
                <div class="trip-invite-card-text">${text}</div>
                <div class="trip-invite-card-actions">
                    <button type="button" class="trip-invite-accept-btn" data-invite-id="${inv.id}" data-trip-id="${inv.tripId}" data-role="${inv.role || 'view'}">${t('friendsAccept')}</button>
                    <button type="button" class="trip-invite-decline-btn" data-invite-id="${inv.id}">${t('friendsDecline')}</button>
                </div>
            </div>
        </div>`;
    }).join('');
    container.querySelectorAll('.trip-invite-accept-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            const result = typeof window.acceptTripInvite === 'function'
                ? await window.acceptTripInvite(btn.dataset.inviteId, btn.dataset.tripId, btn.dataset.role)
                : { error: 'failed' };
            btn.disabled = false;
            // Avant ce correctif, un échec ici (ex: le voyage n'avait jamais été correctement
            // créé côté serveur par la personne qui a invité — voir le correctif du
            // 07/09/2026 dans sendTripInvite()) ne montrait RIEN : la carte d'invitation
            // restait affichée sans le moindre indice que "Accept" n'avait servi à rien.
            if (result && result.error) {
                if (typeof window.showSimpleToast === 'function') {
                    // Distingue 'permission-denied' du reste (demande du 13/09/2026), même
                    // schéma que friends.html — voir acceptTripInvite() dans firebase-init.js.
                    const msg = result.error === 'permission-denied'
                        ? (currentLang === 'fr' ? "Erreur serveur — réessayez dans un instant, ou contactez l'administrateur si ça persiste." : 'Server error — please try again in a moment, or contact the site admin if it persists.')
                        : (currentLang === 'fr' ? "Échec de l'acceptation. Réessayez." : 'Failed to accept. Please try again.');
                    window.showSimpleToast(msg, { isError: true });
                }
                return;
            }
            if (typeof window.refreshSharedTrips === 'function') await window.refreshSharedTrips();
        });
    });
    container.querySelectorAll('.trip-invite-decline-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (typeof window.declineTripInvite === 'function') await window.declineTripInvite(btn.dataset.inviteId);
            window.refreshTripInvitesSidebar();
        });
    });
};

let sharedTripsCache = [];
window.refreshSharedTrips = async function() {
    sharedTripsCache = typeof window.listSharedTripsForMe === 'function' ? await window.listSharedTripsForMe() : [];
    window.renderTripsSidebar();
    if (typeof window.refreshTripInvitesSidebar === 'function') window.refreshTripInvitesSidebar();

    // Lien direct depuis une conversation de groupe (friends.html, trips.html?openTrip=ID) :
    // si l'id demandé correspond à un voyage partagé (pas un voyage possédé — ceux-là sont
    // déjà gérés via activeTripId dans le localStorage par trips.html au chargement), on
    // l'ouvre directement plutôt que d'attendre un clic dans la sidebar.
    const openTripParam = new URLSearchParams(location.search).get('openTrip');
    if (openTripParam && !getMyTripsList().some(t => String(t.id) === openTripParam)) {
        const target = sharedTripsCache.find(t => String(t._sharedTripId) === openTripParam);
        if (target) window.openSharedTrip(target._sharedTripId);
    }

    // Personne sans aucun voyage à elle mais avec au moins un voyage partagé : on ouvre
    // directement le premier plutôt que de laisser l'état vide "New trip" s'afficher, ce
    // qui laisserait croire à tort qu'il n'y a rien du tout à voir.
    if (getMyTripsList().length === 0 && sharedTripsCache.length > 0 && !currentTrip) {
        window.openSharedTrip(sharedTripsCache[0]._sharedTripId);
    }
};

// Ouvre un voyage partagé par quelqu'un d'autre dans le même panneau de détail que les
// voyages possédés (réutilise tout le rendu/drag&drop existant de renderTrip()) — seul
// activeTripAccess change, pour que saveTrip() sache qu'il ne doit jamais écrire dans
// myTrips ici, et que la classe body.trip-view-only masque les contrôles de modification
// si le rôle est "view" (voir .edit-only dans style.css).
window.openSharedTrip = function(sharedTripId) {
    const shared = sharedTripsCache.find(t => t._sharedTripId === sharedTripId);
    if (!shared) return;
    activeTripAccess.isOwner = false;
    activeTripAccess.role = shared._myRole;
    currentTrip = Object.assign({}, shared, { id: sharedTripId });
    if (!currentTrip.days) currentTrip.days = [];
    localStorage.removeItem('activeTripId');
    document.body.classList.toggle('trip-view-only', shared._myRole === 'view');
    document.body.classList.add('trip-not-owner');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('trip-detail-content').style.display = 'block';
    // Voir la même note dans le onclick des voyages possédés plus haut : sans ça, le
    // voyage partagé qu'on vient d'ouvrir reste caché derrière le tiroir mobile resté ouvert.
    const sidebarElShared = document.getElementById('app-sidebar');
    if (sidebarElShared && sidebarElShared.classList.contains('open') && typeof window.toggleMobileMenu === 'function') window.toggleMobileMenu();
    if(document.getElementById('trip-map-container') && !tripPageMap) {
        tripPageMap = L.map('trip-map-container', { zoomControl: false }).setView([37.541, 127.025], 6);
        createOSMTileLayer(tripPageMap).addTo(tripPageMap);
        tripPageLayer = L.featureGroup().addTo(tripPageMap);
    }
    window.renderTripsSidebar();
    window.renderTrip();
};

// ==========================================
// PARTAGE D'UN VOYAGE ("travel buddies") — trips.html
// ==========================================
// Modal injectée en JS (voir ensureDeleteVisitModal() plus haut pour le même principe) :
// avatars + icône crayon/œil cliquable par collaborateur pour son niveau d'accès, comme
// demandé (version "icônes crayon/œil" du prototype fourni), plus un champ pour inviter
// par pseudo (voir claimUsername()/lookupUserByUsername() dans firebase-init.js — la
// recherche ne fonctionne que par pseudo exact, pas par email, faute de backend capable
// de résoudre un email en identifiant de compte côté client).
const editIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D42759" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const viewIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

function ensureShareTripModal() {
    let modal = document.getElementById('share-trip-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'share-trip-modal';
    modal.className = 'modal hidden';
    modal.style.zIndex = '10500';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:380px;">
            <span class="close-btn" onclick="document.getElementById('share-trip-modal').classList.add('hidden')">&times;</span>
            <div style="text-align:center; margin-bottom:16px;">
                <div style="font-size:15px; font-weight:700; color:#212832;" id="share-trip-name"></div>
                <div style="font-size:11px; color:#94a3b8; margin-top:2px;" data-i18n="shareTripSub">Plan it together</div>
            </div>
            <div id="share-trip-buddies"></div>
            <div id="share-trip-error" class="hidden" style="font-size:11px; color:#D42759; margin-bottom:8px;"></div>
            <div style="position:relative;">
                <div class="share-trip-invite-row" style="display:flex; gap:8px; margin-top:6px;">
                    <input id="share-trip-invite-input" autocomplete="off" placeholder="${currentLang === 'fr' ? 'Leur pseudo' : 'Their username'}" style="flex:1; min-width:0; border:1.5px solid #cbd5e1; border-radius:100px; padding:10px 14px; font-size:12px; font-family:'Poppins',sans-serif;">
                    <button id="share-trip-invite-btn" style="background:#D42759; color:#fff; border:none; border-radius:100px; padding:10px 18px; font-size:12px; font-weight:700; font-family:'Poppins',sans-serif; cursor:pointer;" data-i18n="shareTripInvite">Invite</button>
                </div>
                <div id="share-trip-suggestions" class="hidden" style="position:fixed; background:#fff; border:1px solid #cbd5e1; border-radius:12px; box-shadow:0 10px 24px rgba(0,0,0,.12); max-height:180px; overflow-y:auto; z-index:10600;"></div>
            </div>
            <div style="font-size:9.5px; color:#94a3b8; text-align:center; margin-top:10px;" data-i18n="shareTripHint">Tap the icon next to a name to switch between edit and view-only access.</div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

let shareTripCurrentId = null;
window.openShareTripModal = async function(tripId, event) {
    if (event) event.stopPropagation();
    shareTripCurrentId = tripId;
    const modal = ensureShareTripModal();
    const trips = getMyTripsList();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    document.getElementById('share-trip-name').textContent = trip.name;
    modal.classList.remove('hidden');
    await window.renderShareTripBuddies(tripId);

    // Auto-complétion par pseudo (voir window.searchUsernamesByPrefix dans
    // firebase-init.js) : debounce 250ms pour ne pas interroger Firestore à chaque
    // frappe, un seul écouteur réutilisé à chaque ouverture de la modale (pas
    // ré-attaché à chaque fois — ensureShareTripModal() ne recrée le DOM qu'une fois).
    const inviteInput = document.getElementById('share-trip-invite-input');
    const suggestionsBox = document.getElementById('share-trip-suggestions');
    if (inviteInput && !inviteInput.dataset.autocompleteWired) {
        inviteInput.dataset.autocompleteWired = '1';
        let debounceTimer = null;
        inviteInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const q = inviteInput.value.trim();
            if (!q) { suggestionsBox.classList.add('hidden'); suggestionsBox.innerHTML = ''; return; }
            debounceTimer = setTimeout(async () => {
                if (typeof window.searchUsernamesByPrefix !== 'function') return;
                const myUid = window.firebaseCurrentUser && window.firebaseCurrentUser.uid;
                const matches = (await window.searchUsernamesByPrefix(q, 6)).filter(m => m.uid !== myUid);
                if (inviteInput.value.trim() !== q) return; // la personne a continué à taper entre-temps
                if (matches.length === 0) { suggestionsBox.classList.add('hidden'); suggestionsBox.innerHTML = ''; return; }
                // BUG rapporté le 12/09/2026 ("ça ne propose pas l'user dans la liste") :
                // ce menu était positionné en absolute par rapport à .modal-content, qui a
                // overflow-y:auto — tout ce qui débordait de sa hauteur visible (quasi
                // toujours le cas ici, ce champ étant proche du bas de la modale) était
                // donc généré dans le DOM mais invisible, rogné par ce conteneur. En fixed,
                // recalculé ici à partir des coordonnées réelles du champ, le menu échappe
                // à cet overflow et reste toujours visible à l'écran.
                const inputRect = inviteInput.getBoundingClientRect();
                suggestionsBox.style.top = (inputRect.bottom + 4) + 'px';
                suggestionsBox.style.left = inputRect.left + 'px';
                suggestionsBox.style.width = inputRect.width + 'px';
                suggestionsBox.innerHTML = matches.map(m => `<div class="share-suggestion-row" data-username="${escapeHtml(m.username)}" style="padding:9px 14px; font-size:12px; font-weight:600; color:#212832; cursor:pointer;">${escapeHtml(m.username)}</div>`).join('');
                suggestionsBox.querySelectorAll('.share-suggestion-row').forEach(row => {
                    row.addEventListener('mouseenter', () => row.style.background = '#FFF7F8');
                    row.addEventListener('mouseleave', () => row.style.background = '');
                    row.addEventListener('mousedown', (e) => e.preventDefault()); // évite le blur avant le click
                    row.addEventListener('click', () => {
                        inviteInput.value = row.dataset.username;
                        suggestionsBox.classList.add('hidden');
                        suggestionsBox.innerHTML = '';
                        inviteInput.focus();
                    });
                });
                suggestionsBox.classList.remove('hidden');
            }, 250);
        });
        inviteInput.addEventListener('blur', () => setTimeout(() => suggestionsBox.classList.add('hidden'), 150));
    }

    const inviteBtn = document.getElementById('share-trip-invite-btn');
    inviteBtn.onclick = async () => {
        const input = document.getElementById('share-trip-invite-input');
        const username = input.value.trim();
        const errorEl = document.getElementById('share-trip-error');
        if (errorEl) errorEl.classList.add('hidden');
        if (!username) return;
        inviteBtn.disabled = true;
        // Un voyage doit exister côté Firestore partagé AVANT de pouvoir y inviter
        // quelqu'un (voir createSharedTrip()) — appelé à chaque invitation, pas seulement
        // la première (createSharedTrip est idempotent) pour auto-réparer un document
        // incomplet sans jamais toucher aux collaborateurs déjà présents.
        if (typeof window.createSharedTrip === 'function') {
            const createResult = await window.createSharedTrip(trip);
            if (createResult && createResult.success && !trip.isShared) {
                trip.isShared = true;
                const idx = trips.findIndex(t => t.id === tripId);
                if (idx !== -1) { trips[idx] = trip; localStorage.setItem('myTrips', JSON.stringify(trips)); syncTrips(trips); }
            }
        }
        // Envoie une INVITATION plutôt que d'ajouter directement (demande du 06/09/2026) :
        // la personne n'apparaîtra dans ce voyage qu'après l'avoir acceptée elle-même.
        const result = typeof window.sendTripInvite === 'function' ? await window.sendTripInvite(tripId, trip.name, trip.coverImage, username, 'view') : { error: 'failed' };
        inviteBtn.disabled = false;
        if (result && result.error) {
            // Avant ce correctif, TOUT code d'erreur (y compris 'failed' — un échec
            // d'écriture Firestore, ex: permission-denied) affichait "No account found",
            // masquant la vraie cause quand le pseudo existait pourtant bel et bien
            // (demande du 06/09/2026).
            if (errorEl) {
                errorEl.textContent = result.error === 'not-found'
                    ? (currentLang === 'fr' ? `Aucun compte trouvé pour le pseudo « ${username} ».` : `No account found for the username "${username}".`)
                    : result.error === 'already-invited' || result.error === 'already-member'
                    ? (currentLang === 'fr' ? "Cette personne fait déjà partie du voyage ou a déjà été invitée." : 'This person is already in the trip or already invited.')
                    : result.error === 'self'
                    ? (currentLang === 'fr' ? "Vous ne pouvez pas vous inviter vous-même." : "You can't invite yourself.")
                    : (currentLang === 'fr' ? "Échec de l'invitation. Réessayez." : 'Failed to send the invite. Please try again.');
                errorEl.classList.remove('hidden');
            }
            return;
        }
        input.value = '';
        if (suggestionsBox) { suggestionsBox.classList.add('hidden'); suggestionsBox.innerHTML = ''; }
        if (typeof window.showSimpleToast === 'function') {
            window.showSimpleToast(currentLang === 'fr' ? `Invitation envoyée à ${username}.` : `Invite sent to ${username}.`);
        }
        window.renderShareTripBuddies(tripId);
    };
};

window.renderShareTripBuddies = async function(tripId) {
    const container = document.getElementById('share-trip-buddies');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center; padding:10px 0; font-size:11px; color:#94a3b8;">${currentLang === 'fr' ? 'Chargement…' : 'Loading…'}</div>`;

    const ownerInitial = (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'U').trim().charAt(0).toUpperCase();
    const ownerName = (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || (currentLang === 'fr' ? 'Vous' : 'You')).trim();
    const creatorLabel = currentLang === 'fr' ? 'Créateur du voyage' : 'Trip creator';

    let members = {};
    let memberNames = {};
    if (typeof window.loadSharedTrip === 'function') {
        const shared = await window.loadSharedTrip(tripId);
        if (shared) { members = shared.members || {}; memberNames = shared.memberNames || {}; }
    }
    // Invitations envoyées pour CE voyage, pas encore acceptées (demande du 06/09/2026) :
    // affichées séparément pour que la personne qui partage sache qui a déjà été invité
    // sans encore faire partie du voyage (voir sendTripInvite() dans firebase-init.js).
    let pendingInvites = [];
    if (typeof window.listMyTripInvites === 'function') {
        const { outgoing } = await window.listMyTripInvites();
        pendingInvites = (outgoing || []).filter(inv => inv.tripId === String(tripId));
    }

    let rowsHtml = `
        <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f6f4fb;">
            <div style="width:34px; height:34px; border-radius:50%; background:#D42759; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;">${ownerInitial}</div>
            <div style="flex:1;"><div style="font-size:12px; font-weight:700; color:#212832;">${ownerName}</div><div style="font-size:9px; color:#94a3b8;">${creatorLabel}</div></div>
        </div>`;

    // Libellé de rôle explicite (pas seulement un title au survol, invisible sur mobile
    // et pas assez clair d'après le retour utilisateur) : "Editor — can add/edit places"
    // vs "Viewer — can only see the itinerary", affiché en permanence sous le nom.
    const editorLabel = currentLang === 'fr' ? 'Éditeur — peut modifier le voyage' : 'Editor — can edit the trip';
    const viewerLabel = currentLang === 'fr' ? 'Lecteur — peut seulement consulter' : 'Viewer — can only view';
    Object.keys(members).forEach(uid => {
        const role = members[uid];
        const name = memberNames[uid] || uid;
        const initial = name.trim().charAt(0).toUpperCase();
        rowsHtml += `
        <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f6f4fb;">
            <div style="width:34px; height:34px; border-radius:50%; background:#8B5CF6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;">${initial}</div>
            <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:700; color:#212832;">${name}</div>
                <div style="font-size:9.5px; color:#94a3b8;">${role === 'edit' ? editorLabel : viewerLabel}</div>
            </div>
            <div class="share-role-toggle" data-uid="${uid}" data-role="${role}" title="${currentLang === 'fr' ? 'Cliquer pour basculer entre éditeur et lecteur' : 'Click to switch between editor and viewer'}" style="width:28px; height:28px; border-radius:50%; background:${role === 'edit' ? '#FCE7F0' : '#f1f5f9'}; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;">${role === 'edit' ? editIconSvg : viewIconSvg}</div>
            <div class="share-remove-btn" data-uid="${uid}" title="${currentLang === 'fr' ? 'Retirer' : 'Remove'}" style="width:20px; height:20px; border-radius:50%; color:#cbd5e1; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; font-weight:700; flex-shrink:0;">&times;</div>
        </div>`;
    });

    const pendingLabel = currentLang === 'fr' ? 'Invitation en attente' : 'Invite pending';
    pendingInvites.forEach(inv => {
        const initial = (inv.toUsername || '?').trim().charAt(0).toUpperCase();
        rowsHtml += `
        <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f6f4fb; opacity:.6;">
            <div style="width:34px; height:34px; border-radius:50%; background:#94a3b8; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;">${escapeHtml(initial)}</div>
            <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:700; color:#212832;">${escapeHtml(inv.toUsername || '')}</div>
                <div style="font-size:9.5px; color:#94a3b8;">${pendingLabel}</div>
            </div>
            <div class="share-cancel-invite-btn" data-invite-id="${inv.id}" title="${currentLang === 'fr' ? 'Annuler' : 'Cancel'}" style="width:20px; height:20px; border-radius:50%; color:#cbd5e1; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; font-weight:700; flex-shrink:0;">&times;</div>
        </div>`;
    });

    container.innerHTML = rowsHtml;

    container.querySelectorAll('.share-role-toggle').forEach(el => {
        el.addEventListener('click', async () => {
            const uid = el.dataset.uid;
            const newRole = el.dataset.role === 'edit' ? 'view' : 'edit';
            if (typeof window.setTripCollaboratorRole === 'function') await window.setTripCollaboratorRole(tripId, uid, newRole);
            window.renderShareTripBuddies(tripId);
        });
    });
    container.querySelectorAll('.share-remove-btn').forEach(el => {
        el.addEventListener('click', async () => {
            if (typeof window.removeTripCollaborator === 'function') await window.removeTripCollaborator(tripId, el.dataset.uid);
            window.renderShareTripBuddies(tripId);
        });
    });
    container.querySelectorAll('.share-cancel-invite-btn').forEach(el => {
        el.addEventListener('click', async () => {
            if (typeof window.declineTripInvite === 'function') await window.declineTripInvite(el.dataset.inviteId);
            window.renderShareTripBuddies(tripId);
        });
    });
};

window.initTrips = function() {
    let trips = getMyTripsList();

    if (trips.length === 0 && sharedTripsCache.length === 0) {
        // Le bouton "+ New trip" de la sidebar est caché par défaut sur mobile (tiroir
        // fermé) : on duplique donc un bouton directement dans l'état vide, au premier
        // plan, pour qu'il reste cliquable sans devoir d'abord ouvrir le menu.
        document.getElementById('empty-state').innerHTML = (currentLang === 'fr'
            ? "Vous n'avez pas encore de voyage.<br>Cliquez sur le bouton « New trip » pour en créer un !"
            : "You haven't created any trips yet.<br>Click the 'New trip' button to create one!")
            + `<br><button class="gen-btn empty-state-new-trip-btn" onclick="openNewTripModal()">+ ${currentLang === 'fr' ? 'Nouveau voyage' : 'New trip'}</button>`;
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('trip-detail-content').style.display = 'none';
        document.getElementById('sidebar-title').textContent = `MY TRIPS (0)`;
        document.getElementById('trips-list-container').innerHTML = '';
        return;
    }
    
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('trip-detail-content').style.display = 'block';
    
    let activeId = localStorage.getItem('activeTripId');
    if (activeId) {
        currentTrip = trips.find(t => t.id === activeId);
    }
    if (!currentTrip) {
        currentTrip = trips[trips.length - 1];
    }
    if (!currentTrip.days) currentTrip.days = [];

    if(document.getElementById('trip-map-container') && !tripPageMap) {
        tripPageMap = L.map('trip-map-container', { zoomControl: false }).setView([37.541, 127.025], 6);
        createOSMTileLayer(tripPageMap).addTo(tripPageMap);
        tripPageLayer = L.featureGroup().addTo(tripPageMap);
    }

    window.renderTripsSidebar();
    window.renderTrip();
}

window.renderTripsSidebar = function() {
    const listContainer = document.getElementById('trips-list-container');
    if(!listContainer) return;

    let trips = getMyTripsList();
    let wList = getWishlistLocs();

    listContainer.innerHTML = '';
    // Un voyage partagé accepté (sharedTripsCache) compte désormais dans "MY TRIPS", au
    // même titre qu'un voyage possédé — plus de section "Shared with me" séparée (demande
    // du 07/09/2026) : tant que l'invitation n'est pas acceptée, le voyage n'apparaît nulle
    // part (voir sendTripInvite/acceptTripInvite/declineTripInvite) ; une fois acceptée, il
    // rejoint directement la liste principale plutôt qu'une liste à part qui laissait croire
    // qu'il fallait encore une action pour "vraiment" l'avoir.
    document.getElementById('sidebar-title').textContent = `MY TRIPS (${trips.length + sharedTripsCache.length})`;

    trips.forEach(t => {
        let allAssignedIds = (t.days || []).flat();
        let unassignedCount = wList.filter(w => w.tripId === t.id && !allAssignedIds.includes(Number(w.id))).length;
        let totalLocs = allAssignedIds.length + unassignedCount;

        let dateStr = t.dateType === 'duration' ? (t.duration || 'Flexible') : `${t.startDate || '?'} to ${t.endDate || '?'}`;

        let pill = document.createElement('div');
        pill.className = `trip-pill ${activeTripAccess.isOwner && currentTrip && currentTrip.id === t.id ? 'active' : ''}`;
        pill.setAttribute('draggable', 'true');
        pill.ondragstart = (e) => window.dragTripStart(e, t.id, 'trip');
        pill.ondragover = (e) => window.dragTripOver(e);
        pill.ondragleave = (e) => window.dragTripLeave(e);
        pill.ondrop = (e) => window.dropTrip(e, t.id);
        pill.onclick = () => {
            activeTripAccess.isOwner = true;
            activeTripAccess.role = 'edit';
            document.body.classList.remove('trip-view-only', 'trip-not-owner');
            localStorage.setItem('activeTripId', t.id);
            window.initTrips();
            // Sur mobile, la liste des voyages vit dans le tiroir #app-sidebar (voir
            // toggleMobileMenu()) : sans ça, le voyage qu'on vient de sélectionner reste
            // caché derrière le tiroir resté ouvert, il faut alors une action en plus
            // rien que pour le voir.
            const sidebarEl = document.getElementById('app-sidebar');
            if (sidebarEl && sidebarEl.classList.contains('open')) window.toggleMobileMenu();
        };

        pill.innerHTML = `
            <div class="trip-pill-name">${t.name}</div>
            <div class="share-trip-btn" title="${currentLang === 'fr' ? 'Partager' : 'Share'}" onclick="openShareTripModal('${t.id}', event)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </div>
            <div class="del-trip-btn" onclick="openDeleteModal('${t.id}', event)" title="Delete trip">✕</div>
            ${t.isShared ? `<div class="trip-pill-avatars" data-trip-id="${t.id}"></div>` : ''}
            <div class="trip-pill-meta">${dateStr} &middot; ${totalLocs} locations</div>
        `;
        listContainer.appendChild(pill);
    });

    // Avatars des collaborateurs sous le nom de chaque voyage partagé (t.isShared) —
    // en passe async SÉPARÉE du rendu synchrone ci-dessus (une requête Firestore par
    // voyage partagé, jamais bloquant pour le premier affichage de la liste). Le survol
    // d'un avatar affiche le pseudo (bulle CSS, voir wireAvatarTapTooltips) — un tap
    // fonctionne aussi sur mobile, contrairement à l'ancien attribut title natif seul.
    document.querySelectorAll('.trip-pill-avatars').forEach(async (container) => {
        const tripId = container.dataset.tripId;
        if (typeof window.loadSharedTrip !== 'function') return;
        const shared = await window.loadSharedTrip(tripId);
        if (!shared || !shared.members) return;
        const memberNames = shared.memberNames || {};
        const uids = Object.keys(shared.members);
        if (uids.length === 0) return;
        container.innerHTML = uids.map(uid => {
            const name = memberNames[uid] || uid;
            const initial = name.trim().charAt(0).toUpperCase();
            return `<div class="trip-pill-avatar" data-avatar-name>${escapeHtml(initial)}<span class="avatar-name-bubble">${escapeHtml(name)}</span></div>`;
        }).join('');
        wireAvatarTapTooltips(container);
    });

    // Voyages que d'AUTRES personnes ont partagés avec ce compte ET que ce compte a
    // acceptés (sharedTripsCache, jamais dans myTrips — voir refreshSharedTrips()) :
    // ajoutés à la SUITE de la même liste "MY TRIPS" plutôt que dans une section à part
    // (demande du 07/09/2026), avec un badge "Shared by X" + niveau d'accès à la place des
    // méta habituelles, pas de glisser-déposer ni de suppression (ce n'est pas notre
    // voyage) — un bouton "Quitter" remplace le bouton "Supprimer".
    sharedTripsCache.forEach(t => {
        const roleLabel = t._myRole === 'edit' ? (currentLang === 'fr' ? 'Peut modifier' : 'Can edit') : (currentLang === 'fr' ? 'Lecture seule' : 'View only');
        const pill = document.createElement('div');
        pill.className = `trip-pill trip-pill-shared ${!activeTripAccess.isOwner && currentTrip && currentTrip.id === t._sharedTripId ? 'active' : ''}`;
        pill.onclick = () => window.openSharedTrip(t._sharedTripId);
        pill.innerHTML = `
            <div class="trip-pill-name">${escapeHtml(t.name || (currentLang === 'fr' ? 'Voyage partagé' : 'Shared trip'))}</div>
            <div class="del-trip-btn" onclick="leaveSharedTrip('${t._sharedTripId}', event)" title="${currentLang === 'fr' ? 'Quitter ce voyage' : 'Leave this trip'}">✕</div>
            <div class="trip-pill-meta">${currentLang === 'fr' ? 'Partagé par' : 'Shared by'} ${escapeHtml(t.ownerName || 'ARMY')} &middot; ${roleLabel}</div>
        `;
        listContainer.appendChild(pill);
    });
}

window.dragTripStart = function(e, id, type) { 
    dragType = type; 
    e.dataTransfer.setData('text/plain', id); 
    e.dataTransfer.setData('type', type);
    e.currentTarget.style.opacity = '0.4'; 
}
window.dragTripOver = function(e) { if(dragType === 'trip') { e.preventDefault(); e.currentTarget.classList.add('drag-over-trip'); } }
window.dragTripLeave = function(e) { if(dragType === 'trip') { e.currentTarget.classList.remove('drag-over-trip'); } }
window.dropTrip = function(e, targetId) {
    if(dragType !== 'trip') return;
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-trip');
    const draggedId = e.dataTransfer.getData('text/plain');
    if(draggedId && draggedId !== targetId) {
        let trips = getMyTripsList();
        const fromIdx = trips.findIndex(t => t.id === draggedId);
        const toIdx = trips.findIndex(t => t.id === targetId);
        if(fromIdx > -1 && toIdx > -1) {
            const [moved] = trips.splice(fromIdx, 1);
            trips.splice(toIdx, 0, moved);
            localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
            window.renderTripsSidebar();
        }
    }
    document.querySelectorAll('.trip-pill').forEach(p => p.style.opacity = '1');
}

window.populateEditTripFilters = function() {
    const groupSel = document.getElementById('edit-trip-group');
    const memberSel = document.getElementById('edit-trip-member');
    const countrySel = document.getElementById('edit-trip-country');
    const citySel = document.getElementById('edit-trip-city');
    if(!groupSel) return;

    const unlockedGroups = getUnlockedGroups();
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    if(groupSel.options.length <= 1) {
        groupSel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Tous les Groupes' : 'All Groups'}</option>`;
        const groups = [...new Set(baseLocs.map(l => l.group))].sort();
        groups.forEach(g => groupSel.innerHTML += `<option value="${g}">${g}</option>`);
    }
    
    if(currentTrip.group !== undefined) groupSel.value = currentTrip.group;

    let locs = baseLocs;
    if(groupSel.value) locs = locs.filter(l => l.group === groupSel.value);

    const currentMember = currentTrip.member || "All";
    memberSel.innerHTML = `<option value="All">${currentLang === 'fr' ? 'Tous les membres' : 'All Members'}</option>`;
    if(groupSel.value && filterData[groupSel.value]) {
        filterData[groupSel.value].members.forEach(m => memberSel.innerHTML += `<option value="${m}">${m}</option>`);
    } else {
        const members = [...new Set(locs.map(l => l.member))].filter(m => m !== 'All');
        members.forEach(m => memberSel.innerHTML += `<option value="${m}">${m}</option>`);
    }
    memberSel.value = currentMember;

    const currentCountry = currentTrip.country || "";
    countrySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Tous les pays' : 'All Countries'}</option>`;
    const countries = [...new Set(locs.map(l => l.country))].sort();
    countries.forEach(c => countrySel.innerHTML += `<option value="${c}">${c}</option>`);
    if(countries.includes(currentCountry)) countrySel.value = currentCountry;

    const currentCity = currentTrip.city || "";
    let cityLocs = locs;
    if(countrySel.value) cityLocs = locs.filter(l => l.country === countrySel.value);
    citySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Toutes les villes' : 'All Cities'}</option>`;
    const cities = [...new Set(cityLocs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySel.innerHTML += `<option value="${c}">${c}</option>`);
    if(cities.includes(currentCity)) citySel.value = currentCity;
}

window.updateEditTripOptions = function(fieldChanged) {
    if(fieldChanged === 'group') {
        currentTrip.group = document.getElementById('edit-trip-group').value;
        currentTrip.member = "All"; 
    } else if (fieldChanged === 'member') {
        currentTrip.member = document.getElementById('edit-trip-member').value;
    } else if(fieldChanged === 'country') {
        currentTrip.country = document.getElementById('edit-trip-country').value;
        currentTrip.city = ""; 
    } else if(fieldChanged === 'city') {
        currentTrip.city = document.getElementById('edit-trip-city').value;
    }
    window.saveTrip();
    window.renderTrip();
}

// Aperçu en lecture seule des horaires réalistes d'un jour (arrivée/départ, trajet,
// pause déjeuner) — voir computeDayTimeline. Toujours recalculé à partir de l'ordre
// ACTUEL des lieux du jour (y compris après un glisser-déposer manuel), donc jamais
// périmé. Un lieu qui ne tient plus dans la journée n'est jamais retiré ici (ce serait
// surprenant pour un jour édité à la main) : juste signalé par une pastille ⚠.
const TRIPS_TXT_DICT = {
    en: { lunchBreak: "Lunch break (~1h)", fromHotel: "From your accommodation" },
    fr: { lunchBreak: "Pause déjeuner (~1h)", fromHotel: "Depuis votre hébergement" }
};
// `isFirstOfDay` est passé explicitement (plutôt que déduit de la position dans un
// tableau) car cette fonction est appelée une fois par lieu dans refreshDayTimelines(),
// pour ne mettre à jour que la pastille de CE lieu sans reconstruire toute la liste.
function renderDayTimelineHTML(it, isFirstOfDay, dayColor) {
    const txt = TRIPS_TXT_DICT[currentLang] || TRIPS_TXT_DICT.en;
    const color = dayColor || '#D42759';
    const formatMin = (mins) => {
        const d = new Date();
        d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    let html = '';
    if (it.leg) {
        const legLabel = `${it.leg.mode} · ~${it.leg.minMinutes}-${it.leg.maxMinutes} min`;
        html += `<div style="font-size:10.5px; font-weight:600; color:#64748b; padding:3px 0 3px 4px;">${isFirstOfDay ? '📍 ' + txt.fromHotel + ' · ' : ''}${legLabel}</div>`;
    }
    if (it.lunchBefore) {
        html += `<div style="font-size:10.5px; font-weight:600; color:${color}; padding:3px 0 3px 4px;">${txt.lunchBreak}</div>`;
    }
    const warn = (it.pastClose || it.pastHardEnd) ? ' <span style="color:#ef4444;" title="Hors des horaires réalistes de la journée">⚠</span>' : '';
    html += `<div style="font-size:10.5px; font-weight:700; color:${color}; padding-left:4px;">${formatMin(it.arrival)} - ${formatMin(it.departure)}${warn}</div>`;
    return html;
}

// Recalcule et réinjecte l'aperçu horaire de chaque jour à partir des .day-loc
// actuellement présents dans le DOM (sans reconstruire les lignes de lieux elles-mêmes,
// pour ne jamais perturber un glisser-déposer en cours ou en cours d'affichage).
window.refreshDayTimelines = function() {
    if (!currentTrip) return;
    document.querySelectorAll('.day-card').forEach((card, cardIdx) => {
        const rows = Array.from(card.querySelectorAll('.day-loc'));
        if (rows.length === 0) return;
        const dayColor = TRIP_DAY_COLORS[cardIdx % TRIP_DAY_COLORS.length];
        const locs = rows.map(el => celebLocations.find(l => l.id === parseInt(el.dataset.id))).filter(Boolean);
        const items = computeDayTimeline(locs, currentTrip.homeBase);
        items.forEach((it, idx) => {
            const rowEl = rows[idx];
            if (!rowEl) return;
            let badge = rowEl.querySelector('.day-loc-timing');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'day-loc-timing';
                rowEl.appendChild(badge);
            }
            badge.innerHTML = renderDayTimelineHTML(it, idx === 0, dayColor);
        });
    });
}

// Avatars des personnes qui ont accès à ce voyage (voir la demande du 31/08/2026),
// affichés en haut du détail : le créateur d'abord, puis chaque collaborateur — masqué
// entièrement si le voyage n'a jamais été partagé, pour ne pas encombrer l'écran d'un
// avatar "solo" sans intérêt.
// Bulle de pseudo au tap (mobile) pour un groupe d'avatars empilés — le survol marche
// nativement via CSS (:hover), mais un écran tactile n'a pas de "survol" : sans ce
// wiring, aucun pseudo n'apparaissait jamais quand le site est utilisé au doigt (bug
// rapporté à plusieurs reprises les 06 et 07/09/2026). Un tap sur un avatar bascule sa
// bulle, un tap ailleurs (ou sur un autre avatar) la referme.
let _avatarTooltipDocListenerWired = false;
function wireAvatarTapTooltips(container) {
    if (!container || container.dataset.tooltipsWired) return;
    container.dataset.tooltipsWired = '1';
    container.addEventListener('click', (e) => {
        const avatar = e.target.closest('[data-avatar-name]');
        document.querySelectorAll('.tooltip-active').forEach(el => { if (el !== avatar) el.classList.remove('tooltip-active'); });
        if (avatar) { e.stopPropagation(); avatar.classList.toggle('tooltip-active'); }
    });
    // Un seul écouteur global, jamais un par groupe d'avatars (sinon un clic ailleurs sur
    // la page ré-exécuterait N fois le même querySelectorAll pour rien).
    if (!_avatarTooltipDocListenerWired) {
        _avatarTooltipDocListenerWired = true;
        document.addEventListener('click', () => document.querySelectorAll('.tooltip-active').forEach(el => el.classList.remove('tooltip-active')));
    }
}

window.renderTripBuddiesAvatars = async function() {
    const container = document.getElementById('trip-buddies-avatars');
    if (!container || !currentTrip) return;

    let ownerName, members = {}, memberNames = {};
    if (activeTripAccess.isOwner) {
        // Toujours affiché, même pour un voyage jamais partagé (au moins son propre
        // avatar) : sans ça, rien n'indiquait où trouver le partage depuis la fiche du
        // voyage elle-même — voir la demande du 04/09/2026 (bouton "+ Share this trip"
        // juste à côté, dans le HTML).
        ownerName = (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'You').trim();
        if (currentTrip.isShared && typeof window.loadSharedTrip === 'function') {
            const shared = await window.loadSharedTrip(currentTrip.id);
            if (shared) { members = shared.members || {}; memberNames = shared.memberNames || {}; }
            // Auto-réparation (createSharedTrip est idempotent, voir plus haut) : si ce
            // voyage a été partagé avant le correctif du 06/09/2026, son document
            // Firestore peut manquer name/ownerName (affichés comme "undefined"/"ARMY"
            // chez les personnes à qui il a été partagé) — corrigé dès que son
            // propriétaire rouvre la fiche, sans jamais toucher aux collaborateurs.
            if (shared && (shared.name !== currentTrip.name || !shared.ownerName) && typeof window.createSharedTrip === 'function') {
                window.createSharedTrip(currentTrip);
            }
        }
    } else {
        ownerName = currentTrip.ownerName || 'ARMY';
        members = currentTrip.members || {};
        memberNames = currentTrip.memberNames || {};
    }

    const palette = ['#D42759', '#8B5CF6', '#F06090', '#10b981', '#3b82f6', '#f59e0b'];
    let html = `<div class="trip-buddy-avatar" style="background:${palette[0]};" data-avatar-name>${escapeHtml(ownerName.charAt(0).toUpperCase())}<span class="avatar-name-bubble">${escapeHtml(ownerName)}</span></div>`;
    Object.keys(members).forEach((uid, i) => {
        const name = memberNames[uid] || uid;
        const role = members[uid];
        const bg = palette[(i + 1) % palette.length];
        const initial = escapeHtml(name.charAt(0).toUpperCase());
        if (activeTripAccess.isOwner) {
            // Propriétaire consultant un membre : un clic ouvre le sélecteur Editor/Viewer
            // (demande du 07/09/2026, capture d'écran fournie) plutôt qu'une simple bulle de
            // nom — voir openTripRoleMenu() plus bas, qui remplace aussi le rôle déjà
            // modifiable depuis la modale "+ Share this trip" (les deux restent valides).
            html += `<div class="trip-buddy-avatar role-clickable" style="background:${bg};" onclick="openTripRoleMenu(event, this, '${uid}', '${escapeHtml(name).replace(/'/g, "\\'")}', '${role}')">${initial}</div>`;
        } else {
            html += `<div class="trip-buddy-avatar" style="background:${bg};" data-avatar-name>${initial}<span class="avatar-name-bubble">${escapeHtml(name)}</span></div>`;
        }
    });
    container.innerHTML = html;
    container.classList.remove('hidden');
    wireAvatarTapTooltips(container);
};

// Popup Editor/Viewer au clic sur l'avatar d'un membre, en dehors de .trip-hero-banner
// (position:fixed + coordonnées calculées, plutôt qu'un enfant positionné en absolu) : la
// bannière a overflow:hidden pour rogner sa photo de couverture, ce qui aurait purement et
// simplement masqué tout popup débordant en dessous d'elle (demande du 07/09/2026).
function ensureTripRoleMenuEl() {
    let el = document.getElementById('trip-role-menu-popup');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'trip-role-menu-popup';
    document.body.appendChild(el);
    if (!window.__tripRoleMenuDocListenerWired) {
        window.__tripRoleMenuDocListenerWired = true;
        document.addEventListener('click', () => el.classList.remove('open'));
    }
    return el;
}
window.openTripRoleMenu = function(evt, avatarEl, uid, name, role) {
    evt.stopPropagation();
    const menu = ensureTripRoleMenuEl();
    const wasOpenForThis = menu.classList.contains('open') && menu.dataset.uid === uid;
    menu.classList.remove('open');
    if (wasOpenForThis) return; // reclic sur le même avatar : referme plutôt que rouvrir
    menu.dataset.uid = uid;
    const editorLabel = currentLang === 'fr' ? 'Éditeur' : 'Editor';
    const viewerLabel = currentLang === 'fr' ? 'Lecteur' : 'Viewer';
    menu.innerHTML = `
        <div class="trip-role-menu-name">${escapeHtml(name)}</div>
        <div class="trip-role-menu-pills">
            <button type="button" class="trip-role-pill ${role === 'edit' ? 'active' : ''}" data-role="edit">${editorLabel}</button>
            <button type="button" class="trip-role-pill ${role !== 'edit' ? 'active' : ''}" data-role="view">${viewerLabel}</button>
        </div>`;
    const rect = avatarEl.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.left = `${rect.left}px`;
    menu.classList.add('open');
    menu.querySelectorAll('.trip-role-pill').forEach(pill => {
        pill.onclick = async (e) => {
            e.stopPropagation();
            const newRole = pill.dataset.role;
            if (typeof window.setTripCollaboratorRole === 'function' && currentTrip) {
                await window.setTripCollaboratorRole(currentTrip.id, uid, newRole);
            }
            menu.classList.remove('open');
            if (typeof window.renderTripBuddiesAvatars === 'function') window.renderTripBuddiesAvatars();
        };
    });
};

// Photo de couverture d'un voyage (voir la demande du 06/09/2026) : stockée directement
// en dataURL sur le document du voyage (comme userPhoto pour un compte, voir
// account.html) — pas de Firebase Storage sur ce site 100% statique, donc redimensionnée
// et compressée assez fort côté client pour rester sous la limite de 1 Mo par champ
// Firestore. Sert de fond à la bannière #trip-hero-banner (demande du 07/09/2026 : une
// vraie bannière pleine largeur plutôt qu'une miniature à côté du titre — voir le CSS de
// .trip-hero-banner dans trips.html), et à l'icône de la liste "Trip groups" de
// friends.html (voir listMyTripGroups()).
// Palette de dégradés de secours pour un voyage sans photo de couverture (demande du
// 07/09/2026 : "il faut changer la couleur du dégradé pour chaque trip" — jusqu'ici, un
// seul dégradé fixe pour tous, codé en dur dans le CSS de .trip-hero-banner). L'index choisi
// est stocké sur currentTrip.coverGradient une fois choisi explicitement via le modal
// "Change cover" ; tant qu'aucun choix n'a été fait, resolveTripGradientIndex() en dérive
// un déterministe à partir de l'id du voyage, pour que deux voyages sans cover affichent
// des couleurs différentes dès le départ plutôt que le même dégradé partout.
const TRIP_COVER_GRADIENTS = [
    'linear-gradient(135deg, #F06090 0%, #D42759 45%, #8B5CF6 100%)',
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #f472b6 0%, #fb923c 100%)',
    'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)',
];
function resolveTripGradientIndex(trip) {
    if (!trip) return 0;
    if (typeof trip.coverGradient === 'number' && trip.coverGradient >= 0 && trip.coverGradient < TRIP_COVER_GRADIENTS.length) return trip.coverGradient;
    const id = String(trip.id || '');
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return hash % TRIP_COVER_GRADIENTS.length;
}

window.renderTripCoverPreview = function() {
    const el = document.getElementById('trip-hero-banner');
    if (!el || !currentTrip) return;
    if (currentTrip.coverImage) {
        el.style.backgroundImage = `url('${currentTrip.coverImage}')`;
        el.classList.add('has-cover');
    } else {
        el.classList.remove('has-cover');
        el.style.backgroundImage = TRIP_COVER_GRADIENTS[resolveTripGradientIndex(currentTrip)];
    }
};

function resizeTripCoverDataUrl(dataUrl, maxSize) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Modale "Change cover" (demande du 07/09/2026, remplace l'ancien bouton qui déclenchait
// directement un <input type=file>) : deux onglets mutuellement exclusifs — "Upload photo"
// / "Choose gradient" — avec un aperçu de la bannière en haut qui se met à jour au fur et à
// mesure du choix, avant validation par "Apply". `coverModalPendingPhoto`/
// `coverModalPendingGradientIdx` restent de simples brouillons tant qu'Apply n'a pas été
// cliqué — fermer la modale sans valider (ou changer d'onglet) ne modifie jamais
// currentTrip.
let coverModalPendingPhoto = null;
let coverModalPendingGradientIdx = 0;
let coverModalActiveTab = 'upload';

function ensureChangeCoverModal() {
    let modal = document.getElementById('change-cover-modal');
    if (modal) return modal;
    const isFr = currentLang === 'fr';
    modal = document.createElement('div');
    modal.id = 'change-cover-modal';
    modal.className = 'modal hidden';
    modal.style.zIndex = '10500';
    const swatchesHtml = TRIP_COVER_GRADIENTS.map((g, i) => `<div class="cover-gradient-swatch" data-idx="${i}" style="background:${g};"></div>`).join('');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:420px;">
            <span class="close-btn" onclick="document.getElementById('change-cover-modal').classList.add('hidden')">&times;</span>
            <div style="font-size:15px; font-weight:700; color:#212832; margin-bottom:14px; text-align:center;">${isFr ? 'Changer la couverture' : 'Change cover'}</div>
            <div id="cover-modal-preview" class="cover-modal-preview"></div>
            <div class="cover-modal-tabs">
                <div class="cover-modal-tab active" data-tab="upload">${isFr ? 'Importer une photo' : 'Upload photo'}</div>
                <div class="cover-modal-tab" data-tab="gradient">${isFr ? 'Choisir un dégradé' : 'Choose gradient'}</div>
            </div>
            <div id="cover-modal-upload-panel" class="cover-modal-panel">
                <button type="button" id="cover-modal-upload-btn" class="cover-modal-upload-btn">${isFr ? 'Choisir un fichier' : 'Choose a file'}</button>
                <input type="file" id="cover-modal-file-input" accept="image/*,.heic,.heif" class="hidden">
            </div>
            <div id="cover-modal-gradient-panel" class="cover-modal-panel hidden">
                <div class="cover-gradient-grid">${swatchesHtml}</div>
            </div>
            <button type="button" class="stp-cal-apply-btn" style="width:100%; margin-top:16px;" onclick="applyChangeCover()">${isFr ? 'Appliquer' : 'Apply'}</button>
        </div>`;
    document.body.appendChild(modal);

    modal.querySelectorAll('.cover-modal-tab').forEach(tabEl => {
        tabEl.addEventListener('click', () => {
            coverModalActiveTab = tabEl.dataset.tab;
            modal.querySelectorAll('.cover-modal-tab').forEach(t => t.classList.toggle('active', t === tabEl));
            document.getElementById('cover-modal-upload-panel').classList.toggle('hidden', coverModalActiveTab !== 'upload');
            document.getElementById('cover-modal-gradient-panel').classList.toggle('hidden', coverModalActiveTab !== 'gradient');
            updateCoverModalPreview();
        });
    });
    modal.querySelector('#cover-modal-upload-btn').addEventListener('click', () => modal.querySelector('#cover-modal-file-input').click());
    modal.querySelector('#cover-modal-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // fileToResizedDataUrl() gère le HEIC (photo iPhone) — voir le commentaire détaillé
        // sur memoryPhotoInput plus haut ; passe aussi par resizeTripCoverDataUrl() en interne.
        try {
            coverModalPendingPhoto = await fileToResizedDataUrl(file, 800);
            updateCoverModalPreview();
        } catch (err) {
            console.warn('Import de la photo de couverture échoué :', err);
            alert(currentLang === 'fr'
                ? "Impossible d'importer cette photo. Essayez un autre fichier (format JPEG/PNG)."
                : "Couldn't import this photo. Try a different file (JPEG/PNG format).");
        }
        e.target.value = '';
    });
    modal.querySelectorAll('.cover-gradient-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            coverModalPendingGradientIdx = parseInt(sw.dataset.idx, 10);
            modal.querySelectorAll('.cover-gradient-swatch').forEach(s => s.classList.toggle('selected', s === sw));
            updateCoverModalPreview();
        });
    });
    return modal;
}

function updateCoverModalPreview() {
    const preview = document.getElementById('cover-modal-preview');
    if (!preview) return;
    // Un seul choix visible à la fois (demande du 07/09/2026) : l'aperçu reflète
    // uniquement l'onglet ACTIF, jamais les deux en même temps.
    if (coverModalActiveTab === 'upload') {
        const src = coverModalPendingPhoto || (currentTrip && currentTrip.coverImage) || '';
        if (src) { preview.style.backgroundImage = `url('${src}')`; return; }
        preview.style.backgroundImage = TRIP_COVER_GRADIENTS[coverModalPendingGradientIdx];
    } else {
        preview.style.backgroundImage = TRIP_COVER_GRADIENTS[coverModalPendingGradientIdx];
    }
}

window.openChangeCoverModal = function() {
    if (!currentTrip) return;
    const modal = ensureChangeCoverModal();
    coverModalPendingPhoto = null;
    coverModalPendingGradientIdx = resolveTripGradientIndex(currentTrip);
    // Par défaut, ouvre sur l'onglet qui correspond à l'état actuel du voyage : une photo
    // déjà en place → onglet "Upload" (pour la remplacer) ; pas de photo → onglet
    // "Gradient" (pour changer sa couleur), plutôt que toujours le même onglet par défaut.
    coverModalActiveTab = currentTrip.coverImage ? 'upload' : 'gradient';
    modal.querySelectorAll('.cover-modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === coverModalActiveTab));
    document.getElementById('cover-modal-upload-panel').classList.toggle('hidden', coverModalActiveTab !== 'upload');
    document.getElementById('cover-modal-gradient-panel').classList.toggle('hidden', coverModalActiveTab !== 'gradient');
    modal.querySelectorAll('.cover-gradient-swatch').forEach((s, i) => s.classList.toggle('selected', i === coverModalPendingGradientIdx));
    modal.querySelector('#cover-modal-file-input').value = '';
    updateCoverModalPreview();
    modal.classList.remove('hidden');
};

window.applyChangeCover = function() {
    if (!currentTrip) return;
    if (coverModalActiveTab === 'upload' && coverModalPendingPhoto) {
        currentTrip.coverImage = coverModalPendingPhoto;
    } else if (coverModalActiveTab === 'gradient') {
        currentTrip.coverImage = '';
        currentTrip.coverGradient = coverModalPendingGradientIdx;
    }
    // Sinon (onglet "Upload" sans nouveau fichier choisi) : on ne touche à rien, ferme
    // simplement la modale — évite d'effacer une photo déjà en place pour rien.
    window.renderTripCoverPreview();
    if (typeof window.saveTrip === 'function') window.saveTrip();
    const modal = document.getElementById('change-cover-modal');
    if (modal) modal.classList.add('hidden');
};

window.renderTrip = function() {
    if (!currentTrip) return;

    // Jamais currentTrip.name tel quel : sur un voyage partagé avant le correctif
    // createSharedTrip (voir plus haut), le champ peut être absent côté Firestore — assigner
    // `undefined` à .value le convertit en la chaîne littérale "undefined" affichée dans la
    // bannière (bug rapporté le 07/09/2026), d'où ce filet de sécurité.
    document.getElementById('edit-trip-name').value = currentTrip.name || (currentLang === 'fr' ? 'Voyage partagé' : 'Shared trip');
    if (typeof window.renderTripBuddiesAvatars === 'function') window.renderTripBuddiesAvatars();
    if (typeof window.renderTripCoverPreview === 'function') window.renderTripCoverPreview();

    let metaText = "";
    if (currentTrip.group) metaText += currentTrip.group + " • ";
    if (currentTrip.country) metaText += currentTrip.country + " • ";
    let allAssignedIds = currentTrip.days.flat().map(Number);
    metaText += `${allAssignedIds.length} location${allAssignedIds.length > 1 ? 's' : ''}`;
    const datesDisplay = document.getElementById('dates-display');
    if(datesDisplay) {
        datesDisplay.textContent = metaText;
        if(metaText.trim() === '0 location') datesDisplay.style.display = 'none';
        else datesDisplay.style.display = 'inline-flex';
    }

    window.populateEditTripFilters();

    renderFlexibleMonthGrid('edit');
    if(currentTrip.dateType === 'duration') {
        document.getElementById('edit-date-specific-panel').classList.add('hidden');
        document.getElementById('edit-date-flexible-panel').classList.remove('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.remove('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.add('active');

        document.querySelectorAll('.edit-banner .pill-btn').forEach(el => el.classList.remove('active'));
        if (currentTrip.duration) {
            const parts = currentTrip.duration.split(' in ');
            if (parts[0]) {
                document.querySelectorAll('.edit-banner .pill-btn[data-type="edit-duration"]').forEach(el => {
                    if (el.textContent === parts[0]) el.classList.add('active');
                });
            }
            if (parts[1]) {
                document.querySelectorAll('.edit-banner .pill-btn[data-type="edit-month"]').forEach(el => {
                    if (el.textContent === parts[1]) el.classList.add('active');
                });
            }
        }
    } else {
        document.getElementById('edit-date-specific-panel').classList.remove('hidden');
        document.getElementById('edit-date-flexible-panel').classList.add('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.add('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.remove('active');
        document.getElementById('date-start').value = currentTrip.startDate || '';
        document.getElementById('date-end').value = currentTrip.endDate || '';
        // Juste les cases résumées : le calendrier lui-même reste replié par défaut (voir
        // toggleDateCalendar), pas besoin de construire sa grille tant qu'il n'est pas ouvert.
        updateDateBoxes('edit');
    }
    
    const unlockedGroups = getUnlockedGroups();
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let filteredLocs = baseLocs.filter(loc => {
        if (currentTrip.group && loc.group !== currentTrip.group) return false;
        if (currentTrip.member && currentTrip.member !== "All" && loc.member !== currentTrip.member && loc.member !== "All") return false;
        if (currentTrip.country && loc.country !== currentTrip.country) return false;
        if (currentTrip.city && loc.city !== currentTrip.city) return false;
        return true;
    });

    // Ne garder dans unassignedLocs QUE les lieux qui sont explicitement dans wishlistLocs pour ce voyage ET qui ne sont pas déjà assignés.
    let wList = getWishlistLocs();
    let unassignedLocs = wList
        .filter(w => w.tripId === currentTrip.id && !allAssignedIds.includes(Number(w.id)))
        .map(w => celebLocations.find(l => l.id === Number(w.id)))
        .filter(Boolean);

    const locList = document.getElementById('loc-list');
    locList.innerHTML = '';
    unassignedLocs.forEach(loc => {
        locList.appendChild(window.createLocRow(loc));
    });
    document.getElementById('saved-locs-label').textContent = currentLang === 'fr' ? `Lieux non assignés (${unassignedLocs.length})` : `UNASSIGNED LOCATIONS (${unassignedLocs.length})`;

    const box = document.getElementById('itinerary-box');
    const addBtn = box.querySelector('.add-day-btn');
    box.innerHTML = ''; 
    
    currentTrip.days.forEach((dayIds, index) => {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.dataset.day = index + 1;
        card.setAttribute('draggable', 'true'); 
        card.setAttribute('ondragstart', 'dragStart(event, "day")');
        card.setAttribute('ondragover', 'allowDrop(event)');
        card.setAttribute('ondrop', 'drop(event)');
        card.setAttribute('ondragleave', 'dragLeave(event)');
        
        let itemsHtml = '';
        dayIds.forEach(id => {
            const loc = celebLocations.find(l => l.id === Number(id));
            if (loc) itemsHtml += window.createLocRowHtml(loc);
        });

        const dayColor = TRIP_DAY_COLORS[index % TRIP_DAY_COLORS.length];
        card.innerHTML = `
            <div class="day-header">
                <div class="day-title" style="color:${dayColor};"><span class="drag-handle edit-only" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${index + 1}</div>
                <div class="x-btn edit-only" style="display:block;" onclick="removeDay(this)">✕</div>
            </div>
            <div class="day-items">${itemsHtml}</div>
            ${dayIds.length > 0 ? `<div class="day-mini-map" id="day-map-${index}"></div>` : ''}
        `;
        box.appendChild(card);
    });
    box.appendChild(addBtn);

    let tripCountries = [currentTrip.country].filter(Boolean);
    if(tripCountries.length === 0) {
        tripCountries = [...new Set(filteredLocs.map(l => l.country))].filter(Boolean);
    }

    const recoList = document.getElementById('reco-list');
    recoList.innerHTML = '';
    let recoCount = 0;
    
    if(tripCountries.length > 0) {
        celebLocations.forEach(loc => {
            // Recommandation si: même pays + PAS assigné à un jour + PAS déjà dans unassignedLocs
            if (tripCountries.includes(loc.country) && !allAssignedIds.includes(loc.id) && !unassignedLocs.some(u=>u.id===loc.id)) {
                if (recoCount < 4) {
                    recoList.innerHTML += `
                        <div class="loc-row">
                            <div class="loc-thumb" style="background-image:url('${loc.img}');"></div>
                            <div style="flex:1;"><div class="loc-name">${loc.name}</div><div class="loc-meta">${loc.city}, ${loc.country} &middot; ${getCatName(loc.category)}</div></div>
                            <button class="add-to-trip-btn edit-only" style="display:block;" onclick="quickAddLoc(${loc.id})">+ Add</button>
                        </div>
                    `;
                    recoCount++;
                }
            }
        });
    }
    document.getElementById('reco-section').style.display = recoCount > 0 ? 'block' : 'none';
    document.querySelectorAll('.day-loc').forEach(el => el.setAttribute('draggable', 'true'));
    
    if(tripPageMap) {
        setTimeout(() => { tripPageMap.invalidateSize(); drawTripOnMap(currentTrip, tripPageMap, tripPageLayer); }, 200);
    }
    renderDayMiniMaps(currentTrip);
    window.refreshDayTimelines();
}

// ==========================================
// CALENDRIER DE SÉLECTION DE PLAGE DE DATES (demande du 07/09/2026)
// ==========================================
// Remplace les deux <input type="date"> bruts par un vrai calendrier navigable, deux mois
// affichés côte à côte, avec sélection directe de la tranche (premier clic = début,
// second clic = fin) — comme les captures d'écran de référence fournies, MAIS sans les
// couleurs par prix (aucune notion de tarif sur ce site). Un seul composant, réutilisé
// pour le panneau "edit" (fiche voyage) et "create" (modale de création), distingués par
// un préfixe ('edit'/'create') qui retrouve les bons inputs cachés #date-start/#date-end
// ou #create-trip-start/#create-trip-end (toujours mis à jour en parallèle : c'est toujours
// eux que lit le reste du code, saveTrip()/createNewTripAdvanced() inclus, donc aucune
// autre fonction n'a besoin de changer).
const _calState = {};

function _calInputIds(prefix) {
    return prefix === 'edit' ? ['date-start', 'date-end'] : ['create-trip-start', 'create-trip-end'];
}

function renderDateRangeCalendar(prefix) {
    const [startId, endId] = _calInputIds(prefix);
    const startInput = document.getElementById(startId);
    const endInput = document.getElementById(endId);
    const container = document.getElementById(prefix + '-date-specific-panel');
    if (!startInput || !endInput || !container) return;
    const gridsEl = container.querySelector('.stp-cal-grids');
    if (!gridsEl) return;

    const curStart = startInput.value || null;
    const curEnd = endInput.value || null;
    let st = _calState[prefix];
    // Resynchronise depuis les inputs cachés seulement si leur valeur a changé depuis
    // l'extérieur (nouveau voyage ouvert, modale de création qui vient de s'ouvrir...) —
    // si on vient nous-mêmes de les mettre à jour via pickCalendarDate() ci-dessous, start/
    // end correspondent déjà à st et ce bloc ne s'exécute pas, ce qui préserve le mois
    // actuellement affiché plutôt que de sauter ailleurs à chaque clic.
    if (!st || st.start !== curStart || st.end !== curEnd) {
        const ref = curStart ? new Date(curStart + 'T00:00:00') : new Date();
        st = _calState[prefix] = { viewMonth: ref.getMonth(), viewYear: ref.getFullYear(), start: curStart, end: curEnd };
    }

    const monthNames = currentLang === 'fr'
        ? ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayLabels = currentLang === 'fr' ? ['L','M','M','J','V','S','D'] : ['M','T','W','T','F','S','S'];

    function buildMonthGrid(year, month) {
        const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let cells = '';
        for (let i = 0; i < firstWeekday; i++) cells += `<div class="stp-cal-day empty"></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let cls = 'stp-cal-day';
            const isStart = st.start === iso;
            const isEnd = st.end === iso;
            if (isStart) cls += ' range-start';
            if (isEnd) cls += ' range-end';
            if (st.start && st.end && iso > st.start && iso < st.end) cls += ' in-range';
            cells += `<div class="${cls}" onclick="pickCalendarDate('${prefix}','${iso}')">${d}</div>`;
        }
        return `<div class="stp-cal-month">
            <div class="stp-cal-month-label">${monthNames[month]} ${year}</div>
            <div class="stp-cal-weekdays">${dayLabels.map(l => `<div>${l}</div>`).join('')}</div>
            <div class="stp-cal-grid">${cells}</div>
        </div>`;
    }

    let m2 = st.viewMonth + 1, y2 = st.viewYear;
    if (m2 > 11) { m2 = 0; y2++; }
    gridsEl.innerHTML = buildMonthGrid(st.viewYear, st.viewMonth) + buildMonthGrid(y2, m2);
    updateDateBoxes(prefix);
}

// Cases "Départ"/"Retour" repliées par défaut (demande du 07/09/2026, retour à l'ancien
// format) : mises à jour indépendamment du calendrier déplié ou non — appelé aussi bien
// depuis renderDateRangeCalendar() (calendrier ouvert) que directement à l'ouverture de la
// fiche voyage/modale de création (calendrier encore replié, jamais rendu).
function formatDateBoxLabel(iso) {
    if (!iso) return currentLang === 'fr' ? 'Choisir' : 'Select date';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
function updateDateBoxes(prefix) {
    const [startId, endId] = _calInputIds(prefix);
    const startInput = document.getElementById(startId);
    const endInput = document.getElementById(endId);
    const startBox = document.getElementById(prefix + '-date-box-start');
    const endBox = document.getElementById(prefix + '-date-box-end');
    if (startBox && startInput) startBox.textContent = formatDateBoxLabel(startInput.value);
    if (endBox && endInput) endBox.textContent = formatDateBoxLabel(endInput.value);
}

// Un clic sur une des deux cases déplie le calendrier (rendu à la volée seulement à ce
// moment-là, jamais tant qu'il reste replié) ; le bouton "Appliquer" à l'intérieur le
// replie de nouveau (voir applyDateCalendar ci-dessous) — demande du 07/09/2026.
window.toggleDateCalendar = function(prefix) {
    const popup = document.getElementById(prefix + '-cal-popup');
    if (!popup) return;
    const opening = popup.classList.contains('hidden');
    popup.classList.toggle('hidden');
    if (opening) renderDateRangeCalendar(prefix);
};

// Redistribue automatiquement TOUS les lieux déjà associés à ce voyage (assignés à un jour
// OU seulement dans la liste "non assignés") sur le nombre de jours actuel — demande du
// 07/09/2026 : "quand je change les dates et que je clique sur apply, il faut que ça génère
// automatiquement un nouvel itinéraire", pas seulement ajouter/retirer des jours vides
// (c'est déjà le rôle de syncItineraryDaysToDates ci-dessus). Réutilise buildDayPlans() —
// la même répartition "réaliste" (horaires d'ouverture) que le générateur d'itinéraire
// automatique (window.generateItinerary) — avec le même tri "plus proche voisin" pour
// l'ordre de visite, mais SANS les filtres groupe/pays/ville du générateur : ici, ce sont
// déjà les lieux propres à ce voyage, pas une nouvelle sélection à construire.
window.regenerateTripItinerary = function() {
    if (!currentTrip || !activeTripAccess.isOwner) return;
    const wList = getWishlistLocs();
    const tripLocIds = [...new Set(wList.filter(w => w.tripId === currentTrip.id).map(w => Number(w.id)))];
    let locs = tripLocIds.map(id => celebLocations.find(l => l.id === id)).filter(Boolean);
    if (locs.length === 0) return;

    let route = [locs.shift()];
    while (locs.length > 0) {
        let lastLoc = route[route.length - 1], nearestIdx = 0, minDist = Infinity;
        for (let i = 0; i < locs.length; i++) {
            const d = Math.hypot(lastLoc.lat - locs[i].lat, lastLoc.lng - locs[i].lng);
            if (d < minDist) { minDist = d; nearestIdx = i; }
        }
        route.push(locs.splice(nearestIdx, 1)[0]);
    }

    const dayCount = document.querySelectorAll('#itinerary-box .day-card').length;
    if (!dayCount) return;
    const { dayPlans } = buildDayPlans(route, dayCount, null);

    // renderTrip() reconstruit tout le HTML des .day-card/.day-loc à partir de
    // currentTrip.days — saveTrip() relit ENSUITE ce DOM pour persister, donc l'ordre
    // (currentTrip.days d'abord, renderTrip(), puis saveTrip()) est important : sauvegarder
    // avant renderTrip() effacerait ce changement en relisant l'ancien DOM (voir la même
    // remarque sur syncItineraryDaysToDates plus haut).
    currentTrip.days = dayPlans.map(dayLocs => dayLocs.map(l => l.id));
    while (currentTrip.days.length < dayCount) currentTrip.days.push([]);
    window.renderTrip();
    window.saveTrip();
};

window.applyDateCalendar = function(prefix) {
    const popup = document.getElementById(prefix + '-cal-popup');
    if (popup) popup.classList.add('hidden');
    updateDateBoxes(prefix);
    if (prefix === 'edit') {
        syncItineraryDaysToDates();
        window.regenerateTripItinerary();
    }
};

window.navCalendar = function(prefix, dir) {
    const st = _calState[prefix];
    if (!st) return;
    st.viewMonth += dir;
    if (st.viewMonth > 11) { st.viewMonth = 0; st.viewYear++; }
    if (st.viewMonth < 0) { st.viewMonth = 11; st.viewYear--; }
    renderDateRangeCalendar(prefix);
};

window.pickCalendarDate = function(prefix, iso) {
    const st = _calState[prefix];
    if (!st) return;
    if (!st.start || st.end) {
        st.start = iso; st.end = null;
    } else if (iso < st.start) {
        st.start = iso; st.end = null;
    } else {
        st.end = iso;
    }
    const [startId, endId] = _calInputIds(prefix);
    document.getElementById(startId).value = st.start || '';
    document.getElementById(endId).value = st.end || '';
    renderDateRangeCalendar(prefix);
    // Ajuste le nombre de jours de l'itinéraire à la nouvelle plage AVANT de sauvegarder
    // (demande du 07/09/2026) — seulement sur la fiche voyage existante (prefix 'edit'),
    // jamais pendant la création (prefix 'create' : l'itinéraire n'existe pas encore, il
    // est généré séparément par createNewTripAdvanced() avec son propre calcul de durée).
    if (prefix === 'edit') { syncItineraryDaysToDates(); window.saveTrip(); }
};

// Grille de mois pour l'onglet "Dates flexibles" (demande du 07/09/2026 : plus de choix
// qu'avant — 12 mois glissants à partir d'aujourd'hui, calculés dynamiquement plutôt que
// codés en dur, sans aucune couleur de prix). Réutilise les fonctions de sélection déjà en
// place (selectEditPill/selectCreatePill) et la classe .pill-btn : le reste du code (lecture
// de currentTrip.duration, createNewTripAdvanced()...) continue de fonctionner sans y toucher.
function renderFlexibleMonthGrid(prefix) {
    const grid = document.getElementById(prefix + '-month-grid');
    if (!grid) return;
    const monthNames = currentLang === 'fr'
        ? ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const today = new Date();
    let html = '';
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        const fnName = prefix === 'edit' ? 'selectEditPill' : 'selectCreatePill';
        const save = prefix === 'edit' ? ' saveTrip();' : '';
        html += `<div class="pill-btn stp-month-tile${i === 0 ? ' active' : ''}" data-type="${prefix}-month" onclick="${fnName}(this, '${prefix}-month');${save}">${label}</div>`;
    }
    grid.innerHTML = html;
}

window.switchEditDateTab = function(tab) {
    if(tab === 'specific') {
        document.getElementById('edit-date-specific-panel').classList.remove('hidden');
        document.getElementById('edit-date-flexible-panel').classList.add('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.add('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.remove('active');
        updateDateBoxes('edit');
    } else {
        document.getElementById('edit-date-specific-panel').classList.add('hidden');
        document.getElementById('edit-date-flexible-panel').classList.remove('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.remove('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.add('active');
        if (!document.getElementById('edit-month-grid').children.length) renderFlexibleMonthGrid('edit');
    }
    window.saveTrip();
}

window.selectEditPill = function(btn, type) {
    document.querySelectorAll(`.edit-banner .pill-btn[data-type="${type}"]`).forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    window.saveTrip();
}

window.createLocRow = function(loc) {
    const div = document.createElement('div');
    div.className = 'day-loc';
    div.dataset.id = loc.id;
    div.setAttribute('draggable', 'true');
    div.setAttribute('ondragstart', 'dragStart(event, "loc")');
    div.setAttribute('ondragend', 'dragEnd(event)');
    div.setAttribute('ondragover', 'allowDrop(event)');
    div.setAttribute('ondrop', 'drop(event)');
    div.setAttribute('ondragleave', 'dragLeave(event)');
    div.innerHTML = `
        <span class="drag-handle edit-only" style="display:inline;">⠿</span>
        ${loc.name}
        <span class="x-btn edit-only" style="display:inline;" onclick="removeFromTrip(this, ${loc.id})">✕</span>
    `;
    return div;
}

window.createLocRowHtml = function(loc) {
    // ondragover/ondrop DIRECTEMENT sur la ligne (pas seulement sur .day-card, son
    // parent) : sans ça, l'évènement ne fait que remonter (bubbling) jusqu'au
    // gestionnaire de .day-card, où event.currentTarget vaut TOUJOURS .day-card (jamais
    // .day-loc) — la condition "survole une autre ligne" (voir allowDrop()) n'était donc
    // jamais vraie, et le trait indicateur .drag-over-top/.drag-over-bottom (déjà stylé
    // en CSS) ne s'affichait jamais entre deux lieux pendant un glisser-déposer.
    return `
        <div class="day-loc" data-id="${loc.id}" draggable="true" ondragstart="dragStart(event, 'loc')" ondragend="dragEnd(event)" ondragover="allowDrop(event)" ondrop="drop(event)" ondragleave="dragLeave(event)">
            <span class="drag-handle edit-only" style="display:inline;">⠿</span>
            ${loc.name}
            <span class="x-btn edit-only" style="display:inline;" onclick="removeFromTrip(this, ${loc.id})">✕</span>
        </div>
    `;
}

// DRAG & DROP DES LIEUX ET DES JOURS
window.dragStart = function(e, type) { 
    dragType = type; 
    draggedEl = e.currentTarget; 
    draggedEl.classList.add('dragging'); 
    e.dataTransfer.effectAllowed = 'move'; 
    e.stopPropagation();
}

window.dragEnd = function(e) { 
    if(draggedEl) draggedEl.classList.remove('dragging'); 
    document.querySelectorAll('.day-card, #loc-list, .day-loc').forEach(d => {
        d.classList.remove('drag-over');
        d.classList.remove('drag-over-day');
        d.classList.remove('drag-over-top');
        d.classList.remove('drag-over-bottom');
    }); 
    draggedEl = null; 
    dragType = null;
    window.saveTrip(); 
}

window.allowDrop = function(e) { 
    e.preventDefault(); 
    e.stopPropagation();
    
    document.querySelectorAll('.drag-over, .drag-over-day, .drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-day', 'drag-over-top', 'drag-over-bottom');
    });

    if (dragType === 'day' && e.currentTarget.classList.contains('day-card')) {
        e.currentTarget.classList.add('drag-over-day');
    } else if (dragType === 'loc') {
        if (e.currentTarget.classList.contains('day-loc')) {
            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            if (relY < rect.height / 2) e.currentTarget.classList.add('drag-over-top');
            else e.currentTarget.classList.add('drag-over-bottom');
        } else {
            e.currentTarget.classList.add('drag-over');
        }
    }
}

window.dragLeave = function(e) { 
    e.currentTarget.classList.remove('drag-over', 'drag-over-day', 'drag-over-top', 'drag-over-bottom'); 
}

window.drop = function(e) { 
    e.preventDefault(); 
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over', 'drag-over-day', 'drag-over-top', 'drag-over-bottom'); 
    
    if(!draggedEl) return;

    if (dragType === 'day' && e.currentTarget.classList.contains('day-card')) {
        const box = document.getElementById('itinerary-box');
        const draggedIdx = Array.from(box.children).indexOf(draggedEl);
        const targetIdx = Array.from(box.children).indexOf(e.currentTarget);
        if (draggedIdx < targetIdx) {
            e.currentTarget.after(draggedEl);
        } else {
            e.currentTarget.before(draggedEl);
        }
        
        document.querySelectorAll('.day-card').forEach((c, index) => {
            c.dataset.day = index + 1;
            const dayTitleEl = c.querySelector('.day-title');
            dayTitleEl.style.color = TRIP_DAY_COLORS[index % TRIP_DAY_COLORS.length];
            dayTitleEl.innerHTML = `<span class="drag-handle edit-only" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${index + 1}`;
        });
    } else if (dragType === 'loc') {
        if (e.currentTarget.classList.contains('day-loc')) {
            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            if (relY < rect.height / 2) e.currentTarget.before(draggedEl);
            else e.currentTarget.after(draggedEl);
        } else if (e.currentTarget.id === 'loc-list') { 
            e.currentTarget.appendChild(draggedEl); 
        } else { 
            const itemsContainer = e.currentTarget.querySelector('.day-items');
            if(itemsContainer) itemsContainer.appendChild(draggedEl); 
        } 
    }
    window.saveTrip();
}

// Factorisé hors de addDay() pour être réutilisé par syncItineraryDaysToDates()
// ci-dessous (demande du 07/09/2026) — même carte, même comportement drag & drop.
function buildDayCardElement(dayNum) {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.day = dayNum;
    card.setAttribute('draggable', 'true');
    card.setAttribute('ondragstart', 'dragStart(event, "day")');
    card.setAttribute('ondragover', 'allowDrop(event)');
    card.setAttribute('ondrop', 'drop(event)');
    card.setAttribute('ondragleave', 'dragLeave(event)');
    card.innerHTML = `
        <div class="day-header">
            <div class="day-title" style="color:${TRIP_DAY_COLORS[(dayNum - 1) % TRIP_DAY_COLORS.length]};"><span class="drag-handle edit-only" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${dayNum}</div>
            <div class="x-btn edit-only" style="display:flex;" onclick="removeDay(this)">✕</div>
        </div>
        <div class="day-items"></div>
    `;
    return card;
}

// Ajuste le nombre de .day-card à la durée du voyage (demande du 07/09/2026 : "quand on
// change les dates... il faut que ça modifie l'itinéraire en conséquence") — appelée
// explicitement par les gestionnaires de changement de date (jamais depuis saveTrip() lui-
// même : celui-ci tourne aussi après un simple glisser-déposer de lieu, où le nombre de
// jours ne doit surtout pas être recalculé/écrasé). Lit directement le DOM (onglet actif,
// pilule de durée active, valeurs des champs de date) plutôt que currentTrip, pour rester
// correcte quel que soit l'ordre d'appel par rapport à saveTrip() (qui n'a peut-être pas
// encore écrit la nouvelle valeur au moment où ceci s'exécute). Les lieux des jours retirés
// retournent dans la liste "non assignés" — jamais supprimés — mêmes règles que
// confirmRemoveDay(), sans sa confirmation modale puisque ce n'est pas une suppression
// demandée explicitement par la personne.
function syncItineraryDaysToDates() {
    if (!currentTrip || !activeTripAccess.isOwner) return;
    const isFlexible = document.querySelector('.edit-banner .date-tab[data-tab="edit-flexible"]')?.classList.contains('active');
    let desiredDays = null;
    if (isFlexible) {
        const length = document.querySelector('.edit-banner .pill-btn[data-type="edit-duration"].active')?.textContent || '';
        if (length.includes('Weekend')) desiredDays = 2;
        else if (length.includes('1 week') || length.includes('1 semaine')) desiredDays = 7;
        else if (length.includes('2 weeks') || length.includes('2 semaines')) desiredDays = 14;
        else if (length.includes('1 month') || length.includes('1 mois')) desiredDays = 30;
    } else {
        const start = document.getElementById('date-start')?.value;
        const end = document.getElementById('date-end')?.value;
        if (start && end) {
            const diffTime = new Date(end) - new Date(start);
            if (!isNaN(diffTime) && diffTime >= 0) desiredDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
    }
    if (!desiredDays || desiredDays < 1) return;

    const box = document.getElementById('itinerary-box');
    if (!box) return;
    const addBtn = box.querySelector('.add-day-btn');
    const locList = document.getElementById('loc-list');
    let cards = Array.from(box.querySelectorAll('.day-card'));
    if (desiredDays > cards.length) {
        while (cards.length < desiredDays) {
            const card = buildDayCardElement(cards.length + 1);
            box.insertBefore(card, addBtn);
            cards.push(card);
        }
    } else if (desiredDays < cards.length) {
        while (cards.length > desiredDays) {
            const card = cards.pop();
            card.querySelectorAll('.day-loc').forEach(loc => locList && locList.appendChild(loc));
            card.remove();
        }
    }
}

window.addDay = function() {
    const box = document.getElementById('itinerary-box');
    const addBtn = box.querySelector('.add-day-btn');
    const newDayNum = document.querySelectorAll('.day-card').length + 1;
    box.insertBefore(buildDayCardElement(newDayNum), addBtn);
    window.saveTrip();
}

window.removeDay = function(btn) {
    dayToRemoveBtn = btn;
    document.getElementById('remove-day-modal').classList.remove('hidden');
}

window.confirmRemoveDay = function() {
    if(!dayToRemoveBtn) return;
    const card = dayToRemoveBtn.closest('.day-card');
    const items = card.querySelectorAll('.day-loc');
    const locList = document.getElementById('loc-list');
    items.forEach(i => locList.appendChild(i)); 
    card.remove();
    
    document.querySelectorAll('.day-card').forEach((c, index) => {
        c.dataset.day = index + 1;
        const dayTitleEl = c.querySelector('.day-title');
        dayTitleEl.style.color = TRIP_DAY_COLORS[index % TRIP_DAY_COLORS.length];
        dayTitleEl.innerHTML = `<span class="drag-handle edit-only" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${index + 1}`;
    });
    window.saveTrip();
    closeModal('remove-day-modal');
    dayToRemoveBtn = null;
}

window.removeFromTrip = function(btn, locId) {
    locToRemoveData = { btn: btn, id: Number(locId) };
    document.getElementById('remove-loc-modal').classList.remove('hidden');
}

window.confirmRemoveLoc = function() {
    if(!locToRemoveData) return;
    
    let wList = getWishlistLocs();
    wList = wList.filter(w => !(Number(w.id) === locToRemoveData.id && w.tripId === currentTrip.id));
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    
    currentTrip.days = currentTrip.days.map(day => day.filter(id => Number(id) !== locToRemoveData.id));

    // Important : on persiste directement le voyage mis à jour AVANT de ré-appeler renderTrip().
    // On n'utilise pas saveTrip() ici, car elle reconstruit currentTrip.days en relisant le DOM
    // (qui contient encore l'ancien lieu tant que renderTrip() n'a pas tourné), ce qui annulait
    // silencieusement la suppression qu'on vient de faire.
    let trips = getMyTripsList();
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);

    closeModal('remove-loc-modal');
    locToRemoveData = null;
    window.renderTrip();
    window.renderTripsSidebar();
}

window.quickAddLoc = function(locId) {
    locId = Number(locId);
    let wList = getWishlistLocs();
    if(!wList.some(w => Number(w.id) === locId && w.tripId === currentTrip.id)) {
        wList.push({ id: locId, dateAdded: new Date().toLocaleDateString(), tripId: currentTrip.id });
        localStorage.setItem('wishlistLocs', JSON.stringify(wList));
        syncWishlist(wList);
        window.renderTrip(); 
        
        if(document.getElementById('add-modal') && !document.getElementById('add-modal').classList.contains('hidden')) {
            window.filterAddModal(); 
        }
    }
}

// Accès à currentTrip quand ce n'est PAS un voyage possédé (voir "shared with me" dans
// window.initTrips) : { isOwner:true } par défaut pour tout voyage de myTrips ; mis à
// jour à {isOwner:false, role:'edit'|'view'} en ouvrant un voyage partagé par quelqu'un
// d'autre. saveTrip() (fonction centrale par laquelle passe TOUTE modification de
// voyage) s'appuie dessus pour bloquer l'écriture en lecture seule, et rediriger vers le
// document Firestore partagé plutôt que vers myTrips quand on n'est pas propriétaire.
let activeTripAccess = { isOwner: true, role: 'edit' };
window.activeTripAccess = activeTripAccess;

window.saveTrip = function() {
    if(!currentTrip) return;
    if (!activeTripAccess.isOwner && activeTripAccess.role === 'view') return; // lecture seule : aucune écriture
    currentTrip.name = document.getElementById('edit-trip-name').value || currentTrip.name;
    
    const isFlexible = document.querySelector('.edit-banner .date-tab[data-tab="edit-flexible"]')?.classList.contains('active');
    if(isFlexible) {
        currentTrip.dateType = 'duration';
        const month = document.querySelector('.edit-banner .pill-btn[data-type="edit-month"].active')?.textContent || '';
        const length = document.querySelector('.edit-banner .pill-btn[data-type="edit-duration"].active')?.textContent || '';
        currentTrip.duration = `${length} in ${month}`;
    } else {
        currentTrip.dateType = 'specific';
        currentTrip.startDate = document.getElementById('date-start').value;
        currentTrip.endDate = document.getElementById('date-end').value;
    }
    
    const newDays = [];
    document.querySelectorAll('.day-card').forEach(card => {
        const ids = [];
        card.querySelectorAll('.day-loc').forEach(locEl => { ids.push(parseInt(locEl.dataset.id)); });
        newDays.push(ids);
    });
    currentTrip.days = newDays;

    if (activeTripAccess.isOwner) {
        let trips = getMyTripsList();
        const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
        if(tripIndex !== -1) trips[tripIndex] = currentTrip;
        localStorage.setItem('myTrips', JSON.stringify(trips));
        syncTrips(trips);
        // Voyage déjà partagé (voir openShareTripModal) : on répercute aussi les
        // modifications du propriétaire vers le document Firestore partagé, pour que
        // les collaborateurs voient la dernière version au prochain chargement.
        if (currentTrip.isShared && typeof window.saveSharedTrip === 'function') {
            window.saveSharedTrip(currentTrip.id, currentTrip);
        }
    } else if (activeTripAccess.role === 'edit' && typeof window.saveSharedTrip === 'function') {
        // Collaborateur avec droit de modification : jamais écrit dans myTrips (ce
        // voyage n'est pas le sien), seulement dans le document Firestore partagé.
        window.saveSharedTrip(currentTrip.id, currentTrip);
    }

    window.renderTripsSidebar();

    if(tripPageMap) {
        drawTripOnMap(currentTrip, tripPageMap, tripPageLayer);
    }

    // saveTrip() ne reconstruit pas le HTML des .day-card (pour ne pas perturber le drag & drop
    // en cours) : on ajoute/retire seulement le conteneur de mini-carte selon que le jour a
    // désormais des lieux ou non, avant de redessiner les mini-cartes elles-mêmes.
    document.querySelectorAll('.day-card').forEach((card, idx) => {
        let mapDiv = card.querySelector('.day-mini-map');
        const hasLocs = currentTrip.days[idx] && currentTrip.days[idx].length > 0;
        if(hasLocs && !mapDiv) {
            mapDiv = document.createElement('div');
            mapDiv.className = 'day-mini-map';
            mapDiv.id = `day-map-${idx}`;
            card.appendChild(mapDiv);
        } else if(!hasLocs && mapDiv) {
            mapDiv.remove();
        }
    });
    renderDayMiniMaps(currentTrip);
    window.refreshDayTimelines();
}

window.openAddModal = function() { document.getElementById('add-modal').classList.remove('hidden'); window.filterAddModal(); }
window.closeAddModal = function() { document.getElementById('add-modal').classList.add('hidden'); document.getElementById('add-search').value = ""; }

window.filterAddModal = function() {
    if(!currentTrip) return;
    const query = (document.getElementById('add-search').value || "").toLowerCase();
    const list = document.getElementById('add-modal-list');
    list.innerHTML = '';
    
    const unlockedGroups = getUnlockedGroups();
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let filteredLocs = baseLocs.filter(loc => {
        if (currentTrip.group && loc.group !== currentTrip.group) return false;
        if (currentTrip.country && loc.country !== currentTrip.country) return false;
        return true;
    });

    let allAssignedIds = currentTrip.days.flat().map(Number);
    
    filteredLocs.forEach(loc => {
        if (!allAssignedIds.includes(Number(loc.id))) {
            if(loc.name.toLowerCase().includes(query) || (loc.city && loc.city.toLowerCase().includes(query)) || (loc.category && loc.category.toLowerCase().includes(query))) {
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #e2e8f0;">
                        <div>
                            <div style="font-weight:700; font-size:13px; color:#212832;">${loc.name}</div>
                            <div style="font-size:11px; color:#64748b;">${loc.city}, ${loc.country} &middot; ${getCatName(loc.category)}</div>
                        </div>
                        <button onclick="quickAddLoc(${loc.id}); this.textContent='Added'; this.disabled=true; this.style.background='#e2e8f0';" style="background:#D42759; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">+ Add</button>
                    </div>
                `;
            }
        }
    });
}

// Auto-complétion "pseudos ressemblants" sur le champ d'invitation à la création d'un
// voyage (demande du 06/09/2026) — même pattern que openShareTripModal() plus haut, mais
// via searchUsernamesContaining() (recherche "contient", pas seulement préfixe) et câblé
// une seule fois (le formulaire de création n'est jamais recréé, juste montré/masqué).
function wireCreateTripInviteAutocompleteOnce() {
    const input = document.getElementById('create-trip-invite-input');
    const suggestionsBox = document.getElementById('create-trip-invite-suggestions');
    if (!input || !suggestionsBox || input.dataset.autocompleteWired) return;
    input.dataset.autocompleteWired = '1';
    let debounceTimer = null;
    const hideSuggestions = () => { suggestionsBox.classList.add('hidden'); suggestionsBox.innerHTML = ''; };
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (!q) { hideSuggestions(); return; }
        debounceTimer = setTimeout(async () => {
            if (typeof window.searchUsernamesContaining !== 'function') return;
            const myUsername = (localStorage.getItem('userName') || '').trim().toLowerCase();
            const matches = (await window.searchUsernamesContaining(q, 8)).filter(m => m.username.toLowerCase() !== myUsername);
            if (input.value.trim() !== q) return;
            if (matches.length === 0) { hideSuggestions(); return; }
            suggestionsBox.innerHTML = matches.map(m => `<div class="share-suggestion-row" data-username="${escapeHtml(m.username)}" style="padding:9px 14px; font-size:12px; font-weight:600; color:#212832; cursor:pointer;">${escapeHtml(m.username)}</div>`).join('');
            suggestionsBox.querySelectorAll('.share-suggestion-row').forEach(row => {
                row.addEventListener('mouseenter', () => row.style.background = '#FFF7F8');
                row.addEventListener('mouseleave', () => row.style.background = '');
                row.addEventListener('mousedown', (e) => e.preventDefault());
                row.addEventListener('click', () => { input.value = row.dataset.username; hideSuggestions(); input.focus(); });
            });
            suggestionsBox.classList.remove('hidden');
        }, 250);
    });
    document.addEventListener('click', (e) => {
        if (e.target !== input && !suggestionsBox.contains(e.target)) hideSuggestions();
    });
}

// LOGIQUE GOOGLE FLIGHTS STYLE TABS (NEW TRIP)
window.openNewTripModal = function() {
    document.getElementById('add-trip-modal').classList.remove('hidden');
    wireCreateTripInviteAutocompleteOnce();
    // Repart d'un état de calendrier neuf à chaque ouverture (voir _calState dans
    // renderDateRangeCalendar plus haut) : une modale de création rouverte ne doit jamais
    // garder la plage de dates du voyage précédent affichée.
    delete _calState.create;
    document.getElementById('create-trip-start').value = '';
    document.getElementById('create-trip-end').value = '';
    document.getElementById('create-cal-popup').classList.add('hidden');
    updateDateBoxes('create');
    renderFlexibleMonthGrid('create');
    const gSelect = document.getElementById('create-trip-group');
    if(gSelect && gSelect.options.length <= 1) {
        const unlockedGroups = getUnlockedGroups();
        let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
        const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
        availableGroups.forEach(g => gSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }
}

window.updateCreateTripOptions = function() {
    const group = document.getElementById('create-trip-group').value;
    const memberSelect = document.getElementById('create-trip-member');
    const countrySelect = document.getElementById('create-trip-country');
    const citySelect = document.getElementById('create-trip-city');

    const unlockedGroups = getUnlockedGroups();
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let locs = baseLocs;
    if(group) locs = locs.filter(l => l.group === group);

    memberSelect.innerHTML = `<option value="All">${currentLang === 'fr' ? 'Tous les membres (Optionnel)' : 'All Members (Optional)'}</option>`;
    if(group && filterData[group]) {
        filterData[group].members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    } else {
        const members = [...new Set(locs.map(l => l.member))].filter(m => m !== 'All');
        members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    }

    const currentCountry = countrySelect.value;
    countrySelect.innerHTML = `<option value="">${currentLang === 'fr' ? 'Sélectionner le Pays' : 'Select Country'}</option>`;
    const countries = [...new Set(locs.map(l => l.country))].sort();
    countries.forEach(c => countrySelect.innerHTML += `<option value="${c}">${c}</option>`);
    if(countries.includes(currentCountry)) countrySelect.value = currentCountry;

    const currentCity = citySelect.value;
    let cityLocs = locs;
    if(countrySelect.value) cityLocs = locs.filter(l => l.country === countrySelect.value);
    
    citySelect.innerHTML = `<option value="">${currentLang === 'fr' ? 'Sélectionner la Ville (Optionnel)' : 'Select City (Optional)'}</option>`;
    const cities = [...new Set(cityLocs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySelect.innerHTML += `<option value="${c}">${c}</option>`);
    if(cities.includes(currentCity)) citySelect.value = currentCity;

    window.updateCreateTripCategories();
}

window.switchCreateDateTab = function(tab) {
    document.querySelectorAll('#add-trip-modal .date-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`#add-trip-modal .date-tab[data-tab="create-${tab}"]`).classList.add('active');

    if(tab === 'specific') {
        document.getElementById('create-date-specific-panel').classList.remove('hidden');
        document.getElementById('create-date-flexible-panel').classList.add('hidden');
        updateDateBoxes('create');
    } else {
        document.getElementById('create-date-specific-panel').classList.add('hidden');
        document.getElementById('create-date-flexible-panel').classList.remove('hidden');
        if (!document.getElementById('create-month-grid').children.length) renderFlexibleMonthGrid('create');
    }
}

window.selectCreatePill = function(btn, type) {
    document.querySelectorAll(`#add-trip-modal .pill-btn[data-type="${type}"]`).forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
}

window.renderCreateTripInvitees = function() {
    const container = document.getElementById('create-trip-invitees');
    if (!container) return;
    container.innerHTML = createTripPendingInvitees.map(name => `
        <span class="invitee-chip">${name}<span class="remove" onclick="removeCreateTripInvitee('${name.replace(/'/g, "\\'")}')">&times;</span></span>
    `).join('');
};
window.addCreateTripInvitee = function() {
    const input = document.getElementById('create-trip-invite-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name || createTripPendingInvitees.includes(name)) { input.value = ''; return; }
    createTripPendingInvitees.push(name);
    input.value = '';
    window.renderCreateTripInvitees();
};
window.removeCreateTripInvitee = function(name) {
    createTripPendingInvitees = createTripPendingInvitees.filter(n => n !== name);
    window.renderCreateTripInvitees();
};

window.createNewTripAdvanced = async function() {
    const nameInput = document.getElementById('create-trip-name');
    let name = nameInput.value.trim();

    const country = document.getElementById('create-trip-country').value;
    const group = document.getElementById('create-trip-group').value;
    const member = document.getElementById('create-trip-member').value;
    const city = document.getElementById('create-trip-city').value;
    const hotelQuery = (document.getElementById('create-trip-hotel')?.value || '').trim();

    const errorEl = document.getElementById('create-trip-error');
    // Un groupe et un pays sont indispensables pour proposer le moindre lieu : les
    // exiger explicitement plutôt que de créer silencieusement un voyage entièrement
    // vide (c'était le cas avant, et donnait l'impression que "ça n'enregistre rien").
    if (!group || !country) {
        if (errorEl) {
            errorEl.textContent = currentLang === 'fr'
                ? 'Choisissez un groupe et un pays pour générer un itinéraire.'
                : 'Choose a group and a country to generate an itinerary.';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (errorEl) errorEl.classList.add('hidden');

    if (!name) {
        name = `${group} Trip in ${country}`;
    }

    const isFlexible = document.querySelector('#add-trip-modal .date-tab[data-tab="create-flexible"]').classList.contains('active');

    let dateType = isFlexible ? 'duration' : 'specific';
    let duration = "";
    let startDate = "";
    let endDate = "";
    let numDays = 3;

    if (isFlexible) {
        const month = document.querySelector('#add-trip-modal .pill-btn[data-type="create-month"].active')?.textContent || '';
        const length = document.querySelector('#add-trip-modal .pill-btn[data-type="create-duration"].active')?.textContent || '';
        duration = `${length} in ${month}`;

        if(length.includes('Weekend')) numDays = 2;
        else if(length.includes('1 week') || length.includes('1 semaine')) numDays = 7;
        else if(length.includes('2 weeks') || length.includes('2 semaines')) numDays = 14;
        else if(length.includes('1 month') || length.includes('1 mois')) numDays = 30;
    } else {
        startDate = document.getElementById('create-trip-start').value;
        endDate = document.getElementById('create-trip-end').value;
        if(startDate && endDate) {
            const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
            numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
    }

    const createBtn = document.getElementById('i18n-btn-create');
    const originalBtnLabel = createBtn ? createBtn.textContent : '';
    if (createBtn) { createBtn.disabled = true; createBtn.textContent = '...'; }

    // Hôtel / quartier d'hébergement (optionnel) : géocodé via l'API Nominatim
    // (OpenStreetMap, gratuite, sans clé) pour servir de point de départ réel du premier
    // trajet de chaque journée. Si le géocodage échoue (adresse introuvable, réseau
    // indisponible), on continue simplement sans point de départ plutôt que de bloquer
    // la création du voyage — ce n'est qu'un raffinement optionnel.
    let homeBase = null;
    if (hotelQuery) {
        // Priorité à la suggestion explicitement choisie dans la liste déroulante (mêmes
        // coordonnées que ce qui a été affiché et cliqué) — ne re-géocode que si la
        // personne a tapé une adresse librement sans en sélectionner une.
        if (createTripHotelSelected && createTripHotelSelected.label === hotelQuery) {
            homeBase = { lat: createTripHotelSelected.lat, lng: createTripHotelSelected.lng };
        } else {
            homeBase = await geocodeAddress(hotelQuery);
        }
        if (!homeBase && errorEl) {
            errorEl.textContent = currentLang === 'fr'
                ? "Adresse de l'hôtel introuvable — le voyage sera créé sans point de départ fixe."
                : "Couldn't find that address — the trip will be created without a fixed starting point.";
            errorEl.classList.remove('hidden');
        }
    }

    const unlockedGroups = getUnlockedGroups();
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let validLocs = baseLocs.filter(l => {
        if(l.group !== group) return false;
        if(l.country !== country) return false;
        if(city && l.city !== city) return false;
        if(member && member !== 'All' && l.member !== member && l.member !== 'All') return false;
        if(createTripSelectedCategories.length > 0 && !createTripSelectedCategories.includes(l.category)) return false;
        return true;
    });

    let daysArray = [];
    for(let i=0; i<numDays; i++) daysArray.push([]);

    if (validLocs.length > 0) {
        // Itinéraire du plus proche voisin, en partant de l'hôtel s'il a pu être
        // géocodé (sinon du premier lieu, comme pour l'Auto-Itinerary Generator) —
        // ne force jamais tous les lieux dans le nombre de jours choisi (voir
        // buildDayPlans) : le surplus reste simplement non assigné, à ajouter
        // manuellement ensuite si la personne le souhaite.
        let pool = validLocs.slice();
        let route = [];
        let anchor = homeBase;
        if (!anchor) { anchor = pool.shift(); route.push(anchor); }
        while (pool.length > 0) {
            let nearestIdx = 0, minDist = Infinity;
            for (let i = 0; i < pool.length; i++) {
                const d = Math.hypot(anchor.lat - pool[i].lat, anchor.lng - pool[i].lng);
                if (d < minDist) { minDist = d; nearestIdx = i; }
            }
            const next = pool.splice(nearestIdx, 1)[0];
            route.push(next);
            anchor = next;
        }

        const { dayPlans } = buildDayPlans(route, numDays, homeBase);
        dayPlans.forEach((dayLocs, i) => { if (i < daysArray.length) daysArray[i] = dayLocs.map(l => l.id); });
    }

    const newTripId = 'trip-' + Date.now();
    let newTrip = {
        id: newTripId, name: name, dateType: dateType, duration: duration, startDate: startDate, endDate: endDate, days: daysArray,
        group: group, member: member, country: country, city: city,
        categories: createTripSelectedCategories.slice(),
        homeBase: homeBase, homeBaseLabel: homeBase ? hotelQuery : ''
    };

    // Comme pour l'Auto-Itinerary Generator (saveItineraryToTrips) : les lieux assignés
    // à un jour sont aussi ajoutés à la wishlist liée à ce voyage, pour rester cohérent
    // avec le reste du site (stats, page Wishlist).
    let wList = getWishlistLocs();
    daysArray.flat().forEach(id => {
        if (!wList.some(w => Number(w.id) === Number(id) && w.tripId === newTripId)) {
            wList.push({ id, dateAdded: new Date().toLocaleDateString(), tripId: newTripId });
        }
    });
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);

    let trips = getMyTripsList();
    trips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);

    localStorage.setItem('activeTripId', newTripId);

    // Invitations saisies DANS cette même modale (voir renderCreateTripInvitees) :
    // le voyage partagé n'existe côté Firestore qu'à partir de maintenant, comme pour
    // un partage classique depuis openShareTripModal — on ne bloque jamais la création
    // du voyage lui-même si une invitation échoue (pseudo introuvable), on continue
    // simplement avec les suivantes.
    if (createTripPendingInvitees.length > 0) {
        if (typeof window.createSharedTrip === 'function') {
            const createResult = await window.createSharedTrip(newTrip);
            if (createResult && createResult.success) {
                newTrip.isShared = true;
                const idx2 = trips.findIndex(t => t.id === newTripId);
                if (idx2 !== -1) { trips[idx2] = newTrip; localStorage.setItem('myTrips', JSON.stringify(trips)); syncTrips(trips); }
            }
        }
        // Avant ce correctif, un échec (pseudo introuvable, déjà invité...) ici ne
        // remontait JAMAIS à l'écran : la modale se fermait comme si tout le monde avait
        // bien été invité, alors que rien n'était envoyé pour les pseudos en erreur — bug
        // rapporté le 07/09/2026 ("l'user ne reçoit pas de message... ça ne fonctionne
        // pas"). On récapitule maintenant les échecs dans un toast après coup, sans
        // bloquer la création du voyage lui-même pour autant.
        if (typeof window.sendTripInvite === 'function') {
            const isFr = currentLang === 'fr';
            const failed = [];
            for (const username of createTripPendingInvitees) {
                const inviteResult = await window.sendTripInvite(newTripId, newTrip.name, newTrip.coverImage, username, 'view');
                if (inviteResult && inviteResult.error) failed.push(username);
            }
            if (failed.length > 0 && typeof window.showSimpleToast === 'function') {
                const msg = isFr
                    ? `Échec de l'invitation pour : ${failed.join(', ')}. Vérifiez les pseudos.`
                    : `Failed to invite: ${failed.join(', ')}. Check the usernames.`;
                window.showSimpleToast(msg, { isError: true });
            } else if (failed.length < createTripPendingInvitees.length && typeof window.showSimpleToast === 'function') {
                window.showSimpleToast(isFr ? 'Invitations envoyées.' : 'Invites sent.');
            }
        }
        createTripPendingInvitees = [];
        if (document.getElementById('create-trip-invitees')) document.getElementById('create-trip-invitees').innerHTML = '';
    }

    if (createBtn) { createBtn.disabled = false; createBtn.textContent = originalBtnLabel; }
    document.getElementById('add-trip-modal').classList.add('hidden');
    nameInput.value = '';
    if (document.getElementById('create-trip-hotel')) document.getElementById('create-trip-hotel').value = '';
    createTripSelectedCategories = [];
    createTripHotelSelected = null;

    if(typeof window.initTrips === 'function') window.initTrips();
    else if(document.getElementById('tab-itinerary-btn')) loadItineraryTabOptions();
}

window.openDeleteModal = function(id = null, event = null) {
    if(event) event.stopPropagation();
    tripIdToDelete = id || currentTrip.id;
    document.getElementById('delete-trip-modal').classList.remove('hidden');
}

window.confirmDeleteTrip = function() {
    if (!tripIdToDelete) return;

    let trips = getMyTripsList();
    trips = trips.filter(t => t.id !== tripIdToDelete);
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
    
    let wList = getWishlistLocs();
    wList = wList.filter(w => w.tripId !== tripIdToDelete);
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    
    if (currentTrip && currentTrip.id === tripIdToDelete) {
        currentTrip = null;
        localStorage.removeItem('activeTripId');
    }
    
    tripIdToDelete = null;
    document.getElementById('delete-trip-modal').classList.add('hidden');

    if(typeof window.initTrips === 'function') window.initTrips();
    else if(document.getElementById('tab-itinerary-btn')) loadItineraryTabOptions();
}

// Quitter un voyage partagé par quelqu'un d'autre (demande du 06/09/2026) : contrairement
// à "Delete" (réservé au propriétaire, ci-dessus), on ne fait que se retirer soi-même de
// members/memberNames (voir window.removeTripCollaborator dans firebase-init.js) — le
// voyage continue d'exister pour son propriétaire et les autres collaborateurs.
let sharedTripIdToLeave = null;
window.leaveSharedTrip = function(sharedTripId, event) {
    if (event) event.stopPropagation();
    sharedTripIdToLeave = sharedTripId;
    const modal = document.getElementById('leave-trip-modal');
    if (modal) modal.classList.remove('hidden');
};

window.confirmLeaveSharedTrip = async function() {
    const sharedTripId = sharedTripIdToLeave;
    const modal = document.getElementById('leave-trip-modal');
    if (modal) modal.classList.add('hidden');
    if (!sharedTripId) return;
    sharedTripIdToLeave = null;
    const myUid = window.firebaseCurrentUser && window.firebaseCurrentUser.uid;
    if (!myUid || typeof window.removeTripCollaborator !== 'function') return;
    await window.removeTripCollaborator(sharedTripId, myUid);
    if (currentTrip && currentTrip.id === sharedTripId) {
        currentTrip = null;
        localStorage.removeItem('activeTripId');
    }
    if (typeof window.refreshSharedTrips === 'function') await window.refreshSharedTrips();
    else if (typeof window.renderTripsSidebar === 'function') window.renderTripsSidebar();
    if (typeof window.initTrips === 'function') window.initTrips();
};
