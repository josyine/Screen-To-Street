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
        { id: 'la',          city: 'Los Angeles',   country: 'USA',         venue: 'SoFi Stadium',               lat: 33.9535,  lng: -118.3392, showDates: ['2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06'] },
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

const ALL_TOURS = [ARIRANG_TOUR, WINGS_TOUR_2017, LOVE_YOURSELF_TOUR_2018, SPEAK_YOURSELF_TOUR_2019, PTD_TOUR_2021];
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

function getLiveTimelineEntries() {
    if (window.selectedTourLiveGroup && window.selectedTourLiveGroup !== 'BTS') return [];
    const now = getTourNow();
    const groupEntries = getLiveTour().stops.map(s => ({
        kind: 'group', member: null, id: s.id,
        title: `${getLiveTour().tourName} — ${s.city}`,
        city: s.city, country: s.country, lat: s.lat, lng: s.lng,
        dateStart: s.dateStart, dateEnd: s.dateEnd,
        status: getTourStopStatus(s, now)
    }));
    const soloEntries = MEMBER_EVENTS_DATA.map(s => ({
        kind: 'solo', member: s.member, id: s.id,
        title: `${s.member} — ${s.eventName}`, eventName: s.eventName,
        city: s.city, country: s.country, lat: s.lat, lng: s.lng,
        dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1],
        status: getTourStopStatus({ dateStart: s.showDates[0], dateEnd: s.showDates[s.showDates.length - 1] }, now)
    }));
    return groupEntries.concat(soloEntries)
        .filter(e => e.status !== 'done')
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
            <div class="live-tl-title" onclick="map.flyTo([${e.lat}, ${e.lng}], 6); closeLivePanel();">${e.title}</div>
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
    panel.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.add('open'));
};
window.closeLivePanel = function() {
    const panel = document.getElementById('live-panel');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(() => panel.classList.add('hidden'), 200);
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

// Badge fusionné "Tour" + "Live" (voir map.html) : un seul point d'entrée qui ouvre un
// petit menu contextuel à deux options plutôt que deux boutons séparés dans le header.
// Chaque option appelle openTourModePanel()/openLivePanel() TELS QUELS (aucun changement
// à ces deux panneaux eux-mêmes) — seul ce point d'entrée commun change.
window.openLiveTourChooser = function(event) {
    if (event) event.stopPropagation();
    const chooser = document.getElementById('live-tour-chooser');
    if (!chooser) return;
    const wasOpen = !chooser.classList.contains('hidden');
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    if (wasOpen) { chooser.classList.add('hidden'); return; }

    // Se positionne sous le déclencheur réellement cliqué (badge pilule centré en haut
    // sur desktop, icône compacte dans le header sur mobile) plutôt qu'à un endroit fixe
    // qui n'aurait été correct que pour l'un des deux cas.
    const trigger = (event && event.currentTarget) || document.getElementById('tour-mode-badge');
    const containerEl = document.querySelector('.map-container');
    if (trigger && containerEl) {
        const rect = trigger.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        const chooserWidth = 190;
        let left = rect.left - containerRect.left + rect.width / 2 - chooserWidth / 2;
        left = Math.max(8, Math.min(left, containerRect.width - chooserWidth - 8));
        chooser.style.left = left + 'px';
        chooser.style.top = (rect.bottom - containerRect.top + 8) + 'px';
        chooser.style.transform = 'none';
    }
    chooser.classList.remove('hidden');
};
window.chooseLiveTourMode = function(mode) {
    const chooser = document.getElementById('live-tour-chooser');
    if (chooser) chooser.classList.add('hidden');
    if (mode === 'tour' && typeof window.openTourModePanel === 'function') window.openTourModePanel();
    else if (mode === 'live' && typeof window.openLivePanel === 'function') window.openLivePanel();
};
document.addEventListener('click', (e) => {
    const chooser = document.getElementById('live-tour-chooser');
    if (!chooser || chooser.classList.contains('hidden')) return;
    if (chooser.contains(e.target) || e.target.closest('#tour-mode-badge') || e.target.closest('#tour-mode-badge-mobile')) return;
    chooser.classList.add('hidden');
});

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

// Lieux partagés par des amis (cloche du header, voir map.html) : rechargé au login
// puis après chaque action (partage envoyé, lieu ouvert depuis la liste).
window.refreshFriendShares = async function() {
    if (typeof window.listSharesForMe !== 'function') return;
    const shares = await window.listSharesForMe();
    const container = document.getElementById('friend-shares-container');
    const badge = document.getElementById('friend-shares-badge');
    const list = document.getElementById('friend-shares-list');
    const empty = document.getElementById('friend-shares-empty');
    if (!container) return;
    container.classList.remove('hidden');
    shares.sort((a, b) => (a.seen === b.seen) ? 0 : (a.seen ? 1 : -1));
    const unseenCount = shares.filter(s => !s.seen).length;
    if (badge) {
        badge.textContent = unseenCount;
        badge.classList.toggle('hidden', unseenCount === 0);
    }
    if (list) {
        list.innerHTML = shares.map(s => `<div class="friend-row friend-share-row" style="cursor:pointer;" data-share-id="${s.id}" data-location-id="${s.locationId}">
            <span>${s.seen ? '' : '🔵 '}${t('sharedByLabel').replace('{username}', s.fromUsername).replace('{location}', s.locationName)}</span>
        </div>`).join('');
    }
    if (empty) empty.classList.toggle('hidden', shares.length > 0);
};

const friendSharesListEl = document.getElementById('friend-shares-list');
if (friendSharesListEl) {
    friendSharesListEl.addEventListener('click', (e) => {
        const row = e.target.closest('.friend-share-row');
        if (!row) return;
        const locId = Number(row.getAttribute('data-location-id'));
        const shareId = row.getAttribute('data-share-id');
        if (typeof window.markShareSeen === 'function') window.markShareSeen(shareId);
        const menu = document.getElementById('friend-shares-menu');
        if (menu) menu.classList.add('hidden');
        const loc = celebLocations.find(l => l.id === locId);
        if (loc && map) map.flyTo([loc.lat, loc.lng], 16);
        if (typeof window.openDetailsPanel === 'function') window.openDetailsPanel(locId);
        window.refreshFriendShares();
    });
}

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
const shareFriendListEl = document.getElementById('share-friend-list');
if (shareFriendListEl) {
    shareFriendListEl.addEventListener('click', async (e) => {
        const opt = e.target.closest('.share-friend-option');
        if (!opt || typeof window.shareLocationWithFriend !== 'function') return;
        const loc = celebLocations.find(l => l.id === currentLocationIdForMemory);
        if (!loc) return;
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

// Bouton "Log out" de la fenêtre de précaution "aucun pass débloqué" (map.html).
document.addEventListener('DOMContentLoaded', () => {
    const gateLogoutLink = document.getElementById('gate-logout-link');
    if (gateLogoutLink) {
        gateLogoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            const finish = () => { localStorage.clear(); window.location.href = 'index.html'; };
            if (typeof window.firebaseSignOut === 'function') window.firebaseSignOut().then(finish).catch(finish);
            else finish();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userAvatarEls = document.querySelectorAll('.user-avatar-btn');
    if (userAvatarEls.length > 0) {
        const savedPhoto = localStorage.getItem('userPhoto');
        // Initiale de l'avatar : prénom en priorité (comme Google), sinon pseudo.
        const firstName = (localStorage.getItem('userFirstName') || '').trim();
        const userName = (localStorage.getItem('userName') || 'U').trim();
        const avatarInitial = (firstName || userName || 'U').charAt(0).toUpperCase();
        
        userAvatarEls.forEach(avatarEl => {
            if (savedPhoto && savedPhoto.trim() !== '') {
                avatarEl.innerHTML = `<img src="${savedPhoto}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;border:none;">`;
                avatarEl.style.color = 'transparent'; 
            } else {
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
        }
    };

    ['lang-btn', 'profile-btn', 'cart-btn', 'friend-shares-btn'].forEach(id => {
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

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
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
            if (typeof window.firebaseSignOut === 'function') {
                window.firebaseSignOut().then(finishLogout).catch(finishLogout);
            } else {
                finishLogout();
            }
        });
    }

    updateUI();

    // Si on arrive sur map.html avec ?loc=ID (depuis le bouton "More details" de
    // visited.html / wishlist.html), on ouvre directement la fiche du lieu concerné.
    if(document.getElementById('map')) {
        const params = new URLSearchParams(window.location.search);
        const locParam = params.get('loc');
        if(locParam) {
            setTimeout(() => {
                if(typeof window.switchMainTab === 'function') window.switchMainTab('explore');
                window.openDetailsPanel(Number(locParam));
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

// Icône générique utilisée pour un marqueur de cluster (plusieurs lieux regroupés) —
// volontairement neutre plutôt qu'une icône de catégorie précise, puisqu'un cluster
// mélange souvent plusieurs catégories/groupes différents.
const CLUSTER_ICON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;

const groupColors = { "BTS": "#8b5cf6", "Blackpink": "#ec4899", "Twice": "#f43f5e", "Seventeen": "#3b82f6", "Katseye": "#10b981", "TXT": "#f59e0b" };

const filterData = {
    "BTS": { members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"], categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks", "Pop-up Store"] },
    "Blackpink": { members: ["Jisoo", "Jennie", "Rosé", "Lisa"], categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"] },
    "General": { categories: ["Cafe", "Concerts", "Fashion", "Landmarks", "Museums", "Restaurants", "Pop-up Store"] }
};

let celebLocations = [
   { id: 1, name: "Cafe Camptong", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2020", episode: "Episodes 118 & 119", episodeLink: "https://weverse.io/bts/media/3-104694116", ytId: "yiqe-aegVk0", address: "27 Apgujeong-ro 42-gil, Gangnam-gu", lat: 37.5255, lng: 127.0375, img: "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg",
  fullDescription: {
    en: `<p>Once nestled in the trendy alleys of Apgujeong, in the heart of Gangnam, Cafe Camptong was a massive five-story urban oasis dedicated to "glamping" (glamorous camping). The concept was pushed to the extreme: fake grass, cozy indoor tents, camping chairs, and string lights offered a rustic escape without leaving Seoul. Although this iconic establishment has unfortunately closed its doors for good, its address remains a must-visit pilgrimage site for ARMYs. And for good reason: this is where episodes 118 and 119 of <em>Run BTS!</em> were filmed in late 2020, becoming the stage for one of the most chaotic and memorable scavenger hunts in the show's history. Standing in front of the facade lets you instantly relive that legendary filming day.</p><p>The café's labyrinthine interior became a true playground where the seven members faced off in a frantic post-it hunt (the famous "Photo Story" arc). The stories from this shoot are legendary: it's impossible not to think of Jin's "squirrel syndrome," compulsively snatching up every post-it he found without even reading them, a Machiavellian plan that ultimately backfired on him. It was also on these stairs that Jungkook literally wore out his cameraman by sprinting at full speed to escape the others. Between fleeting alliances, the Maknae Line's (Jimin and V) hilarious betrayals to get their poses validated in the "Photo Zones," and Suga calmly trying to analyze the situation from inside a tent, the building echoed with their laughter and screams all day long.</p>`,
    fr: `<p>Autrefois niché dans les ruelles branchées d'Apgujeong, au cœur de Gangnam, le Cafe Camptong était une immense oasis urbaine de cinq étages dédiée au "glamping" (le camping glamour). Le concept était poussé à l'extrême : fausse pelouse, tentes d'intérieur douillettes, chaises de camping et guirlandes lumineuses offraient une évasion rustique sans quitter Séoul. Bien que cet établissement emblématique ait malheureusement fermé ses portes définitivement, son adresse reste un lieu de pèlerinage incontournable pour les ARMYs. Et pour cause : c'est ici qu'ont été tournés les épisodes 118 et 119 de <em>Run BTS!</em> fin 2020, devenant le théâtre de l'une des chasses au trésor les plus chaotiques et mémorables de l'histoire de l'émission. Se tenir devant la façade permet de se replonger instantanément dans cette journée de tournage mythique.</p><p>L'intérieur labyrinthique du café s'était alors transformé en un véritable terrain de jeu où les sept membres se sont affrontés lors d'une chasse aux post-it frénétique (le fameux arc "Photo Story"). Les anecdotes de ce tournage sont légendaires : on repense inévitablement au "syndrome de l'écureuil" de Jin, qui arrachait compulsivement tous les post-it trouvés sans même les lire, un plan machiavélique qui s'est finalement retourné contre lui. C'est aussi dans ces escaliers que Jungkook a littéralement épuisé son caméraman à force de sprinter à toute vitesse pour échapper aux autres. Entre les alliances éphémères, les trahisons hilarantes de la Maknae Line (Jimin et V) pour valider leurs poses dans les "Photo Zones", et Suga qui tentait d'analyser calmement la situation depuis une tente, le bâtiment a résonné de leurs rires et de leurs cris toute la journée.</p>`,
    es: `<p>Una vez ubicado en los callejones de moda de Apgujeong, en el corazón de Gangnam, Cafe Camptong era un enorme oasis urbano de cinco pisos dedicado al "glamping" (camping glamoroso). El concepto se llevó al extremo: césped artificial, acogedoras tiendas de campaña en el interior, sillas de camping y luces de cadena ofrecían un escape rústico sin salir de Seúl. Aunque este emblemático establecimiento lamentablemente ha cerrado sus puertas de forma permanente, su dirección sigue siendo un lugar de peregrinación de visita obligada para l@s ARMYs. Y por una buena razón: aquí es donde se filmaron los episodios 118 y 119 de <em>Run BTS!</em> a finales de 2020, convirtiéndose en el escenario de una de las búsquedas del tesoro más caóticas y memorables de la historia del programa. Pararse frente a la fachada te permite sumergirte instantáneamente en ese legendario día de rodaje.</p><p>El laberíntico interior del café se transformó en un verdadero patio de recreo donde los siete miembros se enfrentaron en una frenética búsqueda de post-its (el famoso arco de "Photo Story"). Las anécdotas de este rodaje son legendarias: inevitablemente pensamos en el "síndrome de la ardilla" de Jin, quien arrancaba compulsivamente todos los post-its que encontraba sin siquiera leerlos, un plan maquiavélico que al final se volvió en su contra. También fue en estas escaleras donde Jungkook literalmente agotó a su camarógrafo al correr a toda velocidad para escapar de los demás. Entre alianzas fugaces, traiciones hilarantes de la Maknae Line (Jimin y V) para validar sus poses en las "Photo Zones", y Suga intentando analizar con calma la situación desde una tienda de campaña, el edificio resonó con sus risas y gritos durante todo el día.</p>`,
    it: `<p>Un tempo incastonato nei vicoli alla moda di Apgujeong, nel cuore di Gangnam, il Cafe Camptong era un'enorme oasi urbana di cinque piani dedicata al "glamping" (campeggio glamour). Il concetto era spinto all'estremo: erba finta, accoglienti tende da interni, sedie da campeggio e luci a corda offrivano una fuga rustica senza lasciare Seoul. Anche se questo iconico stabilimento ha purtroppo chiuso definitivamente i battenti, il suo indirizzo rimane un luogo di pellegrinaggio imperdibile per le/gli ARMY. E per una buona ragione: è qui che sono stati girati gli episodi 118 e 119 di <em>Run BTS!</em> alla fine del 2020, diventando il teatro di una delle cacce al tesoro più caotiche e memorabili della storia dello show. Stare davanti alla facciata ti permette di immergerti all'istante in quella leggendaria giornata di riprese.</p><p>L'interno labirintico del caffè si trasformò in un vero e proprio parco giochi in cui i sette membri si sfidarono in una frenetica caccia ai post-it (il famoso arco narrativo "Photo Story"). Le aneddoti di queste riprese sono leggendarie: si pensa inevitabilmente alla "sindrome dello scoiattolo" di Jin, che strappava compulsivamente tutti i post-it trovati senza nemmeno leggerli, un piano machiavellico che alla fine gli si è ritorto contro. È anche su queste scale che Jungkook ha letteralmente sfiancato il suo cameraman scattando a tutta velocità per sfuggire agli altri. Tra alleanze fugaci, esilaranti tradimenti della Maknae Line (Jimin e V) per convalidare le loro pose nelle "Photo Zones", e Suga che cercava di analizzare con calma la situazione da una tenda, l'edificio ha risuonato delle loro risate e urla per tutto il giorno.</p>`,
    ko: `<p>강남의 심장부, 트렌디한 압구정 골목에 자리 잡고 있던 카페 캠프통은 '글램핑'을 테마로 한 5층 규모의 거대한 도심 속 오아시스였습니다. 인조 잔디, 아늑한 실내 텐트, 캠핑 의자, 꼬마전구 등 콘셉트를 극대화하여 서울을 떠나지 않고도 시골로 탈출한 듯한 느낌을 주었습니다. 아쉽게도 이 상징적인 장소는 영구 폐업했지만, 이 주소는 아미들에게 여전히 필수 순례지로 남아있습니다. 그도 그럴 것이 이곳은 2020년 말 <em>달려라 방탄!</em> 118, 119화가 촬영된 곳으로, 프로그램 역사상 가장 혼란스럽고 기억에 남는 보물찾기의 무대가 되었기 때문입니다. 건물 정면에 서면 그 전설적인 촬영 날의 분위기로 순식간에 빠져들 수 있습니다.</p><p>카페의 미로 같은 내부는 일곱 멤버가 열띤 포스트잇 찾기(유명한 '포토 스토리' 에피소드)를 벌이는 진정한 놀이터로 변했습니다. 이 촬영에 얽힌 일화들은 전설적입니다. 포스트잇을 읽지도 않고 강박적으로 다 뜯어버리던 진의 '다람쥐 증후군'과 결국 자신에게 화살로 돌아온 마키아벨리적 계획은 잊을 수 없습니다. 정국이 다른 멤버들을 피하기 위해 전력 질주하며 카메라맨을 말 그대로 기진맥진하게 만든 곳도 바로 이 계단입니다. 찰나의 동맹, '포토 존'에서 포즈를 인정받기 위한 막내 라인(지민, 뷔)의 유쾌한 배신, 텐트 안에서 상황을 침착하게 분석하려던 슈가 등 건물은 하루 종일 멤버들의 웃음과 비명으로 가득 찼습니다.</p>`,
    ja: `<p>江南の中心部、トレンディな狎鴎亭の路地裏にひっそりと佇んでいたCafe Camptongは、「グランピング」をテーマにした5階建ての巨大な都会のオアシスでした。人工芝、居心地の良い屋内テント、キャンプチェア、ストリングライトなど、コンセプトが極限まで追求され、ソウルにいながらにして田舎への逃避行を提供していました。残念ながらこの象徴的な店は永久に閉店してしまいましたが、その住所は今でもARMYにとって必見の巡礼地です。それもそのはず、ここは2020年末に<em>Run BTS!</em>のエピソード118と119が撮影された場所であり、番組史上最もカオスで記憶に残る宝探しの舞台となったからです。ファサードの前に立つと、あの伝説的な撮影の日に一瞬でタイムスリップできます。</p><p>カフェの迷路のような内部は、7人のメンバーが熱狂的なポストイット探し（有名な「フォトストーリー」編）で対決する本物の遊び場と化しました。この撮影のエピソードは伝説的です。見つけたポストイットを読まずに強迫的に剥がし取ったジンの「リス症候群」や、結局裏目に出たマキャベリ的な計画は忘れられません。ジョングクが他のメンバーから逃れるために全力疾走し、カメラマンを文字通り疲労困憊させたのもこの階段でした。束の間の同盟、「フォトゾーン」でポーズを認めてもらうためのマンネライン（ジミンとV）の爆笑の裏切り、テントの中で状況を冷静に分析しようとしていたシュガなど、建物は一日中彼らの笑い声と叫び声で響き渡っていました。</p>`,
    pt: `<p>Outrora aninhado nas vielas da moda de Apgujeong, no coração de Gangnam, o Cafe Camptong era um enorme oásis urbano de cinco andares dedicado ao "glamping" (acampamento glamoroso). O conceito foi levado ao extremo: grama falsa, tendas internas aconchegantes, cadeiras de acampamento e luzes de corda ofereciam uma fuga rústica sem sair de Seul. Embora este estabelecimento icônico infelizmente tenha fechado suas portas permanentemente, seu endereço continua sendo um local de peregrinação obrigatório para os ARMYs. E por um bom motivo: foi aqui que os episódios 118 e 119 de <em>Run BTS!</em> foram filmados no final de 2020, tornando-se o palco de uma das caças ao tesouro mais caóticas e memoráveis da história do programa. Ficar em frente à fachada permite que você mergulhe instantaneamente de volta naquele lendário dia de filmagem.</p><p>O interior labiríntico do café se transformou em um verdadeiro playground onde os sete membros se enfrentaram em uma caçada frenética por post-its (o famoso arco "Photo Story"). As anedotas dessa filmagem são lendárias: pensa-se inevitavelmente na "síndrome do esquilo" de Jin, que arrancava compulsivamente todos os post-its encontrados sem sequer lê-los, um plano maquiavélico que acabou se voltando contra ele. Foi também nestas escadas que Jungkook literalmente exauriu o seu cinegrafista correndo a toda velocidade para escapar dos outros. Entre alianças fugazes, as hilárias traições da Maknae Line (Jimin e V) para validar suas poses nas "Photo Zones", e Suga tentando analisar calmamente a situação de dentro de uma tenda, o prédio ecoou com seus risos e gritos o dia todo.</p>`,
    zh: `<p>Cafe Camptong曾经坐落在江南中心时尚的狎鸥亭小巷中，是一个占地五层、以“豪华露营”为主题的巨大都市绿洲。这里的概念发挥到了极致：人造草坪、舒适的室内帐篷、露营椅和串灯，让你无需离开首尔就能享受乡村般的逃离。尽管这家标志性的店面遗憾地已永久关闭，但它的地址依然是ARMY们必去的朝圣地。原因很简单：这里是2020年底<em>Run BTS!</em>第118和119集的拍摄地，也是该节目历史上最混乱、最令人难忘的寻宝游戏舞台。站在建筑正面，你可以瞬间沉浸在那个传奇拍摄日的回忆中。</p><p>咖啡馆迷宫般的内部变成了一个真正的游乐场，七名成员在这里展开了疯狂的便利贴寻找战（著名的“照片故事”篇）。这次拍摄的轶事堪称传奇：不可避免地会让人想起Jin的“松鼠综合症”，他强迫症般地撕下所有找到的便利贴，看都不看一眼，这个马基雅维利式的计划最终让他自食其果。同样是在这些楼梯上，Jungkook为了躲避其他成员全速冲刺，让他的摄像师累得半死。在短暂的结盟、忙内小分队（Jimin和V）为了在“拍照区”认证姿势而上演的搞笑背叛，以及Suga试图在帐篷里冷静分析局势之间，整栋建筑一整天都回荡着他们的笑声和尖叫声。</p>`
  },
  // Practical information & access : 3 items titrés (statut du lieu, comment s'y
  // rendre, quoi faire alentour) — voir practicalList dans openDetailsPanel(). Contenu
  // français fourni tel quel par toi (01/09/2026) ; les autres langues reprennent la
  // substance déjà traduite précédemment (statut/alentours) et l'ancien champ
  // "directions" (comment s'y rendre), simplement réorganisés dans cette structure.
  practicalInfo: [
    {
      title: { en: "Location status", fr: "Statut du lieu", es: "Estado del lugar", it: "Stato del luogo", ko: "장소 상태", ja: "場所の状況", pt: "Status do local", zh: "地点状态" },
      text: {
        en: "Permanently closed. The original establishment with its tents and indoor rooftop no longer exists. However, the building and the alley (at 27 Apgujeong-ro 42-gil, Gangnam-gu) remain accessible public spaces. It's the perfect opportunity to take a souvenir photo of the complex's exterior and check off this legendary milestone on your pilgrimage map.",
        fr: "Fermé définitivement. L'établissement d'origine avec ses tentes et son rooftop intérieur n'existe plus. Cependant, le bâtiment et la ruelle (au 27 Apgujeong-ro 42-gil, Gangnam-gu) restent des espaces publics accessibles. C'est l'occasion parfaite pour prendre une photo souvenir de l'extérieur du complexe et marquer ce point de passage mythique sur votre carte de pèlerinage.",
        es: "Cerrado permanentemente. El establecimiento original con sus tiendas y su azotea interior ya no existe. Sin embargo, el edificio y el callejón (en 27 Apgujeong-ro 42-gil, Gangnam-gu) siguen siendo espacios públicos accesibles. Es la oportunidad perfecta para tomar una foto de recuerdo del exterior del complejo y marcar este punto de paso mítico en tu mapa de peregrinación.",
        it: "Chiuso definitivamente. La struttura originale con le sue tende e il rooftop interno non esiste più. Tuttavia, l'edificio e il vicolo (al 27 Apgujeong-ro 42-gil, Gangnam-gu) rimangono spazi pubblici accessibili. È l'occasione perfetta per scattare una foto ricordo dell'esterno del complesso e segnare questo punto mitico sulla tua mappa di pellegrinaggio.",
        ko: "영구 폐업. 텐트와 실내 루프탑이 있던 원래 시설은 더 이상 존재하지 않습니다. 하지만 건물과 골목(강남구 압구정로42길 27)은 여전히 접근 가능한 공공장소입니다. 건물 외관을 배경으로 기념사진을 찍고, 순례 지도에 이 전설적인 장소를 표시할 완벽한 기회입니다.",
        ja: "永久閉店。テントや屋内屋上があった元の施設はもう存在しません。しかし、建物と路地（江南区狎鴎亭路42街27）は依然としてアクセス可能な公共スペースです。建物の外観の記念写真を撮り、巡礼マップにこの伝説的な場所をマークする絶好の機会です。",
        pt: "Permanentemente fechado. O estabelecimento original com suas tendas e terraço interno não existe mais. No entanto, o prédio e o beco (em 27 Apgujeong-ro 42-gil, Gangnam-gu) continuam sendo espaços públicos acessíveis. É a oportunidade perfeita para tirar uma foto de lembrança do exterior do complexo e marcar este marco lendário no seu mapa de peregrinação.",
        zh: "永久关闭。最初带有帐篷和室内屋顶的设施已不复存在。然而，建筑和所在的小巷（江南区狎鸥亭路42街27号）仍然是可进入的公共空间。这是拍摄建筑外观纪念照、在你的朝圣地图上标记这个传奇地点的绝佳机会。"
      }
    },
    {
      title: { en: "How to get there", fr: "Comment s'y rendre", es: "Cómo llegar", it: "Come arrivare", ko: "가는 방법", ja: "アクセス方法", pt: "Como chegar", zh: "如何前往" },
      text: {
        en: "Take the Suin-Bundang subway line to Apgujeong Rodeo station and use exit 5. You will need to walk about 8 minutes north. The walk is very pleasant as it takes you through the lively Rodeo shopping streets, lined with boutiques and storefronts typical of Gangnam's luxurious atmosphere.",
        fr: "Empruntez la ligne de métro Suin-Bundang jusqu'à la station Apgujeong Rodeo et prenez la sortie 5. Il vous faudra marcher environ 8 minutes vers le nord. Le trajet est très agréable car il vous fait traverser les rues commerçantes animées de Rodeo, bordées de boutiques et vitrines typiques de l'atmosphère luxueuse de Gangnam.",
        es: "Toma la línea de metro Suin-Bundang hasta la estación Apgujeong Rodeo y toma la salida 5. Tendrás que caminar unos 8 minutos hacia el norte. El trayecto es muy agradable ya que te hace atravesar las animadas calles comerciales de Rodeo, bordeadas de boutiques y escaparates típicos del ambiente lujoso de Gangnam.",
        it: "Prendi la linea della metropolitana Suin-Bundang fino alla stazione Apgujeong Rodeo e prendi l'uscita 5. Dovrai camminare per circa 8 minuti verso nord. Il tragitto è molto piacevole in quanto ti fa attraversare le animate strade dello shopping di Rodeo, fiancheggiate da boutique e vetrine tipiche della lussuosa atmosfera di Gangnam.",
        ko: "수인분당선을 타고 압구정로데오역에서 내려 5번 출구로 나옵니다. 북쪽으로 약 8분 정도 걸어가야 합니다. 강남 특유의 고급스러운 분위기를 느낄 수 있는 부티크와 쇼윈도가 늘어선 활기찬 로데오 쇼핑거리를 지나게 되어 걷는 길이 매우 즐겁습니다.",
        ja: "水仁・盆唐線に乗り、狎鴎亭ロデオ駅の5番出口を出ます。北へ約8分歩きます。江南の豪華な雰囲気を象徴するブティックやショーウィンドウが並ぶ、活気あるロデオのショッピングストリートを抜けるため、歩くのもとても楽しいです。",
        pt: "Pegue a linha de metrô Suin-Bundang até a estação Apgujeong Rodeo e use a saída 5. Você precisará caminhar cerca de 8 minutos para o norte. A caminhada é muito agradável, pois leva você pelas animadas ruas comerciais de Rodeo, repletas de butiques e vitrines típicas da luxuosa atmosfera de Gangnam.",
        zh: "乘坐水仁·盆唐线至狎鸥亭罗德奥站，从5号出口出站。你需要向北步行约8分钟。这段路非常惬意，因为你将穿过热闹的罗德奥商业街，两旁林立着充满江南奢华气息的精品店和橱窗。"
      }
    },
    {
      title: { en: "What to do around the cafe?", fr: "Que faire autour du café ?", es: "¿Qué hacer alrededor del café?", it: "Cosa fare nei dintorni del caffè?", ko: "카페 주변에서 할 일", ja: "カフェの周辺で何をする？", pt: "O que fazer ao redor do café?", zh: "在咖啡馆周围做什么？" },
      text: {
        en: "Since you can no longer eat or drink on site, take advantage of being in this highly strategic neighborhood! Just a few minutes' walk away, you can reach the famous K-Star Road to admire the well-known \"GangnamDols,\" or walk to Hakdong Park and the area around BTS's old dorm, foundational places from their trainee days.",
        fr: "Puisque vous ne pouvez plus consommer sur place, profitez d'être dans ce quartier hautement stratégique ! À quelques minutes de marche de là, vous pouvez rejoindre la célèbre K-Star Road pour admirer les fameux \"GangnamDols\", ou marcher jusqu'au parc Hakdong et aux environs de l'ancien dortoir de BTS, des lieux fondateurs de leur époque de trainees.",
        es: "Ya que no puedes consumir en el lugar, ¡aprovecha estar en este barrio altamente estratégico! A pocos minutos a pie, puedes llegar a la famosa K-Star Road para admirar los famosos \"GangnamDols\", o caminar hasta el parque Hakdong y los alrededores del antiguo dormitorio de BTS, lugares fundamentales de su época de aprendices.",
        it: "Poiché non puoi più consumare sul posto, approfitta di essere in questo quartiere altamente strategico! A pochi minuti di cammino, puoi raggiungere la famosa K-Star Road per ammirare i noti \"GangnamDols\", oppure camminare fino al parco Hakdong e ai dintorni del vecchio dormitorio dei BTS, luoghi fondamentali dei loro giorni da trainee.",
        ko: "더 이상 이곳에서 커피를 마실 수는 없지만, 이 전략적인 동네에 있다는 사실을 활용하세요! 걸어서 몇 분만 가면 유명한 '강남돌'을 볼 수 있는 K-Star Road가 있고, 연습생 시절의 발자취가 남은 학동공원과 BTS의 옛 숙소 주변까지 걸어갈 수 있습니다.",
        ja: "ここで飲食することはもうできませんが、この戦略的なエリアにいることを最大限に活用しましょう！歩いて数分のところに、有名な「江南ドル（GangnamDol）」を楽しめるK-Star Roadがあります。また、練習生時代の原点である鶴洞公園やBTSの旧宿舎周辺まで歩いて行くこともできます。",
        pt: "Já que você não pode mais consumir no local, aproveite estar neste bairro altamente estratégico! A poucos minutos de caminhada, você pode chegar à famosa K-Star Road para admirar os conhecidos \"GangnamDols\", ou caminhar até o Parque Hakdong e os arredores do antigo dormitório do BTS, lugares fundamentais dos seus tempos de trainee.",
        zh: "既然你已经不能在这里消费了，那就充分利用在这个极具战略意义的街区的时间吧！步行几分钟，你就可以到达著名的韩流明星大道（K-Star Road）欣赏著名的“江南熊（GangnamDols）”，或者步行去鹤洞公园和防弹少年团旧宿舍附近，那些是他们练习生时代的重要地点。"
      }
    }
  ],
  // Tips : 2 conseils titrés (rond numéroté rose automatique via .tip-line/.num — voir
  // openDetailsPanel()). Contenu français fourni tel quel par toi (01/09/2026) ; les
  // autres langues reprennent la substance déjà traduite précédemment.
  tipsList: [
    {
      title: { en: "Immersion tip", fr: "Le conseil immersion.", es: "Consejo de inmersión", it: "Consiglio per l'immersione", ko: "몰입 팁", ja: "没入感のためのヒント", pt: "Conselho de imersão", zh: "沉浸式提示" },
      text: {
        en: "Before heading to this address, don't hesitate to re-watch episode 119 of Run BTS! in your hotel room. This will let you perfectly recognize the building's exterior architecture and the street where the members arrived, making your visit to the storefront much more vivid and full of nostalgia.",
        fr: "Avant de vous rendre à cette adresse, n'hésitez pas à re-visionner l'épisode 119 de Run BTS! dans votre chambre d'hôtel. Cela vous permettra de reconnaître parfaitement l'architecture extérieure du bâtiment et la rue où les membres sont arrivés, rendant votre visite devant la devanture beaucoup plus vivante et remplie de nostalgie.",
        es: "Antes de ir a esta dirección, no dudes en volver a ver el episodio 119 de Run BTS! en tu habitación de hotel para reconocer perfectamente la arquitectura exterior del edificio y la calle por donde llegaron los miembros.",
        it: "Prima di recarti a questo indirizzo, non esitare a riguardare l'episodio 119 di Run BTS! nella tua camera d'albergo per riconoscere perfettamente l'architettura esterna dell'edificio e la strada da cui sono arrivati i membri.",
        ko: "이곳을 방문하기 전, 호텔 방에서 달려라 방탄! 119화를 다시 시청해 보세요. 건물의 외관과 멤버들이 도착했던 거리를 완벽하게 알아볼 수 있을 것입니다.",
        ja: "この場所に向かう前に、ホテルの部屋でRun BTS!のエピソード119をもう一度見直すことをお勧めします。建物の外観やメンバーが到着した通りを完璧に認識できるようになります。",
        pt: "Antes de ir a este endereço, não hesite em rever o episódio 119 de Run BTS! no seu quarto de hotel para reconhecer perfeitamente a arquitetura exterior do edifício e a rua onde os membros chegaram.",
        zh: "在前往这个地址之前，不要犹豫在酒店房间里重温一遍Run BTS!的第119集，这样你就能完美认出建筑的外观和成员们到达的街道。"
      }
    },
    {
      title: { en: "Where to take a real coffee break?", fr: "Où faire une vraie pause café ?", es: "¿Dónde tomar un verdadero descanso para el café?", it: "Dove fare una vera pausa caffè?", ko: "진짜 커피 브레이크는 어디서?", ja: "本当のコーヒーブレイクはどこで？", pt: "Onde fazer uma verdadeira pausa para o café?", zh: "去哪里享受真正的咖啡休息时间？" },
      text: {
        en: "With Cafe Camptong closed, fall back on other historic addresses in the neighborhood for your snack. Gangnam is full of other cafés and restaurants the members used to frequent in their younger days: use the app's map mode to find the nearest open BTS location to rest after your walk!",
        fr: "Le Cafe Camptong étant fermé, rabattez-vous sur d'autres adresses historiques du quartier pour votre goûter. Le quartier de Gangnam regorge d'autres cafés et restaurants fréquentés par les membres dans leur jeunesse : utilisez le mode carte de l'application pour trouver le lieu BTS ouvert le plus proche pour vous reposer après votre marche !",
        es: "Como el Cafe Camptong está cerrado, recurre a otras direcciones históricas del barrio para tu merienda. ¡Utiliza el modo mapa de la aplicación para encontrar el lugar de BTS abierto más cercano!",
        it: "Essendo il Cafe Camptong chiuso, ripiega su altri indirizzi storici del quartiere per la tua merenda. Utilizza la modalità mappa dell'app per trovare il luogo BTS aperto più vicino!",
        ko: "카페 캠프통이 폐업했으니, 간식을 즐기려면 근처의 다른 역사적인 장소들을 방문해 보세요. 앱의 지도 모드를 사용해 가장 가까운 영업 중인 BTS 관련 장소를 찾아보세요!",
        ja: "Cafe Camptongは閉店しているので、おやつには近隣の他の歴史的な場所を利用しましょう。アプリのマップモードを使って、一番近くの営業しているBTS関連の場所を見つけてください！",
        pt: "Como o Cafe Camptong está fechado, recorra a outros endereços históricos do bairro para o seu lanche. Use o modo mapa do aplicativo para encontrar o local BTS aberto mais próximo!",
        zh: "既然Cafe Camptong关门了，去街区里其他有历史意义的地点吃点点心吧。使用应用程序的地图模式寻找最近的正在营业的防弹少年团相关地点！"
      }
    }
  ]
},
    
    { id: 2, name: "Ossu Seiromushi", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018", ytId: "Otsu1", address: "30 Baekjegobun-ro 45-gil, Songpa-gu", lat: 37.5105, lng: 127.1085, img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
      fullDescription: { en: `<p>Set on a quiet street a short walk from Seokchon Lake, Ossu Seiromushi is a steamed-dish specialty restaurant known for its clean, minimalist dining room and its signature bamboo steamer baskets piled high with pork, vegetables and rice cake.</p><p>The restaurant is closely associated with Jin, who has spoken publicly about his appreciation for its cooking style, and it has since become something of a pilgrimage stop for fans exploring the Songpa-gu area near Lotte World.</p>`,
        fr: `<p>Installé dans une rue tranquille à quelques minutes à pied du lac Seokchon, Ossu Seiromushi est un restaurant spécialisé dans les plats vapeur, reconnaissable à sa salle épurée et minimaliste et à ses célèbres paniers en bambou débordant de porc, de légumes et de gâteau de riz.</p><p>Ce restaurant est étroitement associé à Jin, qui a publiquement exprimé son appréciation pour ce style de cuisine, et il est depuis devenu une étape incontournable pour les fans qui explorent le quartier de Songpa-gu, non loin de Lotte World.</p>` },
      tip: { en: "Reservations aren't accepted — arrive right at opening time on weekdays to avoid the longest waits.", fr: "Les réservations ne sont pas acceptées — arrivez pile à l'ouverture en semaine pour éviter les plus longues attentes." },
      directions: { en: "Take Line 8 or the Bundang Line to Songpanaru Station (Exit 2) and walk about 10 minutes east.", fr: "Prenez la ligne 8 ou la ligne Bundang jusqu'à la station Songpanaru (sortie 2) et marchez environ 10 minutes vers l'est." } },

    { id: 3, name: "Lotte World Adventure", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2018", episode: "Episode 51", ytId: "RvDfJBPxjjw", episodeLink: "https://www.youtube.com/watch?v=RvDfJBPxjjw", address: "240 Olympic-ro, Songpa-gu", lat: 37.5113, lng: 127.0980, img: "https://img.youtube.com/vi/RvDfJBPxjjw/hqdefault.jpg",
      fullDescription: { en: `<p>In one of the very first episodes of Run BTS! in 2015, the boys went to Lotte World after hours.</p><p>Fans still laugh at the iconic footage of J-Hope screaming on the Flume Ride and the Viking ship.</p>`,
        fr: `<p>L'un des plus grands parcs à thème intérieurs au monde, Lotte World Adventure réunit sous un même toit, en plein cœur de Jamsil, un parc d'attractions entièrement couvert, un lac artificiel, une patinoire et un musée du folklore.</p><p>BTS a investi le parc le temps d'une journée entière de manèges, de jeux et de défis costumés, et le gigantesque atrium intérieur — avec son toit en verre en forme de dôme et son parcours de parade — est instantanément devenu reconnaissable par les fans du monde entier comme le décor de certains des moments les plus joyeusement chaotiques de Run BTS.</p>` },
      tipsList: [ { title: { en: `Ride the Flume Ride` }, text: { en: `Try to keep a straight face like Suga did during the drop!` } }, { title: { en: `Rent a school uniform` }, text: { en: `A huge trend for young Koreans visiting Lotte World.` } } ],
      practicalInfo: [ { title: { en: `Pricing` }, text: { en: `Day pass is approx. 62,000 KRW (discounts often available online).` } }, { title: { en: `What to expect` }, text: { en: `A massive indoor/outdoor theme park in the middle of the city.` } }, { title: { en: `How to get there` }, text: { en: `Jamsil Station (Lines 2 and 8).` } } ] },

    { id: 4, name: "Ahwon Museum & Hotel", group: "BTS", member: "All", country: "South Korea", city: "Wanju", category: "Museums", year: "2019", ytId: "h1jUtpEzxxA", address: "516-7 Songgwangsuman-ro", lat: 35.8455, lng: 127.1895, img: "https://img.youtube.com/vi/h1jUtpEzxxA/hqdefault.jpg",
      fullDescription: { en: `<p>Hidden in the forested hills of Wanju in North Jeolla Province, Ahwon Museum & Hotel is a boutique art museum and stay built around an extensive private collection of contemporary Korean sculpture and installation art, spread across quiet outdoor gardens and minimalist gallery halls.</p><p>Its remote, tranquil setting made it a natural choice for a slower, more introspective filming segment, letting the members wander the grounds and galleries far from the usual city noise.</p>`,
        fr: `<p>Caché dans les collines boisées de Wanju, dans la province du Jeolla du Nord, Ahwon Museum & Hotel est un musée d'art-boutique bâti autour d'une vaste collection privée de sculptures et d'installations d'art contemporain coréen, répartie entre jardins extérieurs paisibles et salles d'exposition minimalistes.</p><p>Son cadre isolé et tranquille en a fait un choix naturel pour un tournage plus lent et introspectif, laissant les membres flâner dans les jardins et les galeries loin du bruit habituel de la ville.</p>` },
      tip: { en: "Book the gallery tour slot in advance — access to certain wings is limited to a handful of visitors per day.", fr: "Réservez le créneau de visite guidée à l'avance — l'accès à certaines ailes est limité à une poignée de visiteurs par jour." },
      directions: { en: "The museum is best reached by car from Jeonju (around 40 minutes); public transit options in the area are limited.", fr: "Le musée se rejoint le plus facilement en voiture depuis Jeonju (environ 40 minutes) ; les options de transport en commun sont limitées dans ce secteur." } },

    { id: 5, name: "Cafe Kitsuné Seoul", group: "Blackpink", member: "Jennie", country: "South Korea", city: "Seoul", category: "Cafe", year: "2021", ytId: "Kitsune1", address: "23 Dosan-daero 13-gil", lat: 37.5197, lng: 127.0229, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
      fullDescription: { en: `<p>The Seoul outpost of the French fashion-and-coffee brand Maison Kitsuné sits on a stylish backstreet of Apgujeong Rodeo, blending its signature fox-logo streetwear boutique with a sleek, sun-lit café counter.</p><p>Jennie has been photographed here on several occasions, and the location quickly became a favourite stop for fans chasing both a good flat white and a slice of Blackpink-adjacent Seoul fashion culture.</p>`,
        fr: `<p>L'antenne séoulite de la marque française de mode et de café Maison Kitsuné occupe une rue élégante d'Apgujeong Rodeo, mêlant sa boutique de streetwear au logo renard emblématique à un comptoir de café épuré et baigné de lumière.</p><p>Jennie y a été photographiée à plusieurs reprises, et le lieu est rapidement devenu un arrêt incontournable pour les fans en quête à la fois d'un bon flat white et d'un aperçu de la culture mode séoulite proche de Blackpink.</p>` },
      tip: { en: "The boutique and café share the same entrance — browse the clothing rack first, the coffee counter is tucked in the back.", fr: "La boutique et le café partagent la même entrée — parcourez d'abord le portant de vêtements, le comptoir à café est niché au fond." },
      directions: { en: "From Apgujeong Rodeo Station (Suin-Bundang Line), walk about 10 minutes through the Dosan-daero side streets.", fr: "Depuis la station Apgujeong Rodeo (ligne Suin-Bundang), marchez environ 10 minutes à travers les rues secondaires de Dosan-daero." } },

    { id: 6, name: "Pozzetto", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Cafe", year: "2019", ytId: "Pozzetto1", address: "39 Rue du Roi de Sicile, Paris", lat: 48.8569, lng: 2.3572, img: "https://images.unsplash.com/photo-1557142046-c704a3adf365?w=600",
      fullDescription: { en: `<p>A small, unassuming gelateria in the heart of Le Marais, Pozzetto is beloved by Parisians for its authentically Italian, slow-churned gelato served in the traditional "pozzetto" wells rather than piled-high mounds.</p><p>Jimin was spotted stopping by during a visit to Paris, and the narrow cobblestone street outside — lined with old stone façades — has since become a quiet but well-loved detour for fans wandering the Marais.</p>`,
        fr: `<p>Petite gelateria discrète au cœur du Marais, Pozzetto est appréciée des Parisiens pour ses glaces italiennes authentiques, turbinées lentement et servies dans les traditionnels "pozzetti" plutôt qu'en boules empilées.</p><p>Jimin y a été aperçu lors d'un passage à Paris, et la ruelle pavée à l'extérieur — bordée de vieilles façades en pierre — est depuis devenue un détour discret mais très apprécié pour les fans qui flânent dans le Marais.</p>` },
      tip: { en: "Try the pistachio or the tiramisu flavour — both are the shop's most requested and tend to sell out on warm afternoons.", fr: "Essayez le parfum pistache ou tiramisu — ce sont les plus demandés de la boutique et ils partent vite les après-midis ensoleillés." },
      directions: { en: "Take Metro Line 1 to Saint-Paul or Line 11 to Hôtel de Ville, then walk 5–7 minutes into the Marais.", fr: "Prenez la ligne 1 du métro jusqu'à Saint-Paul ou la ligne 11 jusqu'à Hôtel de Ville, puis marchez 5 à 7 minutes dans le Marais." } },

    { id: 7, name: "Musée Nissim de Camondo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Fashion", year: "2026", ytId: "1TdxCtgX53w", address: "63 Rue de Monceau, Paris", lat: 48.8795, lng: 2.3117, img: "https://img.youtube.com/vi/1TdxCtgX53w/hqdefault.jpg",
      fullDescription: { en: `<p>Overlooking Parc Monceau, this preserved early-20th-century private mansion houses an extraordinary collection of 18th-century French decorative arts, its rooms kept exactly as they were when the Camondo family lived there.</p><p>The museum's opulent, perfectly preserved interiors made it a striking setting for a high-fashion appearance tied to Jimin, and the location has since drawn fans interested in both music and fine French heritage architecture.</p>`,
        fr: `<p>Donnant sur le Parc Monceau, cet hôtel particulier du début du XXe siècle parfaitement préservé abrite une collection exceptionnelle d'arts décoratifs français du XVIIIe siècle, ses pièces étant conservées telles qu'elles étaient du vivant de la famille Camondo.</p><p>Les intérieurs somptueux et intacts du musée en ont fait un décor saisissant pour une apparition mode haut de gamme liée à Jimin, et le lieu attire depuis des fans intéressés à la fois par la musique et par le patrimoine architectural français.</p>` },
      tip: { en: "The museum limits daily visitor numbers to protect the period rooms — buying a timed ticket online in advance is strongly recommended.", fr: "Le musée limite le nombre de visiteurs quotidiens pour protéger ses pièces d'époque — il est vivement recommandé d'acheter un billet horodaté en ligne à l'avance." },
      directions: { en: "Take Metro Line 2 or 3 to Villiers or Monceau, then walk 3–5 minutes to the park entrance on Rue de Monceau.", fr: "Prenez la ligne 2 ou 3 du métro jusqu'à Villiers ou Monceau, puis marchez 3 à 5 minutes jusqu'à l'entrée du parc, Rue de Monceau." } },

    { id: 8, name: "Montmartre Stairs", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", ytId: "Montmartre1", address: "Rue Foyatier, Paris", lat: 48.8856, lng: 2.3432, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
      fullDescription: { en: `<p>The steep, iconic staircase of Rue Foyatier climbs the Montmartre hill toward the Sacré-Cœur basilica, its central funicular track flanked by nearly 300 steps that have appeared in countless films and photographs.</p><p>Jimin was photographed here during a quiet stroll through the neighbourhood, adding one more layer to the staircase's already legendary status among visitors chasing the perfect Parisian panorama.</p>`,
        fr: `<p>L'escalier abrupt et emblématique de la rue Foyatier grimpe la butte Montmartre en direction de la basilique du Sacré-Cœur, sa voie centrale de funiculaire encadrée par près de 300 marches qui ont figuré dans d'innombrables films et photographies.</p><p>Jimin y a été photographié lors d'une promenade tranquille dans le quartier, ajoutant une couche supplémentaire au statut déjà légendaire de cet escalier auprès des visiteurs en quête du panorama parisien parfait.</p>` },
      tip: { en: "Climb up early in the morning for soft light and far fewer tourists on the steps.", fr: "Montez tôt le matin pour profiter d'une lumière douce et de bien moins de touristes sur les marches." },
      directions: { en: "Take Metro Line 12 to Abbesses and follow signs for the funicular; the staircase runs directly alongside it.", fr: "Prenez la ligne 12 du métro jusqu'à Abbesses et suivez les panneaux vers le funiculaire ; l'escalier longe directement celui-ci." } },

    { id: 9, name: "Wall of Love", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", ytId: "WallOfLove1", address: "Square Jehan Rictus, Paris", lat: 48.8848, lng: 2.3386, img: "https://images.unsplash.com/photo-1522093005080-d132e14a2e6f?w=600",
      fullDescription: { en: `<p>Tucked inside a small park at the foot of Montmartre, the Wall of Love ("Le Mur des Je t'aime") is a striking 40-square-metre mural where the phrase "I love you" is painted in over 250 languages and dialects across deep blue enamel tiles.</p><p>Jimin's visit to this quiet, romantic corner of Paris turned it into an unofficial pilgrimage spot for fans, many of whom now search the tiles for their own native language before taking a photo.</p>`,
        fr: `<p>Niché dans un petit parc au pied de Montmartre, le Mur des Je t'aime est une saisissante fresque de 40 mètres carrés où la phrase "je t'aime" est peinte en plus de 250 langues et dialectes sur des carreaux d'émail bleu profond.</p><p>La visite de Jimin dans ce coin romantique et paisible de Paris en a fait un lieu de pèlerinage officieux pour les fans, dont beaucoup cherchent désormais leur propre langue maternelle sur les carreaux avant de prendre une photo.</p>` },
      tip: { en: "Look for 'Je t'aime' in Korean near the lower-left section of the wall — it's the tile most fans photograph first.", fr: "Cherchez « je t'aime » en coréen près de la partie inférieure gauche du mur — c'est le carreau que la plupart des fans photographient en premier." },
      directions: { en: "Take Metro Line 12 to Abbesses; the square is a 2-minute walk from the station, right next to the metro entrance.", fr: "Prenez la ligne 12 du métro jusqu'à Abbesses ; le square se trouve à 2 minutes à pied de la station, juste à côté de l'entrée du métro." } },

    { id: 10, name: "Palais de Tokyo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Museums", year: "2023", ytId: "PalaisTokyo1", address: "13 Av. du Président Wilson, Paris", lat: 48.8643, lng: 2.2965, img: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600",
      fullDescription: { en: `<p>One of Europe's largest spaces dedicated to contemporary art, Palais de Tokyo occupies a monumental 1937 Art Deco building facing the Seine, known for its raw concrete interiors and constantly rotating, boundary-pushing exhibitions.</p><p>Jimin's appearance here tied into a fashion and art moment that fit the venue's avant-garde identity perfectly, and its industrial-chic architecture has since become a favourite backdrop for fans' own photos.</p>`,
        fr: `<p>L'un des plus grands espaces d'Europe dédiés à l'art contemporain, le Palais de Tokyo occupe un bâtiment monumental de style Art déco datant de 1937, face à la Seine, reconnu pour ses intérieurs en béton brut et ses expositions sans cesse renouvelées et avant-gardistes.</p><p>L'apparition de Jimin ici s'inscrivait dans un moment mode et art parfaitement en phase avec l'identité avant-gardiste du lieu, et son architecture industrielle-chic est depuis devenue un décor de prédilection pour les photos des fans.</p>` },
      tip: { en: "The building stays open late most evenings — an evening visit avoids the daytime museum crowds entirely.", fr: "Le bâtiment reste ouvert tard la plupart des soirs — une visite en soirée permet d'éviter complètement l'affluence diurne du musée." },
      directions: { en: "Take Metro Line 9 to Alma-Marceau or Iéna, both a 5-minute walk from the entrance on Avenue du Président Wilson.", fr: "Prenez la ligne 9 du métro jusqu'à Alma-Marceau ou Iéna, toutes deux à 5 minutes à pied de l'entrée, avenue du Président Wilson." } },

    { id: 11, name: "Cheonggu Building", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2017", ytId: "vJwHIpEogEY", address: "16 Hakdong-ro 30-gil", lat: 37.5144, lng: 127.0315, img: "https://img.youtube.com/vi/vJwHIpEogEY/hqdefault.jpg",
      fullDescription: { en: `<p>A modest, unassuming office building in Cheongdam-dong, this address served as Big Hit Entertainment's original headquarters during BTS's earliest, scrappiest years, well before the company grew into the global powerhouse HYBE.</p><p>It's here that early practice sessions, meetings and countless behind-the-scenes moments took place, making the building a quietly significant landmark for long-time fans tracing the group's origin story.</p>`,
        fr: `<p>Immeuble de bureaux modeste et discret situé à Cheongdam-dong, cette adresse a hébergé le tout premier siège de Big Hit Entertainment durant les années les plus modestes et les plus intenses des débuts de BTS, bien avant que l'entreprise ne devienne le géant mondial HYBE.</p><p>C'est ici qu'ont eu lieu les premières sessions de répétition, les réunions et d'innombrables moments en coulisses, faisant de ce bâtiment un lieu discrètement significatif pour les fans de longue date retraçant les origines du groupe.</p>` },
      tip: { en: "The building is a private office space today — admire the exterior from the street rather than trying to enter.", fr: "Le bâtiment est aujourd'hui un espace de bureaux privé — admirez l'extérieur depuis la rue plutôt que de tenter d'y entrer." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 12 minutes southeast into Cheongdam-dong.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 12 minutes vers le sud-est jusqu'à Cheongdam-dong." } },

    { id: 12, name: "The First BTS Dorm", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", ytId: "RhJqNFQCU_Q", address: "29 Nonhyeon-ro 119-gil", lat: 37.5133, lng: 127.0321, img: "https://img.youtube.com/vi/RhJqNFQCU_Q/hqdefault.jpg",
      fullDescription: { en: `<p>Long before their sprawling, more comfortable later dorms, all seven members of BTS lived together in a compact, two-room apartment on this residential street — a living arrangement famously chronicled in early vlogs and reality segments for its cramped bunk beds and shared everything.</p><p>The building itself is unremarkable from the outside, but its role in shaping the group's early bond and work ethic has made it one of the most sentimental stops on any BTS-focused itinerary.</p>`,
        fr: `<p>Bien avant leurs dortoirs plus vastes et confortables des années suivantes, les sept membres de BTS ont vécu ensemble dans un appartement compact de deux pièces sur cette rue résidentielle — un cadre de vie rendu célèbre par les premiers vlogs et segments de télé-réalité pour ses lits superposés exigus et tout ce qui s'y partageait.</p><p>Le bâtiment lui-même n'a rien de remarquable vu de l'extérieur, mais son rôle dans la formation des liens et de l'éthique de travail du groupe à ses débuts en fait l'une des étapes les plus chargées d'émotion de tout itinéraire consacré à BTS.</p>` },
      tip: { en: "This is a private residential building — please stay on the public street and keep noise to a minimum out of respect for current residents.", fr: "Il s'agit d'un immeuble résidentiel privé — merci de rester sur la voie publique et de limiter le bruit par respect pour les résidents actuels." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk roughly 10 minutes south through the Nonhyeon-dong side streets.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 10 minutes vers le sud à travers les rues de Nonhyeon-dong." } },

    { id: 13, name: "Hyangho Beach Bus Stop", group: "BTS", member: "All", country: "South Korea", city: "Gangneung", category: "Landmarks", year: "2017", ytId: "46qWWmnK4F0", address: "8-55 Hyangho-ri", lat: 37.9048, lng: 128.8266, img: "https://img.youtube.com/vi/46qWWmnK4F0/hqdefault.jpg",
      fullDescription: { en: `<p>A modest little bus shelter facing the sea along the East Coast, this stop near Hyangho Beach became instantly iconic after appearing as a key emotional backdrop in one of BTS's most beloved music videos.</p><p>With the wide, quiet beach stretching out just beyond the road and the pale blue shelter almost unchanged since filming, fans regularly make the trip out from Gangneung just to sit on the same bench and watch the same waves.</p>`,
        fr: `<p>Modeste petit abribus face à la mer, sur la côte est du pays, cet arrêt près de la plage de Hyangho est devenu instantanément culte après avoir servi de décor émotionnel clé dans l'un des clips les plus aimés de BTS.</p><p>Avec la plage large et paisible qui s'étend juste après la route et l'abri bleu pâle resté quasiment identique depuis le tournage, les fans font régulièrement le déplacement depuis Gangneung pour s'asseoir sur le même banc et regarder les mêmes vagues.</p>` },
      tip: { en: "Sunrise here is spectacular and the beach is almost empty that early — worth setting an alarm for.", fr: "Le lever de soleil y est spectaculaire et la plage est quasiment vide à cette heure — cela vaut le coup de régler un réveil." },
      directions: { en: "From Gangneung Station, a taxi takes about 20 minutes; there is also a local bus that stops within walking distance.", fr: "Depuis la gare de Gangneung, comptez environ 20 minutes en taxi ; un bus local dessert également un arrêt à quelques minutes à pied." } },

    { id: 14, name: "Iryeong Station", group: "BTS", member: "All", country: "South Korea", city: "Yangju", category: "MV Location", year: "2017", ytId: "xEeFrLSkMm8", address: "327 Samsang-ri", lat: 37.7135, lng: 126.9329, img: "https://img.youtube.com/vi/xEeFrLSkMm8/hqdefault.jpg",
      fullDescription: { en: `<p>A small, largely disused regional train station north of Seoul, Iryeong Station's weathered platform and rusting rail cars gave it exactly the melancholic, nostalgic atmosphere needed for a pivotal scene in one of BTS's most narratively rich music videos.</p><p>Because the station sees very little regular traffic, its quiet platforms have remained remarkably close to how they appeared on screen, letting visiting fans recreate shots almost frame for frame.</p>`,
        fr: `<p>Petite gare régionale largement désaffectée au nord de Séoul, le quai usé et les wagons rouillés d'Iryeong offraient exactement l'atmosphère mélancolique et nostalgique nécessaire à une scène charnière de l'un des clips les plus riches narrativement de BTS.</p><p>La gare étant très peu fréquentée au quotidien, ses quais silencieux sont restés remarquablement fidèles à leur apparition à l'écran, permettant aux fans en visite de recréer les plans presque à l'identique.</p>` },
      tip: { en: "Trains still run infrequently through the station — always check the platform edge and stay well behind the yellow line.", fr: "Des trains circulent encore occasionnellement dans la gare — vérifiez toujours le bord du quai et restez bien derrière la ligne jaune." },
      directions: { en: "Best reached by car or taxi from central Seoul (around 1 hour); regional trains to Iryeong are infrequent.", fr: "Se rejoint le plus facilement en voiture ou en taxi depuis le centre de Séoul (environ 1 heure) ; les trains régionaux vers Iryeong sont peu fréquents." } },

    { id: 15, name: "Quinta da Francelha de Cima", group: "BTS", member: "All", country: "Portugal", city: "Prior Velho", category: "MV Location", year: "2026", ytId: "GEk4jHwfFTA", address: "R. da Francelha de Cima", lat: 38.7844, lng: -9.1238, img: "https://img.youtube.com/vi/GEk4jHwfFTA/hqdefault.jpg",
      fullDescription: { en: `<p>A rustic countryside estate just outside Lisbon, Quinta da Francelha de Cima blends traditional Portuguese stonework with sprawling gardens, olive trees and weathered farm buildings that lend it a timeless, cinematic quality.</p><p>Its earthy, sun-bleached aesthetic made it a striking choice of filming location, offering a very different visual mood from BTS's usual urban settings.</p>`,
        fr: `<p>Domaine rural rustique situé juste aux portes de Lisbonne, la Quinta da Francelha de Cima marie une architecture en pierre traditionnelle portugaise à de vastes jardins, des oliviers et des bâtiments agricoles patinés par le temps, lui conférant une qualité cinématographique intemporelle.</p><p>Son esthétique brute et délavée par le soleil en a fait un choix de tournage saisissant, offrant une ambiance visuelle très différente des décors urbains habituels de BTS.</p>` },
      tip: { en: "The estate is largely private property — respectful viewing from the road is recommended unless a public event is scheduled.", fr: "Le domaine est en grande partie une propriété privée — il est recommandé de l'observer respectueusement depuis la route, sauf événement public programmé." },
      directions: { en: "Best reached by car from central Lisbon (around 20–25 minutes); limited public transit serves this rural area.", fr: "Se rejoint le plus facilement en voiture depuis le centre de Lisbonne (environ 20 à 25 minutes) ; les transports en commun sont limités dans cette zone rurale." } },

    { id: 16, name: "Sunhyewon", group: "BTS", member: "All", country: "South Korea", city: "Seoul Area", category: "MV Location", year: "2026", ytId: "Hb06Iem3FWg", address: "Sunhyewon Estate", lat: 37.5826, lng: 126.9856, img: "https://img.youtube.com/vi/Hb06Iem3FWg/hqdefault.jpg",
      fullDescription: { en: `<p>Sunhyewon is a beautifully landscaped traditional-style estate on the outskirts of Seoul, blending hanok-inspired architecture with manicured gardens, ponds and stone pathways that evoke a sense of classical Korean elegance.</p><p>Its serene, meticulously maintained grounds provided a striking visual contrast for filming, standing apart from the group's more commonly seen city locations.</p>`,
        fr: `<p>Sunhyewon est un domaine de style traditionnel magnifiquement paysager, en périphérie de Séoul, alliant une architecture inspirée des hanoks à des jardins soignés, des bassins et des allées de pierre qui évoquent une élégance coréenne classique.</p><p>Son terrain serein et méticuleusement entretenu a offert un contraste visuel saisissant pour le tournage, se démarquant nettement des décors urbains plus habituels du groupe.</p>` },
      tip: { en: "Certain garden areas open to visitors only on specific days — check ahead before planning a visit around them.", fr: "Certaines zones du jardin ne sont ouvertes aux visiteurs que certains jours précis — vérifiez au préalable avant d'organiser votre visite autour d'elles." },
      directions: { en: "Best reached by car or taxi from central Seoul; the estate sits roughly 45 minutes from downtown depending on traffic.", fr: "Se rejoint le plus facilement en voiture ou en taxi depuis le centre de Séoul ; le domaine se trouve à environ 45 minutes du centre-ville selon la circulation." } },

    { id: 17, name: "Museu de Marinha", group: "BTS", member: "All", country: "Portugal", city: "Lisbon", category: "MV Location", year: "2026", ytId: "b4iVv91Z6lY", address: "Praça do Império, Lisboa", lat: 38.6976, lng: -9.2082, img: "https://img.youtube.com/vi/b4iVv91Z6lY/hqdefault.jpg",
      fullDescription: { en: `<p>Housed in a wing of the monumental Jerónimos Monastery complex in Belém, the Museu de Marinha traces Portugal's rich maritime and naval history through ship models, royal barges and navigational instruments spanning centuries of exploration.</p><p>Its grand, echoing halls and nautical exhibits gave a distinctly regal, historic texture to the footage filmed here, tying BTS's Portugal chapter to the country's Age of Discovery heritage.</p>`,
        fr: `<p>Installé dans une aile du monumental complexe du monastère des Jerónimos, à Belém, le Museu de Marinha retrace la riche histoire maritime et navale du Portugal à travers des maquettes de navires, des barques royales et des instruments de navigation couvrant plusieurs siècles d'exploration.</p><p>Ses grandes salles résonnantes et ses collections nautiques ont conféré une texture nettement royale et historique aux images tournées ici, rattachant le chapitre portugais de BTS à l'héritage des Grandes Découvertes du pays.</p>` },
      tip: { en: "Combine your visit with the neighbouring Jerónimos Monastery and Belém Tower — all three sit within a short walk of each other.", fr: "Combinez votre visite avec le monastère des Jerónimos et la tour de Belém, juste à côté — les trois sites se trouvent à quelques minutes de marche les uns des autres." },
      directions: { en: "Take Tram 15E or bus 728/729 from central Lisbon to Belém, then walk about 5 minutes to Praça do Império.", fr: "Prenez le tram 15E ou le bus 728/729 depuis le centre de Lisbonne jusqu'à Belém, puis marchez environ 5 minutes jusqu'à la Praça do Império." } },

    { id: 18, name: "In the SOOP Estate", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2021", episode: "In the SOOP BTS ver. Season 2", ytId: "6qB8Nb_WO_Y", address: "Domaine privé en montagne, Chuncheon (Accès restreint via le Phoenix Pyeongchang Resort)", lat: 37.8813, lng: 127.7298, img: "https://img.youtube.com/vi/6qB8Nb_WO_Y/hqdefault.jpg",
      fullDescription: { en: `<p>Nestled deep in the lush mountains and dense forests of Chuncheon, this sprawling estate is far more than a simple vacation rental. HYBE acquired, redesigned and fully renovated the vast property specifically to create the perfect setting for the show.</p><p>The location seamlessly blends untouched wilderness with ultra-modern architecture: a sumptuous main house, private guest villas, an outdoor pool, a tennis court, and even a dedicated RV area. It's a true sanctuary of tranquility, custom-built to offer quiet luxury and a total disconnect from the outside world.</p><p><b>Following in BTS's Footsteps (In the SOOP Season 2)</b><br>It was in this idyllic setting that the members of BTS settled in 2021 for a well-deserved break. Walking the grounds today, the immersion is total: the sets remain faithful to the show. You can walk exactly where RM once read peacefully, see the RV where SUGA retreated to play guitar, and visit the kitchen that was the backdrop for Jin and Jung Kook's late-night meals. The outdoor sports field still seems to echo with their laughter from legendary games of foot-volley in the rain. Visiting this place means feeling the magic and serenity of the simple moments the group shared together.</p>`,
        fr: `<p>Niché au cœur des montagnes luxuriantes et des forêts denses de Chuncheon, ce vaste domaine n'est pas une simple location de vacances. L'agence HYBE a acquis, repensé et entièrement rénové cette immense propriété spécifiquement pour créer le cadre parfait de l'émission.</p><p>Le lieu allie harmonieusement nature sauvage et architecture ultra-moderne : il comprend une somptueuse maison principale, des villas d'invités privées, une piscine extérieure, un court de tennis, et même une zone dédiée aux camping-cars. C'est un véritable sanctuaire de tranquillité, conçu sur mesure pour offrir un luxe discret et une déconnexion totale du monde extérieur.</p><p><b>Following in BTS's Footsteps (In the SOOP Season 2)</b><br>C'est dans cet environnement idyllique que les membres de BTS ont posé leurs valises en 2021 pour s'accorder une pause bien méritée. En visitant le domaine, l'immersion est totale : les décors sont restés fidèles à l'émission. Vous pourrez marcher exactement là où RM lisait paisiblement, voir le camping-car où SUGA s'isolait pour jouer de la guitare, et visiter la cuisine qui a été le théâtre des repas nocturnes de Jin et Jung Kook. Le terrain de sport extérieur résonne encore de leurs rires lors de leurs mythiques parties de foot-volley sous la pluie. Visiter ce lieu, c'est ressentir la magie et la sérénité des moments simples partagés par le groupe.</p>` },
      tip: { en: "Wear comfortable shoes to explore the whole property. Don't miss the hidden gift shop on-site, which sells exclusive merchandise you won't find anywhere else!", fr: "Prévoyez des chaussures confortables pour explorer l'ensemble de la propriété. Ne manquez surtout pas la boutique de souvenirs cachée sur le site, qui vend des produits dérivés exclusifs que vous ne trouverez nulle part ailleurs !" },
      directions: { en: "Access to this estate is strictly regulated to preserve the grounds. You cannot arrive by personal vehicle or taxi. Entry requires booking the official 'In the SOOP Stay' package in partnership with the Phoenix Pyeongchang Resort. The recommended route is to take the KTX high-speed train from Seoul Station to Pyeongchang Station, then board the resort's private shuttle, which takes you directly to the estate.",
        fr: "L'accès à ce domaine est strictement réglementé pour préserver les lieux. Vous ne pouvez pas vous y rendre avec un véhicule personnel ou un taxi. Pour y accéder, vous devez obligatoirement réserver le package officiel « In the SOOP Stay » en partenariat avec le Phoenix Pyeongchang Resort. Le trajet recommandé est de prendre le train à grande vitesse (KTX) depuis la gare de Séoul jusqu'à la gare de Pyeongchang, puis de monter à bord de la navette privée du complexe hôtelier qui vous conduira directement au domaine." } },

    { id: 19, name: "Happy Meadow Ranch", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2020", ytId: "F14vk9qPRM0", address: "330-48 Chunhwa-ro", lat: 37.9547, lng: 127.6975, img: "https://img.youtube.com/vi/F14vk9qPRM0/hqdefault.jpg",
      fullDescription: { en: `<p>A working horse ranch set against the rolling green hills of Chuncheon, Happy Meadow Ranch offers wide-open pastures, stables and riding trails that feel a world away from Seoul, just an hour or so outside the capital.</p><p>The members visited during a Bon Voyage travel segment to try horseback riding for the first time, and the ranch's laid-back, countryside charm made for one of the show's most relaxed and good-humoured episodes.</p>`,
        fr: `<p>Ranch équestre en activité niché au milieu des collines verdoyantes de Chuncheon, Happy Meadow Ranch offre de vastes pâturages, des écuries et des sentiers de randonnée à cheval qui semblent à des lieues de Séoul, à seulement une heure environ de la capitale.</p><p>Les membres l'ont visité lors d'un segment de voyage de Bon Voyage pour s'essayer à l'équitation pour la première fois, et le charme décontracté et champêtre du ranch a donné lieu à l'un des épisodes les plus détendus et les plus drôles de l'émission.</p>` },
      tip: { en: "Riding lessons for beginners are available on-site and can be booked the same day if it isn't too busy.", fr: "Des cours d'équitation pour débutants sont proposés sur place et peuvent être réservés le jour même si l'affluence le permet." },
      directions: { en: "Best reached by car from Chuncheon city center (around 20 minutes); a taxi is the easiest option for visitors without a vehicle.", fr: "Se rejoint le plus facilement en voiture depuis le centre-ville de Chuncheon (environ 20 minutes) ; le taxi reste l'option la plus simple pour les visiteurs sans véhicule." } },

    // ===== BON VOYAGE SAISON 1 — SCANDINAVIE, 2016 =====
    { id: 20, name: "Bryggen", group: "BTS", member: "All", country: "Norway", city: "Bergen", category: "Bon Voyage", year: "2016", address: "Bryggen", lat: 60.3979, lng: 5.3245, img: "https://images.unsplash.com/photo-1601439678777-b2b3c56fa72e?w=600",
      fullDescription: { en: `<p>Bryggen is the old wharf of Bergen, a row of narrow wooden merchant houses leaning into each other in shades of ochre, red and mustard, left over from the city's Hanseatic trading days. It's the kind of place that photographs itself, and it's exactly where the seven members wandered on the very first stop of the very first Bon Voyage, cameras and disbelief in equal measure.</p><p>There's something fitting about a group known for tight harmonies starting their first real off-the-clock trip in a neighbourhood built by merchants who once lived, worked and argued shoulder to shoulder in these same alleys. Season 1 of Bon Voyage still gets talked about as the rawest, least polished version of the show, and Bryggen's crooked rooftops are the first thing viewers see of it.</p>`,
        fr: `<p>Bryggen, c'est le vieux quai marchand de Bergen : une rangée de maisons en bois qui penchent légèrement les unes contre les autres, dans des tons ocre, rouge et moutarde, vestiges de l'époque hanséatique de la ville. C'est le genre d'endroit qui se photographie tout seul, et c'est précisément là que les sept membres ont posé leurs valises lors de la toute première étape du tout premier Bon Voyage.</p><p>Il y a quelque chose d'assez juste à voir un groupe connu pour ses harmonies vocales débuter son premier vrai voyage hors caméra dans un quartier bâti par des marchands qui vivaient et travaillaient coude à coude dans ces mêmes ruelles. La saison 1 de Bon Voyage reste connue pour être la version la plus brute et la moins scénarisée du programme, et les toits de guingois de Bryggen sont la toute première image que les spectateurs en gardent.</p>` },
      tip: { en: "Duck into the narrow passageways between the buildings — most of the charm (and the tiny artisan shops) is hidden just off the main waterfront row.", fr: "Faufilez-vous dans les passages étroits entre les bâtiments — l'essentiel du charme (et les petites boutiques d'artisans) se cache juste derrière la rangée principale sur les quais." },
      directions: { en: "Bryggen sits right on Bergen's harbour, a 10–15 minute walk from the train and bus station.", fr: "Bryggen se trouve directement sur le port de Bergen, à 10–15 minutes à pied de la gare et de la gare routière." } },

    { id: 21, name: "Fløyen", group: "BTS", member: "All", country: "Norway", city: "Bergen", category: "Bon Voyage", year: "2016", address: "Fløyfjellet", lat: 60.3969, lng: 5.3341, img: "https://images.unsplash.com/photo-1601439678777-b2b3c56fa72e?w=600",
      fullDescription: { en: `<p>A short, steep funicular ride above Bergen sits Fløyen, one of the seven mountains that surround the city, and the members rode it up for a proper look at the fjords and rooftops they'd just been wandering through at ground level.</p><p>It's less a single filmed spot than a vantage point — the kind of stop that exists in the itinerary mostly so everyone can catch their breath and take in how small the harbour looks from up there. Fans still trade screenshots of the group lined up along the railing, wind-blown and squinting into the light, as one of the more candid, unguarded moments of the whole season.</p>`,
        fr: `<p>Au sommet d'un court et raide trajet en funiculaire au-dessus de Bergen se trouve Fløyen, l'une des sept montagnes qui encerclent la ville. Les membres y sont montés pour admirer les fjords et les toits qu'ils venaient tout juste d'arpenter au niveau de la rue.</p><p>C'est moins un lieu de tournage à proprement parler qu'un point de vue — le genre d'étape qui existe surtout pour laisser tout le monde souffler et mesurer à quel point le port paraît minuscule vu d'en haut. Les fans continuent de s'échanger des captures d'écran du groupe aligné le long de la rambarde, décoiffé par le vent et plissant les yeux dans la lumière, comme l'un des moments les plus spontanés de toute la saison.</p>` },
      tip: { en: "Buy the funicular ticket as a round trip — the walking path down is beautiful but takes over an hour.", fr: "Prenez le billet de funiculaire en aller-retour — le sentier de descente à pied est magnifique mais prend plus d'une heure." },
      directions: { en: "The Fløibanen funicular station is a 5-minute walk from Bryggen; the ride to the top takes about 8 minutes.", fr: "La station du funiculaire Fløibanen se trouve à 5 minutes à pied de Bryggen ; la montée dure environ 8 minutes." } },

    { id: 22, name: "Gamla Stan", group: "BTS", member: "All", country: "Sweden", city: "Stockholm", category: "Bon Voyage", year: "2016", address: "Gamla Stan", lat: 59.3251, lng: 18.0711, img: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=600",
      fullDescription: { en: `<p>Stockholm's old town is a tangle of cobbled lanes so narrow that two people can barely walk side by side, lined with pastel-coloured buildings that have barely changed since the 17th century. It's here that the group spent an afternoon just walking, no real agenda beyond getting a little lost.</p><p>What made this stop memorable wasn't a landmark so much as the pace of it — Bon Voyage at its best has always been about watching seven exhausted idols be allowed to do absolutely nothing in particular, and Gamla Stan's maze of alleys gave them exactly that kind of aimless afternoon.</p>`,
        fr: `<p>La vieille ville de Stockholm est un enchevêtrement de ruelles pavées si étroites que deux personnes peuvent à peine y marcher côte à côte, bordées de façades pastel qui n'ont presque pas changé depuis le XVIIe siècle. C'est ici que le groupe a passé un après-midi à simplement marcher, sans autre objectif que de se perdre un peu.</p><p>Ce qui rend cette étape mémorable, ce n'est pas un monument en particulier, mais le rythme de la scène — Bon Voyage est toujours à son meilleur lorsqu'il laisse sept idoles épuisées ne rien faire de précis, et le dédale de ruelles de Gamla Stan leur a offert exactement ce genre d'après-midi sans but.</p>` },
      tip: { en: "Stortorget, the small square at the heart of Gamla Stan, is the easiest landmark to use as a starting point before wandering off.", fr: "Stortorget, la petite place au cœur de Gamla Stan, est le repère le plus simple pour démarrer la balade avant de se perdre dans les ruelles." },
      directions: { en: "Gamla Stan has its own metro station (T-Gamla stan) on the red and green lines, right in the middle of the old town.", fr: "Gamla Stan dispose de sa propre station de métro (T-Gamla stan), sur les lignes rouge et verte, en plein cœur de la vieille ville." } },

    { id: 23, name: "Suomenlinna", group: "BTS", member: "All", country: "Finland", city: "Helsinki", category: "Bon Voyage", year: "2016", address: "Suomenlinna", lat: 60.1454, lng: 24.9880, img: "https://images.unsplash.com/photo-1508189860359-777d945909ef?w=600",
      fullDescription: { en: `<p>A short ferry ride from central Helsinki, Suomenlinna is a sea fortress spread across six connected islands, its grassy ramparts and tunnels built in the 18th century to guard the approach to the city. The group crossed over for an afternoon of exploring cannons, courtyards and the odd sense of standing in the middle of the sea.</p><p>It closed out the Nordic leg of Bon Voyage on a quieter note than Bryggen or Gamla Stan — fewer people around, more open sky, and a lot of walking with nowhere in particular to be, which by that point in the trip had become the whole point.</p>`,
        fr: `<p>À quelques minutes de ferry du centre d'Helsinki, Suomenlinna est une forteresse maritime répartie sur six îles reliées entre elles, avec ses remparts herbeux et ses tunnels construits au XVIIIe siècle pour protéger l'accès à la ville. Le groupe y a traversé pour un après-midi à explorer canons, cours intérieures et cette sensation étrange de se trouver en plein milieu de la mer.</p><p>Cette étape a clos le passage nordique de Bon Voyage sur une note plus calme que Bryggen ou Gamla Stan — moins de monde, un ciel plus ouvert, et beaucoup de marche sans destination précise, ce qui à ce stade du voyage était devenu tout l'intérêt de l'exercice.</p>` },
      tip: { en: "The ferry to Suomenlinna runs year-round and is covered by a standard Helsinki public transport ticket.", fr: "Le ferry vers Suomenlinna fonctionne toute l'année et est inclus dans un billet standard des transports en commun d'Helsinki." },
      directions: { en: "Ferries leave from the Market Square (Kauppatori) in central Helsinki roughly every 20–40 minutes; the crossing takes about 15 minutes.", fr: "Les ferries partent de la place du marché (Kauppatori), au centre d'Helsinki, environ toutes les 20 à 40 minutes ; la traversée dure environ 15 minutes." } },

    // ===== BON VOYAGE SAISON 2 — HAWAÏ, 2017 =====
    { id: 24, name: "Aha'oulu (Bon Voyage 2)", group: "BTS", member: "All", country: "USA", city: "Oahu, Hawaii", category: "Bon Voyage", year: "2017", address: "Haleiwa, North Shore", lat: 21.5928, lng: -158.1044, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
      fullDescription: { en: `<p>Haleiwa sits on Oahu's North Shore, a stretch of coastline better known to surfers than tourists, all low wooden storefronts and the kind of waves that draw professionals from around the world. Season 2 of Bon Voyage planted the group here for a stretch of surfing lessons, beach days and considerably more wipeouts than any of them expected.</p><p>It's a rare Bon Voyage location built almost entirely around failure in the funniest sense — nobody involved was a natural on a board, and the show leaned hard into that, turning Haleiwa's gentle beginner breaks into some of the most rewatched, most gif-able footage the group has ever produced.</p>`,
        fr: `<p>Haleiwa se trouve sur la côte nord d'Oahu, un littoral plus connu des surfeurs que des touristes, fait de façades en bois basses et de vagues qui attirent des professionnels venus du monde entier. La saison 2 de Bon Voyage y a installé le groupe pour une série de cours de surf, de journées à la plage et de bien plus de chutes que prévu.</p><p>C'est un lieu Bon Voyage assez rare, construit presque entièrement autour de l'échec dans son sens le plus drôle — personne dans le groupe n'était naturellement doué en surf, et l'émission a pleinement joué cette carte, transformant les vagues débutantes de Haleiwa en certaines des images les plus revisionnées et les plus détournées jamais produites par le groupe.</p>` },
      tip: { en: "Haleiwa's surf shops still rent boards by the hour if you want to try the same beginner breaks the members struggled with.", fr: "Les boutiques de surf de Haleiwa louent encore des planches à l'heure si vous voulez tenter les mêmes vagues débutantes sur lesquelles les membres ont galéré." },
      directions: { en: "Best reached by rental car from Honolulu (around 45 minutes); there is no direct rail or metro link to the North Shore.", fr: "Se rejoint le plus facilement en voiture de location depuis Honolulu (environ 45 minutes) ; il n'existe pas de liaison directe en train ou en métro vers la côte nord." } },

    // ===== BON VOYAGE SAISON 3 — MALTE, 2018 =====
    { id: 25, name: "Triton Fountain", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "Vjal Nelson", lat: 35.8968, lng: 14.5125, img: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=600",
      fullDescription: { en: `<p>Three bronze mermen kneel around a wide basin just outside Valletta's City Gate, holding up a giant metal disc — the Triton Fountain has been the unofficial front door to Malta's capital since the 1950s, and it's the first thing the group saw stepping into the city for Bon Voyage Season 3.</p><p>It's a brief moment in the show, more transition than destination, but it marks the start of what became one of the most visually striking legs of the whole series — golden limestone, baroque churches and Mediterranean light replacing the wood and water of the earlier Nordic seasons.</p>`,
        fr: `<p>Trois tritons de bronze agenouillés autour d'un large bassin, juste devant la porte de La Valette : la fontaine de Triton sert de porte d'entrée officieuse à la capitale maltaise depuis les années 1950, et c'est la première chose que le groupe a vue en arrivant en ville pour la saison 3 de Bon Voyage.</p><p>C'est un passage bref dans l'émission, davantage une transition qu'une destination en soi, mais il marque le début de l'un des segments les plus visuellement marquants de toute la série — la pierre calcaire dorée, les églises baroques et la lumière méditerranéenne remplaçant le bois et l'eau des saisons nordiques précédentes.</p>` },
      tip: { en: "The fountain is best photographed from across the bus terminus square in the early evening, when the limestone catches the golden light.", fr: "La fontaine se photographie le mieux depuis l'autre bout de la place du terminus de bus, en fin d'après-midi, quand la pierre calcaire capte la lumière dorée." },
      directions: { en: "The Triton Fountain sits directly outside Valletta's City Gate, at the main bus terminus — impossible to miss arriving into the city.", fr: "La fontaine de Triton se trouve juste devant la porte de La Valette, au niveau du terminus de bus principal — impossible de la manquer en arrivant en ville." } },

    { id: 26, name: "Upper Barrakka Gardens", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "292 Triq Sant' Orsla", lat: 35.8964, lng: 14.5155, img: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=600",
      fullDescription: { en: `<p>Perched on Valletta's highest bastion, Upper Barrakka Gardens looks straight out over the Grand Harbour toward the Three Cities, arches and statues framing a view that's been drawing visitors since the gardens opened to the public in the 19th century. The group stopped here to take it all in, cameras aimed less at each other than at the water below.</p><p>It's the kind of location Bon Voyage returns to again and again — not a set piece, just somewhere genuinely beautiful that the members were allowed to stand in and be quiet for a minute, which by Season 3 had become as much a part of the show's appeal as anything scripted.</p>`,
        fr: `<p>Perché sur le plus haut bastion de La Valette, le jardin d'Upper Barrakka domine le Grand Port et offre une vue directe sur les Trois Cités, entre arcades et statues qui attirent les visiteurs depuis l'ouverture du jardin au public au XIXe siècle. Le groupe s'y est arrêté pour contempler le paysage, les caméras davantage tournées vers l'eau en contrebas que les uns vers les autres.</p><p>C'est le genre de lieu vers lequel Bon Voyage revient sans cesse — pas un décor à proprement parler, juste un endroit sincèrement beau où les membres ont pu simplement s'arrêter et se taire un instant, ce qui, dès la saison 3, était devenu une part de l'attrait de l'émission au même titre que les séquences plus construites.</p>` },
      tip: { en: "Time your visit around noon or 4pm to catch the small ceremonial cannon firing from the Saluting Battery just below the gardens.", fr: "Prévoyez votre visite vers midi ou 16h pour assister au petit tir de canon cérémoniel depuis la Saluting Battery, juste en contrebas du jardin." },
      directions: { en: "A short walk uphill from the Triton Fountain and City Gate, or reachable by the Barrakka Lift directly from the waterfront below.", fr: "Une courte montée à pied depuis la fontaine de Triton et la porte de la ville, ou accessible directement depuis le front de mer par l'ascenseur Barrakka." } },

    { id: 27, name: "Cafe del Mar Malta", group: "BTS", member: "All", country: "Malta", city: "St Paul's Bay", category: "Bon Voyage", year: "2018", address: "Triq it-Turisti", lat: 35.9522, lng: 14.3986, img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
      fullDescription: { en: `<p>A seafront terrace built into the rocks of St Paul's Bay, Cafe del Mar is the kind of spot where the sun setting over the water does most of the work — string lights, low lounge seating, and the Mediterranean stretching out in front of you. The group came here to unwind after a day of sightseeing, dinner blurring into conversation as the sky went orange.</p><p>Bon Voyage rarely lingers on meals for long, but this stop got more breathing room than most — less an event than a genuine wind-down, the kind of evening that made this season feel, for a moment, like an actual holiday rather than a shoot.</p>`,
        fr: `<p>Terrasse en bord de mer construite à même les rochers de St Paul's Bay, Cafe del Mar est le genre d'endroit où le coucher de soleil sur l'eau fait déjà l'essentiel du travail — guirlandes lumineuses, assises basses façon lounge, et la Méditerranée qui s'étend juste devant. Le groupe y est venu se détendre après une journée de visites, le dîner se prolongeant en conversation tandis que le ciel virait à l'orange.</p><p>Bon Voyage s'attarde rarement longtemps sur les repas, mais cette étape a eu droit à plus de temps que la plupart — moins un événement filmé qu'un véritable moment de détente, le genre de soirée qui, l'espace d'un instant, a donné à cette saison des airs de vraies vacances plutôt que de tournage.</p>` },
      tip: { en: "Book a table facing the water well ahead for sunset — the terrace fills up fast on clear evenings.", fr: "Réservez une table côté mer bien à l'avance pour le coucher de soleil — la terrasse se remplit vite les soirs de beau temps." },
      directions: { en: "Located along the seafront promenade of St Paul's Bay, about a 25-minute drive or bus ride north of Valletta.", fr: "Situé sur la promenade du front de mer de St Paul's Bay, à environ 25 minutes en voiture ou en bus au nord de La Valette." } },

    { id: 28, name: "Mdina Old City", group: "BTS", member: "All", country: "Malta", city: "Mdina", category: "Bon Voyage", year: "2018", address: "Mdina", lat: 35.8872, lng: 14.4034, img: "https://images.unsplash.com/photo-1543832923-44667a44c804?w=600",
      fullDescription: { en: `<p>Malta's former capital earned its nickname, the Silent City, from the near-total quiet inside its honey-coloured walls — cars are barely allowed in, and the population within the fortifications numbers only a few hundred. The group wandered its narrow, curving streets in the late afternoon light, the kind of setting that barely needs a filter.</p><p>Fans of a certain other fantasy series will recognise these same streets from screen appearances of their own, but for BTS, Mdina's medieval alleys became the backdrop for some of the quietest, most unhurried footage of the whole Malta leg — no crowds to manage, just old stone and long shadows.</p>`,
        fr: `<p>L'ancienne capitale de Malte doit son surnom de « Cité du Silence » au calme quasi total qui règne à l'intérieur de ses remparts couleur miel — les voitures y sont presque totalement interdites, et la population à l'intérieur des fortifications ne compte que quelques centaines d'habitants. Le groupe a arpenté ses ruelles étroites et sinueuses dans la lumière de fin d'après-midi, un décor qui n'a presque pas besoin de filtre.</p><p>Les amateurs d'une certaine autre série fantastique reconnaîtront peut-être ces mêmes rues pour y avoir vu d'autres tournages, mais pour BTS, les ruelles médiévales de Mdina sont devenues le décor de certaines des images les plus calmes et les moins pressées de tout le passage à Malte — aucune foule à gérer, juste de la vieille pierre et de longues ombres.</p>` },
      tip: { en: "Visit in late afternoon once the day-trip crowds thin out — Mdina genuinely earns its name after about 5pm.", fr: "Visitez en fin d'après-midi une fois les groupes de touristes de passage repartis — Mdina mérite vraiment son nom après 17h environ." },
      directions: { en: "Buses run regularly from Valletta (around 40 minutes); cars must be left outside the city walls in the car park near the main gate.", fr: "Des bus circulent régulièrement depuis La Valette (environ 40 minutes) ; les voitures doivent être laissées à l'extérieur des remparts, sur le parking près de la porte principale." } },

    { id: 29, name: "St. John's Co-Cathedral", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "Triq San Gwann", lat: 35.8977, lng: 14.5136, img: "https://images.unsplash.com/photo-1543832923-44667a44c804?w=600",
      fullDescription: { en: `<p>From the outside, St. John's Co-Cathedral looks almost austere — a plain limestone façade typical of Valletta's defensive architecture. Step inside, and it's one of the most ornate baroque interiors in Europe, every inch of the ceiling gilded, the floor made entirely of inlaid marble tombstones. The group's visit here was one of the more solemn, wide-eyed stops of the season.</p><p>It's not a place built for a camera crew's convenience — quiet, dim, genuinely sacred — and the footage reflects that restraint, the members speaking in something closer to a whisper as they took in a building that took Baroque excess about as far as it can go.</p>`,
        fr: `<p>Vue de l'extérieur, la co-cathédrale Saint-Jean paraît presque austère — une façade de pierre calcaire sobre, typique de l'architecture défensive de La Valette. Une fois à l'intérieur, c'est l'un des intérieurs baroques les plus richement ornés d'Europe : chaque centimètre du plafond est doré, et le sol est entièrement composé de dalles funéraires incrustées de marbre. La visite du groupe ici a été l'une des étapes les plus solennelles et les plus impressionnées de la saison.</p><p>Ce n'est pas un lieu pensé pour le confort d'une équipe de tournage — silencieux, sombre, réellement sacré — et les images en gardent cette retenue, les membres s'exprimant presque à voix basse en découvrant un édifice qui pousse l'excès baroque aussi loin que possible.</p>` },
      tip: { en: "Photography is allowed but flash is strictly forbidden — bring a steady hand or a small tripod for the dim interior.", fr: "La photographie est autorisée mais le flash est strictement interdit — prévoyez un pouls stable ou un petit trépied pour l'intérieur peu éclairé." },
      directions: { en: "In the heart of Valletta, a short walk from the Triton Fountain and City Gate; modest dress covering shoulders and knees is required.", fr: "En plein cœur de La Valette, à quelques pas de la fontaine de Triton et de la porte de la ville ; une tenue couvrant épaules et genoux est exigée." } },

    { id: 30, name: "Valletta", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "Valletta City Center", lat: 35.8989, lng: 14.5146, img: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=600",
      fullDescription: { en: `<p>Beyond any single landmark, a good stretch of Bon Voyage Season 3 is really just the group loose in Valletta itself — a compact grid of grid-planned streets packed onto a peninsula, balconies painted in faded greens and blues, and the whole city small enough to properly explore on foot in a single afternoon.</p><p>It's this general wandering, more than any one filmed stop, that fans point to when they talk about Malta as one of the show's most rewatchable legs: no itinerary pressure, just seven people getting genuinely lost in a small European capital together.</p>`,
        fr: `<p>Au-delà de n'importe quel monument précis, une bonne partie de la saison 3 de Bon Voyage, c'est surtout le groupe livré à lui-même dans La Valette — un quadrillage compact de rues tracées au cordeau sur une péninsule, des balcons peints dans des verts et des bleus passés, et une ville assez petite pour être vraiment explorée à pied en un seul après-midi.</p><p>C'est cette flânerie générale, plus qu'un lieu de tournage précis, que les fans citent en premier lorsqu'ils évoquent Malte comme l'un des segments les plus revisionnés de l'émission : aucune pression d'itinéraire, juste sept personnes qui se perdent, ensemble, dans une petite capitale européenne.</p>` },
      tip: { en: "Republic Street runs the length of the peninsula and is the easiest spine to navigate from before ducking into side streets.", fr: "La Republic Street traverse toute la péninsule et constitue le repère le plus simple pour s'orienter avant de bifurquer dans les petites rues adjacentes." },
      directions: { en: "Valletta is fully walkable and largely pedestrianised; ferries also connect it directly to Sliema across the harbour.", fr: "La Valette se visite entièrement à pied et est en grande partie piétonne ; des ferries la relient aussi directement à Sliema, de l'autre côté du port." } },

    // ===== BON VOYAGE SAISON 4 — NOUVELLE-ZÉLANDE, 2019 =====
    { id: 31, name: "Lake Pukaki", group: "BTS", member: "All", country: "New Zealand", city: "Canterbury", category: "Bon Voyage", year: "2019", address: "Lake Pukaki", lat: -44.1667, lng: 170.1333, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>Lake Pukaki's turquoise water — coloured by fine glacial rock flour suspended in the melt — sits beneath Aoraki/Mount Cook in one of the emptiest, most dramatic stretches of New Zealand's South Island. The group camped near its shores for a night under a sky so clear and dark that the stars alone became the whole point of the stop.</p><p>Season 4 leaned hard into this kind of stillness — no cities, barely any people, just seven idols lying on their backs in the middle of nowhere trying to spot the Milky Way, which for a group whose entire life runs on schedules and stages, reads as close to a genuine holiday as the show ever got.</p>`,
        fr: `<p>Les eaux turquoise du lac Pukaki — teintées par une fine farine de roche glaciaire en suspension dans l'eau de fonte — s'étendent au pied du mont Aoraki/Cook, dans l'un des paysages les plus vastes et les plus spectaculaires de l'île du Sud néo-zélandaise. Le groupe a campé près de ses rives pour une nuit sous un ciel si clair et si sombre que les étoiles à elles seules justifiaient l'étape.</p><p>La saison 4 a pleinement assumé ce genre de calme — pas de ville, presque personne, juste sept idoles allongées sur le dos au milieu de nulle part, essayant de repérer la Voie lactée. Pour un groupe dont toute la vie tourne autour des plannings et des scènes, c'est sans doute ce que l'émission a produit de plus proche de vraies vacances.</p>` },
      tip: { en: "New Zealand's Mackenzie Basin around Lake Pukaki is an official Dark Sky Reserve — go on a moonless night for the best stargazing.", fr: "Le bassin de Mackenzie autour du lac Pukaki est une réserve de ciel étoilé officielle — privilégiez une nuit sans lune pour la meilleure observation." },
      directions: { en: "Best reached by rental car; the lake sits along State Highway 8, about a 3-hour drive from Christchurch.", fr: "Se rejoint le plus facilement en voiture de location ; le lac longe la route nationale 8, à environ 3 heures de route de Christchurch." } },

    { id: 32, name: "Mount Cook National Park", group: "BTS", member: "All", country: "New Zealand", city: "Canterbury", category: "Bon Voyage", year: "2019", address: "Aoraki / Mount Cook", lat: -43.7340, lng: 170.0963, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>Aoraki/Mount Cook is New Zealand's tallest peak, and the national park built around it is all glaciers, alpine lakes and hiking trails that end in views most people only see in wallpaper photos. The group set out on a guided walk and glacier tour here, a rare stretch of genuine physical effort on a show usually more about food and conversation.</p><p>It's one of the more logistically demanding stops the show has ever filmed, and it shows in the footage — real exhaustion, real awe, and a landscape too big for any of the usual Bon Voyage banter to compete with.</p>`,
        fr: `<p>L'Aoraki/mont Cook est le plus haut sommet de Nouvelle-Zélande, et le parc national qui l'entoure n'est que glaciers, lacs alpins et sentiers de randonnée qui débouchent sur des panoramas que la plupart des gens ne voient que sur des fonds d'écran. Le groupe y a enchaîné une randonnée guidée et une visite de glacier, un rare passage d'effort physique réel dans une émission d'habitude plus centrée sur la nourriture et la conversation.</p><p>C'est l'une des étapes les plus exigeantes logistiquement jamais filmées pour le programme, et ça se ressent à l'écran — une vraie fatigue, un vrai émerveillement, et un paysage trop immense pour que les habituelles plaisanteries de Bon Voyage puissent rivaliser.</p>` },
      tip: { en: "The Hooker Valley Track is the most accessible glacier-lake hike in the park and needs no technical gear, just sturdy shoes.", fr: "Le Hooker Valley Track est la randonnée vers un lac glaciaire la plus accessible du parc, sans matériel technique nécessaire, juste de bonnes chaussures." },
      directions: { en: "Mount Cook Village, the park's base, is about a 40-minute drive from Lake Pukaki along State Highway 80.", fr: "Le village de Mount Cook, point de départ du parc, se trouve à environ 40 minutes de route du lac Pukaki, sur la route 80." } },

    { id: 33, name: "Queenstown Skyline", group: "BTS", member: "All", country: "New Zealand", city: "Queenstown", category: "Bon Voyage", year: "2019", address: "Brecon Street", lat: -45.0343, lng: 168.6611, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>A gondola climbs steeply out of Queenstown to the Skyline complex, perched high above Lake Wakatipu with the Remarkables mountain range filling the horizon. The group rode up for the view, and stayed for the luge track — a set of small go-kart-like sleds that let you race down the mountain on a purpose-built concrete course.</p><p>The luge runs turned into one of the funniest, most competitive segments of the whole New Zealand leg, seven idols suddenly deadly serious about beating each other down a hill on what is essentially an adult go-kart for tourists.</p>`,
        fr: `<p>Un téléphérique grimpe abruptement au-dessus de Queenstown jusqu'au complexe Skyline, perché haut au-dessus du lac Wakatipu, avec la chaîne des Remarkables qui occupe tout l'horizon. Le groupe y est monté pour la vue, et y est resté pour la piste de luge — de petits chariots façon karting qui permettent de dévaler la montagne sur un circuit en béton conçu pour ça.</p><p>Les descentes en luge sont devenues l'un des passages les plus drôles et les plus compétitifs de tout le segment néo-zélandais, sept idoles soudain d'un sérieux absolu à l'idée de se battre les unes contre les autres sur ce qui n'est, au fond, qu'un karting pour touristes.</p>` },
      tip: { en: "Buy the gondola-plus-luge combo ticket — multiple luge rides are included and it's noticeably cheaper than paying separately.", fr: "Prenez le billet combiné téléphérique + luge — plusieurs descentes sont incluses et c'est nettement moins cher qu'en payant séparément." },
      directions: { en: "The Skyline gondola base station is a short walk from central Queenstown, right at the bottom of Brecon Street.", fr: "La station de départ du téléphérique Skyline se trouve à quelques pas du centre de Queenstown, tout en bas de Brecon Street." } },

    { id: 34, name: "Nevis Swing", group: "BTS", member: "All", country: "New Zealand", city: "Queenstown", category: "Bon Voyage", year: "2019", address: "Queenstown 9300", lat: -45.1685, lng: 168.7593, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>Suspended over a remote canyon outside Queenstown, the Nevis Swing sends riders into a 300-metre freefall arc at speeds well over 100 km/h before the giant swing catches and carries them out over the gorge. Queenstown built its whole identity around this kind of thing, and Bon Voyage Season 4 wasn't going to pass through without making at least a few members do it.</p><p>What followed is some of the most purely reactive footage the show has ever captured — genuine screaming, genuine regret mid-fall, and genuine relief on landing, none of it remotely staged. It's the extreme-sports counterpoint to the quiet nights spent stargazing at Lake Pukaki, and together they sum up what made this season feel so different from the rest.</p>`,
        fr: `<p>Suspendu au-dessus d'un canyon isolé près de Queenstown, le Nevis Swing envoie ceux qui osent monter dans une chute libre en arc de 300 mètres à plus de 100 km/h, avant que la balançoire géante ne les rattrape et les emporte au-dessus des gorges. Queenstown a bâti toute son identité autour de ce genre d'activité, et la saison 4 de Bon Voyage n'allait pas passer par là sans y pousser au moins quelques membres.</p><p>Ce qui a suivi figure parmi les images les plus spontanément réactives jamais filmées pour l'émission — des cris authentiques, des regrets bien réels en plein vol, et un vrai soulagement à l'atterrissage, rien de tout ça n'étant le moins du monde mis en scène. C'est le pendant sports extrêmes des nuits calmes passées à observer les étoiles au lac Pukaki, et à eux deux, ces moments résument ce qui a rendu cette saison si différente des autres.</p>` },
      tip: { en: "Book well in advance during peak summer season (December–February) — the Nevis site has limited daily capacity.", fr: "Réservez bien à l'avance pendant la haute saison estivale (décembre–février) — le site du Nevis a une capacité journalière limitée." },
      directions: { en: "Reached by a dedicated shuttle from the AJ Hackett booking office in central Queenstown; the site itself is not accessible by private car.", fr: "Se rejoint par une navette dédiée depuis le bureau de réservation AJ Hackett au centre de Queenstown ; le site n'est pas accessible en voiture personnelle." } },

    // ===== LIEUX PERSONNELS =====
    { id: 35, name: "Cafe Magnate", group: "BTS", member: "Jimin", country: "South Korea", city: "Busan", category: "Cafe", year: "2019", address: "135 Jinnam-ro, Nam-gu", lat: 35.1379, lng: 129.1074, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
      fullDescription: { en: `<p>Cafe Magnate is owned and run by Jimin's father, tucked into a quiet stretch of Busan's Nam-gu district, well outside the usual fan-mapped circuit of Seoul cafés. It's an unassuming spot by design — coffee, simple desserts, and the kind of low-key neighbourhood atmosphere you'd expect from a family-run business rather than anything built for attention.</p><p>Fans who make the trip down from Seoul tend to describe the same thing: a place that feels genuinely local, run by someone who happens to be Jimin's father rather than a shrine to Jimin himself, which is exactly what gives it its particular charm.</p>`,
        fr: `<p>Cafe Magnate est tenu par le père de Jimin, niché dans un coin tranquille du quartier de Nam-gu à Busan, bien à l'écart du circuit habituel des cafés séoulites répertoriés par les fans. C'est un lieu volontairement discret — du café, des desserts simples, et l'ambiance de quartier posée que l'on attend d'un commerce familial plutôt que d'un endroit pensé pour attirer l'attention.</p><p>Les fans qui font le déplacement depuis Séoul décrivent souvent la même chose : un lieu qui paraît sincèrement local, tenu par quelqu'un qui se trouve être le père de Jimin plutôt qu'un sanctuaire dédié à Jimin lui-même — et c'est précisément ce qui en fait tout le charme.</p>` },
      tip: { en: "This is a working family business, not a fan attraction — keep visits brief and low-key out of respect for the owners and other customers.", fr: "C'est un commerce familial en activité, pas une attraction pour fans — restez brefs et discrets par respect pour les propriétaires et les autres clients." },
      directions: { en: "Located in Busan's Nam-gu district; a taxi from Busan Station takes around 20 minutes.", fr: "Situé dans le quartier de Nam-gu à Busan ; comptez environ 20 minutes en taxi depuis la gare de Busan." } },

    { id: 36, name: "Oldeugnseu (Oldeugns)", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Cafe", year: "2022", address: "Seochon", lat: 37.5808, lng: 126.9700, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
      fullDescription: { en: `<p>Tucked into the low-rise, hanok-lined streets of Seochon — the quiet neighbourhood just west of Gyeongbokgung Palace that RM has been photographed exploring more than once — Oldeugns is a small, art-filled café that fits the area's unhurried, gallery-hopping character perfectly.</p><p>It's the kind of place that gets called a "Namjooning spot" among fans, a term for the specific genre of quiet, artistic, slightly off-the-beaten-path locations RM tends to gravitate toward on his own time. There's no performance to it — just good coffee in a neighbourhood built for wandering.</p>`,
        fr: `<p>Niché dans les rues basses et bordées de hanoks de Seochon — ce quartier tranquille juste à l'ouest du palais Gyeongbokgung que RM a été photographié en train d'explorer à plusieurs reprises — Oldeugns est un petit café rempli d'œuvres d'art qui colle parfaitement au caractère posé et propice à la flânerie entre galeries du quartier.</p><p>C'est le genre d'endroit que les fans qualifient de « spot Namjooning », un terme désignant ce style bien particulier de lieux calmes, artistiques et légèrement à l'écart des sentiers battus vers lesquels RM a tendance à se tourner pendant son temps libre. Rien n'y est mis en scène — juste du bon café dans un quartier fait pour flâner.</p>` },
      tip: { en: "Pair the visit with a walk through Seochon's gallery streets — several small independent art spaces sit within a few minutes' walk.", fr: "Combinez la visite avec une balade dans les rues à galeries de Seochon — plusieurs petits espaces d'art indépendants se trouvent à quelques minutes à pied." },
      directions: { en: "Take Line 3 to Gyeongbokgung Station (Exit 2) and walk about 10 minutes into the Seochon neighbourhood.", fr: "Prenez la ligne 3 jusqu'à la station Gyeongbokgung (sortie 2) et marchez environ 10 minutes dans le quartier de Seochon." } },

    { id: 37, name: "Cafe Hyuga", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2022", address: "16 Nonhyeon-ro 119-gil, Gangnam-gu", lat: 37.5133, lng: 127.0321, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
      fullDescription: { en: `<p>Cafe Hyuga occupies a small, minimalist space just off Nonhyeon-ro, on the exact same street where BTS's first cramped dorm once stood in their earliest years. Whether that's coincidence or a quiet nod to where it all started, it's a detail that hasn't gone unnoticed by long-time fans mapping the group's history.</p><p>The café itself keeps things simple — clean lines, filtered light, coffee taken seriously — the kind of understated spot that rewards fans who know exactly what street they're standing on and why it matters.</p>`,
        fr: `<p>Cafe Hyuga occupe un petit espace minimaliste juste à côté de Nonhyeon-ro, dans la rue exacte où se trouvait le tout premier dortoir exigu de BTS à leurs débuts. Coïncidence ou clin d'œil discret à leurs origines, c'est un détail qui n'a pas échappé aux fans de longue date qui retracent l'histoire du groupe sur la carte.</p><p>Le café en lui-même reste volontairement sobre — des lignes épurées, une lumière filtrée, du café pris au sérieux — le genre de lieu discret qui prend tout son sens pour les fans qui savent exactement dans quelle rue ils se trouvent et pourquoi elle compte.</p>` },
      tip: { en: "Combine this stop with the nearby first-dorm street for a short, walkable early-BTS history loop in one afternoon.", fr: "Combinez cette étape avec la rue du premier dortoir toute proche pour une petite boucle à pied sur les débuts de BTS, en une seule après-midi." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 10 minutes south into Nonhyeon-dong.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 10 minutes vers le sud, dans Nonhyeon-dong." } },

    // ===== CONCERTS =====
    { id: 38, name: "Gillette Stadium", group: "BTS", member: "All", country: "USA", city: "Foxborough, MA", category: "Concerts", year: "2026", episode: "World Tour 'ARIRANG'", address: "1 Patriot Pl", lat: 42.0909, lng: -71.2643, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Gillette Stadium, home turf of the New England Patriots just outside Boston, turned into a sea of purple light banners for one of the East Coast stops on the 2026 "ARIRANG" World Tour — the group's first full-scale stadium run since completing their military service, and it showed in the sheer scale of everything from the staging to the setlist.</p><p>For fans who'd waited years for exactly this, a stadium this size wasn't just a venue, it was proof: seven members, one stage, sixty-some thousand people who'd bought tickets the moment they went on sale.</p>`,
        fr: `<p>Le Gillette Stadium, terrain des New England Patriots juste à l'extérieur de Boston, s'est transformé en une mer de bannières lumineuses violettes pour l'une des étapes de la côte Est de la tournée mondiale « ARIRANG » de 2026 — la première tournée en stade à pleine échelle du groupe depuis la fin de leur service militaire, et cela s'est ressenti dans l'ampleur de tout, de la scénographie à la setlist.</p><p>Pour les fans qui avaient attendu des années pour exactement ce moment, un stade de cette taille n'était pas qu'une simple salle de concert : c'était une preuve — sept membres, une seule scène, et une soixantaine de milliers de personnes qui avaient acheté leur billet dès l'ouverture de la vente.</p>` },
      tip: { en: "Gillette Stadium's parking lots open early and tailgating is common practice — arriving a few hours ahead gets you the full pre-show atmosphere.", fr: "Les parkings du Gillette Stadium ouvrent tôt et le tailgating (pique-nique avant le concert) y est courant — arriver quelques heures en avance permet de profiter pleinement de l'ambiance d'avant-concert." },
      directions: { en: "Gillette Stadium is about 30 miles southwest of Boston; on show nights, MBTA runs special event trains directly to the venue from South Station.", fr: "Le Gillette Stadium se trouve à environ 50 km au sud-ouest de Boston ; les soirs de concert, le MBTA met en place des trains spéciaux directement depuis South Station." } },

    { id: 39, name: "SoFi Stadium", group: "BTS", member: "All", country: "USA", city: "Inglewood, CA", category: "Concerts", year: "2026", episode: "World Tour 'ARIRANG'", address: "1001 Stadium Dr", lat: 33.9535, lng: -118.3392, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>SoFi Stadium's enormous suspended video board — a signature of the venue since it opened — turned the "ARIRANG" tour's West Coast stop into one of the visually biggest nights of the entire run, its curved screen wrapping the whole crowd in the same imagery at once.</p><p>Los Angeles shows have always carried a specific weight for BTS, going back to earlier tours that helped establish just how far their fanbase in the US actually reached, and this stop continued that history on one of the most technologically advanced stages the tour played all year.</p>`,
        fr: `<p>L'immense écran vidéo suspendu de SoFi Stadium — signature du lieu depuis son ouverture — a transformé l'étape ouest de la tournée « ARIRANG » en l'une des soirées les plus impressionnantes visuellement de toute la tournée, son écran incurvé enveloppant tout le public dans les mêmes images en simultané.</p><p>Les concerts à Los Angeles ont toujours eu un poids particulier pour BTS, depuis les tournées précédentes qui avaient contribué à révéler l'ampleur réelle de leur fanbase aux États-Unis, et cette étape a prolongé cette histoire sur l'une des scènes les plus techniquement avancées de toute la tournée.</p>` },
      tip: { en: "SoFi Stadium sits within the larger Hollywood Park complex — arrive early to explore the plaza and food options before doors open.", fr: "SoFi Stadium se trouve au sein du complexe Hollywood Park — arrivez en avance pour profiter de l'esplanade et des stands de restauration avant l'ouverture des portes." },
      directions: { en: "Located in Inglewood; the Metro K Line's Downtown Inglewood station is about a 15-minute walk from the stadium.", fr: "Situé à Inglewood ; la station Downtown Inglewood de la ligne K du métro se trouve à environ 15 minutes à pied du stade." } },

    { id: 40, name: "Stade de France", group: "BTS", member: "All", country: "France", city: "Saint-Denis", category: "Concerts", year: "2026", episode: "World Tour 'ARIRANG'", address: "ZAC du Cornillon Nord", lat: 48.9244, lng: 2.3601, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>The Stade de France stop marked the European leg of the "ARIRANG" World Tour, filling France's national stadium with a crowd that had clearly been counting down since the date was first announced. It's a venue built for football finals and Olympic ceremonies, and for one night it belonged entirely to seven idols and an ocean of ARMY Bombs.</p><p>Paris shows have their own distinct flavour — multilingual chanting, a crowd that skews heavily international given the city's status as a European hub — and Saint-Denis's stadium gave that energy the biggest possible room to expand into.</p>`,
        fr: `<p>L'étape du Stade de France a marqué le passage européen de la tournée mondiale « ARIRANG », remplissant le stade national français d'une foule qui comptait manifestement les jours depuis l'annonce de la date. C'est une enceinte construite pour les finales de football et les cérémonies olympiques, et le temps d'une soirée, elle a appartenu entièrement à sept idoles et à un océan d'ARMY Bombs.</p><p>Les concerts parisiens ont leur propre saveur — des chants multilingues, un public fortement international compte tenu du statut de la ville comme carrefour européen — et le stade de Saint-Denis a offert à cette énergie le plus grand espace possible pour s'exprimer.</p>` },
      tip: { en: "The RER B and D lines both serve the stadium directly — public transport is strongly recommended over driving on concert nights due to heavy traffic.", fr: "Les lignes RER B et D desservent toutes deux le stade directement — les transports en commun sont fortement recommandés plutôt que la voiture les soirs de concert, en raison d'une circulation dense." },
      directions: { en: "Take RER B or D to Saint-Denis - Stade de France station; the stadium entrance is a short walk from the platform.", fr: "Prenez le RER B ou D jusqu'à la station Saint-Denis - Stade de France ; l'entrée du stade se trouve à quelques pas du quai." } },

    { id: 41, name: "Allegiant Stadium", group: "BTS", member: "All", country: "USA", city: "Las Vegas", category: "Concerts", year: "2022", episode: "Permission to Dance On Stage", address: "3333 Al Davis Way", lat: 36.0909, lng: -115.1833, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Before the hiatus, before the military enlistments, the "Permission to Dance On Stage" residency at Allegiant Stadium was the last time fans saw the full group perform together in the US for years — four nights that, in hindsight, carry a very different weight than they did at the time.</p><p>Las Vegas leaned into the occasion with its usual excess: the whole city seemed to know a show was happening, hotel marquees lit up in tribute, and fans flew in from every time zone for what nobody quite realised yet would become such a significant closing chapter.</p>`,
        fr: `<p>Avant la pause, avant les incorporations au service militaire, la résidence « Permission to Dance On Stage » à l'Allegiant Stadium a été la dernière fois où les fans ont vu le groupe complet se produire ensemble aux États-Unis pendant plusieurs années — quatre soirs qui, avec le recul, portent un tout autre poids qu'à l'époque.</p><p>Las Vegas a joué le jeu avec son excès habituel : toute la ville semblait savoir qu'un concert avait lieu, les enseignes des hôtels s'illuminaient en hommage, et des fans ont pris l'avion depuis tous les fuseaux horaires pour ce que personne ne savait encore devenir un chapitre de clôture aussi marquant.</p>` },
      tip: { en: "Allegiant Stadium is a short rideshare from the Strip — factor in extra time for exit traffic, which is notoriously heavy after Vegas shows.", fr: "L'Allegiant Stadium se trouve à une courte course de VTC depuis le Strip — prévoyez du temps supplémentaire pour la sortie, réputée très chargée après les concerts à Vegas." },
      directions: { en: "Located just west of the Las Vegas Strip; free shuttle buses typically run from designated Strip pick-up points on event nights.", fr: "Situé juste à l'ouest du Strip de Las Vegas ; des navettes gratuites circulent généralement depuis des points de collecte dédiés sur le Strip les soirs d'événement." } },

    { id: 42, name: "Seoul Olympic Stadium", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2022", episode: "Permission to Dance On Stage", ytId: "r_z6u96z5k8", episodeLink: "https://www.youtube.com/watch?v=r_z6u96z5k8", address: "25 Olympic-ro, Songpa-gu", lat: 37.5153, lng: 127.0730, img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Seoul_Olympic_Stadium_2019.jpg",
      fullDescription: { en: `<p>In 2015, a still-growing BTS performed I Need U at the massive Dream Concert held at Jamsil Olympic Stadium. At the time, they were just one of many groups performing for a mixed crowd.</p><p>Years later, they would return to this exact stadium to completely sell it out for their Love Yourself and Permission to Dance solo concerts, making it the ultimate symbol of their rise to the top.</p>`,
        fr: `<p>Construit pour les Jeux olympiques d'été de 1988, le stade olympique de Séoul a accueilli l'étape du retour au pays de « Permission to Dance On Stage » — le groupe se produisant sur le sol coréen devant son public national, quelques semaines seulement après avoir bouclé les concerts de Las Vegas, refermant ce chapitre de leur histoire exactement là où tout avait commencé.</p><p>Il y a une intensité particulière à un concert dans le stade de sa propre ville, que rien à l'étranger ne reproduit vraiment : de la famille dans le public, une setlist qui puisait dans les tout premiers titres du groupe, et plus de soixante mille voix qui chantaient en retour, en coréen, sans avoir besoin du moindre sous-titre.</p>` },
      tipsList: [ { title: { en: `The Olympic Rings` }, text: { en: `Take a photo in front of the giant Olympic rings at the main entrance.` } }, { title: { en: `Walk of Fame` }, text: { en: `Check out the surrounding area which features handprints of various artists who have performed there.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `Korea's largest stadium (currently under renovation for years).` } }, { title: { en: `Access` }, text: { en: `Exterior plaza is accessible.` } }, { title: { en: `How to get there` }, text: { en: `Sports Complex Station (Lines 2 and 9).` } } ] },

    // ===== NOUVEAUX LIEUX (recherche complémentaire) =====
    { id: 43, name: "HYBE Headquarters", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2021", address: "42 Hangang-daero, Yongsan-gu", lat: 37.5297, lng: 126.9648, img: "https://images.unsplash.com/photo-1546874177-9e664107314e?w=600",
      fullDescription: { en: `<p>HYBE's glass-and-steel headquarters in Yongsan is the clearest physical marker of just how far BTS has taken their agency — a sleek, modern tower that stands in almost comic contrast to the cramped Gangnam offices the group started out in barely a decade earlier.</p><p>Visitors can't get inside without a scheduled event, but that hasn't stopped fans from gathering out front for photos, especially around member birthdays or big anniversaries, when the surrounding streets tend to fill with pop-up cafés, cup-sleeve events and banners paid for by fan clubs from around the world.</p>`,
        fr: `<p>Le siège de HYBE à Yongsan, tout en verre et en acier, est le marqueur le plus visible du chemin parcouru par BTS avec leur agence — une tour moderne et épurée qui contraste presque comiquement avec les bureaux exigus de Gangnam où le groupe a débuté à peine dix ans plus tôt.</p><p>Impossible d'entrer sans événement programmé, mais cela n'empêche pas les fans de se rassembler devant pour des photos, surtout autour des anniversaires des membres ou des grandes dates commémoratives, quand les rues alentour se remplissent de cafés éphémères, d'événements "cup-sleeve" et de banderoles financées par des fan clubs du monde entier.</p>` },
      tip: { en: "Check fan community boards before visiting — the surrounding cafés often run limited-time BTS-themed events tied to specific members' birthdays.", fr: "Consultez les forums de fans avant de vous y rendre — les cafés alentour organisent souvent des événements temporaires sur le thème de BTS, liés aux anniversaires de membres précis." },
      directions: { en: "A short walk from Seoul Station or Yongsan Station; both are served by multiple subway lines and the KTX high-speed rail.", fr: "À quelques minutes à pied de la gare de Séoul ou de la gare de Yongsan ; toutes deux desservies par plusieurs lignes de métro et le KTX." } },

    { id: 44, name: "Yoojung Sikdang", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2013", episodeLink: "https://www.youtube.com/playlist?list=PLPZaakKQDr0pzgTQaqc0EAK6ERYzNmVbW", address: "Sinsa-dong, Gangnam-gu", lat: 37.5145, lng: 127.0223, img: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600",
      fullDescription: { en: `<p>During their trainee years, BTS practically lived in this modest restaurant. Located a short walk from their old dorm and practice studio, Yoojung Sikdang served as their unofficial mess hall.</p><p>Eating the signature Heukdwaeji Dolsot Bibimbap at the exact table where the members used to sit is a mandatory rite of passage for every ARMY visiting Seoul.</p>`,
        fr: `<p>Bien avant les stades complets, les sept membres étaient des trainees fauchés qui mangeaient là où leur maigre budget le permettait, et Yoojung Sikdang — une modeste gargote familiale à quelques rues de leur ancienne agence — est devenue leur cantine de prédilection. La patronne, une "ajumma" au sens le plus chaleureux du terme, les nourrissait souvent gratuitement ou glissait des plats d'accompagnement supplémentaires sur la table quand elle savait l'argent rare.</p><p>Le bibimbap au porc noir servi dans un bol de pierre chaude, plat signature du restaurant, reste exactement ce qu'il était à l'époque : simple, copieux, servi dans la même salle sans prétention. Une fois BTS devenu un phénomène mondial, la patronne est devenue l'une de leurs plus fidèles admiratrices, et la gargote est depuis devenue un véritable lieu de pèlerinage — un rappel que la célébrité mondiale a commencé avec un bol de pierre chaude et une femme qui croyait en sept jeunes affamés.</p>` },
      tipsList: [ { title: { en: `Order the signature dish` }, text: { en: `Ask for the "Bangtan Bibimbap", their favorite menu item back in the day.` } }, { title: { en: `Leave a message` }, text: { en: `Bring a small photocard; the restaurant features dedicated spaces where fans leave messages.` } } ],
      practicalInfo: [ { title: { en: `Food & Pricing` }, text: { en: `Traditional Korean pork belly and black pork stone pot bibimbap (~10,000 KRW).` } }, { title: { en: `What to expect` }, text: { en: `The owner affectionately remembers the members. The restaurant gets very busy during peak lunch hours.` } }, { title: { en: `How to get there` }, text: { en: `Take the subway to Hakdong Station (Line 7), and walk about 10 minutes.` } } ] },

    { id: 45, name: "Gwanghwamun Square", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2026", episodeLink: "https://www.netflix.com/title/82157128", address: "Gwanghwamun Square, Jongno-gu", lat: 37.5759, lng: 126.9769, img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=600",
      fullDescription: { en: `<p>During their early promotions, BTS and their staff handed out flyers and did guerilla interviews in major public spaces like Gwanghwamun to gain public recognition.</p><p>Standing in the massive square, it's incredible to think of a young BTS trying to catch the attention of passing citizens, years before they became global ambassadors for Seoul.</p>`,
        fr: `<p>Encadrée par l'imposante porte Gwanghwamun et les montagnes qui s'élèvent derrière le palais Gyeongbokgung, cette vaste place publique se trouve au cœur historique et symbolique de Séoul — c'est précisément pour cela que BTS l'a choisie pour un concert gratuit en plein air en 2026, transformant l'un des espaces les plus traditionnels de Corée en scène pour l'une de ses réussites les plus modernes.</p><p>En se tenant ici, le choix se comprend aisément : des siècles d'histoire royale qui s'étendent derrière une foule de dizaines de milliers de personnes, toutes réunies pour un groupe devenu, à sa manière, un monument national à part entière.</p>` },
      tipsList: [ { title: { en: `King Sejong Statue` }, text: { en: `A must-visit landmark in the center of the square.` } }, { title: { en: `Visit Gyeongbokgung` }, text: { en: `The palace is right behind the square, where they later performed 'Idol'.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Massive public square in the historic center of Seoul.` } }, { title: { en: `What to expect` }, text: { en: `Statues of King Sejong and Admiral Yi Sun-sin.` } }, { title: { en: `How to get there` }, text: { en: `Gwanghwamun Station (Line 5).` } } ] },

    { id: 46, name: "HiKR Ground", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "MV Location", year: "2025", address: "Gwanghwamun area, Jongno-gu", lat: 37.5700, lng: 126.9850, img: "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600",
      fullDescription: { en: `<p>HiKR Ground is an interactive K-culture center built around a wildly specific idea: letting ordinary visitors step onto real studio sets — a subway car, a mock space station, a coin laundromat — and shoot their own music-video-style footage, complete with adjustable lighting and camera angles.</p><p>For fans who've spent years watching BTS work behind the scenes on MV shoots, the appeal is obvious: it's a rare chance to stand in front of the same kind of set, camera in hand, and get a small taste of what a day on a K-pop shoot actually feels like.</p>`,
        fr: `<p>HiKR Ground est un centre interactif dédié à la culture coréenne, construit autour d'une idée aussi précise qu'originale : permettre à n'importe quel visiteur de s'installer sur de vrais décors de studio — une rame de métro, une fausse station spatiale, une laverie automatique — pour tourner ses propres images façon clip musical, avec éclairage et angles de caméra réglables.</p><p>Pour les fans qui ont passé des années à regarder BTS travailler en coulisses sur des tournages de clips, l'attrait est évident : c'est l'occasion rare de se tenir devant le même genre de décor, caméra en main, et de goûter un peu à ce que représente une journée de tournage K-pop.</p>` },
      tip: { en: "Book your studio session slot online in advance — the most popular sets fill up quickly, especially on weekends.", fr: "Réservez votre créneau de studio en ligne à l'avance — les décors les plus populaires se remplissent vite, surtout le week-end." },
      directions: { en: "Located near Gwanghwamun Square; take Line 5 or Line 3 to Gwanghwamun Station and follow signs.", fr: "Situé près de la place Gwanghwamun ; prenez la ligne 5 ou la ligne 3 jusqu'à la station Gwanghwamun et suivez les panneaux." } },

    { id: 47, name: "The Min's", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2014", address: "14 Dosan-daero 28-gil, Gangnam-gu", lat: 37.5230, lng: 127.0350, img: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600",
      fullDescription: { en: `<p>Tucked into the Apgujeong-dong side streets, The Min's is run by Lee Chang-min — a member of the K-pop duo Homme and former 2AM member — and has quietly built up a wall of BTS photos, autographs and handwritten notes from years of visits by the group.</p><p>The café's signature drinks, fresh-squeezed lemonade and cherryade, are what members are usually pictured enjoying, and the small, homey space still feels more like a friend's living room than a fan attraction, which is exactly its charm.</p>`,
        fr: `<p>Niché dans les petites rues d'Apgujeong-dong, The Min's est tenu par Lee Chang-min — membre du duo K-pop Homme et ancien membre de 2AM — et a discrètement accumulé au fil des années un mur de photos, d'autographes et de mots manuscrits laissés par le groupe lors de ses visites.</p><p>Les boissons signature du café, citronnade et cherryade fraîchement pressées, sont ce que les membres sont généralement photographiés en train de savourer, et ce petit espace chaleureux ressemble encore davantage au salon d'un ami qu'à une attraction pour fans — ce qui fait justement tout son charme.</p>` },
      tip: { en: "Order the fresh cherryade — it's the drink most often seen in the members' own photos from their visits here.", fr: "Commandez le cherryade frais — c'est la boisson que l'on voit le plus souvent sur les photos des membres prises lors de leurs visites ici." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 8 minutes through the Dosan-daero side streets.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 8 minutes dans les petites rues de Dosan-daero." } },

    { id: 48, name: "Giani's Napoli", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018", address: "Garosu-gil, Gangnam-gu", lat: 37.5205, lng: 127.0234, img: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600",
      fullDescription: { en: `<p>Along the tree-lined boutiques of Garosu-gil sits Giani's Napoli, a wood-fired pizza spot known for traditional Italian technique and unfussy, high-quality ingredients — and, among fans, as one of Jin's regular stops when catching up with friends.</p><p>There's nothing flashy about the choice: it's simply good pizza in a good neighbourhood, which tracks with everything Jin has said over the years about preferring quiet, unpretentious spots over anything designed to be seen at.</p>`,
        fr: `<p>Le long des boutiques bordées d'arbres de Garosu-gil se trouve Giani's Napoli, une pizzeria au four à bois reconnue pour sa technique italienne traditionnelle et ses ingrédients de qualité sans chichi — et, chez les fans, comme l'une des adresses régulières de Jin lorsqu'il retrouve des amis.</p><p>Le choix n'a rien de tape-à-l'œil : c'est simplement une bonne pizza dans un bon quartier, ce qui correspond en tout point à ce que Jin a toujours dit préférer — des endroits tranquilles et sans prétention plutôt que des lieux pensés pour se faire remarquer.</p>` },
      tip: { en: "Garosu-gil gets busy on weekends — a weekday lunch is the easiest way to get a table without waiting.", fr: "Garosu-gil est très fréquenté le week-end — un déjeuner en semaine reste le moyen le plus simple d'obtenir une table sans attendre." },
      directions: { en: "Take Line 3 to Sinsa Station (Exit 8) and walk about 7 minutes into Garosu-gil.", fr: "Prenez la ligne 3 jusqu'à la station Sinsa (sortie 8) et marchez environ 7 minutes dans Garosu-gil." } },

    { id: 49, name: "MMCA Seoul", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Museums", year: "2020", address: "30 Samcheong-ro, Jongno-gu", lat: 37.5786, lng: 126.9800, img: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600",
      fullDescription: { en: `<p>The National Museum of Modern and Contemporary Art's Seoul branch sits in a former Defense Security Command building near Gyeongbokgung, its galleries wrapped around an open courtyard that blends old military architecture with clean, modern exhibition space.</p><p>RM's well-documented love of contemporary art has made this one of his most frequently mentioned haunts, and fans who trace his "Namjooning" trail through the city almost always end up here — wandering the same rotating exhibitions at their own pace, the way he's said he prefers to experience a museum.</p>`,
        fr: `<p>L'antenne séoulite du Musée national d'art moderne et contemporain occupe un ancien bâtiment du Commandement de la sécurité de la défense près de Gyeongbokgung, ses galeries organisées autour d'une cour ouverte qui marie architecture militaire ancienne et espaces d'exposition modernes et épurés.</p><p>L'amour bien documenté de RM pour l'art contemporain en a fait l'un de ses repaires les plus souvent cités, et les fans qui suivent sa trace "Namjooning" à travers la ville y échouent presque toujours — errant au même rythme que lui parmi les expositions temporaires, exactement comme il dit préférer découvrir un musée.</p>` },
      tip: { en: "Check the current exhibition schedule before visiting — the rotating program means the specific artworks on view change several times a year.", fr: "Vérifiez le programme d'exposition en cours avant votre visite — les œuvres présentées changent plusieurs fois par an au gré de la programmation." },
      directions: { en: "Take Line 3 to Anguk Station (Exit 1) and walk about 10 minutes toward Samcheong-dong.", fr: "Prenez la ligne 3 jusqu'à la station Anguk (sortie 1) et marchez environ 10 minutes en direction de Samcheong-dong." } },

    { id: 50, name: "K-Star Road", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2016", address: "Apgujeong-ro, Gangnam-gu", lat: 37.5273, lng: 127.0409, img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=600",
      fullDescription: { en: `<p>A stretch of Apgujeong lined with over a dozen large, stylized bear statues — GangnamDol — each one decorated in the colours and motifs of a different K-pop act, from BTS and EXO to Super Junior and SHINee. The BTS bear, wrapped in the group's signature branding, has become a reliable photo stop for fans making their way between the neighbourhood's cafés and agency buildings.</p><p>It's more playful than solemn, and that's rather the point: K-Star Road exists as a piece of public, shareable fandom, a street-level monument built for exactly the kind of pilgrimage this guide is meant to help with.</p>`,
        fr: `<p>Un tronçon d'Apgujeong bordé d'une dizaine de grandes statues d'ours stylisées — les GangnamDol — chacune décorée aux couleurs et motifs d'un groupe de K-pop différent, de BTS et EXO à Super Junior et SHINee. L'ours BTS, habillé aux couleurs emblématiques du groupe, est devenu un arrêt photo incontournable pour les fans qui se déplacent entre les cafés et les bâtiments d'agences du quartier.</p><p>C'est plus ludique que solennel, et c'est bien tout l'intérêt : K-Star Road existe comme un morceau de fandom public et partageable, un monument à hauteur de rue conçu exactement pour le genre de pèlerinage que ce guide entend accompagner.</p>` },
      tip: { en: "The statues are spread over several blocks — walk the full stretch rather than just stopping at one to spot bears for other groups too.", fr: "Les statues s'étendent sur plusieurs pâtés de maisons — parcourez toute la rue plutôt que de vous arrêter à une seule pour repérer aussi les ours des autres groupes." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 2); the road starts a short walk from the station.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo (sortie 2) ; la rue commence à quelques pas de la station." } },

    { id: 51, name: "Achasan Mountain", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2016", address: "Achasan, Gwangjin-gu", lat: 37.5556, lng: 127.1067, img: "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=600",
      fullDescription: { en: `<p>Achasan is a modest mountain in eastern Seoul, its main claim to fame among ARMY being the punishment hike RM and V were forced into after losing a Run BTS challenge — dragging themselves up the trail grumbling the entire way, only to go quiet once the sunrise view of the Han River and the city skyline opened up in front of them.</p><p>The members have brought it up fondly enough since that it's become shorthand among fans for a very specific kind of memory: something that felt like a punishment in the moment and turned into something closer to a gift in hindsight.</p>`,
        fr: `<p>Achasan est une montagne modeste à l'est de Séoul, connue chez les ARMY surtout pour la randonnée punitive imposée à RM et V après avoir perdu un défi de Run BTS — traînant les pieds sur le sentier en grommelant tout du long, avant de se taire d'un coup lorsque le lever de soleil sur le fleuve Han et les toits de la ville s'est ouvert devant eux.</p><p>Les membres en ont reparlé depuis avec assez d'affection pour que ce moment soit devenu, chez les fans, le raccourci d'un souvenir bien précis : quelque chose qui ressemblait à une punition sur le moment, et qui s'est révélé plus proche d'un cadeau avec le recul.</p>` },
      tip: { en: "Start the climb before dawn if you want the same sunrise view the members got — the trailhead gets busy with local hikers by mid-morning.", fr: "Démarrez l'ascension avant l'aube si vous voulez le même lever de soleil que les membres — le départ du sentier se remplit de randonneurs locaux en milieu de matinée." },
      directions: { en: "Take Line 5 to Achasan Station (Exit 2) and follow signs toward the main trailhead, about a 15-minute walk.", fr: "Prenez la ligne 5 jusqu'à la station Achasan (sortie 2) et suivez les panneaux vers le départ principal du sentier, à environ 15 minutes à pied." } },

    // ===== NOUVEAUX LIEUX (recherche complémentaire, session suivante) =====
    { id: 52, name: "Hakdong Park", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "nbRKyymm4Eg", episodeLink: "https://www.youtube.com/watch?v=nbRKyymm4Eg", address: "Hakdong-ro, Gangnam-gu", lat: 37.5151, lng: 127.0327, img: "https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600",
      fullDescription: { en: `<p>Tucked away on a steep hill, Hakdong Park holds immense emotional weight as the outdoor sanctuary where the young trainees spent countless hours resting and dreaming.</p><p>RM, Suga, and J-Hope frequently mentioned coming here to clear their heads during their hardest pre-debut years.</p>`,
        fr: `<p>Hakdong Park est un petit espace vert de quartier sans prétention à Gangnam — le genre d'endroit devant lequel on passerait sans un regard si l'on n'en connaissait pas l'histoire. Durant les années de stagiaires de BTS, alors que leur premier dortoir et leur studio de répétition se trouvaient tous deux à quelques minutes à pied, ce parc était l'endroit où les membres décompressaient vraiment : assis sur des bancs après de longues séances de répétition, grignotant des snacks de supérette, s'accordant parfois une sieste.</p><p>Il n'y a ni plaque ni fresque, rien qui le signale comme significatif — c'est précisément pour ça que les fans qui retrouvent le banc exact ou l'arbre exact d'une vieille photo d'époque décrivent souvent leur visite comme l'une des étapes les plus émouvantes d'un itinéraire à Séoul. C'est un lieu ordinaire d'une façon qui rend très concrètes les années de travail qui s'y sont jouées tout autour.</p>` },
      tipsList: [ { title: { en: `The basketball court` }, text: { en: `Head to the court where the members used to shoot hoops after midnight practice.` } }, { title: { en: `Wear good shoes` }, text: { en: `The park is built on a steep slope, so expect an uphill climb.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Open 24/7, free of charge. A quiet neighborhood public park featuring a basketball court.` } }, { title: { en: `Best time to visit` }, text: { en: `Go during late afternoon to enjoy a reflective atmosphere.` } }, { title: { en: `How to get there` }, text: { en: `Exit from Hakdong Station (Line 7) and walk uphill for 5 minutes.` } } ] },

    { id: 53, name: "Laundry Pizza", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2015", address: "Sinsa-dong, Gangnam-gu", lat: 37.5178, lng: 127.0201, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
      fullDescription: { en: `<p>Decorated to look exactly like what its name promises — vintage washing machines built into the walls, laundry baskets repurposed as light fixtures — this Gangnam pizzeria became a permanent part of BTS lore the moment it was chosen as the backdrop for the group's photoshoot for The Most Beautiful Moment in Life, Pt.2 (the "Her" version), all soft lighting and oversized sweaters against the laundromat kitsch.</p><p>The pizza itself is genuinely good, which helps, but most visitors are really there to stand in the same corner booth from the album photos, tracing the exact angle the camera used, before ordering something to justify the table.</p>`,
        fr: `<p>Décorée exactement comme son nom le promet — de vieilles machines à laver encastrées dans les murs, des paniers à linge reconvertis en luminaires — cette pizzeria de Gangnam est entrée durablement dans la légende de BTS le jour où elle a été choisie comme décor pour le photoshoot de l'album The Most Beautiful Moment in Life, Pt.2 (version « Her »), lumière douce et pulls surdimensionnés sur fond de kitsch de laverie.</p><p>La pizza est réellement bonne, ce qui aide, mais la plupart des visiteurs viennent surtout se poster dans le même coin banquette que sur les photos de l'album, en retrouvant l'angle exact de la caméra, avant de commander quelque chose pour justifier la table.</p>` },
      tip: { en: "The corner booth used in the photoshoot is the most requested table — arrive off-peak (early afternoon) if you specifically want to sit there.", fr: "La banquette d'angle utilisée pour le photoshoot est la table la plus demandée — venez en heure creuse (début d'après-midi) si vous tenez à vous y installer." },
      directions: { en: "Located in the Sinsa-dong backstreets, about a 10-minute walk from Sinsa Station (Line 3, Exit 8).", fr: "Situé dans les petites rues de Sinsa-dong, à environ 10 minutes à pied de la station Sinsa (ligne 3, sortie 8)." } },

    { id: 54, name: "Yongin Daejanggeum Park", group: "BTS", member: "Suga", country: "South Korea", city: "Yongin", category: "MV Location", year: "2020", episode: "Agust D — Daechwita", address: "birobong-ro 507beon-gil, Yongin", lat: 37.2761, lng: 127.2044, img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600",
      fullDescription: { en: `<p>Built originally as a historical drama set — its hanok streets, royal court halls and traditional gates have hosted countless K-dramas over the years — Yongin Daejanggeum Park became something else entirely when SUGA chose it as the setting for his solo track "Daechwita" under his Agust D alias, reimagining himself as a rebellious king striding through the palace grounds in a video that ranks among the most stylish things BTS has ever put out individually.</p><p>Walking the same courtyards now, it's easy to see why it worked: the architecture is imposing enough to hold its own against SUGA's presence, and the video's blend of traditional Korean aesthetics with a thoroughly modern, defiant energy is baked right into the location itself.</p>`,
        fr: `<p>Construit à l'origine comme décor de drama historique — ses rues de hanoks, ses salles de cour royale et ses portes traditionnelles ont accueilli d'innombrables K-dramas au fil des années — le parc Daejanggeum de Yongin est devenu tout autre chose lorsque SUGA l'a choisi comme cadre de son titre solo « Daechwita », sous son alias Agust D, se réinventant en roi rebelle arpentant les allées du palais dans un clip qui compte parmi les plus stylés jamais sortis individuellement par un membre de BTS.</p><p>En parcourant aujourd'hui les mêmes cours, on comprend facilement pourquoi ça fonctionne : l'architecture est assez imposante pour tenir tête à la présence de SUGA, et le mélange d'esthétique coréenne traditionnelle et d'énergie résolument moderne et frondeuse du clip est en quelque sorte inscrit dans le lieu lui-même.</p>` },
      tip: { en: "The park still actively hosts drama shoots — check ahead, as certain areas occasionally close to visitors during filming days.", fr: "Le parc accueille encore régulièrement des tournages de drama — vérifiez avant de venir, certaines zones ferment parfois aux visiteurs les jours de tournage." },
      directions: { en: "Best reached by car from central Seoul (around 1 hour); limited public transit serves this part of Yongin.", fr: "Se rejoint le plus facilement en voiture depuis le centre de Séoul (environ 1 heure) ; les transports en commun sont limités dans ce secteur de Yongin." } },

    { id: 55, name: "Eulji Dabang", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2019", address: "Euljiro, Jung-gu", lat: 37.5663, lng: 126.9915, img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
      fullDescription: { en: `<p>Tucked into the older, unpolished backstreets of Euljiro — a neighbourhood better known for hardware wholesalers and decades-old print shops than café culture — Eulji Dabang is a deliberately old-fashioned "dabang," the retro tearoom style that was ubiquitous in Korea before the modern coffee shop took over. Low vinyl booths, dim lighting, and a short menu built around traditional teas rather than espresso.</p><p>Its signature order, and the reason it comes up in BTS conversations at all, is ssanghwacha — a bitter medicinal tea served with a raw egg yolk floating on top — an acquired taste the members have been associated with trying, and one that turns a quick coffee stop into something closer to a genuine cultural detour.</p>`,
        fr: `<p>Niché dans les ruelles anciennes et sans artifice d'Euljiro — un quartier plus connu pour ses grossistes en quincaillerie et ses imprimeries centenaires que pour sa culture café — Eulji Dabang est un « dabang » volontairement rétro, ce style de salon de thé qui régnait en Corée avant l'arrivée du café moderne. Banquettes en vinyle basses, éclairage tamisé, et une carte courte construite autour de thés traditionnels plutôt que d'espresso.</p><p>Sa commande signature, et la raison pour laquelle ce lieu revient dans les conversations autour de BTS, c'est le ssanghwacha — un thé médicinal amer servi avec un jaune d'œuf cru flottant à la surface — un goût qui ne plaît pas à tout le monde et auquel les membres ont été associés, transformant une simple pause café en une véritable escapade culturelle.</p>` },
      tip: { en: "If ssanghwacha feels too adventurous, most dabang of this style also serve a milder honey-ginger tea — a good middle ground for a first visit.", fr: "Si le ssanghwacha semble trop audacieux, la plupart des dabang de ce style servent aussi un thé au miel et au gingembre plus doux — un bon compromis pour une première visite." },
      directions: { en: "Take Line 2 or 3 to Euljiro 3(sam)-ga Station and walk about 5 minutes into the surrounding backstreets.", fr: "Prenez la ligne 2 ou 3 jusqu'à la station Euljiro 3(sam)-ga et marchez environ 5 minutes dans les ruelles alentour." } },

    { id: 56, name: "Jumunjin Beach Bus Stop", group: "BTS", member: "All", country: "South Korea", city: "Gangneung", category: "MV Location", year: "2017", episode: "Spring Day / You Never Walk Alone", address: "Jumunjin-eup, Gangneung", lat: 37.8967, lng: 128.8283, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600",
      fullDescription: { en: `<p>The pale blue bus shelter facing the water at Jumunjin Beach isn't the original one seen in the "Spring Day" music video and on the "You Never Walk Alone" album cover — that exact spot proved so difficult for fans to track down that the city of Gangneung eventually built this faithful recreation specifically so ARMY would have somewhere real to visit.</p><p>It's a rare, almost tender example of a destination shaped directly by fan devotion rather than the other way around: the wide sandy beach and pale winter light are the real draw, and the shelter itself, purple bench and all, exists purely so people have a place to sit and feel, briefly, like they've stepped inside the song.</p>`,
        fr: `<p>L'abribus bleu pâle qui fait face à la mer sur la plage de Jumunjin n'est pas l'original vu dans le clip de « Spring Day » et sur la pochette de l'album « You Never Walk Alone » — ce lieu précis s'est avéré si difficile à localiser pour les fans que la ville de Gangneung a fini par construire cette reconstitution fidèle, spécifiquement pour que les ARMY aient un endroit réel où se rendre.</p><p>C'est un exemple rare, presque touchant, d'une destination façonnée directement par la dévotion des fans plutôt que l'inverse : la large plage de sable et la lumière pâle d'hiver sont le véritable attrait, et l'abri lui-même, banc violet compris, existe uniquement pour que chacun puisse s'y asseoir et se sentir, l'espace d'un instant, transporté à l'intérieur de la chanson.</p>` },
      tip: { en: "Winter and early spring light match the music video's mood most closely — a grey, overcast afternoon here feels more \"right\" than a sunny summer day.", fr: "La lumière d'hiver et de début de printemps correspond le mieux à l'ambiance du clip — un après-midi gris et couvert semble plus « juste » ici qu'une journée d'été ensoleillée." },
      directions: { en: "Take a bus from Seoul's Nambu Bus Terminal to Jumunjin Intercity Bus Terminal, then a short taxi or 15-minute walk to the beach.", fr: "Prenez un bus depuis le terminal routier Nambu de Séoul jusqu'au terminal de Jumunjin, puis un court trajet en taxi ou 15 minutes à pied jusqu'à la plage." } },

    { id: 57, name: "Jecheon Mosan Airfield", group: "BTS", member: "All", country: "South Korea", city: "Jecheon", category: "MV Location", year: "2016", episode: "Epilogue: Young Forever", address: "Mosan-dong, Jecheon", lat: 37.1289, lng: 128.2444, img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600",
      fullDescription: { en: `<p>A disused rural airstrip in the hills outside Jecheon, this wide expanse of empty runway and open sky became the backdrop for the group running, jumping and simply being seven kids let loose in "Epilogue: Young Forever" — one of the videos fans consistently point to as the moment BTS's visual language shifted from tightly choreographed sets toward something rawer and more emotionally direct.</p><p>There's nothing built for visitors here — no signage, no facilities — just runway markings slowly fading into grass and a horizon big enough to explain exactly why a director would choose it for a song about chasing something you can't quite catch.</p>`,
        fr: `<p>Ancienne piste d'aviation rurale désaffectée dans les collines aux abords de Jecheon, cette vaste étendue de tarmac vide sous un grand ciel ouvert est devenue le décor du groupe en train de courir, sauter et simplement être sept jeunes lâchés en liberté dans « Epilogue: Young Forever » — l'un des clips que les fans citent systématiquement comme le moment où le langage visuel de BTS a basculé de mises en scène très chorégraphiées vers quelque chose de plus brut et de plus directement émotionnel.</p><p>Rien n'est aménagé pour les visiteurs ici — aucun panneau, aucune installation — juste un marquage de piste qui s'efface lentement dans l'herbe et un horizon assez vaste pour expliquer précisément pourquoi un réalisateur choisirait cet endroit pour une chanson qui parle de courir après quelque chose qu'on ne peut jamais tout à fait attraper.</p>` },
      tip: { en: "The site is remote and unmaintained — sturdy shoes are essential, and it's best visited with a car rather than attempted on foot from town.", fr: "Le site est isolé et non entretenu — de bonnes chaussures sont indispensables, et il vaut mieux s'y rendre en voiture plutôt qu'à pied depuis la ville." },
      directions: { en: "Best reached by car from Jecheon city center (around 20 minutes); no public transit serves the airfield directly.", fr: "Se rejoint le plus facilement en voiture depuis le centre de Jecheon (environ 20 minutes) ; aucun transport en commun ne dessert directement le site." } },

    { id: 58, name: "Ilchi Art Hall", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2013", episodeLink: "https://www.gettyimages.com/detail/news-photo/speak-during-their-showcase-at-ilchi-art-hall-on-june-15-news-photo/170777346", address: "860 Seolleung-ro, Gangnam-gu", lat: 37.5215, lng: 127.041, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>On June 12, 2013, Ilchi Art Hall hosted BTS's official debut showcase. Here they performed "No More Dream" in front of the press and their very first fans.</p><p>Visiting the exterior of this hall allows fans to stand exactly where the boys took their very first steps into the spotlight.</p>`,
        fr: `<p>Le 12 juin 2013, l'Ilchi Art Hall a accueilli le showcase officiel de débuts de BTS, où le groupe a interprété « No More Dream » devant la presse et ses tout premiers fans.</p><p>Visiter l'extérieur de cette salle permet aux fans de se tenir exactement là où le groupe a fait ses tout premiers pas sous les projecteurs, à quelques minutes à pied de la station Apgujeong Rodeo.</p>` },
      tipsList: [ { title: { en: `Take a photo at the entrance` }, text: { en: `The main glass doors are exactly as they appeared in their debut documentary.` } }, { title: { en: `Explore Apgujeong` }, text: { en: `The venue is located in one of Seoul's trendiest districts.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `A 400-seat performance hall often used for K-pop showcases.` } }, { title: { en: `Access` }, text: { en: `You can only enter if you have a ticket for a current event, but the exterior is iconic.` } }, { title: { en: `How to get there` }, text: { en: `A short walk from Apgujeong Rodeo Station.` } } ] },

    { id: 59, name: "YES24 Live Hall (AX-Korea)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2014", episodeLink: "https://en.wikipedia.org/wiki/The_Red_Bullet_Tour", address: "319 Gucheonmyeon-ro, Gwangjin-gu", lat: 37.5465, lng: 127.1035, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>In October 2014, BTS held their very first solo concert, "The Red Bullet," at this venue. It was a deeply emotional milestone for a group from a small agency.</p><p>Standing outside YES24 Live Hall reminds fans of the days when BTS struggled to sell out a 2,000-seat venue, long before their stadium tours.</p>`,
        fr: `<p>En octobre 2014, BTS a donné son tout premier concert en solo, « The Red Bullet », dans cette salle de taille moyenne — une étape profondément émouvante pour un groupe issu d'une petite agence.</p><p>Se tenir aujourd'hui devant le YES24 Live Hall rappelle l'époque où BTS peinait encore à remplir une salle de 2 000 places, bien avant leurs tournées dans des stades.</p>` },
      tipsList: [ { title: { en: `The Entrance steps` }, text: { en: `Recreate the fan photos taken during the 2014 concert queuing.` } }, { title: { en: `Riverside walk` }, text: { en: `It's located right near the Han River, perfect for a post-visit stroll.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `A popular mid-sized concert hall (capacity ~2,000) for growing artists.` } }, { title: { en: `Access` }, text: { en: `You can visit the exterior plaza anytime.` } }, { title: { en: `How to get there` }, text: { en: `Gwangnaru Station (Line 5), exit 2.` } } ] },

    { id: 60, name: "Olympic Hall", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2014", episodeLink: "https://en.wikipedia.org/wiki/List_of_BTS_live_performances", address: "424 Olympic-ro, Songpa-gu", lat: 37.5205, lng: 127.1215, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Olympic Hall was the site of the very first "MUSTER" in March 2014, the official fan meeting that cemented the bond between BTS and the newly named ARMY.</p><p>This venue represents the birth of BTS's unique fan-culture events, filled with early inside jokes and tearful speeches.</p>`,
        fr: `<p>L'Olympic Hall a accueilli le tout premier « MUSTER » en mars 2014, la rencontre fan officielle qui a scellé le lien entre BTS et l'ARMY, alors tout juste nommée.</p><p>Cette salle, nichée au cœur de l'immense complexe d'Olympic Park, symbolise la naissance des événements fan uniques de BTS, riches en blagues internes et en discours émouvants.</p>` },
      tipsList: [ { title: { en: `Explore Olympic Park` }, text: { en: `The park is huge and beautiful, great for renting a bike.` } }, { title: { en: `The plaza photo` }, text: { en: `Stand where the first ever Muster banners were hung.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `Located within the massive Olympic Park complex.` } }, { title: { en: `Access` }, text: { en: `Free to explore the park and venue exteriors.` } }, { title: { en: `How to get there` }, text: { en: `Olympic Park Station (Line 5 & 9).` } } ] },

    { id: 61, name: "SBS Prism Tower", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2015", ytId: "w9MAJ6gRwDU", episodeLink: "https://www.youtube.com/watch?v=w9MAJ6gRwDU", address: "82 Sangamsan-ro, Mapo-gu", lat: 37.5795, lng: 126.889, img: "https://img.youtube.com/vi/w9MAJ6gRwDU/hqdefault.jpg",
      fullDescription: { en: `<p>On May 5, 2015, BTS won their very first music show trophy for "I Need U" on SBS MTV's The Show at the Prism Tower. It was a turning point that saved the group.</p><p>The emotional footage of the members crying backstage was filmed right in the corridors of this building, making it a sacred site.</p>`,
        fr: `<p>Le 5 mai 2015, BTS a remporté son tout premier trophée d'émission musicale, pour « I Need U », sur The Show de SBS MTV à la Prism Tower — un tournant que beaucoup de fans considèrent comme ayant sauvé le groupe.</p><p>Les images émouvantes des membres pleurant en coulisses ont été filmées précisément dans les couloirs de ce bâtiment futuriste, en faisant un lieu presque sacré pour les fans de longue date.</p>` },
      tipsList: [ { title: { en: `The front plaza` }, text: { en: `The futuristic exterior makes for great architectural photos.` } }, { title: { en: `DMC Exploration` }, text: { en: `You can also see MBC and CJ E&M buildings right next door!` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `Broadcasting studio in the Digital Media City district.` } }, { title: { en: `Access` }, text: { en: `The plaza outside is public; inside is restricted to staff/audience.` } }, { title: { en: `How to get there` }, text: { en: `Digital Media City Station (Line 6).` } } ] },

    { id: 62, name: "KBS Yeouido Broadcast Center", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", episodeLink: "https://www.usbtsarmy.com/filmography/music-bank", address: "13 Yeouigongwon-ro, Yeongdeungpo-gu", lat: 37.5285, lng: 126.9195, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>During their rookie days, the walk from the vans to the KBS studio doors for Music Bank was a crucial way for BTS to get media attention, often wearing matching customized outfits.</p><p>Fans still visit the KBS steps where BTS used to greet reporters, representing the grind of their early promotion cycles.</p>`,
        fr: `<p>Pendant leurs débuts en tant que rookies, la marche des vans jusqu'aux portes du studio KBS pour Music Bank — leur toute première apparition, le 29 juin 2013 — était un moyen crucial pour BTS d'attirer l'attention des médias.</p><p>Les fans visitent encore les marches où les membres saluaient les journalistes, vêtus de tenues assorties qu'ils stylisaient eux-mêmes, un petit détail qui en dit long sur l'intensité de leurs débuts promotionnels.</p>` },
      tipsList: [ { title: { en: `The KBS Steps` }, text: { en: `Find the specific stairs leading to the entrance where press photos are taken.` } }, { title: { en: `Yeouido Park` }, text: { en: `Right across the street, where members sometimes filmed quick Vlogs.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `The site of the famous KBS Music Bank Friday morning arrivals.` } }, { title: { en: `Access` }, text: { en: `The exterior parking lot walk is legendary in K-pop.` } }, { title: { en: `How to get there` }, text: { en: `National Assembly Station (Line 9), exit 4.` } } ] },

    { id: 63, name: "Wolmido Island Theme Park", group: "BTS", member: "All", country: "South Korea", city: "Incheon", category: "Landmarks", year: "2013", ytId: "C7G-Kz93d5I", address: "81 Wolmimunhwa-ro, Jung-gu, Incheon", lat: 37.4735, lng: 126.5975, img: "https://img.youtube.com/vi/C7G-Kz93d5I/hqdefault.jpg",
      fullDescription: { en: `<p>In episode 7 of their very first reality show, Rookie King, a terrified J-Hope, Jimin and V were subjected to a penalty ride on Wolmido's infamous Viking ship.</p><p>The hilarious footage of the rookie members screaming on the retro rides of this slightly rusty seaside amusement park remains a classic piece of early fandom lore.</p>`,
        fr: `<p>Dans l'épisode 7 de leur toute première émission de télé-réalité, Rookie King, un J-Hope, un Jimin et un V terrifiés ont dû subir un gage sur le tristement célèbre bateau viking de Wolmido.</p><p>Les images hilarantes des membres rookies en train de hurler sur les manèges rétro de ce parc d'attractions balnéaire un peu rouillé restent un classique des débuts du fandom.</p>` },
      tip: { en: "Ride the Viking ship and sit in the back row like the members did, if you're brave enough.", fr: "Montez sur le bateau viking et asseyez-vous au dernier rang comme les membres, si vous êtes assez courageux." },
      directions: { en: "Take Subway Line 1 to Incheon Station, then a short bus or taxi ride to Wolmido; rides are paid individually, around 5,000 to 7,000 KRW each.", fr: "Prenez la ligne 1 du métro jusqu'à la station Incheon, puis un court trajet en bus ou en taxi jusqu'à Wolmido ; les manèges se paient individuellement, environ 5 000 à 7 000 KRW chacun." } },

    { id: 64, name: "Namsan Seoul Tower", group: "BTS", member: "V", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "2w2h_kF_qVE", address: "105 Namsangongwon-gil, Yongsan-gu", lat: 37.5512, lng: 126.9882, img: "https://img.youtube.com/vi/2w2h_kF_qVE/hqdefault.jpg",
      fullDescription: { en: `<p>For a penalty in an early episode of Rookie King, V had to dress up as a fairy ladybug and serve drinks to strangers at the base of Namsan Tower.</p><p>It's a hilarious piece of early BTS history, standing in sharp contrast with the group's current superstar status, and one of the best places in the city to watch the sunset over Seoul.</p>`,
        fr: `<p>Pour un gage dans un épisode de Rookie King, V a dû se déguiser en coccinelle féerique et servir des boissons à des inconnus au pied de la Namsan Tower.</p><p>C'est un moment hilarant de l'histoire des débuts de BTS, en contraste total avec le statut de superstars du groupe aujourd'hui, et l'un des meilleurs endroits de la ville pour admirer le coucher de soleil sur Séoul.</p>` },
      tip: { en: "Locate the exact viewing-deck spot where Taehyung stood with his penalty tray, then stay for sunset.", fr: "Repérez l'endroit exact du belvédère où Taehyung se tenait avec son plateau de gage, puis restez pour le coucher de soleil." },
      directions: { en: "Take the Namsan Cable Car or one of the yellow Namsan circular buses up the hill; the plaza is free, while the observatory deck costs around 16,000 KRW.", fr: "Prenez le téléphérique de Namsan ou l'un des bus circulaires jaunes de Namsan pour monter la colline ; l'esplanade est gratuite, tandis que l'accès à l'observatoire coûte environ 16 000 KRW." } },

    { id: 65, name: "Han River Park (Jamwon)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", ytId: "wtVKQDEZoF0", episodeLink: "https://www.youtube.com/watch?v=wtVKQDEZoF0", address: "Jamwon-dong, Seocho-gu", lat: 37.5185, lng: 127.013, img: "https://upload.wikimedia.org/wikipedia/commons/7/77/Hangang_Park_Jamwon.jpg",
      fullDescription: { en: `<p>The Jamwon section of the Han River was just a short distance from Big Hit's old Nonhyeon dorm. The members frequently escaped here late at night to skateboard, practice, or film early video logs.</p><p>It was by the Han River that RM recorded some of his most introspective early vlogs, talking about his anxieties before debuting.</p>`,
        fr: `<p>À quelques minutes du vieux dortoir de Big Hit à Nonhyeon, la section de Jamwon sur le fleuve Han est l'endroit où les membres s'échappaient souvent tard le soir pour faire du skate, s'entraîner ou filmer leurs premiers vlogs.</p><p>C'est le long de cette portion du fleuve que RM a enregistré certains de ses tout premiers vlogs les plus introspectifs, revenant sur ses angoisses à l'approche des débuts du groupe.</p>` },
      tipsList: [ { title: { en: `Eat Riverside Ramen` }, text: { en: `Use the automatic foil-bowl machines at the convenience store.` } }, { title: { en: `Rent a bike` }, text: { en: `Cycle along the river at sunset, just like RM often does.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Open 24/7, free. Excellent for biking or walking.` } }, { title: { en: `Food` }, text: { en: `Grabbing instant ramen from the riverside convenience stores is a must.` } }, { title: { en: `How to get there` }, text: { en: `Jamwon Station (Line 3) or Sinsa Station, then walk to the river.` } } ] },

    { id: 66, name: "Incheon Airport Terminal 1", group: "BTS", member: "All", country: "South Korea", city: "Incheon", category: "Landmarks", year: "2014", ytId: "EHt4d0X-vqY", episodeLink: "https://www.youtube.com/watch?v=EHt4d0X-vqY", address: "272 Gonghang-ro, Jung-gu, Incheon", lat: 37.4492, lng: 126.4505, img: "https://img.youtube.com/vi/EHt4d0X-vqY/hqdefault.jpg",
      fullDescription: { en: `<p>In the summer of 2014, BTS arrived at Incheon Airport to film American Hustle Life in LA. They were famously tricked into thinking it was a relaxing vacation.</p><p>Their hilariously flashy rookie airport fashion, complete with heavy eyeliner and oversized hip-hop gear, remains legendary among fans.</p>`,
        fr: `<p>À l'été 2014, BTS a quitté l'aéroport d'Incheon pour tourner American Hustle Life à Los Angeles, persuadés à l'époque de partir simplement en vacances tranquilles.</p><p>Leur look d'aéroport de rookies, tout en eye-liner marqué et pièces hip-hop surdimensionnées, reste légendaire parmi les fans, qui retracent aujourd'hui toute l'évolution de leur « airport fashion » au fil de leur carrière.</p>` },
      tipsList: [ { title: { en: `The Departure Gates` }, text: { en: `Walk the same halls where thousands of press photos of BTS have been taken.` } }, { title: { en: `Watch AHL Ep 1 on the plane` }, text: { en: `A perfect way to kick off a BTS pilgrimage trip!` } } ],
      practicalInfo: [ { title: { en: `Context` }, text: { en: `The iconic departure gate where their "airport fashion" journey began.` } }, { title: { en: `Access` }, text: { en: `Open to the public before security checkpoints.` } }, { title: { en: `How to get there` }, text: { en: `AREX Train from Seoul Station.` } } ] },

    { id: 67, name: "Apgujeong Rodeo Street", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2013 - 2015", ytId: "mD0D00_90l0", address: "Apgujeong-dong, Gangnam-gu", lat: 37.527, lng: 127.04, img: "https://img.youtube.com/vi/mD0D00_90l0/hqdefault.jpg",
      fullDescription: { en: `<p>Before they could afford luxury brands, the BTS members used to window-shop along Apgujeong Rodeo Street, absorbing the fashion and streetwear culture of Gangnam.</p><p>J-Hope and RM in particular have mentioned coming here often to check out streetwear, an influence that shaped much of the group's early hip-hop styling.</p>`,
        fr: `<p>Avant de pouvoir s'offrir des marques de luxe, les membres de BTS faisaient du lèche-vitrines le long de la rue Apgujeong Rodeo, s'imprégnant de la culture mode et streetwear de Gangnam.</p><p>J-Hope et RM en particulier ont mentionné y venir souvent pour repérer du streetwear, une influence qui a beaucoup façonné le style hip-hop des débuts du groupe.</p>` },
      tip: { en: "Browse the modern boutiques that now line the side alleys — many trace back to the same streetwear scene the members once admired.", fr: "Parcourez les boutiques modernes qui bordent aujourd'hui les ruelles adjacentes — beaucoup s'inscrivent dans la même scène streetwear que les membres admiraient déjà." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station; the street stretches out directly from the station exits.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo ; la rue s'étend directement depuis les sorties de la station." } },

    { id: 68, name: "Ilsan Lake Park", group: "BTS", member: "Namjoon", country: "South Korea", city: "Goyang", category: "Landmarks", year: "2013 - 2014", episodeLink: "https://weverse.io/bts/media/1-6401255", address: "595 Hosu-ro, Ilsandong-gu, Goyang-si", lat: 37.6605, lng: 126.7715, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>As RM's hometown, Ilsan shaped his childhood and early songwriting. He frequently visited this lake park to write lyrics and reflect before moving to the Gangnam dorms.</p><p>Walking around Ilsan Lake Park gives fans a deep understanding of Namjoon's roots and the quiet nature he constantly seeks out.</p>`,
        fr: `<p>Ville natale de RM, Ilsan a marqué son enfance et ses débuts d'écriture, et il a souvent fréquenté ce parc au lac — l'un des plus grands lacs artificiels d'Asie — pour écrire ses textes et réfléchir avant de s'installer dans les dortoirs de Gangnam.</p><p>RM cite d'ailleurs directement ce parc dans les paroles de « Ma City » (2015), le préférant au fleuve Han pourtant plus célèbre — en parcourir les allées aujourd'hui offre un aperçu paisible de ses racines.</p>` },
      tipsList: [ { title: { en: `Find the musical fountains` }, text: { en: `A popular spot mentioned in his early memories.` } }, { title: { en: `Listen to 'Ma City'` }, text: { en: `The perfect soundtrack for walking around Goyang.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Free, massive park known as one of the largest artificial lakes in Asia.` } }, { title: { en: `Connection` }, text: { en: `Mentioned in the song "Ma City".` } }, { title: { en: `How to get there` }, text: { en: `Jeongbalsan Station (Line 3), exit 2.` } } ] },

    { id: 69, name: "Dongjak Bridge", group: "BTS", member: "V", country: "South Korea", city: "Seoul", category: "Fashion", year: "2015", address: "Dongjak Bridge", lat: 37.5085, lng: 126.972, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Officially featured later in the Love Yourself era highlight reels, Dongjak Bridge was already a frequent backdrop for early Big Hit visual tests and vlogs.</p><p>The bridge's striking blue architecture and train tracks running down its middle create a cinematic, nostalgic atmosphere deeply tied to the HYYH era's visual identity.</p>`,
        fr: `<p>Mise en avant plus tard dans les images de l'ère Love Yourself, la passerelle de Dongjak servait déjà de décor récurrent pour les premiers essais visuels et vlogs de Big Hit.</p><p>L'architecture bleue frappante du pont et les voies ferrées qui le traversent en son centre créent une atmosphère cinématographique et nostalgique, étroitement liée à l'identité visuelle de l'ère HYYH.</p>` },
      tip: { en: "Visit in the late afternoon — the light here at sunset is unbeatable for photography.", fr: "Venez en fin d'après-midi — la lumière du coucher de soleil y est idéale pour la photographie." },
      directions: { en: "Take Line 4 or 9 to Dongjak Station; the bridge's observatory cafés on the towers are also worth a stop.", fr: "Prenez la ligne 4 ou 9 jusqu'à la station Dongjak ; les cafés-belvédères installés sur les tours du pont valent aussi le détour." } },

    { id: 70, name: "Second BTS Dormitory", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2015 - 2017", ytId: "nbRKyymm4Eg", episodeLink: "https://www.youtube.com/watch?v=nbRKyymm4Eg", address: "Nonhyeon-dong, Gangnam-gu", lat: 37.515, lng: 127.033, img: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Seoul_residential_street.jpg",
      fullDescription: { en: `<p>Moving into this slightly larger dorm in 2015 marked the beginning of their most critical era. They finally had a bit more space as "I Need U" skyrocketed them to fame.</p><p>This dorm was featured in the 2015 Festa broadcasts, showing a chaotic but happier environment as they began winning awards.</p>`,
        fr: `<p>Emménager dans ce dortoir légèrement plus grand en 2015 a marqué le début de l'ère la plus décisive de BTS, alors que « I Need U » propulsait la popularité du groupe.</p><p>Ce dortoir apparaît dans les diffusions Festa de 2015, montrant un foyer chaotique mais visiblement plus heureux, tandis que les membres commençaient à remporter leurs premiers trophées d'émissions musicales.</p>` },
      tipsList: [ { title: { en: `Respect privacy` }, text: { en: `Remember this is just neighborhood history now.` } }, { title: { en: `Explore Nonhyeon` }, text: { en: `The streets here are filled with small eateries they likely visited.` } } ],
      practicalInfo: [ { title: { en: `Important Notice` }, text: { en: `Private residence. Location is famous for being their "breakthrough" era dorm.` } }, { title: { en: `Vibe` }, text: { en: `A slight upgrade from the cramped first dorm, representing their rising success.` } }, { title: { en: `How to get there` }, text: { en: `Nonhyeon area.` } } ] },

    { id: 71, name: "CJ ENM Center (M Countdown)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2013", ytId: "ssnsKGHT7sE", episodeLink: "https://www.youtube.com/watch?v=ssnsKGHT7sE", address: "66 Sangamsan-ro, Mapo-gu", lat: 37.58, lng: 126.8875, img: "https://upload.wikimedia.org/wikipedia/commons/e/e6/CJ_E%26M_Center.jpg",
      fullDescription: { en: `<p>On June 13, 2013, BTS stepped onto the M Countdown stage inside this very building to perform "No More Dream" for their first-ever live television broadcast. This date is officially celebrated as their debut anniversary.</p><p>While you can't easily enter the filming studios, walking into the main lobby of the CJ ENM Center allows you to trace the exact steps the nervous rookies took on their way to their very first dressing room.</p>`,
        fr: `<p>Le 13 juin 2013, BTS est monté sur la scène de M Countdown à l'intérieur de ce bâtiment pour interpréter « No More Dream » lors de sa toute première diffusion télévisée en direct — une date désormais célébrée comme l'anniversaire officiel de leurs débuts.</p><p>Si les studios de tournage restent inaccessibles, entrer dans le hall principal du CJ ENM Center permet aux fans de suivre exactement le trajet des jeunes rookies nerveux vers leur toute première loge.</p>` },
      tipsList: [ { title: { en: `The First Floor Cafe` }, text: { en: `Grab a coffee in the lobby cafe where artists and staff frequently mingle before Thursday broadcasts.` } }, { title: { en: `Explore DMC` }, text: { en: `Digital Media City is the hub of Korean broadcasting; it's a great area to see modern Seoul architecture.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `The headquarters of Mnet and the filming location of M Countdown.` } }, { title: { en: `Access` }, text: { en: `The first-floor lobby is open to the public, but studio access requires a broadcasting ticket.` } }, { title: { en: `How to get there` }, text: { en: `Digital Media City Station (Line 6, AREX, Gyeongui-Jungang), exit 9.` } } ] },

    { id: 72, name: "Hongdae Playground", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", address: "19-3 Wausan-ro 21-gil, Mapo-gu", lat: 37.5535, lng: 126.9235, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>During their American Hustle Life training, the members were tasked with handing out flyers and busking from scratch to learn how to engage a crowd — a mission they carried out right at this small Hongdae playground.</p><p>Watching global superstars awkwardly try to convince passers-by to stop and watch is humbling in hindsight, and the playground remains a symbol of grassroots Korean music culture to this day.</p>`,
        fr: `<p>Pendant leur entraînement pour American Hustle Life, les membres ont dû distribuer des flyers et se produire dans la rue depuis zéro pour apprendre à capter une foule — une mission menée précisément dans ce petit terrain de jeux de Hongdae.</p><p>Voir des superstars mondiales tenter maladroitement de convaincre des passants de s'arrêter est un moment d'humilité rétrospective, et ce terrain de jeux reste aujourd'hui un symbole de la culture musicale coréenne underground.</p>` },
      tip: { en: "Visit on a Friday or Saturday night to watch the current generation of young dancers cover BTS songs right where they once stood.", fr: "Venez un vendredi ou samedi soir pour voir la génération actuelle de jeunes danseurs reprendre des chansons de BTS, à l'endroit même où ils se sont produits." },
      directions: { en: "Take Line 2 to Hongik University Station (Exit 9) and walk about 10 minutes toward the university.", fr: "Prenez la ligne 2 jusqu'à la station Hongik University (sortie 9) et marchez environ 10 minutes en direction de l'université." } },

    { id: 73, name: "Namsangol Hanok Village", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "2w2h_kF_qVE", address: "28 Toegye-ro 34-gil, Jung-gu", lat: 37.5595, lng: 126.994, img: "https://img.youtube.com/vi/2w2h_kF_qVE/hqdefault.jpg",
      fullDescription: { en: `<p>For their first Chuseok (Korean Thanksgiving) after debuting, BTS filmed a special episode of Rookie King at this restored traditional village, wearing hanboks and playing chaotic traditional games.</p><p>The location blends BTS history with Korean heritage: fans can walk through the exact courtyards where the members once wrestled and playfully argued over game rules, with Namsan Tower visible in the background.</p>`,
        fr: `<p>Pour leur premier Chuseok (fête des récoltes coréenne) après leurs débuts, BTS a tourné un épisode spécial de Rookie King dans ce village traditionnel restauré, en hanbok et au fil de jeux traditionnels chaotiques.</p><p>Ce lieu mêle histoire de BTS et patrimoine coréen : les fans peuvent traverser les cours exactes où les membres se sont livrés à des joutes de ssireum et ont chahuté sur les règles du jeu, avec la Namsan Tower en toile de fond.</p>` },
      tip: { en: "Find the main open dirt courtyard where the members set up their traditional wrestling (ssireum) ring.", fr: "Repérez la cour principale en terre battue où les membres avaient installé leur ring de lutte traditionnelle (ssireum)." },
      directions: { en: "Take Line 3 or 4 to Chungmuro Station (Exit 3 or 4); admission to the village is completely free.", fr: "Prenez la ligne 3 ou 4 jusqu'à la station Chungmuro (sortie 3 ou 4) ; l'entrée du village est entièrement gratuite." } },

    { id: 74, name: "Sinchon Yonsei-ro", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2014", ytId: "WpDa_xPvnKY", address: "Yonsei-ro, Seodaemun-gu", lat: 37.5555, lng: 126.937, img: "https://img.youtube.com/vi/WpDa_xPvnKY/hqdefault.jpg",
      fullDescription: { en: `<p>To promote their 'Skool Luv Affair' album in 2014, BTS held a guerilla fan meeting right in the middle of this pedestrian street, performing "Boy In Luv" on a tiny makeshift stage for just a few hundred fans.</p><p>It's surreal to stand on this busy university street today and realise that global superstars once performed here inches away from the crowd, trying to build their fandom one person at a time.</p>`,
        fr: `<p>Pour promouvoir leur album « Skool Luv Affair » en 2014, BTS a organisé une rencontre-guérilla en plein cœur de cette rue piétonne, interprétant « Boy In Luv » sur une minuscule scène improvisée devant quelques centaines de fans seulement.</p><p>C'est presque irréel de se tenir aujourd'hui sur cette rue universitaire animée en sachant que de futures superstars mondiales s'y sont produites à quelques centimètres du public, bâtissant leur fandom une personne à la fois.</p>` },
      tip: { en: "Look for the famous red periscope-shaped structure near the station exit, a popular meeting point close to where their stage once stood.", fr: "Repérez la célèbre structure rouge en forme de périscope près de la sortie de la station, un point de rendez-vous populaire proche de l'endroit où se tenait leur scène." },
      directions: { en: "Take Line 2 to Sinchon Station (Exit 2 or 3); the street connects to Ewha and Yonsei universities, great for cheap eats and student culture.", fr: "Prenez la ligne 2 jusqu'à la station Sinchon (sortie 2 ou 3) ; la rue relie les universités Ewha et Yonsei, idéale pour manger pas cher et découvrir la culture étudiante." } },

    { id: 75, name: "Everland (Bungee Jump)", group: "BTS", member: "All", country: "South Korea", city: "Yongin", category: "Run BTS", year: "2015", episode: "Episode 9", ytId: "KrJfIKaXhY4", address: "199 Everland-ro, Pogok-eup, Cheoin-gu, Yongin-si", lat: 37.2945, lng: 127.202, img: "https://img.youtube.com/vi/KrJfIKaXhY4/hqdefault.jpg",
      fullDescription: { en: `<p>In a legendary early episode of Run BTS!, the members went to Everland to face their fears by bungee jumping — the episode is famous for J-Hope's tearful hesitation and Jungkook's fearless, smiling leap.</p><p>South Korea's largest theme park offers a full day of rides and attractions, but for ARMY, walking past the bungee jump tower brings back the hilarious memory of the members screaming the group's name before taking the plunge.</p>`,
        fr: `<p>Dans un épisode légendaire des débuts de Run BTS!, les membres se sont rendus à Everland pour affronter leurs peurs en sautant à l'élastique — épisode resté célèbre pour l'hésitation larmoyante de J-Hope et le saut souriant et sans peur de Jungkook.</p><p>Le plus grand parc à thème de Corée du Sud offre une journée entière de manèges et d'attractions, mais pour l'ARMY, passer devant la tour de saut à l'élastique rappelle le souvenir hilarant des membres criant le nom du groupe avant de sauter.</p>` },
      tip: { en: "After the bungee tower, ride the T-Express — one of the steepest wooden rollercoasters in the world.", fr: "Après la tour de saut à l'élastique, montez dans le T-Express — l'un des grands huit en bois les plus vertigineux au monde." },
      directions: { en: "Take the Everline light rail to Jeondae-Everland Station, then the free shuttle bus; a full day pass runs around 50,000-60,000 KRW depending on the season.", fr: "Prenez le train léger Everline jusqu'à la station Jeondae-Everland, puis la navette gratuite ; un pass journée coûte environ 50 000 à 60 000 KRW selon la saison." } },

    { id: 76, name: "Yeouido Hangang Park", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", ytId: "wKjxFyfcClw", address: "330 Yeouidong-ro, Yeongdeungpo-gu", lat: 37.5285, lng: 126.933, img: "https://img.youtube.com/vi/wKjxFyfcClw/hqdefault.jpg",
      fullDescription: { en: `<p>To celebrate their very first anniversary in 2014, the members filmed a wholesome video having a small, budget-friendly picnic on the grass of Yeouido Hangang Park, reflecting on their rookie year.</p><p>The park became a cornerstone of BTS history again in 2023, when RM hosted the massive 10th-anniversary Festa festival here — making it a full-circle location for the fandom.</p>`,
        fr: `<p>Pour célébrer leur tout premier anniversaire en 2014, les membres ont filmé une vidéo pleine de charme d'un pique-nique modeste sur l'herbe du parc de Yeouido, revenant sur leur première année de carrière.</p><p>Le parc est redevenu une pierre angulaire de l'histoire de BTS en 2023, lorsque RM y a organisé l'immense festival Festa du 10e anniversaire — un lieu à la boucle bouclée pour le fandom.</p>` },
      tip: { en: "Order delivery fried chicken straight to your picnic mat in the park, just as the members did and as locals still do today.", fr: "Faites-vous livrer du poulet frit directement sur votre tapis de pique-nique dans le parc, comme les membres à l'époque et comme le font encore les habitants aujourd'hui." },
      directions: { en: "Take Line 5 to Yeouinaru Station (Exit 2 or 3); picnic mats and small tables can be rented from vendors near the exits for about 5,000 KRW.", fr: "Prenez la ligne 5 jusqu'à la station Yeouinaru (sortie 2 ou 3) ; des tapis et petites tables de pique-nique se louent auprès de vendeurs près des sorties, pour environ 5 000 KRW." } },

    { id: 77, name: "Children's Grand Park", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "mD0D00_90l0", address: "216 Neungdong-ro, Gwangjin-gu", lat: 37.5485, lng: 127.0745, img: "https://img.youtube.com/vi/mD0D00_90l0/hqdefault.jpg",
      fullDescription: { en: `<p>Before their schedules became overwhelmingly packed, the members visited this large ecological park, relatively close to their early practice studios, posting several early Twitter selfies enjoying its cherry blossoms.</p><p>It's a nostalgic, family-friendly location that contrasts sharply with the intense hip-hop image the group tried to project during their debut era, and the park is especially beautiful in spring.</p>`,
        fr: `<p>Avant que leur emploi du temps ne devienne écrasant, les membres fréquentaient ce vaste parc écologique, relativement proche de leurs premiers studios de répétition, publiant plusieurs selfies sur Twitter au milieu des cerisiers en fleurs.</p><p>C'est un lieu nostalgique et familial qui tranche nettement avec l'image hip-hop intense que le groupe cherchait à projeter à ses débuts, et le parc est particulièrement beau au printemps.</p>` },
      tip: { en: "Visit in early April for one of the best and least crowded cherry blossom spots in Seoul.", fr: "Venez début avril pour l'un des plus beaux spots de cerisiers en fleurs de Séoul, et l'un des moins fréquentés." },
      directions: { en: "Take Line 7 to Children's Grand Park Station (Exit 1); admission to the park itself is completely free, only the rides require tickets.", fr: "Prenez la ligne 7 jusqu'à la station Children's Grand Park (sortie 1) ; l'entrée du parc est entièrement gratuite, seuls les manèges nécessitent un billet." } },

    { id: 78, name: "KBS Radio Studios (Yeouido)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", ytId: "kPhzLuV47Yk", address: "13 Yeouigongwon-ro, Yeongdeungpo-gu", lat: 37.5288, lng: 126.9198, img: "https://img.youtube.com/vi/kPhzLuV47Yk/hqdefault.jpg",
      fullDescription: { en: `<p>During their rookie years, BTS frequently guested on late-night radio shows to build their public profile, and their chaotic, hilarious appearances on 'Sukira' (Kiss The Radio) are legendary among early fans.</p><p>The KBS Open Radio Studio lets fans stand outside and watch broadcasts through a glass window, a quiet reminder of the late nights the rookies spent promoting themselves until 2am.</p>`,
        fr: `<p>Pendant leurs années de rookies, BTS était souvent invité à des émissions de radio tardives pour se faire connaître, et leurs passages chaotiques et hilarants à « Sukira » (Kiss The Radio) sont légendaires parmi les fans de la première heure.</p><p>Le studio radio ouvert de KBS permet aux fans de se tenir dehors et de regarder les émissions à travers une vitre, un rappel discret des soirées tardives que les rookies passaient à faire leur promotion jusqu'à 2h du matin.</p>` },
      tip: { en: "Find the 'Cool FM' open studio on the ground floor facing the street, and try a late-night visit for the quiet broadcasting atmosphere.", fr: "Repérez le studio ouvert « Cool FM » au rez-de-chaussée donnant sur la rue, et tentez une visite nocturne pour ressentir l'ambiance tranquille des émissions tardives." },
      directions: { en: "Take Line 9 to National Assembly Station (Exit 4); the studio windows are visible from the public street at any hour.", fr: "Prenez la ligne 9 jusqu'à la station National Assembly (sortie 4) ; les vitres du studio sont visibles depuis la rue publique à toute heure." } },

    { id: 79, name: "COEX Mall (Bandi & Luni's)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", ytId: "MBvunpC8Yw4", address: "513 Yeongdong-daero, Gangnam-gu", lat: 37.5115, lng: 127.0595, img: "https://img.youtube.com/vi/MBvunpC8Yw4/hqdefault.jpg",
      fullDescription: { en: `<p>In their first two years, BTS held multiple public fan sign events at the large bookstores inside COEX Mall — early interactions that were crucial in building their famously dedicated core fandom.</p><p>You can no longer attend a BTS fan sign in a public mall, but walking through Asia's largest underground shopping mall today is still a reminder of their slow, steady climb to the top.</p>`,
        fr: `<p>Lors de leurs deux premières années, BTS a organisé plusieurs séances de dédicaces publiques dans les grandes librairies du centre commercial COEX — des interactions cruciales dans la construction de leur noyau de fans si dévoué.</p><p>On ne peut plus assister à une dédicace de BTS dans un centre commercial public, mais parcourir aujourd'hui le plus grand centre commercial souterrain d'Asie rappelle encore leur ascension lente et méthodique vers le sommet.</p>` },
      tip: { en: "Don't miss the Starfield Library at the centre of COEX — built after their rookie days, but a must-see all the same.", fr: "Ne manquez pas la Starfield Library au centre du COEX — construite après leurs débuts, mais incontournable tout de même." },
      directions: { en: "Take Line 2 to Samseong Station (Exit 5 or 6); the specific bookstore has since closed, but the COEX complex itself remains a major landmark.", fr: "Prenez la ligne 2 jusqu'à la station Samseong (sortie 5 ou 6) ; la librairie en question a depuis fermé, mais le complexe COEX reste un lieu incontournable." } },

    { id: 80, name: "Old Big Hit 2nd Office (Hakdong-ro)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2016 - 2017", ytId: "N5K-g6i1t34", episodeLink: "https://www.youtube.com/watch?v=N5K-g6i1t34", address: "5-30 Hakdong-ro 30-gil, Gangnam-gu", lat: 37.514, lng: 127.032, img: "https://upload.wikimedia.org/wikipedia/commons/0/05/Gangnam_street_view.jpg",
      fullDescription: { en: `<p>Though slightly past the 2015 mark, this second agency building represents the direct result of their early struggles. They moved here right around the explosive success of the *Wings* era.</p><p>Many of their most famous chaotic V Live broadcasts (like Jin's 'Eat Jin' sessions) were filmed in the small practice rooms of this specific building before they moved to their massive Yongsan headquarters.</p>`,
        fr: `<p>Un peu après leurs débuts de rookies, ce deuxième bâtiment de l'agence est le résultat direct des premières années de lutte de BTS : le groupe y a emménagé au moment même de l'explosion de succès de l'ère Wings.</p><p>Bon nombre de leurs V Live les plus mémorables, dont les sessions « Eat Jin » de Jin, ont été filmés dans les petites salles de répétition de ce bâtiment précis, avant le déménagement vers leur bien plus vaste siège de Yongsan.</p>` },
      tipsList: [ { title: { en: `The V Live Vibe` }, text: { en: `Look at the exterior and remember the countless hours of live streams broadcasted from those windows.` } }, { title: { en: `The Evolution` }, text: { en: `Compare this building to the Cheonggu basement (BTS-012) to truly visualize their growth.` } } ],
      practicalInfo: [ { title: { en: `Important Notice` }, text: { en: `The building is no longer affiliated with Big Hit/HYBE. Do not enter the premises.` } }, { title: { en: `History` }, text: { en: `Their second major office, marking their transition from struggling rookies to top stars.` } }, { title: { en: `How to get there` }, text: { en: `Hakdong Station (Line 7), exit 3.` } } ] },

    { id: 81, name: "School of Performing Arts Seoul (SOPA)", group: "BTS", member: "Jungkook", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014 - 2017", ytId: "kT0BoKiNQns", episodeLink: "https://www.youtube.com/watch?v=kT0BoKiNQns", address: "147-1 Gung-dong, Guro-gu", lat: 37.4955, lng: 126.842, img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/School_of_Performing_Arts_Seoul.jpg",
      fullDescription: { en: `<p>In 2014, all six older members escorted a very young Jungkook to his high school entrance ceremony at SOPA, a famous arts high school recognizable by its bright yellow uniforms.</p><p>The heartwarming tradition continued three years later when all the members returned to attend his graduation. Fans often visit the exterior to remember the Golden Maknae's youth.</p>`,
        fr: `<p>En 2014, les six aînés du groupe ont accompagné un très jeune Jungkook à la cérémonie de rentrée de son lycée à SOPA, une célèbre école des arts du spectacle reconnaissable à ses uniformes jaune vif.</p><p>Cette tradition touchante s'est répétée trois ans plus tard, lorsque les membres sont revenus pour sa remise de diplôme, et les fans visitent souvent l'extérieur en souvenir de la jeunesse du « Golden Maknae ».</p>` },
      tipsList: [ { title: { en: `Respect the Students` }, text: { en: `Take a quick photo of the entrance gate from a distance and move on.` } }, { title: { en: `Eat Jajangmyeon` }, text: { en: `After visiting, eat at a local Chinese restaurant to recreate the members' celebratory graduation meal.` } } ],
      practicalInfo: [ { title: { en: `Important Notice` }, text: { en: `This is an active high school. Do not enter the campus or disturb the students.` } }, { title: { en: `Photo opportunities` }, text: { en: `The iconic yellow school gates are visible from the street.` } }, { title: { en: `How to get there` }, text: { en: `Onsu Station (Lines 1 and 7).` } } ] },

    { id: 82, name: "YES24 MUV Hall", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Concerts", year: "2015", ytId: "gCOw09Xy4i0", address: "Seogyo-dong, Mapo-gu", lat: 37.5525, lng: 126.9215, img: "https://img.youtube.com/vi/gCOw09Xy4i0/hqdefault.jpg",
      fullDescription: { en: `<p>In 2015, RM (then Rap Monster) performed tracks from his very first self-titled solo mixtape at an underground hip-hop showcase called All Force One inside this small Hongdae venue.</p><p>This gritty little hall captures the raw hip-hop roots of BTS's leader well before pop superstardom, with J-Hope and Suga in attendance to support him on stage.</p>`,
        fr: `<p>En 2015, RM (alors Rap Monster) a interprété des titres de sa toute première mixtape solo éponyme lors d'un showcase hip-hop underground baptisé All Force One, dans cette petite salle de Hongdae.</p><p>Cette salle brute capture les racines hip-hop authentiques du leader de BTS, bien avant la superstardom pop, avec J-Hope et Suga présents sur scène pour le soutenir.</p>` },
      tip: { en: "Check the venue's current listings — it still hosts indie and hip-hop shows if you want to experience the underground vibe firsthand.", fr: "Consultez la programmation actuelle de la salle — elle accueille encore des concerts indie et hip-hop pour vivre l'ambiance underground de l'intérieur." },
      directions: { en: "Take Line 2 to Hongik University Station or Line 6 to Sangsu Station; the venue has since changed name and management but remains a live-music hub.", fr: "Prenez la ligne 2 jusqu'à la station Hongik University ou la ligne 6 jusqu'à Sangsu ; la salle a changé de nom et de gestion depuis, mais reste un lieu de concerts vivant." } },

    { id: 83, name: "Dongdaemun Design Plaza (DDP)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2014", ytId: "KzXgZ_kR74Y", address: "281 Eulji-ro, Jung-gu", lat: 37.5665, lng: 127.0095, img: "https://img.youtube.com/vi/KzXgZ_kR74Y/hqdefault.jpg",
      fullDescription: { en: `<p>During the Dark & Wild era in 2014, BTS made one of their first major fashion appearances at Seoul Fashion Week, held at this Zaha Hadid-designed landmark — their edgy, all-black leather rookie styling still gets praise from fans today.</p><p>The building's stunning metallic curves make it feel like a spaceship; walking the wide silver staircases where the young members once nervously posed for the press is a great way to combine architecture and BTS history.</p>`,
        fr: `<p>Pendant l'ère Dark & Wild en 2014, BTS a fait l'une de ses premières apparitions mode majeures à la Seoul Fashion Week, organisée dans ce monument signé Zaha Hadid — leur style de rookies tout en cuir noir reste encore aujourd'hui salué par les fans.</p><p>Les courbes métalliques spectaculaires du bâtiment lui donnent des airs de vaisseau spatial ; parcourir les larges escaliers argentés où les jeunes membres posaient nerveusement devant la presse permet d'allier architecture et histoire de BTS.</p>` },
      tip: { en: "Visit at night, when DDP is fully illuminated and looks its most striking.", fr: "Venez de nuit, quand le DDP est entièrement illuminé et à son plus spectaculaire." },
      directions: { en: "Take Line 2, 4 or 5 to Dongdaemun History & Culture Park Station; walking the exterior and basic halls is free, exhibitions are ticketed.", fr: "Prenez la ligne 2, 4 ou 5 jusqu'à la station Dongdaemun History & Culture Park ; l'extérieur et les halls de base sont gratuits, les expositions sont payantes." } },

    { id: 84, name: "Itaewon Antique Furniture Street", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2014", ytId: "C7G-Kz93d5I", address: "Bogwang-ro, Yongsan-gu", lat: 37.534, lng: 126.9945, img: "https://img.youtube.com/vi/C7G-Kz93d5I/hqdefault.jpg",
      fullDescription: { en: `<p>To capture the rebellious, slightly vintage and grungy vibe of their first full-length album Dark & Wild, BTS shot several concept photos along the alleys of this antique furniture street in Itaewon.</p><p>The brick walls and vintage storefronts provided the perfect backdrop for their bad-boy concept, and the street remains largely unchanged, making it easy to spot the same textures from the album's photo book.</p>`,
        fr: `<p>Pour capturer l'ambiance rebelle et légèrement vintage de leur premier album complet Dark & Wild, BTS a réalisé plusieurs photos concept dans les ruelles de cette rue d'antiquaires du quartier d'Itaewon.</p><p>Les murs en briques et les devantures vintage offraient le décor parfait pour ce concept « mauvais garçon », et la rue a peu changé depuis, ce qui permet de retrouver facilement les mêmes textures que dans le livret photo de l'album.</p>` },
      tip: { en: "This area is fantastic for moody, vintage-style street photography of your own.", fr: "Ce quartier se prête magnifiquement à la photographie de rue vintage et atmosphérique." },
      directions: { en: "Take Line 6 to Itaewon Station (Exit 3 or 4); the street is public and free to walk, with the main Itaewon district just beyond for a bite to eat.", fr: "Prenez la ligne 6 jusqu'à la station Itaewon (sortie 3 ou 4) ; la rue est publique et libre d'accès, avec le quartier principal d'Itaewon juste à côté pour manger un morceau." } },

    { id: 85, name: "Banpo Hangang Park", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", ytId: "2w2h_kF_qVE", address: "40 Sinbanpo-ro 11-gil, Seocho-gu", lat: 37.5125, lng: 126.997, img: "https://img.youtube.com/vi/2w2h_kF_qVE/hqdefault.jpg",
      fullDescription: { en: `<p>In several early vlogs and late-night social posts, the members visited the Banpo section of the Han River, a common spot to reflect on their trainee days and the pressure of upcoming album releases.</p><p>The Banpo Bridge, famous for its water-and-light Moonlight Rainbow Fountain show, is a staple of Seoul youth culture, and sitting by the river here connects fans to those quiet nights the members once spent seeking comfort by the water.</p>`,
        fr: `<p>Dans plusieurs vlogs et publications tardives, les membres ont visité la section de Banpo sur le fleuve Han, un endroit habituel pour réfléchir à leurs années de stagiaires et à la pression des sorties d'albums à venir.</p><p>Le pont de Banpo, célèbre pour son spectacle de la fontaine arc-en-ciel au clair de lune, est un incontournable de la culture jeune de Séoul, et s'asseoir au bord du fleuve ici relie les fans à ces soirées calmes où les membres cherchaient du réconfort près de l'eau.</p>` },
      tip: { en: "Come in the evening to watch the bridge light up and spray water in time with music.", fr: "Venez en soirée pour voir le pont s'illuminer et projeter de l'eau en rythme avec la musique." },
      directions: { en: "Take Line 3, 7 or 9 to Express Bus Terminal Station (Exit 8-1); the glowing artificial Some Sevit islands sit right next to the park.", fr: "Prenez la ligne 3, 7 ou 9 jusqu'à la station Express Bus Terminal (sortie 8-1) ; les îles artificielles lumineuses de Some Sevit se trouvent juste à côté du parc." } },

    { id: 86, name: "CGV Cheongdam Cine City", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "WpDa_xPvnKY", address: "323 Dosan-daero, Gangnam-gu", lat: 37.5245, lng: 127.043, img: "https://img.youtube.com/vi/WpDa_xPvnKY/hqdefault.jpg",
      fullDescription: { en: `<p>In their early vlogs and tweets, RM and Jin frequently mentioned going on movie dates to clear their minds from training, and because this cinema sat close to their old Big Hit dorm, it became their go-to theatre.</p><p>Catching a late-night movie in this specific multiplex is a fun way to experience the mundane but cherished downtime the young trainees once enjoyed after long hours of dance practice.</p>`,
        fr: `<p>Dans leurs premiers vlogs et tweets, RM et Jin mentionnaient souvent des sorties cinéma pour souffler entre deux entraînements, et comme cette salle se trouvait près de leur vieux dortoir Big Hit, elle est devenue leur cinéma de prédilection.</p><p>Aller voir un film tard le soir dans ce multiplexe précis est une façon amusante de retrouver ces moments de détente modestes mais précieux que les jeunes trainees s'accordaient après de longues heures de répétition.</p>` },
      tip: { en: "Catch a midnight screening to match the schedule they used to keep after evening dance practice.", fr: "Optez pour une séance de minuit, comme celles qu'ils enchaînaient après leurs répétitions de danse en soirée." },
      directions: { en: "Reachable from Apgujeong Rodeo Station or Gangnam-gu Office Station; the surrounding Dosan-daero street is lined with luxury brands and trendy cafés.", fr: "Accessible depuis la station Apgujeong Rodeo ou Gangnam-gu Office ; la rue Dosan-daero alentour est bordée de marques de luxe et de cafés branchés." } },

    { id: 87, name: "Naksan Park", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "kPhzLuV47Yk", address: "41 Naksan-gil, Jongno-gu", lat: 37.5805, lng: 127.0075, img: "https://img.youtube.com/vi/kPhzLuV47Yk/hqdefault.jpg",
      fullDescription: { en: `<p>Naksan Park was a favourite escape for the members when they needed a break from the claustrophobia of their basement practice rooms, and RM specifically filmed early vlogs discussing his walks along the old city walls here.</p><p>The contrast between the ancient stone fortress walls and the glowing modern city below mirrors the contemplative tone of RM's early lyrics, making it a fittingly reflective stop for any fan retracing his roots.</p>`,
        fr: `<p>Naksan Park était une échappée belle pour les membres lorsqu'ils avaient besoin de sortir de leurs salles de répétition en sous-sol, et RM a notamment filmé de premiers vlogs évoquant ses balades le long des anciens remparts de la ville.</p><p>Le contraste entre les vieux remparts de pierre et la ville moderne scintillante en contrebas fait écho au ton contemplatif des premiers textes de RM, faisant de ce lieu une étape particulièrement introspective pour tout fan sur ses traces.</p>` },
      tip: { en: "Go after sunset for one of the most romantic night views in all of Seoul.", fr: "Venez après le coucher du soleil pour l'une des plus belles vues nocturnes de tout Séoul." },
      directions: { en: "Take Line 4 to Hyehwa Station, followed by a steep 15-minute uphill walk; the park is free and open 24/7.", fr: "Prenez la ligne 4 jusqu'à la station Hyehwa, puis comptez 15 minutes de montée assez raide ; le parc est gratuit et ouvert 24h/24." } },

    { id: 88, name: "Bongeunsa Temple", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", ytId: "mD0D00_90l0", address: "531 Bongeunsa-ro, Gangnam-gu", lat: 37.515, lng: 127.0585, img: "https://img.youtube.com/vi/mD0D00_90l0/hqdefault.jpg",
      fullDescription: { en: `<p>Located just a few subway stops from their old Gangnam practice rooms, RM used to visit this massive, peaceful Buddhist temple to find quiet in the middle of the chaotic city — one of the earliest examples of what fans now call "Namjooning."</p><p>The temple features a giant stone Buddha statue, and standing in its grounds while hearing the traffic of Gangnam right outside offers a genuinely meditative contrast.</p>`,
        fr: `<p>À quelques stations de métro seulement de leurs anciennes salles de répétition de Gangnam, RM avait pour habitude de venir dans cet immense temple bouddhiste paisible pour trouver le calme au cœur de la ville chaotique — l'un des tout premiers exemples de ce que les fans appellent aujourd'hui le « Namjooning ».</p><p>Le temple abrite une statue de Bouddha en pierre géante, et se tenir dans son enceinte tout en entendant la circulation de Gangnam juste à l'extérieur offre un contraste véritablement méditatif.</p>` },
      tip: { en: "You can actually book a short meditation session or tea time with monks at this temple.", fr: "Il est possible de réserver une courte séance de méditation ou un moment de thé avec les moines de ce temple." },
      directions: { en: "Take Line 9 to Bongeunsa Station (Exit 1); the temple sits directly across the street from the massive COEX Mall.", fr: "Prenez la ligne 9 jusqu'à la station Bongeunsa (sortie 1) ; le temple se trouve juste en face de l'immense centre commercial COEX." } },

    { id: 89, name: "Blue Square", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2014", ytId: "q6qO8L13fSc", episodeLink: "https://www.youtube.com/watch?v=q6qO8L13fSc", address: "294 Itaewon-ro, Yongsan-gu", lat: 37.5335, lng: 126.9995, img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Blue_Square_Seoul.jpg",
      fullDescription: { en: `<p>In August 2014, BTS held their official showcase for their first full-length album, Dark & Wild, at the Blue Square Samsung Card Hall. This marked a significant step up from their smaller debut venues.</p><p>Walking into the Blue Square complex today, fans can appreciate how much the group grew in just one year. The venue is also famous for its stunning Book Park, which is a great place to relax.</p>`,
        fr: `<p>En août 2014, BTS a donné son showcase officiel pour son premier album complet, Dark & Wild, au Blue Square Samsung Card Hall — un vrai pas en avant par rapport aux salles plus modestes de leurs débuts.</p><p>Entrer aujourd'hui dans le complexe Blue Square permet de mesurer à quel point le groupe a grandi en seulement un an ; le lieu est aussi connu pour son somptueux Book Park sur plusieurs étages, parfait pour se détendre.</p>` },
      tipsList: [ { title: { en: `Visit the Book Park` }, text: { en: `Don't miss the massive, multi-story bookstore inside the complex for incredible architectural photos.` } }, { title: { en: `Explore Itaewon` }, text: { en: `Hangangjin is right next to the trendy Hannam-dong and Itaewon districts.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `A major cultural complex in Itaewon featuring concert halls and a massive book park.` } }, { title: { en: `Access` }, text: { en: `The Book Park lounge and cafes are free to enter.` } }, { title: { en: `How to get there` }, text: { en: `Hangangjin Station (Line 6), exit 2 is directly connected to the venue.` } } ] },

    { id: 90, name: "Baekam Art Hall", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2014", ytId: "MBvunpC8Yw4", address: "113 Samseong-ro, Gangnam-gu", lat: 37.5135, lng: 127.0625, img: "https://img.youtube.com/vi/MBvunpC8Yw4/hqdefault.jpg",
      fullDescription: { en: `<p>Before Dark & Wild, BTS launched their breakthrough mini-album Skool Luv Affair (featuring "Boy In Luv") with a press and fan showcase at this intimate, roughly 400-seat theatre in February 2014.</p><p>The small size of this venue is a stark reminder of the group's rookie days — only a few hundred fans witnessed the first-ever live performance of "Boy In Luv" in this room.</p>`,
        fr: `<p>Avant Dark & Wild, BTS a lancé son mini-album décisif Skool Luv Affair (avec « Boy In Luv ») lors d'un showcase presse et fans dans ce théâtre intimiste d'environ 400 places, en février 2014.</p><p>La petite taille de cette salle rappelle avec force les débuts de rookies du groupe — seules quelques centaines de fans ont assisté à la toute première interprétation live de « Boy In Luv » dans cette pièce.</p>` },
      tip: { en: "Walk up the front steps where the members gave their press greetings on showcase day.", fr: "Montez les marches de l'entrée, là où les membres saluaient la presse le jour du showcase." },
      directions: { en: "Take Line 2 to Samseong Station (Exit 8); interior access requires an event ticket, but the exterior is worth seeing — it's very close to COEX Mall.", fr: "Prenez la ligne 2 jusqu'à la station Samseong (sortie 8) ; l'accès à l'intérieur nécessite un billet pour un événement, mais l'extérieur vaut le coup d'œil — tout près du centre commercial COEX." } },

    { id: 91, name: "Korea University Hwajeong Gym", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2016", ytId: "KzXgZ_kR74Y", episodeLink: "https://www.youtube.com/watch?v=KzXgZ_kR74Y", address: "145 Anam-ro, Seongbuk-gu", lat: 37.5895, lng: 127.0325, img: "https://upload.wikimedia.org/wikipedia/commons/9/91/Korea_University_campus.jpg",
      fullDescription: { en: `<p>Though taking place slightly later in early 2016, the 2nd MUSTER represents the culmination of their rookie era struggles. Held at Hwajeong Gymnasium, it was a deeply emotional fan meeting where they reflected on their first music show wins.</p><p>The steep walk up to the gymnasium is legendary among K-pop fans. The campus itself is beautiful and features classic, European-style university architecture.</p>`,
        fr: `<p>Organisé début 2016 dans cette arène universitaire d'environ 8 000 places, le 2e MUSTER (rencontre fan officielle) symbolise l'aboutissement des années difficiles de BTS en tant que rookies — un événement profondément émouvant où le groupe est revenu sur ses premières victoires en émission musicale.</p><p>La montée abrupte jusqu'au gymnase, à travers le campus classique de style européen de l'Université Korea, est presque légendaire parmi les fans de K-pop qui font ce pèlerinage.</p>` },
      tipsList: [ { title: { en: `The Uphill Hike` }, text: { en: `Be prepared for a genuine workout to reach the gym from the subway station.` } }, { title: { en: `Campus Photography` }, text: { en: `The main stone buildings of Korea University look like a scene out of Harry Potter.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `A university sports arena seating around 8,000 people.` } }, { title: { en: `Access` }, text: { en: `The campus is open to the public, though the gym itself is only open for events.` } }, { title: { en: `How to get there` }, text: { en: `Anam Station (Line 6), then a steep uphill walk through the campus.` } } ] },

    { id: 92, name: "Garosu-gil", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "p_Oq-ecwVGY", address: "Sinsa-dong, Gangnam-gu", lat: 37.5205, lng: 127.023, img: "https://img.youtube.com/vi/p_Oq-ecwVGY/hqdefault.jpg",
      fullDescription: { en: `<p>In the early episodes of Rookie King, the BTS members were sent to this famous tree-lined shopping street to conduct awkward street interviews with the public and hand out promotional flyers for their show.</p><p>Walking down this stylish street today, it's hard not to smile imagining the now-untouchable global stars running up to random shoppers asking if they'd heard of BTS.</p>`,
        fr: `<p>Dans les premiers épisodes de Rookie King, les membres de BTS avaient été envoyés dans cette célèbre rue commerçante bordée d'arbres pour mener des interviews maladroites auprès du public et distribuer des flyers pour promouvoir leur émission.</p><p>En parcourant aujourd'hui cette rue élégante, difficile de ne pas sourire en imaginant les stars mondiales désormais inaccessibles courir vers des passants au hasard pour leur demander s'ils connaissaient BTS.</p>` },
      tip: { en: "Duck into the side alleys (Serosu-gil) for some of the best cafés and bakeries in Seoul.", fr: "Glissez-vous dans les ruelles adjacentes (Serosu-gil) pour découvrir certains des meilleurs cafés et boulangeries de Séoul." },
      directions: { en: "Take Line 3 to Sinsa Station (Exit 8); the street stretches out from there, lined with flagship stores and boutiques.", fr: "Prenez la ligne 3 jusqu'à la station Sinsa (sortie 8) ; la rue s'étend à partir de là, bordée de boutiques et de magasins phares." } },

    { id: 93, name: "Myeongdong Shopping Street", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "C7G-Kz93d5I", address: "Myeongdong, Jung-gu", lat: 37.5636, lng: 126.9834, img: "https://img.youtube.com/vi/C7G-Kz93d5I/hqdefault.jpg",
      fullDescription: { en: `<p>Just like in Gangnam and Hongdae, the pre-debut and rookie members often took to the crowded streets of Myeongdong to promote their group, hand out flyers, and practise engaging with crowds of strangers.</p><p>Myeongdong is loud, chaotic and vibrant — navigating its sea of tourists and street-food carts gives a real sense of the overwhelming environment the young members had to conquer to get noticed.</p>`,
        fr: `<p>Comme à Gangnam et Hongdae, les membres, avant leurs débuts puis en tant que rookies, arpentaient souvent les rues bondées de Myeongdong pour faire la promotion du groupe, distribuer des flyers et s'entraîner à interpeller des inconnus.</p><p>Myeongdong est bruyant, chaotique et vibrant — se frayer un chemin parmi la marée de touristes et les stands de street food donne une vraie idée de l'environnement écrasant que les jeunes membres ont dû apprivoiser pour se faire remarquer.</p>` },
      tip: { en: "Try the famous Myeongdong street food, like egg bread (gyeran-ppang) and hotteok.", fr: "Goûtez la street food emblématique de Myeongdong, comme le pain à l'œuf (gyeran-ppang) et le hotteok." },
      directions: { en: "Take Line 4 to Myeongdong Station (Exit 6 or 7); the whole district is pedestrian and easy to explore on foot.", fr: "Prenez la ligne 4 jusqu'à la station Myeongdong (sortie 6 ou 7) ; tout le quartier est piéton et se découvre facilement à pied." } },

    { id: 94, name: "Hanlim Multi Art School", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", ytId: "gCOw09Xy4i0", address: "172 Chungmin-ro, Songpa-gu", lat: 37.478, lng: 127.1265, img: "https://img.youtube.com/vi/gCOw09Xy4i0/hqdefault.jpg",
      fullDescription: { en: `<p>While Jungkook attended SOPA, Jimin and V — the so-called "95z" — attended this performing arts high school, graduating together in February 2014, just months after the group's debut.</p><p>The video of a sleepy V and Jimin walking into their graduation ceremony in smart Hanlim uniforms is a classic piece of fandom footage, and fans still visit the exterior to honour the bond of the 95-liners.</p>`,
        fr: `<p>Tandis que Jungkook fréquentait SOPA, Jimin et V — surnommés les « 95z » — étaient scolarisés dans ce lycée des arts du spectacle, dont ils sont diplômés ensemble en février 2014, quelques mois seulement après les débuts du groupe.</p><p>La vidéo d'un V et d'un Jimin encore endormis entrant à leur cérémonie de remise de diplôme en uniforme Hanlim est un classique du fandom, et les fans viennent encore honorer devant l'extérieur le lien qui unit les « 95-liners ».</p>` },
      tip: { en: "Take a quick, respectful photo of the school sign from the sidewalk — this is an active school with real students.", fr: "Prenez une photo rapide et respectueuse du panneau de l'école depuis le trottoir — c'est un établissement en activité avec de vrais élèves." },
      directions: { en: "Take Line 8 to Jangji Station (Exit 1); the school sits near the large Garden 5 shopping complex.", fr: "Prenez la ligne 8 jusqu'à la station Jangji (sortie 1) ; l'école se trouve près du grand complexe commercial Garden 5." } },

    { id: 95, name: "Arirang TV Studios", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", ytId: "2w2h_kF_qVE", address: "2351 Nambusunhwan-ro, Seocho-gu", lat: 37.4835, lng: 127.013, img: "https://img.youtube.com/vi/2w2h_kF_qVE/hqdefault.jpg",
      fullDescription: { en: `<p>Because Arirang TV targets an international audience, BTS promoted heavily on its music show "Simply K-Pop" during their debut year — one of the first Korean platforms to showcase them to fans abroad.</p><p>The backstage interviews they gave here in 2013, awkwardly speaking English and trying to act tough, are legendary among older international ARMYs — a nostalgic stop for anyone who followed BTS from day one.</p>`,
        fr: `<p>Comme Arirang TV s'adresse à un public international, BTS y a beaucoup misé sur son émission musicale « Simply K-Pop » durant l'année de ses débuts — l'une des premières plateformes coréennes à les faire découvrir aux fans à l'étranger.</p><p>Les interviews en coulisses données ici en 2013, où ils s'exprimaient en anglais avec hésitation en essayant de paraître assurés, sont légendaires parmi les ARMYs internationaux de la première heure — une étape nostalgique pour qui a suivi BTS depuis le tout début.</p>` },
      tip: { en: "The Seoul Arts Center sits right nearby — a fantastic cultural complex to combine with this visit.", fr: "Le Seoul Arts Center se trouve juste à côté — un formidable complexe culturel à combiner avec cette visite." },
      directions: { en: "Take Line 3 to Nambu Bus Terminal Station (Exit 5); the exterior of the broadcasting building is publicly visible.", fr: "Prenez la ligne 3 jusqu'à la station Nambu Bus Terminal (sortie 5) ; l'extérieur du bâtiment de diffusion est visible depuis la rue." } },

    { id: 96, name: "Konkuk University", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2017", ytId: "WpDa_xPvnKY", address: "120 Neungdong-ro, Gwangjin-gu", lat: 37.5407, lng: 127.0793, img: "https://img.youtube.com/vi/WpDa_xPvnKY/hqdefault.jpg",
      fullDescription: { en: `<p>While juggling intense idol training and debut promotions, Jin attended Konkuk University as an acting major, often spotted by classmates rushing to campus between music show schedules.</p><p>Walking around the campus's large Ilgam Lake offers a glimpse into Jin's demanding double life as both a college student and a rising K-pop star; the members later celebrated his graduation in a sweet livestream.</p>`,
        fr: `<p>Tout en jonglant avec un entraînement d'idol intense et la promotion de leurs débuts, Jin étudiait le jeu d'acteur à l'Université Konkuk, parfois aperçu par ses camarades filant sur le campus entre deux émissions musicales.</p><p>Se promener autour du grand lac Ilgam du campus donne un aperçu de la double vie exigeante de Jin, à la fois étudiant et star de K-pop montante ; les membres ont ensuite célébré sa remise de diplôme lors d'un livestream plein de tendresse.</p>` },
      tip: { en: "Walk around Ilgam Lake at the centre of campus — beautiful, and perfect for a quiet afternoon.", fr: "Promenez-vous autour du lac Ilgam au centre du campus — magnifique, et parfait pour une après-midi tranquille." },
      directions: { en: "Take Line 2 or 7 to Konkuk University Station; Kondae Taste Street, a lively food and nightlife strip, sits right outside the campus.", fr: "Prenez la ligne 2 ou 7 jusqu'à la station Konkuk University ; la Kondae Taste Street, une rue animée de restauration et de vie nocturne, se trouve juste à la sortie du campus." } },

    { id: 97, name: "Gimpo International Airport", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2014", ytId: "KrJfIKaXhY4", address: "112 Haneul-gil, Gangseo-gu", lat: 37.5583, lng: 126.7906, img: "https://img.youtube.com/vi/KrJfIKaXhY4/hqdefault.jpg",
      fullDescription: { en: `<p>While Incheon handles most global flights, Gimpo was the departure point for BTS's very first international promotion trips to Japan in early 2014.</p><p>Photos of the rookie members nervously bowing to the small crowd of press at Gimpo's departure gates marked the true beginning of the group's global expansion.</p>`,
        fr: `<p>Si Incheon gère la majorité des vols internationaux, c'est depuis Gimpo que BTS a effectué ses tout premiers voyages promotionnels à l'étranger, au Japon, début 2014.</p><p>Les photos des membres, encore rookies, s'inclinant nerveusement devant la petite foule de journalistes aux portes d'embarquement de Gimpo marquent le vrai début de l'expansion internationale du groupe.</p>` },
      tip: { en: "Walk the departure hall floors where the boys debuted their earliest airport fashion looks.", fr: "Parcourez les halls de départ où les garçons ont dévoilé leurs tout premiers looks d'aéroport." },
      directions: { en: "Take Line 5, Line 9 or AREX to Gimpo Airport Station; the airport connects directly to the Lotte Mall Gimpo shopping and cinema complex.", fr: "Prenez la ligne 5, la ligne 9 ou l'AREX jusqu'à la station Gimpo Airport ; l'aéroport est directement relié au complexe commercial et cinéma Lotte Mall Gimpo." } },

    { id: 98, name: "KINTEX", group: "BTS", member: "All", country: "South Korea", city: "Goyang", category: "Concerts", year: "2013", ytId: "wKjxFyfcClw", address: "217-60 Kintex-ro, Ilsanseo-gu, Goyang-si", lat: 37.6688, lng: 126.7444, img: "https://img.youtube.com/vi/wKjxFyfcClw/hqdefault.jpg",
      fullDescription: { en: `<p>At the end of their debut year in 2013, BTS was invited to perform at major year-end broadcasting festivals, several of which were held in the colossal halls of KINTEX, South Korea's largest exhibition centre.</p><p>Performing on such huge stages alongside the industry's biggest veterans was a real validation for rookies from a small agency — proof that they had made it through their debut year.</p>`,
        fr: `<p>À la fin de leur année de débuts en 2013, BTS a été invité à se produire lors des grands galas de fin d'année, plusieurs se tenant dans les salles gigantesques du KINTEX, le plus grand centre d'exposition de Corée du Sud.</p><p>Se produire sur des scènes aussi immenses aux côtés des plus grands vétérans de l'industrie représentait une vraie reconnaissance pour des rookies venus d'une petite agence — la preuve qu'ils avaient tenu bon durant leur première année.</p>` },
      tip: { en: "Since KINTEX is in Goyang, it's very close to RM's hometown and to Ilsan Lake Park — easy to combine in one trip.", fr: "Comme le KINTEX se trouve à Goyang, il est tout proche de la ville natale de RM et du parc du lac d'Ilsan — facile à combiner en une seule sortie." },
      directions: { en: "Take Line 3 to Daehwa Station, then walk about 10 minutes; the exhibition halls are open to the public during events.", fr: "Prenez la ligne 3 jusqu'à la station Daehwa, puis marchez environ 10 minutes ; les halls d'exposition sont ouverts au public lors des événements." } },

    { id: 99, name: "Maengbang Beach", group: "BTS", member: "All", country: "South Korea", city: "Samcheok", category: "Fashion", year: "2021", ytId: "BVwAVbKAFPI", address: "Maengbang Beach, Samcheok-si, Gangwon-do", lat: 37.2515, lng: 129.232, img: "https://img.youtube.com/vi/BVwAVbKAFPI/hqdefault.jpg",
      fullDescription: { en: `<p>To celebrate the global success of "Butter," the local government perfectly recreated the bright, summery beach set used for the single's concept photos — complete with yellow umbrellas, sunbeds and a volleyball net.</p><p>Fans can lie on the actual yellow sunbeds, pose with the striped parasols, and sit next to the referee chair where Jimin was photographed — a vividly fun stop capturing the energy of the group's English-single era.</p>`,
        fr: `<p>Pour célébrer le succès mondial de « Butter », la municipalité a reconstitué à l'identique le décor de plage estival et lumineux utilisé pour les photos concept du single — parasols jaunes, transats et filet de volley inclus.</p><p>Les fans peuvent s'allonger sur les vrais transats jaunes, poser avec les parasols rayés, et s'asseoir près de la chaise d'arbitre où Jimin avait été photographié — une étape joyeuse et haute en couleur qui capture toute l'énergie de l'ère des singles anglais du groupe.</p>` },
      tip: { en: "Bring small props like the Butter album or yellow balloons — fans often do to make their photos pop.", fr: "Apportez de petits accessoires comme l'album Butter ou des ballons jaunes — c'est ce que font souvent les fans pour dynamiser leurs photos." },
      directions: { en: "Take the KTX to Donghae Station, then a local bus or a 20-minute taxi ride down the coast.", fr: "Prenez le KTX jusqu'à la gare de Donghae, puis un bus local ou un taxi d'environ 20 minutes le long de la côte." } },

    { id: 100, name: "Saemangeum Seawall", group: "BTS", member: "All", country: "South Korea", city: "Buan", category: "MV Location", year: "2016", episode: "Save Me", ytId: "MBvunpC8Yw4", address: "Saemangeum Embankment, Buan-gun", lat: 35.7995, lng: 126.5885, img: "https://img.youtube.com/vi/MBvunpC8Yw4/hqdefault.jpg",
      fullDescription: { en: `<p>The "Save Me" music video is famous for being filmed in one continuous take on a dreary, windy day — that endless, muddy horizon that matched the song's desperate energy is part of the Saemangeum reclaimed-land project.</p><p>The moody, overcast sky and the sheer emptiness of the location force visitors to slow down and reflect; many fans come here to film their own one-take dance covers on the same ground BTS danced across.</p>`,
        fr: `<p>Le clip de « Save Me » est célèbre pour avoir été tourné en un seul plan-séquence, par une journée grise et venteuse — cet horizon boueux et infini qui épouse l'énergie désespérée de la chanson fait partie du projet de terres gagnées sur la mer de Saemangeum.</p><p>Le ciel maussade et couvert, ainsi que le vide total du lieu, invitent le visiteur à ralentir et à réfléchir ; de nombreux fans viennent y filmer leur propre reprise de danse en un plan, sur le sol même où BTS a dansé.</p>` },
      tip: { en: "Bring a sturdy tripod if filming a dance cover — the ocean winds here are notoriously strong.", fr: "Apportez un trépied solide si vous filmez une reprise de danse — les vents marins y sont réputés très forts." },
      directions: { en: "Best reached by rental car from Gunsan or Buan, as public transport is scarce; the seawall makes for a beautiful road-trip drive on its own.", fr: "Se rejoint le plus facilement en voiture de location depuis Gunsan ou Buan, les transports en commun étant rares ; la digue offre à elle seule un magnifique parcours en road trip." } },

    { id: 101, name: "Maze Land", group: "BTS", member: "All", country: "South Korea", city: "Jeju Island", category: "MV Location", year: "2016", episode: "Epilogue: Young Forever", ytId: "BEFNhMkdVz4", address: "2134-47 Bijarim-ro, Gujwa-eup, Jeju-si", lat: 33.4995, lng: 126.7285, img: "https://img.youtube.com/vi/BEFNhMkdVz4/hqdefault.jpg",
      fullDescription: { en: `<p>Before they reached the runway, the members were shown wandering through a vast, confusing labyrinth for the "Epilogue: Young Forever" video — filmed at Maze Land, one of Jeju Island's most famous eco-parks, known for its intricate stone walls.</p><p>Getting lost in the same stone corridors where RM, Jin and Jimin once wandered makes for a fun, slightly melancholic adventure, adding to the realism of feeling lost in youth.</p>`,
        fr: `<p>Avant d'atteindre la piste, les membres étaient filmés errant dans un vaste labyrinthe déroutant pour le clip « Epilogue: Young Forever » — tourné à Maze Land, l'un des parcs écologiques les plus célèbres de l'île de Jeju, réputé pour ses murs de pierre labyrinthiques.</p><p>Se perdre dans les mêmes couloirs de pierre où RM, Jin et Jimin ont autrefois erré donne lieu à une aventure amusante et légèrement mélancolique, renforçant ce sentiment réaliste de se perdre dans sa jeunesse.</p>` },
      tip: { en: "Head specifically to the Stone Maze section — that's where the video was primarily shot.", fr: "Dirigez-vous précisément vers la section du labyrinthe de pierre — c'est là que le clip a été principalement tourné." },
      directions: { en: "Best explored by rental car while touring eastern Jeju Island; admission is around 11,000 KRW.", fr: "Se découvre le mieux en voiture de location en explorant l'est de l'île de Jeju ; l'entrée coûte environ 11 000 KRW." } },

    { id: 102, name: "Gyeonggi English Village", group: "BTS", member: "All", country: "South Korea", city: "Yangpyeong", category: "MV Location", year: "2014", episode: "War of Hormone", ytId: "HMzt6TeIUKw", address: "92 Yeonsu-ro, Yongmun-myeon, Yangpyeong-gun", lat: 37.5145, lng: 127.5215, img: "https://img.youtube.com/vi/HMzt6TeIUKw/hqdefault.jpg",
      fullDescription: { en: `<p>If the European-style streets in the "War of Hormone" music video looked a little out of place for Korea, that's because they were filmed at this surreal mock-European village, built for English-immersion programmes.</p><p>The playful, rebellious one-take video had the members dancing around red-brick buildings, phone booths and vintage cars — a nostalgic trip back to one of their most energetic teenage-era concepts.</p>`,
        fr: `<p>Si les rues de style européen du clip « War of Hormone » semblaient un peu déplacées en Corée, c'est parce qu'elles ont été tournées dans ce village surréaliste imitant l'Europe, construit pour des programmes d'immersion en anglais.</p><p>Ce clip espiègle et rebelle, tourné en un seul plan, montrait les membres dansant parmi des bâtiments en briques rouges, des cabines téléphoniques et des voitures anciennes — un retour nostalgique à l'un de leurs concepts adolescents les plus énergiques.</p>` },
      tip: { en: "Walk down the central avenue where Jimin did his iconic jump and Jungkook dragged his lollipop.", fr: "Descendez l'avenue centrale où Jimin a fait son saut emblématique et où Jungkook traînait sa sucette." },
      directions: { en: "Take the Gyeongui-Jungang subway line to Yongmun Station, then a taxi; admission is around 6,000 KRW.", fr: "Prenez la ligne de métro Gyeongui-Jungang jusqu'à la station Yongmun, puis un taxi ; l'entrée coûte environ 6 000 KRW." } },

    { id: 103, name: "SNU Abandoned Swimming Pool", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "MV Location", year: "2015", episode: "HYYH On Stage: Prologue", ytId: "BVwAVbKAFPI", address: "Seoul National University, Gwanak-gu", lat: 37.4595, lng: 126.9525, img: "https://img.youtube.com/vi/BVwAVbKAFPI/hqdefault.jpg",
      fullDescription: { en: `<p>Hidden in the forested mountains behind the prestigious Seoul National University lies an abandoned outdoor swimming pool — a gritty, graffiti-covered ruin that served as the primary filming location for the legendary HYYH On Stage: Prologue short film.</p><p>This is where the members played in the empty pool, where Jin recorded them on his camcorder, and where some of the storyline's most heartbreaking scenes were established.</p>`,
        fr: `<p>Cachée dans les montagnes boisées derrière la prestigieuse Université nationale de Séoul se trouve une piscine extérieure abandonnée — une ruine brute couverte de graffitis, principal lieu de tournage du légendaire court-métrage HYYH On Stage: Prologue.</p><p>C'est ici que les membres ont joué dans la piscine vide, que Jin les a filmés avec son caméscope, et que certaines des scènes les plus déchirantes de cette histoire ont pris forme.</p>` },
      tip: { en: "You can still see the remnants of the diving-board area where Taehyung's emotional jump was filmed.", fr: "On peut encore voir les vestiges de la zone du plongeoir où le saut chargé d'émotion de Taehyung a été filmé." },
      directions: { en: "Located deep in the mountains behind the SNU campus; getting there involves a genuine hike on unpaved trails, so wear sturdy shoes and visit with caution.", fr: "Situé loin dans les montagnes derrière le campus de l'Université nationale de Séoul ; s'y rendre implique une vraie randonnée sur des sentiers non aménagés — prévoyez de bonnes chaussures et restez prudent." } },

    { id: 104, name: "Ihwa Mural Village", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "MV Location", year: "2015", episode: "I Need U", ytId: "BEFNhMkdVz4", address: "49 Naksan 4-gil, Jongno-gu", lat: 37.5805, lng: 127.0065, img: "https://img.youtube.com/vi/BEFNhMkdVz4/hqdefault.jpg",
      fullDescription: { en: `<p>In the "I Need U" music video, RM is seen walking up a steep, narrow staircase with a lollipop in his mouth — those gritty, atmospheric alleyway shots were filmed around this hillside mural village near Naksan Park.</p><p>The steep stairs and the view of the city below capture the struggling-youth aesthetic of the era perfectly, and the village itself is known for its art and stunning views.</p>`,
        fr: `<p>Dans le clip « I Need U », on voit RM monter un escalier étroit et raide, une sucette à la bouche — ces plans bruts et atmosphériques de ruelles ont été tournés autour de ce village de fresques à flanc de colline, près de Naksan Park.</p><p>L'escalier raide et la vue sur la ville en contrebas capturent parfaitement l'esthétique de jeunesse en difficulté de cette époque, et le village lui-même est réputé pour son art et ses vues magnifiques.</p>` },
      tip: { en: "After finding the alleyways, keep walking up to Naksan Park for one of the best night views of the old city walls.", fr: "Après avoir repéré les ruelles, continuez à monter jusqu'à Naksan Park pour l'une des plus belles vues nocturnes sur les anciens remparts de la ville." },
      directions: { en: "Take Line 4 to Hyehwa Station (Exit 2) and walk up the hill toward Naksan Park; this is a quiet residential area, so please keep noise to a minimum.", fr: "Prenez la ligne 4 jusqu'à la station Hyehwa (sortie 2) et montez la colline en direction de Naksan Park ; c'est un quartier résidentiel calme, merci de limiter le bruit." } },

    { id: 105, name: "Hwajeong Tunnel", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "MV Location", year: "2015", episode: "Run", ytId: "HMzt6TeIUKw", address: "San 56-1 Sillim-dong, Gwanak-gu", lat: 37.4745, lng: 126.9345, img: "https://img.youtube.com/vi/HMzt6TeIUKw/hqdefault.jpg",
      fullDescription: { en: `<p>One of the most chaotic, iconic scenes in the "Run" music video — the seven members blocking traffic inside a tunnel, throwing drinks at cars and sprinting from the police — was filmed in this long, loud traffic tunnel.</p><p>Walking down the tunnel's raised pedestrian path, dimly lit and yellow-hued, is enough to get the "Run" bassline running through your head, even without recreating any of the more reckless stunts.</p>`,
        fr: `<p>L'une des scènes les plus chaotiques et emblématiques du clip « Run » — les sept membres bloquant la circulation dans un tunnel, jetant des boissons sur les voitures et fuyant la police en courant — a été tournée dans ce long tunnel routier bruyant.</p><p>Marcher sur le trottoir surélevé du tunnel, faiblement éclairé et baigné de teintes jaunes, suffit à faire résonner la basse de « Run » dans votre tête, même sans recréer les cascades les plus téméraires.</p>` },
      tip: { en: "Stay on the raised pedestrian sidewalk — this is an active vehicle tunnel, so never walk in the road.", fr: "Restez sur le trottoir piéton surélevé — c'est un tunnel routier en activité, ne marchez jamais sur la chaussée." },
      directions: { en: "Located near Seoul National University; bus line 5511 passes through the tunnel, or combine the visit with the SNU Abandoned Swimming Pool nearby.", fr: "Situé près de l'Université nationale de Séoul ; la ligne de bus 5511 traverse le tunnel, ou combinez la visite avec la piscine abandonnée de l'université toute proche." } },

    { id: 106, name: "Sihwa Seawall", group: "BTS", member: "All", country: "South Korea", city: "Ansan", category: "MV Location", year: "2015", episode: "Run", ytId: "MBvunpC8Yw4", address: "Daebudo, Danwon-gu, Ansan-si", lat: 37.3125, lng: 126.6205, img: "https://img.youtube.com/vi/MBvunpC8Yw4/hqdefault.jpg",
      fullDescription: { en: `<p>The bittersweet ending of the "Run" music video, with the members walking together beside the ocean before Jimin holds up a burning Polaroid, was filmed along this massive coastal embankment.</p><p>The seawall also appears in the HYYH On Stage: Prologue short film, where the members sit on the rocks looking out at the sea — arguably the ultimate HYYH-era location, symbolising the edge of the world and the bond of youth.</p>`,
        fr: `<p>La fin douce-amère du clip « Run », où les membres marchent ensemble au bord de l'océan avant que Jimin ne brandisse un Polaroid en train de brûler, a été tournée le long de cette immense digue côtière.</p><p>La digue apparaît aussi dans le court-métrage HYYH On Stage: Prologue, où les membres sont assis sur les rochers à regarder la mer — sans doute le lieu ultime de l'ère HYYH, symbole du bord du monde et du lien de la jeunesse.</p>` },
      tip: { en: "You can carefully sit on the large coastal rocks, just like the members did in the Prologue film.", fr: "Vous pouvez vous asseoir avec précaution sur les grands rochers côtiers, exactement comme les membres dans le court-métrage Prologue." },
      directions: { en: "Best visited by car when driving from Seoul down to Daebudo Island; stop at the Sihwa Narae rest area observatory for sweeping ocean views.", fr: "Se visite le mieux en voiture en descendant de Séoul vers l'île de Daebudo ; arrêtez-vous à l'observatoire de l'aire de repos Sihwa Narae pour une vue dégagée sur l'océan." } },

    { id: 107, name: "Hwangmaesan County Park", group: "BTS", member: "Namjoon", country: "South Korea", city: "Hapcheon", category: "MV Location", year: "2022", episode: "Wild Flower", ytId: "BVwAVbKAFPI", address: "Hwangmaesan-ro, Gahoe-myeon, Hapcheon-gun", lat: 35.5455, lng: 128.0455, img: "https://img.youtube.com/vi/BVwAVbKAFPI/hqdefault.jpg",
      fullDescription: { en: `<p>For his solo track "Wild Flower," RM wanted a location that felt earthy, vast and grounded, choosing this breathtaking mountain — filmed specifically in autumn, when its hills are covered in silver grass.</p><p>Standing in the sweeping fields where Namjoon walked amid fireworks is a quietly moving experience, the wind and silence perfectly matching his desire to be a wild flower rather than a firework.</p>`,
        fr: `<p>Pour son titre en solo « Wild Flower », RM voulait un lieu au caractère brut, vaste et ancré, et a choisi cette montagne à couper le souffle — filmée précisément en automne, quand ses collines se couvrent d'herbes argentées.</p><p>Se tenir dans les vastes champs où Namjoon a marché parmi les feux d'artifice est une expérience discrètement bouleversante, le vent et le silence faisant écho à son désir d'être une fleur sauvage plutôt qu'un feu d'artifice.</p>` },
      tip: { en: "Hike up to the main plateau to find the exact silver-grass fields used in the video's drone shots.", fr: "Montez jusqu'au plateau principal pour retrouver les champs d'herbe argentée exacts utilisés dans les plans aériens du clip." },
      directions: { en: "Very remote — a rental car is highly recommended; best visited in May for the pink azaleas or October for the silver grass seen in the video.", fr: "Très isolé — une voiture de location est vivement recommandée ; à visiter idéalement en mai pour les azalées roses ou en octobre pour l'herbe argentée du clip." } },

    { id: 108, name: "Nodeul Island", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Fashion", year: "2017", ytId: "7VPje5VvYfk", address: "445 Yangnyeong-ro, Yongsan-gu", lat: 37.5175, lng: 126.9575, img: "https://img.youtube.com/vi/7VPje5VvYfk/hqdefault.jpg",
      fullDescription: { en: `<p>In the dramatic Love Yourself highlight reels, RM's storyline features him riding a bus and watching a girl drop her hair tie, before getting off at a bus stop on a bridge — a scene filmed on the Hangang Bridge, right at the entrance to Nodeul Island.</p><p>The island itself is a lovely place to relax, and fans love recreating Namjoon's pensive bus-stop look before heading down to its grassy riverbanks to listen to his solo music.</p>`,
        fr: `<p>Dans les dramatiques Love Yourself highlight reels, l'histoire de RM le montre dans un bus, regardant une jeune femme laisser tomber son élastique à cheveux, avant de descendre à un arrêt sur un pont — une scène tournée sur le pont Hangang, juste à l'entrée de l'île de Nodeul.</p><p>L'île elle-même est un endroit charmant pour se détendre, et les fans adorent recréer le regard pensif de Namjoon à l'arrêt de bus avant de descendre vers les berges herbeuses pour écouter sa musique en solo.</p>` },
      tip: { en: "The actual bus stop used in the video sits right on the bridge, near the island's entrance.", fr: "L'arrêt de bus réellement utilisé dans le clip se trouve juste sur le pont, près de l'entrée de l'île." },
      directions: { en: "Take Line 9 to Nodeul Station (Exit 2), then walk across the Hangang Bridge; it's one of the least crowded spots in Seoul for a Han River sunset picnic.", fr: "Prenez la ligne 9 jusqu'à la station Nodeul (sortie 2), puis traversez le pont Hangang à pied ; c'est l'un des endroits les moins fréquentés de Séoul pour un pique-nique au coucher du soleil sur le fleuve Han." } },

    { id: 109, name: "Seoul Forest", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2017", ytId: "BEFNhMkdVz4", address: "273 Ttukseom-ro, Seongdong-gu", lat: 37.5445, lng: 127.0375, img: "https://img.youtube.com/vi/BEFNhMkdVz4/hqdefault.jpg",
      fullDescription: { en: `<p>Seoul Forest served as the backdrop for several key moments of the Love Yourself era, most notably the concrete tube where Suga is seen playing piano, and where Jungkook sits in a wheelchair.</p><p>Beyond those on-screen connections, Seoul Forest is famously one of RM's favourite spots for what fans call "Namjooning," and the park even has a bench formally adopted by ARMY in his honour.</p>`,
        fr: `<p>Seoul Forest a servi de décor à plusieurs moments clés de l'ère Love Yourself, notamment le tube en béton où l'on voit Suga jouer du piano, et où Jungkook est assis dans un fauteuil roulant.</p><p>Au-delà de ces liens avec les clips, Seoul Forest est réputé être l'un des endroits préférés de RM pour ce que les fans appellent le « Namjooning », et le parc compte même un banc officiellement adopté par l'ARMY en son honneur.</p>` },
      tip: { en: "Look for the large cylindrical concrete play structures hidden in the park to recreate Suga's piano scene.", fr: "Cherchez les grandes structures de jeu cylindriques en béton cachées dans le parc pour recréer la scène du piano de Suga." },
      directions: { en: "Take the Suin-Bundang Line to Seoul Forest Station (Exit 3); trendy café streets surround the park on several sides.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Seoul Forest (sortie 3) ; des rues de cafés branchés entourent le parc sur plusieurs côtés." } },

    { id: 110, name: "Gyeongbokgung Palace (Geunjeongjeon)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2020", ytId: "HMzt6TeIUKw", address: "161 Sajik-ro, Jongno-gu", lat: 37.5788, lng: 126.977, img: "https://img.youtube.com/vi/HMzt6TeIUKw/hqdefault.jpg",
      fullDescription: { en: `<p>BTS's performance of "IDOL" in front of Geunjeongjeon, the main throne hall, for The Tonight Show broke the internet — clad in modernised hanboks, the group put Korean culture on the global late-night stage.</p><p>Standing in the vast stone courtyard where they once danced late at night is genuinely awe-inspiring, and it cements BTS's role not only as pop stars but as cultural ambassadors for their country.</p>`,
        fr: `<p>La performance de « IDOL » par BTS devant le Geunjeongjeon, la salle du trône principale, pour The Tonight Show a fait le tour du web — vêtu de hanboks modernisés, le groupe a fait rayonner la culture coréenne sur une scène télévisée mondiale.</p><p>Se tenir dans la vaste cour de pierre où ils ont autrefois dansé de nuit est réellement impressionnant, et cela confirme le rôle de BTS non seulement comme stars de la pop, mais aussi comme ambassadeurs culturels de leur pays.</p>` },
      tip: { en: "Rent a modern hanbok from the shops just outside the palace gates, inspired by their stage outfits.", fr: "Louez un hanbok moderne auprès des boutiques juste à l'extérieur des portes du palais, inspiré de leurs tenues de scène." },
      directions: { en: "Take Line 3 to Gyeongbokgung Station (Exit 5); admission is 3,000 KRW, but free if you're wearing a hanbok.", fr: "Prenez la ligne 3 jusqu'à la station Gyeongbokgung (sortie 5) ; l'entrée coûte 3 000 KRW, mais est gratuite si vous portez un hanbok." } },

    { id: 111, name: "National Museum of Korea", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Museums", year: "2020", ytId: "MBvunpC8Yw4", address: "137 Seobinggo-ro, Yongsan-gu", lat: 37.524, lng: 126.9803, img: "https://img.youtube.com/vi/MBvunpC8Yw4/hqdefault.jpg",
      fullDescription: { en: `<p>During the pandemic, BTS delivered a commencement speech and a moving performance of "Boy With Luv," "Spring Day" and "Mikrokosmos" for YouTube's Dear Class of 2020, filmed in the museum's stunning main lobby and outdoor plaza.</p><p>The open-air corridor where they sang "Mikrokosmos" perfectly frames Namsan Seoul Tower in the distance, making it one of the most peaceful and quietly majestic spots on this list.</p>`,
        fr: `<p>Pendant la pandémie, BTS a prononcé un discours de fin d'études et livré une performance émouvante de « Boy With Luv », « Spring Day » et « Mikrokosmos » pour Dear Class of 2020 sur YouTube, tournée dans le somptueux hall principal et l'esplanade extérieure du musée.</p><p>Le couloir en plein air où ils ont chanté « Mikrokosmos » cadre parfaitement la Namsan Seoul Tower au loin, faisant de ce lieu l'un des plus paisibles et discrètement majestueux de cette liste.</p>` },
      tip: { en: "Take a photo on the museum's grand indoor staircase, where they performed \"Boy With Luv.\"", fr: "Prenez une photo sur le grand escalier intérieur du musée, là où ils ont interprété « Boy With Luv »." },
      directions: { en: "Take Line 4 or the Gyeongui-Jungang Line to Ichon Station (Exit 2); the main exhibition halls and outdoor plaza are free to enter.", fr: "Prenez la ligne 4 ou la ligne Gyeongui-Jungang jusqu'à la station Ichon (sortie 2) ; les salles d'exposition principales et l'esplanade extérieure sont en accès libre." } },

    { id: 112, name: "Susaek Station Freight Yard", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "MV Location", year: "2015", episode: "Run", ytId: "BVwAVbKAFPI", address: "Susaek-dong, Eunpyeong-gu", lat: 37.5865, lng: 126.9005, img: "https://img.youtube.com/vi/BVwAVbKAFPI/hqdefault.jpg",
      fullDescription: { en: `<p>Another unforgettable scene from the "Run" music video — RM walking along the train tracks holding a crushed cup, the group partying in front of a massive freight train — was filmed at this sprawling industrial rail yard.</p><p>The gritty, slightly dangerous aesthetic of the yard suited the era's rebellious-youth concept perfectly; fans can take in the web of tracks safely from the station's pedestrian bridges.</p>`,
        fr: `<p>Une autre scène inoubliable du clip « Run » — RM marchant le long des rails avec un gobelet écrasé à la main, le groupe faisant la fête devant un immense train de marchandises — a été tournée dans cette vaste gare de triage industrielle.</p><p>L'esthétique brute et légèrement dangereuse de la gare de triage convenait parfaitement au concept de jeunesse rebelle de cette ère ; les fans peuvent admirer en toute sécurité l'entrelacs des voies depuis les passerelles piétonnes de la gare.</p>` },
      tip: { en: "Do not trespass on the tracks — the pedestrian overpass offers the perfect cinematic view of the yard.", fr: "Ne vous aventurez pas sur les voies — la passerelle piétonne offre déjà la vue cinématographique parfaite sur la gare de triage." },
      directions: { en: "Take the Gyeongui-Jungang Line to Susaek Station; it's right next to Digital Media City, where the SBS Prism Tower also stands.", fr: "Prenez la ligne Gyeongui-Jungang jusqu'à la station Susaek ; elle se trouve juste à côté de Digital Media City, où se dresse aussi la SBS Prism Tower." } },
    {"id":113,"name":"Gocheok Sky Dome","group":"BTS","member":"All","country":"South Korea","city":"Seoul","category":"Concerts","year":"2017","episode":"BTS Live Trilogy Episode III: The Wings Tour","address":"","lat":37.4986,"lng":126.8672,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Gocheok Sky Dome in Seoul hosted BTS during the \"BTS Live Trilogy Episode III: The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Gocheok Sky Dome à Seoul a accueilli BTS lors de la tournée « BTS Live Trilogy Episode III: The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":114,"name":"Movistar Arena","group":"BTS","member":"All","country":"Chile","city":"Santiago","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":-33.4672,"lng":-70.6323,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Movistar Arena in Santiago hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Movistar Arena à Santiago a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":115,"name":"Citibank Hall","group":"BTS","member":"All","country":"Brazil","city":"São Paulo","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":-23.599,"lng":-46.691,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Citibank Hall in São Paulo hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Citibank Hall à São Paulo a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":116,"name":"Prudential Center","group":"BTS","member":"All","country":"USA","city":"Newark, NJ","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":40.7336,"lng":-74.171,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Prudential Center in Newark, NJ hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Prudential Center à Newark, NJ a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":117,"name":"Allstate Arena","group":"BTS","member":"All","country":"USA","city":"Chicago, IL","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":42.0362,"lng":-87.8845,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Allstate Arena in Chicago, IL hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Allstate Arena à Chicago, IL a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":118,"name":"Honda Center","group":"BTS","member":"All","country":"USA","city":"Anaheim, CA","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":33.8078,"lng":-117.8766,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Honda Center in Anaheim, CA hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Honda Center à Anaheim, CA a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":119,"name":"Thunder Dome (Bangkok Indoor Stadium)","group":"BTS","member":"All","country":"Thailand","city":"Bangkok","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":13.8083,"lng":100.6144,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Thunder Dome (Bangkok Indoor Stadium) in Bangkok hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Thunder Dome (Bangkok Indoor Stadium) à Bangkok a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":120,"name":"ICE BSD City","group":"BTS","member":"All","country":"Indonesia","city":"Jakarta","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":-6.3021,"lng":106.6528,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>ICE BSD City in Jakarta hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>ICE BSD City à Jakarta a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":121,"name":"Mall of Asia Arena","group":"BTS","member":"All","country":"Philippines","city":"Manila","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":14.5352,"lng":120.9822,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Mall of Asia Arena in Manila hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Mall of Asia Arena à Manila a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":122,"name":"AsiaWorld-Expo","group":"BTS","member":"All","country":"Hong Kong","city":"Hong Kong","category":"Concerts","year":"2017 · 2019","episode":"The Wings Tour · Love Yourself: Speak Yourself","address":"","lat":22.3213,"lng":113.9412,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>AsiaWorld-Expo in Hong Kong hosted BTS during the \"The Wings Tour · Love Yourself: Speak Yourself\" (2017 · 2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>AsiaWorld-Expo à Hong Kong a accueilli BTS lors de la tournée « The Wings Tour · Love Yourself: Speak Yourself » (2017 · 2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":123,"name":"Qudos Bank Arena","group":"BTS","member":"All","country":"Australia","city":"Sydney","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":-33.8474,"lng":151.0631,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Qudos Bank Arena in Sydney hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Qudos Bank Arena à Sydney a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":124,"name":"Osaka-jo Hall","group":"BTS","member":"All","country":"Japan","city":"Osaka","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":34.6873,"lng":135.5262,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Osaka-jo Hall in Osaka hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Osaka-jo Hall à Osaka a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":125,"name":"Hiroshima Green Arena","group":"BTS","member":"All","country":"Japan","city":"Hiroshima","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":34.3971,"lng":132.4652,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Hiroshima Green Arena in Hiroshima hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Hiroshima Green Arena à Hiroshima a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":126,"name":"Nippon Gaishi Hall","group":"BTS","member":"All","country":"Japan","city":"Nagoya","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":35.1256,"lng":136.9686,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Nippon Gaishi Hall in Nagoya hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Nippon Gaishi Hall à Nagoya a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":127,"name":"Saitama Super Arena","group":"BTS","member":"All","country":"Japan","city":"Saitama","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":35.8969,"lng":139.6303,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Saitama Super Arena in Saitama hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Saitama Super Arena à Saitama a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":128,"name":"Marine Messe Fukuoka","group":"BTS","member":"All","country":"Japan","city":"Fukuoka","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":33.6489,"lng":130.3739,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Marine Messe Fukuoka in Fukuoka hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Marine Messe Fukuoka à Fukuoka a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":129,"name":"Makomanai Sekisui Heim Ice Arena","group":"BTS","member":"All","country":"Japan","city":"Sapporo","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":43.0089,"lng":141.3489,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Makomanai Sekisui Heim Ice Arena in Sapporo hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Makomanai Sekisui Heim Ice Arena à Sapporo a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":130,"name":"Kyocera Dome","group":"BTS","member":"All","country":"Japan","city":"Osaka","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":34.6688,"lng":135.4744,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Kyocera Dome in Osaka hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Kyocera Dome à Osaka a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":131,"name":"Taoyuan International Baseball Stadium","group":"BTS","member":"All","country":"Taiwan","city":"Taoyuan","category":"Concerts","year":"2017 · 2018","episode":"The Wings Tour · Love Yourself World Tour","address":"","lat":24.9903,"lng":121.301,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Taoyuan International Baseball Stadium in Taoyuan hosted BTS during the \"The Wings Tour · Love Yourself World Tour\" (2017 · 2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Taoyuan International Baseball Stadium à Taoyuan a accueilli BTS lors de la tournée « The Wings Tour · Love Yourself World Tour » (2017 · 2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":132,"name":"Cotai Arena","group":"BTS","member":"All","country":"Macau","city":"Macau","category":"Concerts","year":"2017","episode":"The Wings Tour","address":"","lat":22.147,"lng":113.5533,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Cotai Arena in Macau hosted BTS during the \"The Wings Tour\" (2017) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Cotai Arena à Macau a accueilli BTS lors de la tournée « The Wings Tour » (2017) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":133,"name":"Crypto.com Arena (Staples Center)","group":"BTS","member":"All","country":"USA","city":"Los Angeles, CA","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":34.043,"lng":-118.2673,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Crypto.com Arena (Staples Center) in Los Angeles, CA hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Crypto.com Arena (Staples Center) à Los Angeles, CA a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":134,"name":"Oracle Arena","group":"BTS","member":"All","country":"USA","city":"Oakland, CA","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":37.7503,"lng":-122.203,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Oracle Arena in Oakland, CA hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Oracle Arena à Oakland, CA a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":135,"name":"Fort Worth Convention Center","group":"BTS","member":"All","country":"USA","city":"Fort Worth, TX","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":32.7521,"lng":-97.3277,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Fort Worth Convention Center in Fort Worth, TX hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Fort Worth Convention Center à Fort Worth, TX a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":136,"name":"FirstOntario Centre","group":"BTS","member":"All","country":"Canada","city":"Hamilton, ON","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":43.2586,"lng":-79.8712,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>FirstOntario Centre in Hamilton, ON hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>FirstOntario Centre à Hamilton, ON a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":137,"name":"United Center","group":"BTS","member":"All","country":"USA","city":"Chicago, IL","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":41.8807,"lng":-87.6742,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>United Center in Chicago, IL hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>United Center à Chicago, IL a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":138,"name":"Citi Field","group":"BTS","member":"All","country":"USA","city":"New York, NY","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":40.7571,"lng":-73.8458,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Citi Field in New York, NY hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Citi Field à New York, NY a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":139,"name":"The O2 Arena","group":"BTS","member":"All","country":"UK","city":"London","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":51.5033,"lng":0.0032,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>The O2 Arena in London hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>The O2 Arena à London a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":140,"name":"Ziggo Dome","group":"BTS","member":"All","country":"Netherlands","city":"Amsterdam","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":52.3132,"lng":4.9382,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Ziggo Dome in Amsterdam hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Ziggo Dome à Amsterdam a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":141,"name":"Mercedes-Benz Arena","group":"BTS","member":"All","country":"Germany","city":"Berlin","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":52.5058,"lng":13.4432,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Mercedes-Benz Arena in Berlin hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Mercedes-Benz Arena à Berlin a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":142,"name":"Accor Arena","group":"BTS","member":"All","country":"France","city":"Paris","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":48.8388,"lng":2.3788,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Accor Arena in Paris hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Accor Arena à Paris a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":143,"name":"Tokyo Dome","group":"BTS","member":"All","country":"Japan","city":"Tokyo","category":"Concerts","year":"2018","episode":"Love Yourself World Tour","address":"","lat":35.7056,"lng":139.7519,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Tokyo Dome in Tokyo hosted BTS during the \"Love Yourself World Tour\" (2018) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Tokyo Dome à Tokyo a accueilli BTS lors de la tournée « Love Yourself World Tour » (2018) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":144,"name":"Nagoya Dome","group":"BTS","member":"All","country":"Japan","city":"Nagoya","category":"Concerts","year":"2019","episode":"Love Yourself World Tour","address":"","lat":35.1855,"lng":136.9457,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Nagoya Dome in Nagoya hosted BTS during the \"Love Yourself World Tour\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Nagoya Dome à Nagoya a accueilli BTS lors de la tournée « Love Yourself World Tour » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":145,"name":"National Stadium","group":"BTS","member":"All","country":"Singapore","city":"Singapore","category":"Concerts","year":"2019","episode":"Love Yourself World Tour","address":"","lat":1.3033,"lng":103.8748,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>National Stadium in Singapore hosted BTS during the \"Love Yourself World Tour\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>National Stadium à Singapore a accueilli BTS lors de la tournée « Love Yourself World Tour » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":146,"name":"Fukuoka PayPay Dome (Yahuoku! Dome)","group":"BTS","member":"All","country":"Japan","city":"Fukuoka","category":"Concerts","year":"2019","episode":"Love Yourself World Tour","address":"","lat":33.5954,"lng":130.3618,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Fukuoka PayPay Dome (Yahuoku! Dome) in Fukuoka hosted BTS during the \"Love Yourself World Tour\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Fukuoka PayPay Dome (Yahuoku! Dome) à Fukuoka a accueilli BTS lors de la tournée « Love Yourself World Tour » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":147,"name":"Rajamangala National Stadium","group":"BTS","member":"All","country":"Thailand","city":"Bangkok","category":"Concerts","year":"2019","episode":"Love Yourself World Tour","address":"","lat":13.7563,"lng":100.6242,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Rajamangala National Stadium in Bangkok hosted BTS during the \"Love Yourself World Tour\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Rajamangala National Stadium à Bangkok a accueilli BTS lors de la tournée « Love Yourself World Tour » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":148,"name":"Rose Bowl Stadium","group":"BTS","member":"All","country":"USA","city":"Pasadena, CA","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":34.1613,"lng":-118.1676,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Rose Bowl Stadium in Pasadena, CA hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Rose Bowl Stadium à Pasadena, CA a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":149,"name":"Soldier Field","group":"BTS","member":"All","country":"USA","city":"Chicago, IL","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":41.8623,"lng":-87.6167,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Soldier Field in Chicago, IL hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Soldier Field à Chicago, IL a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":150,"name":"MetLife Stadium","group":"BTS","member":"All","country":"USA","city":"East Rutherford, NJ","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":40.8135,"lng":-74.0745,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>MetLife Stadium in East Rutherford, NJ hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>MetLife Stadium à East Rutherford, NJ a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":151,"name":"Allianz Parque","group":"BTS","member":"All","country":"Brazil","city":"São Paulo","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":-23.5273,"lng":-46.678,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Allianz Parque in São Paulo hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Allianz Parque à São Paulo a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":152,"name":"Wembley Stadium","group":"BTS","member":"All","country":"UK","city":"London","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":51.556,"lng":-0.2795,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Wembley Stadium in London hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Wembley Stadium à London a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":153,"name":"Nagai Stadium (Yanmar Stadium)","group":"BTS","member":"All","country":"Japan","city":"Osaka","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":34.6117,"lng":135.5188,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Nagai Stadium (Yanmar Stadium) in Osaka hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Nagai Stadium (Yanmar Stadium) à Osaka a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":154,"name":"Shizuoka Stadium Ecopa","group":"BTS","member":"All","country":"Japan","city":"Shizuoka","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":34.8161,"lng":137.9433,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>Shizuoka Stadium Ecopa in Shizuoka hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>Shizuoka Stadium Ecopa à Shizuoka a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},
    {"id":155,"name":"King Fahd International Stadium","group":"BTS","member":"All","country":"Saudi Arabia","city":"Riyadh","category":"Concerts","year":"2019","episode":"Love Yourself: Speak Yourself","address":"","lat":24.7136,"lng":46.7208,"img":"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","fullDescription":{"en":"<p>King Fahd International Stadium in Riyadh hosted BTS during the \"Love Yourself: Speak Yourself\" (2019) — one of dozens of stops on a run that took the group across five continents and cemented just how far their live audience had grown.</p><p>Details on the exact staging and setlist for this stop are limited compared to the group's more recent, heavily documented tours — but the show itself is a matter of public record, part of the official tour schedule of the era.</p>","fr":"<p>King Fahd International Stadium à Riyadh a accueilli BTS lors de la tournée « Love Yourself: Speak Yourself » (2019) — l'une des dizaines d'étapes d'une tournée qui a mené le groupe sur cinq continents et confirmé l'ampleur déjà considérable de son public en concert.</p><p>Les détails précis sur la mise en scène et la setlist de cette étape sont plus limités que pour les tournées plus récentes du groupe, bien mieux documentées — mais la date elle-même est un fait de notoriété publique, inscrite au calendrier officiel de la tournée de l'époque.</p>"},"tip":{"en":"This stop is from an earlier BTS world tour — check the venue's own website for current opening hours or public tours, as they can change independently of the concert date shown here.","fr":"Cette étape provient d'une tournée mondiale précédente de BTS — vérifiez le site officiel du lieu pour les horaires d'ouverture ou visites publiques actuelles, qui peuvent avoir changé depuis la date de concert indiquée ici."},"directions":{"en":"Check the venue's official website or a map app for the best way to reach it from where you're staying — public transit access varies a lot by city.","fr":"Consultez le site officiel du lieu ou une application de cartes pour le meilleur moyen de vous y rendre depuis votre logement — l'accès en transport en commun varie beaucoup selon la ville."}},

    // Import du fichier BTS_Visited_Locations_V10.xlsx fourni par l'utilisateur (40 lieux
    // vérifiés, BTS-1 à BTS-40) — BTS-13 "Lotte World" est omis ici car doublon exact de
    // l'entrée id:3 "Lotte World Adventure" déjà présente ci-dessus. Coordonnées estimées
    // à partir des adresses et lieux réels connus (pas d'accès à un service de géocodage
    // dans cet environnement) : à vérifier avant une utilisation nécessitant une précision
    // GPS exacte. BTS-18, BTS-19 et BTS-24 : narration réécrite pour rester cohérente avec
    // le lieu réellement vérifié (le fichier source gardait encore l'ancien texte associé à
    // une adresse déjà corrigée par ailleurs — voir sa colonne "Lieux vérifiés").
    { id: 158, name: "Old Big Hit Studio (Cheonggu Bldg)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013-2016", ytId: "-uAHvGQtmT4", episodeLink: "https://youtu.be/-uAHvGQtmT4", address: "10-31 Nonhyeon-dong, Gangnam-gu", lat: 37.5155, lng: 127.0305, img: "https://images.unsplash.com/photo-1522093005080-d132e14a2e6f?w=600",
      fullDescription: { en: `<p>The basement of the Cheonggu Building is the legendary birthplace of BTS, where the seven members sweat through years of grueling choreography practice.</p><p>The exterior walls became a massive canvas where thousands of fans wrote messages in permanent marker, standing as a quiet monument to their humble beginnings.</p>`,
        fr: `<p>Le sous-sol du bâtiment Cheonggu est le lieu de naissance légendaire de BTS, où les sept membres ont sué pendant des années sur des chorégraphies épuisantes.</p><p>Les murs extérieurs sont devenus une immense toile où des milliers de fans ont écrit des messages au marqueur indélébile, un monument discret à leurs débuts modestes.</p>` },
      tipsList: [ { title: { en: `Respect the neighborhood` }, text: { en: `Keep noise levels down and do not attempt to enter private property.` } }, { title: { en: `Do the Trainee Walk` }, text: { en: `Walk from this building to Yoojung Sikdang to trace their exact daily commute.` } } ],
      practicalInfo: [ { title: { en: `Important Notice` }, text: { en: `The building is occupied by private businesses. You cannot enter the basement.` } }, { title: { en: `Photo opportunities` }, text: { en: `The main attraction is the exterior walls where BTS filmed early vlogs.` } }, { title: { en: `How to get there` }, text: { en: `Located just a few streets away from Hakdong Park.` } } ] },
    { id: 160, name: "First BTS Dormitory", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013-2015", ytId: "wtVKQDEZoF0", episodeLink: "https://www.youtube.com/watch?v=wtVKQDEZoF0", address: "9-8 Nonhyeon-dong, Gangnam-gu", lat: 37.515, lng: 127.0215, img: "https://images.unsplash.com/photo-1546874177-9e664107314e?w=600",
      fullDescription: { en: `<p>This infamous small, cramped 3rd-floor apartment was where all 7 members shared a single bedroom, sleeping on bunk beds, surrounded by shoes and clothes.</p><p>The dorm was heavily featured in their debut anniversary broadcasts and Rookie King, representing the ultimate symbol of their shared struggles.</p>`,
        fr: `<p>Ce petit appartement exigu du 3e étage, tristement célèbre, est celui où les 7 membres partageaient une seule chambre, dormant sur des lits superposés entourés de chaussures et de vêtements.</p><p>Ce dortoir est apparu abondamment dans les diffusions anniversaire de leurs débuts et dans Rookie King, symbole ultime de leurs galères partagées.</p>` },
      tipsList: [ { title: { en: `Keep your distance` }, text: { en: `View it respectfully from the street.` } }, { title: { en: `Notice the steep hills` }, text: { en: `You'll quickly realize how fit they had to be to walk these hills daily!` } } ],
      practicalInfo: [ { title: { en: `Important Notice` }, text: { en: `This is now a private residential building or redeveloped area. Do not trespass.` } }, { title: { en: `Photo spot` }, text: { en: `The small alleyways leading up to the building were often featured in their early Twitter posts.` } }, { title: { en: `How to get there` }, text: { en: `Near Sinsa Station (Line 3), exit 1.` } } ] },
    { id: 161, name: "The Min's Cafe", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2014-2015", ytId: "VLFgr5fOqJs", episodeLink: "https://www.youtube.com/watch?v=VLFgr5fOqJs", address: "330 Apgujeong-ro, Gangnam-gu", lat: 37.5273, lng: 127.0287, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
      fullDescription: { en: `<p>During their rookie days, BTS were frequently spotted grabbing berry ades at The Min's. It was a safe space for them, owned by a trusted senior artist.</p><p>The members posted dozens of selfies from this cafe's terrace in 2014, making it one of the first true "ARMY pilgrimage" spots in Seoul.</p>`,
        fr: `<p>Pendant leurs débuts, BTS venait souvent boire des berry ades chez The Min's. Un endroit sûr pour eux, tenu par un artiste senior de confiance.</p><p>Les membres ont posté des dizaines de selfies depuis la terrasse de ce café en 2014, en faisant l'un des tout premiers vrais lieux de « pèlerinage ARMY » à Séoul.</p>` },
      tipsList: [ { title: { en: `Nostalgia walk` }, text: { en: `Even though it's closed, the street itself is part of their rookie memories.` } }, { title: { en: `Check out nearby shops` }, text: { en: `Apgujeong is full of early BTS era lore.` } } ],
      practicalInfo: [ { title: { en: `Status` }, text: { en: `Currently permanently closed, but the storefront location is a nostalgic stop.` } }, { title: { en: `History` }, text: { en: `It was run by Changmin of 2AM, Big Hit's senior labelmate at the time.` } }, { title: { en: `How to get there` }, text: { en: `Apgujeong Rodeo area.` } } ] },
    { id: 172, name: "The Troubadour", group: "BTS", member: "All", country: "United States", city: "West Hollywood, CA", category: "Concerts", year: "2014", ytId: "gCOw09Xy4i0", episodeLink: "https://www.youtube.com/watch?v=gCOw09Xy4i0", address: "9081 Santa Monica Blvd, West Hollywood, CA 90069", lat: 34.0809, lng: -118.39, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>During their American Hustle Life training, the members were tasked with handing out flyers and performing on the streets to learn how to engage a crowd from scratch. They performed at this iconic playground in Hongdae.</p><p>Watching the global superstars awkwardly try to convince passersby to watch their street performance is incredibly humbling today. The playground remains a symbol of grassroots Korean music culture.</p>`,
        fr: `<p>Le 13 juillet 2014, pendant leur séjour à Los Angeles pour American Hustle Life, BTS a donné un showcase surprise au Troubadour, le club légendaire de West Hollywood où des artistes tels qu'Elton John ou Guns N' Roses ont fait leurs débuts.</p><p>Pour un groupe qui remplissait encore des salles de quelques milliers de places au pays, se produire sur cette scène chargée d'histoire fut un moment rare et discret dans l'histoire musicale live de LA — un contraste saisissant avec les tournées de stades qui suivraient à peine quelques années plus tard.</p>` },
      tipsList: [ { title: { en: `Weekend Busking` }, text: { en: `Visit on a Friday or Saturday night to watch the current generation of young dancers covering BTS songs right where they once stood.` } }, { title: { en: `The Slide Photo` }, text: { en: `Recreate the casual photos the members took near the playground equipment.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Free public park in the center of the bustling Hongdae university district.` } }, { title: { en: `What to expect` }, text: { en: `A small playground surrounded by street art, often filled with indie musicians busking at night.` } }, { title: { en: `How to get there` }, text: { en: `Hongik University Station (Line 2), exit 9. Walk about 10 minutes towards the university.` } } ] },
    { id: 173, name: "XGame Resort (Inje Bungee Jump)", group: "BTS", member: "All", country: "South Korea", city: "Inje-gun, Gangwon-do", category: "Run BTS", year: "2015", ytId: "KrJfIKaXhY4", episodeLink: "https://www.youtube.com/watch?v=KrJfIKaXhY4", address: "221-12 Hapgang-ri, Inje-eup, Inje-gun, Gangwon-do", lat: 38.07, lng: 128.17, img: "https://images.unsplash.com/photo-1546874177-9e664107314e?w=600",
      fullDescription: { en: `<p>In a legendary early episode of Run BTS!, the boys went to Everland to face their fears by bungee jumping. The episode is famous for J-Hope's tearful hesitation and Jungkook's fearless, smiling jump.</p><p>While the park is massive and offers a full day of fun, for ARMYs, walking past the bungee jump tower brings back the hilarious memories of the members screaming their group's name before taking the plunge.</p>`,
        fr: `<p>Dans un épisode légendaire des débuts de Run BTS ! (le Silmido Special), les garçons se sont rendus au XGame Resort, dans les montagnes d'Inje, Gangwon-do, pour affronter leur peur du saut à l'élastique. L'épisode est resté célèbre pour l'hésitation larmoyante de J-Hope et le saut sans peur, tout sourire, de Jungkook.</p><p>Loin du centre de Séoul, la tour de saut du complexe attire encore des ARMY venus revivre les décomptes hurlés des membres avant de sauter à leur tour.</p>` },
      tipsList: [ { title: { en: `The T-Express` }, text: { en: `After seeing the bungee jump, make sure to ride the T-Express, one of the steepest wooden rollercoasters in the world!` } }, { title: { en: `Safari World` }, text: { en: `Don't miss the animal enclosures that the members also visited during their rest time.` } } ],
      practicalInfo: [ { title: { en: `Pricing` }, text: { en: `A full day pass is around 50,000 - 60,000 KRW depending on the season.` } }, { title: { en: `What to expect` }, text: { en: `South Korea's largest theme park, featuring massive rollercoasters and a zoo.` } }, { title: { en: `How to get there` }, text: { en: `Take the Everline light rail to Jeondae-Everland Station, then the free shuttle bus.` } } ] },
    { id: 178, name: "Lotte Card Art Center", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2014", ytId: "MBvunpC8Yw4", episodeLink: "https://www.youtube.com/watch?v=MBvunpC8Yw4", address: "Cheongdam-dong, Gangnam-gu, Seoul", lat: 37.5236, lng: 127.0479, img: "https://upload.wikimedia.org/wikipedia/commons/5/53/Gangnam_street_view.jpg",
      fullDescription: { en: `<p>Before Dark & Wild, BTS launched their breakthrough mini-album Skool Luv Affair (featuring Boy In Luv) with a press and fan showcase at the Baekam Art Hall in February 2014.</p><p>The intimate size of this venue is a stark reminder of their rookie days. Only a few hundred lucky fans got to witness the first ever live performance of Boy In Luv in this small room.</p>`,
        fr: `<p>Avant Dark & Wild, BTS a lancé son mini-album décisif Skool Luv Affair (avec « Boy In Luv ») lors d'un showcase presse et fans au Lotte Card Art Center, à Cheongdam-dong, en février 2014.</p><p>La taille intimiste de cette salle rappelle crûment leurs débuts : seules quelques centaines de fans chanceux ont assisté à la toute première performance live de « Boy In Luv » dans cette petite pièce.</p>` },
      tipsList: [ { title: { en: `The Entrance Walk` }, text: { en: `Walk up the front steps where the members gave their press greetings.` } }, { title: { en: `Close to COEX` }, text: { en: `It is located very close to the COEX Mall (BTS-058), making it easy to visit both in one day.` } } ],
      practicalInfo: [ { title: { en: `Venue Info` }, text: { en: `A relatively small, intimate theater seating around 400 people.` } }, { title: { en: `Access` }, text: { en: `You can view the exterior, but interior access requires an event ticket.` } }, { title: { en: `How to get there` }, text: { en: `Samseong Station (Line 2), exit 8.` } } ] },
    { id: 180, name: "Lotte Museum of Art", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Museums", year: "2019", ytId: "3u6yXh_xQxg", episodeLink: "https://www.youtube.com/watch?v=3u6yXh_xQxg", address: "300 Olympic-ro, Songpa-gu, Seoul", lat: 37.5125, lng: 127.1025, img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Lotte_World_Tower_2017.jpg",
      fullDescription: { en: `<p>Both RM and V have visited exhibitions here, notably the James Jean exhibition. The artist they viewed here eventually created the spectacular Seven Phases artwork based on the BTS members, which was later displayed at the HYBE Insight museum.</p><p>Located high up in the Lotte World Tower complex, the museum hosts vibrant, pop-culture-adjacent contemporary art. It is a great location for fans who want a mix of shopping, entertainment, and modern art.</p>`,
        fr: `<p>RM et V ont tous deux visité des expositions ici, notamment celle de James Jean. Cet artiste a par la suite créé l'œuvre spectaculaire Seven Phases inspirée des membres de BTS, exposée plus tard au musée HYBE Insight.</p><p>Perché en hauteur dans le complexe Lotte World Tower, le musée présente un art contemporain vivant, proche de la pop culture — une belle étape pour les fans qui veulent mêler shopping, divertissement et art moderne.</p>` },
      tipsList: [ { title: { en: `James Jean Connection` }, text: { en: `Knowing that this exhibition sparked a direct collaboration with BTS makes walking through the gallery even more special.` } }, { title: { en: `Lotte Mall` }, text: { en: `Since it is inside the Lotte World Mall, you can combine this with a visit to the Star Avenue (BTS-170).` } } ],
      practicalInfo: [ { title: { en: `Pricing` }, text: { en: `Admission is approximately 15,000 KRW.` } }, { title: { en: `What to expect` }, text: { en: `A modern art museum located on the 7th floor of the Lotte World Tower.` } }, { title: { en: `How to get there` }, text: { en: `Jamsil Station (Lines 2 and 8).` } } ] },
    { id: 181, name: "Palace Theatre (Los Angeles)", group: "BTS", member: "Jimin", country: "United States", city: "Los Angeles, CA", category: "Concerts", year: "2023", ytId: "w6sJ3io9gqg", episodeLink: "https://www.youtube.com/watch?v=w6sJ3io9gqg", address: "630 S Broadway, Los Angeles, CA", lat: 34.043, lng: -118.2519, img: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Los_Angeles_Downtown_Skyline.jpg",
      fullDescription: { en: `<p>The grand, sweeping performance spaces filled with marching dancers in Jimin's powerful hip-hop track Set Me Free Pt. 2 utilized the historic theater district of downtown Los Angeles, echoing classical architecture.</p><p>The ornate detailing, balconies, and majestic arches of historic Broadway theaters provide an imposing, theatrical stage that elevates Jimin's fierce choreography to an artistic masterpiece.</p>`,
        fr: `<p>Les vastes espaces scéniques traversés par des danseurs en formation dans le puissant titre hip-hop de Jimin « Set Me Free Pt. 2 » ont été tournés dans le quartier historique des théâtres du centre-ville de Los Angeles, à l'architecture classique.</p><p>Les détails ornementés, les balcons et les arches majestueuses de ces théâtres historiques de Broadway offrent une scène théâtrale imposante, qui élève la chorégraphie féroce de Jimin au rang d'œuvre d'art.</p>` },
      tipsList: [ { title: { en: `Historic Broadway` }, text: { en: `Walk down South Broadway to view the magnificent historic movie palaces that line the street.` } }, { title: { en: `Architectural Tours` }, text: { en: `Check local LA preservation groups (like LA Conservancy) which occasionally offer walking tours inside these historic theaters.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Exterior viewing; interior access depends on scheduled theatre events or guided architectural tours.` } }, { title: { en: `What to expect` }, text: { en: `One of the oldest ornate movie palaces in Broadway Theater District, featuring a stunning French Baroque exterior.` } }, { title: { en: `How to get there` }, text: { en: `Downtown LA, near Pershing Square.` } } ] },
    { id: 182, name: "Spain (Mallorca / Historic Streets)", group: "BTS", member: "V", country: "Spain", city: "Mallorca", category: "Bon Voyage", year: "2023", ytId: "HYzyRHA9A8o", episodeLink: "https://www.youtube.com/watch?v=HYzyRHA9A8o", address: "Palma de Mallorca, Spain", lat: 39.5696, lng: 2.6502, img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Mallorca_coastline.jpg",
      fullDescription: { en: `<p>For his soulful R&B solo tracks Love Me Again and Rainy Days, V traveled to the Mediterranean island of Mallorca in Spain. The glowing cave sequences and the vintage hotel hallway scenes were shot across the island.</p><p>The warm, golden lighting of the Mallorcan caves and the nostalgic European hotel rooms created a cozy, intimate atmosphere that perfectly embodied Taehyung's distinct retro artistic vision.</p>`,
        fr: `<p>Pour ses titres solo R&B tout en soul « Love Me Again » et « Rainy Days », V s'est rendu sur l'île méditerranéenne de Majorque, en Espagne. Les scènes de grottes lumineuses et de couloirs d'hôtel vintage ont été tournées à travers l'île.</p><p>La lumière chaude et dorée des grottes majorquines et les chambres d'hôtel européennes nostalgiques ont créé une atmosphère intime et cosy, parfaitement fidèle à la vision artistique rétro si particulière de Taehyung.</p>` },
      tipsList: [ { title: { en: `Historic Old Town` }, text: { en: `Explore the cobblestone streets and Gothic architecture of Palma's old town to feel the European aesthetic.` } }, { title: { en: `Cave Explorations` }, text: { en: `Mallorca is famous for its breathtaking underground cave systems (like Cuevas del Drach) that inspired the music video's look.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Public streets and historic European cave/hotel locations.` } }, { title: { en: `What to expect` }, text: { en: `Breathtaking Mediterranean coastal views, ancient stone alleyways, and cozy vintage European hotel interiors.` } }, { title: { en: `How to get there` }, text: { en: `Flew into Palma de Mallorca Airport (PMI) from mainland Europe.` } } ] },
    { id: 183, name: "Mojave Desert (Palmdale / California)", group: "BTS", member: "Suga", country: "United States", city: "Palmdale, CA", category: "MV Location", year: "2020-2023", ytId: "qGjLVwlbVJg", episodeLink: "https://www.youtube.com/watch?v=qGjLVwlbVJg", address: "Mojave Desert, California, USA", lat: 34.5794, lng: -118.1165, img: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Mojave_Desert_landscape.jpg",
      fullDescription: { en: `<p>For the cinematic Western-meets-historical aesthetics of Agust D's solo music videos (such as the sprawling highway scenes in Haegeum and artistic teasers), production took place in the stark, cinematic expanses of the Mojave Desert.</p><p>The raw, isolated environment of the desert perfectly mirrors the rebellious, independent spirit of Suga's Agust D alter-ego, capturing the feeling of riding alone through the American frontier.</p>`,
        fr: `<p>Pour l'esthétique cinématographique, entre western et fresque historique, des clips solo d'Agust D (comme les vastes scènes de route de « Haegeum » et ses teasers artistiques), le tournage s'est déroulé dans les étendues brutes et cinématographiques du désert de Mojave.</p><p>L'environnement brut et isolé du désert reflète parfaitement l'esprit rebelle et indépendant de l'alter ego Agust D de Suga, capturant cette sensation de rouler seul à travers la frontière américaine.</p>` },
      tipsList: [ { title: { en: `Golden Hour Photography` }, text: { en: `The lighting at sunrise and sunset across the desert flats is legendary for photography.` } }, { title: { en: `Stay Hydrated` }, text: { en: `Temperatures can rise to extreme levels; always carry ample water if exploring unpaved tracks.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Public desert areas and highways; safety precautions for extreme heat are necessary.` } }, { title: { en: `What to expect` }, text: { en: `Vast, arid desert landscapes featuring sparse Joshua trees, dusty roads, and stark mountain horizons.` } }, { title: { en: `How to get there` }, text: { en: `Accessible via a 1.5 to 2-hour drive north from Los Angeles.` } } ] },
    { id: 184, name: "Universal Studios Backlot (Agust D Palace Set)", group: "BTS", member: "Suga", country: "United States", city: "Los Angeles, CA", category: "MV Location", year: "2020", ytId: "3YqQoycUnWc", episodeLink: "https://www.youtube.com/watch?v=3YqQoycUnWc", address: "100 Universal City Plaza, Universal City, CA", lat: 34.1381, lng: -118.3534, img: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Universal_Studios_Hollywood.jpg",
      fullDescription: { en: `<p>The breathtaking opening and closing sequences of the record-shattering Daechwita music video—where Agust D walks through a bustling historical marketplace and stands before a royal palace courtyard—utilised specialized cinematic backlots.</p><p>The fusion of traditional Korean royal garments with a modern hip-hop swagger created an iconic visual identity for Suga's solo work, blending ancient heritage with futuristic rebellion.</p>`,
        fr: `<p>Les saisissantes séquences d'ouverture et de fermeture du clip record « Daechwita » — où Agust D traverse un marché historique animé et se dresse devant la cour d'un palais royal — ont été tournées sur des backlots de cinéma spécialisés.</p><p>La fusion des habits royaux coréens traditionnels avec une attitude hip-hop moderne a créé une identité visuelle iconique pour le travail solo de Suga, mêlant héritage ancien et rébellion futuriste.</p>` },
      tipsList: [ { title: { en: `Studio Tram Tour` }, text: { en: `Catch the backlot tour to see how different historic eras can be simulated on a single studio plot.` } }, { title: { en: `Global Fan Landmark` }, text: { en: `Daechwita remains one of the most viewed solo K-pop music videos in history.` } } ],
      practicalInfo: [ { title: { en: `Pricing` }, text: { en: `Theme park admission required.` } }, { title: { en: `What to expect` }, text: { en: `Specialized backlot areas mimicking traditional or historic architecture used for global film productions.` } }, { title: { en: `How to get there` }, text: { en: `Universal City Metro Station, Los Angeles.` } } ] },
    { id: 185, name: "Vinyl & Plastic by Hyundai Card", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2020", episodeLink: "https://english.visitseoul.net/hallyu/Traces-of-BTS-in-Seouls-Hot-Places/ENN036007", address: "248 Itaewon-ro, Yongsan-gu, Seoul", lat: 37.5333, lng: 126.9958, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>On September 21, 2020, BTS filmed a Tiny Desk Concert for NPR at Vinyl & Plastic in Itaewon, a music space built by Hyundai Card, performing three songs backed by a live band in retro outfits.</p><p>This Hyundai-branded cultural space, more listening bar than shop, let BTS showcase the group's link to Hyundai — one of their longtime brand partners — in an intimate, music-first setting rather than a traditional ad shoot.</p>`,
        fr: `<p>Le 21 septembre 2020, BTS a tourné un Tiny Desk Concert pour NPR chez Vinyl & Plastic, à Itaewon, un espace musical créé par Hyundai Card, interprétant trois titres accompagnés d'un groupe live en tenues rétro.</p><p>Cet espace culturel signé Hyundai, plus proche d'un listening bar que d'une boutique, a permis à BTS de mettre en avant son lien avec Hyundai — l'un de ses partenaires de longue date — dans un cadre intimiste centré sur la musique plutôt qu'un tournage publicitaire classique.</p>` },
      tipsList: [ { title: { en: `Browse first` }, text: { en: `The vinyl and CD stacks are organized for actual crate-digging, not just display.` } }, { title: { en: `Listen in` }, text: { en: `Turntables and cassette players are set up for visitors to try records on the spot.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Open Tue–Sat 12–9 p.m., Sun 12–6 p.m. (closed Mondays); free entry.` } }, { title: { en: `What to expect` }, text: { en: `A record store and listening space holding over ten thousand vinyl records and CDs, run by card company Hyundai Card as a cultural venue.` } }, { title: { en: `How to get there` }, text: { en: `5-minute walk from Exit 3 of Hangangjin Station (Line 6).` } } ] },
    { id: 186, name: "Line Friends Flagship Store Myeongdong", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2017", episodeLink: "https://www.tripadvisor.com/Attraction_Review-g294197-d10253186-Reviews-LINE_Friends_Flagship_Store_Myeongdong_Station-Seoul.html", address: "9 Myeongdong 8-na-gil, Jung-gu, Seoul 04536", lat: 37.5636, lng: 126.9834, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>BT21 — the eight characters (Koya, RJ, Shooky, Mang, Chimmy, Tata, Cooky and Van) that BTS co-designed with Line Friends in 2017 — is sold across Line Friends stores nationwide, with Myeongdong as one of the busiest flagship locations for tourists.</p><p>Each BT21 character was designed to reflect one BTS member's personality, making the store one of the few places to see the full lineup of official character goods together.</p>`,
        fr: `<p>BT21 — les huit personnages (Koya, RJ, Shooky, Mang, Chimmy, Tata, Cooky et Van) que BTS a co-créés avec Line Friends en 2017 — est vendu dans les boutiques Line Friends à travers tout le pays, celle de Myeongdong étant l'une des plus fréquentées par les touristes.</p><p>Chaque personnage BT21 a été conçu pour refléter la personnalité d'un membre de BTS, faisant de cette boutique l'un des rares endroits où voir la collection complète des goodies officiels réunis.</p>` },
      tipsList: [ { title: { en: `Photo op` }, text: { en: `The giant Brown figure at the entrance is a popular photo spot; queues form on weekends.` } }, { title: { en: `Combine with` }, text: { en: `Myeongdong's street food and shopping strip, right outside the store.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Open daily, free entry; a giant Brown statue greets visitors at the door.` } }, { title: { en: `What to expect` }, text: { en: `Two floors of Line Friends and BT21 merchandise: plushies, stationery, accessories.` } }, { title: { en: `How to get there` }, text: { en: `1-minute walk from Myeongdong Station (Line 4), Exit 6.` } } ] },
    { id: 187, name: "Line Friends Flagship Store Hongdae", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Fashion", year: "2018", episodeLink: "https://www.koreaetour.com/line-friends-store-korea/", address: "Hongdae, Mapo-gu, Seoul", lat: 37.5563, lng: 126.9236, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Hongdae's Line Friends store is regularly cited by fans as one of the biggest BT21 collections in Seoul, alongside the Myeongdong and Itaewon locations.</p><p>The Hongdae neighborhood's youth and street-art culture makes it a natural fit for the brand's colorful, playful retail concept.</p>`,
        fr: `<p>La boutique Line Friends de Hongdae est régulièrement citée par les fans comme l'une des plus grandes collections BT21 de Séoul, aux côtés de celles de Myeongdong et Itaewon.</p><p>La culture jeune et street-art du quartier de Hongdae en fait un cadre naturel pour le concept de vente coloré et ludique de la marque.</p>` },
      tipsList: [ { title: { en: `Time it right` }, text: { en: `Go on a weekday to avoid the Hongdae weekend crowds.` } }, { title: { en: `Combine with` }, text: { en: `Hongdae's street performances and indie shops nearby.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Open daily, free entry.` } }, { title: { en: `What to expect` }, text: { en: `One of the largest Line Friends stores in Seoul, with a dedicated BT21 section spread over several floors.` } }, { title: { en: `How to get there` }, text: { en: `Short walk from Hongik University Station (Lines 2, Gyeongui-Jungang, Airport Railroad).` } } ] },
    { id: 188, name: "BTS POP-UP: MAP OF THE SOUL Showcase", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Pop-up Store", year: "2020-2021", ytId: "PEWbNZvdEao", episodeLink: "https://www.youtube.com/watch?v=PEWbNZvdEao", address: "51 Garosu-gil, Gangnam-gu, Seoul", lat: 37.5199, lng: 127.0233, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Big Hit IP's first Korean showcase of this kind took over a three-story building on trendy Garosu-gil, later expanding the concept to Tokyo, Singapore, Bangkok, Manila and Taipei.</p><p>Visitors entered through a signature blue door into a purple-lit terrace filled with lightstick displays, receiving a branded rubber bracelet as a souvenir of the visit.</p>`,
        fr: `<p>Ce premier pop-up coréen de ce genre signé Big Hit IP a investi un immeuble de trois étages sur la branchée Garosu-gil, avant que le concept ne s'étende à Tokyo, Singapour, Bangkok, Manille et Taipei.</p><p>Les visiteurs entraient par une porte bleue emblématique vers une terrasse baignée de lumière violette remplie d'expositions de lightsticks, repartant avec un bracelet en caoutchouc de la marque en souvenir.</p>` },
      tipsList: [ { title: { en: `Fan pilgrimage` }, text: { en: `The building is a normal commercial space today; nothing on-site marks its BTS history.` } }, { title: { en: `Look up` }, text: { en: `The official "Bangtan Bomb" tour video (BTS's own YouTube channel) shows the full walkthrough of the showcase.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Ran Oct 23, 2020 to Jan 24, 2021, by reservation only, capped visits per person.` } }, { title: { en: `What it was` }, text: { en: `A three-story pop-up across Garosu-gil built around the Map of the Soul: 7 album, with themed rooms for tracks like "Black Swan", "ON" and "Dynamite".` } }, { title: { en: `Now` }, text: { en: `The pop-up itself has since closed; the address is included for historical/fan-pilgrimage reference.` } } ] },
    { id: 189, name: "BTS POP-UP: SPACE OF BTS (Lotte Department Store)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Pop-up Store", year: "2021", episodeLink: "https://hybecorp.com/eng/news/news/573?companyCode=&page=23", address: "Lotte Department Store Main Branch, 81 Namdaemun-ro, Jung-gu, Seoul", lat: 37.5647, lng: 126.9812, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>"BTS POP-UP: SPACE OF BTS" was Big Hit IP's partnership with Lotte Department Store, bringing BT21/TinyTAN-adjacent lifestyle merchandise into a mainstream department store setting rather than a standalone fan pop-up.</p><p>The Lotte partnership marked one of the clearest crossovers between BTS's merchandising universe and a major Korean retail conglomerate, alongside Lotte World and Lotte Duty Free's own BTS-branded spaces.</p>`,
        fr: `<p>« BTS POP-UP: SPACE OF BTS » était le partenariat de Big Hit IP avec le grand magasin Lotte, amenant des produits lifestyle proches de BT21/TinyTAN dans un grand magasin généraliste plutôt que dans un pop-up dédié aux fans.</p><p>Ce partenariat avec Lotte a marqué l'un des croisements les plus nets entre l'univers merchandising de BTS et un grand conglomérat coréen de la distribution, aux côtés des espaces BTS propres à Lotte World et Lotte Duty Free.</p>` },
      tipsList: [ { title: { en: `Shop smart` }, text: { en: `Items were basic fashion and household goods, priced closer to retail than limited-run concert merch.` } }, { title: { en: `Combine with` }, text: { en: `The Lotte Duty Free "Star Avenue" BTS space, also in Jung-gu.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Ran domestically until February 28, 2021, inside regular Lotte Department Store operating hours.` } }, { title: { en: `What it was` }, text: { en: `A retail pop-up centered on everyday goods and basic fashion rather than concert merch: household items, stationery, and casualwear carrying BTS branding.` } }, { title: { en: `Where else` }, text: { en: `The same concept also ran in Lotte stores in Busan, Daegu and Gwangju.` } } ] },
    { id: 190, name: "HYBE Headquarters Pop-Up Space (2026)", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Pop-up Store", year: "2026", episodeLink: "https://www.koreaherald.com/article/10700759", address: "HYBE Headquarters, Yongsan-gu, Seoul", lat: 37.5334, lng: 126.99, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>HYBE opened this dedicated pop-up venue at its Yongsan headquarters in March 2026, with the launch exhibition built around BTS's album "Arirang".</p><p>The reservation system through Weverse is meant to manage the crowds of fans who already gather outside the HYBE building daily to take photos, even without an event running.</p>`,
        fr: `<p>HYBE a ouvert cet espace pop-up dédié au sein de son siège de Yongsan en mars 2026, avec une exposition de lancement construite autour de l'album « Arirang » de BTS.</p><p>Le système de réservation via Weverse vise à gérer les foules de fans qui se rassemblent déjà quotidiennement devant le bâtiment HYBE pour prendre des photos, même en dehors de tout événement.</p>` },
      tipsList: [ { title: { en: `Book ahead` }, text: { en: `Entry requires a Weverse reservation; walk-ins are not guaranteed a spot.` } }, { title: { en: `Follow updates` }, text: { en: `New pop-up concepts are announced via HYBE Merch's official X (Twitter) account and artist Weverse communities.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Entry is by reservation only, booked through the Weverse fan platform.` } }, { title: { en: `What to expect` }, text: { en: `A rotating pop-up space whose concept and decor change with each HYBE artist's album releases, including a large 17.5m-wide LED wall.` } }, { title: { en: `How to get there` }, text: { en: `Inside HYBE's headquarters building in Yongsan, central Seoul.` } } ] },
    { id: 191, name: "Leeum Museum of Art", group: "BTS", member: "Namjoon", country: "South Korea", city: "Seoul", category: "Museums", year: "2019", episodeLink: "https://www.koreatimes.co.kr/lifestyle/travel-food/20260317/rms-seoul-art-trail-museum-and-gallery-guide-for-army-visiting-during-bts-comeback", address: "60-16 Itaewon-ro 55-gil, Yongsan-gu, Seoul", lat: 37.5384, lng: 126.9995, img: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600",
      fullDescription: { en: `<p>RM's frequent visits to Leeum — including the 2019 David Hockney solo show — are credited by Korean media with sparking the "Namjoon Tour", where fans retrace the galleries and museums he posts about on social media.</p><p>Officially recognized by South Korea's tourism board: VisitKorea's "RM's Pick: Seoul Art Tour" itinerary names Leeum among the five key stops on his art trail, alongside SeMA, Gana Art Center and the National Museum of Korea.</p>`,
        fr: `<p>Les visites fréquentes de RM au Leeum — dont l'exposition personnelle de David Hockney en 2019 — sont créditées par les médias coréens d'avoir lancé le « Namjoon Tour », où les fans refont le parcours des galeries et musées qu'il partage sur les réseaux sociaux.</p><p>Reconnu officiellement par l'office du tourisme sud-coréen : l'itinéraire « RM's Pick: Seoul Art Tour » de VisitKorea cite le Leeum parmi les cinq étapes clés de son parcours artistique, aux côtés du SeMA, du Gana Art Center et du Musée national de Corée.</p>` },
      tipsList: [ { title: { en: `Don't rush` }, text: { en: `The three museum buildings each have a distinct architectural identity; budget at least 2 hours.` } }, { title: { en: `Audio guide` }, text: { en: `Highly recommended; free English guided tours run weekends at 3pm.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Closed Mondays; timed-entry tickets recommended in advance, especially on weekends.` } }, { title: { en: `What to expect` }, text: { en: `Three connected buildings (Mario Botta, Jean Nouvel, Rem Koolhaas) housing traditional Korean art, modern/contemporary art, and an outdoor sculpture garden.` } }, { title: { en: `How to get there` }, text: { en: `Hangangjin Station (Line 6), Exit 1, short uphill walk.` } } ] },
    { id: 192, name: "San Francisco Museum of Modern Art (SFMOMA)", group: "BTS", member: "Namjoon", country: "United States", city: "San Francisco, CA", category: "Museums", year: "2026", episodeLink: "https://www.sfmoma.org/press-release/rm-and-sfmoma-partner-on-first-exhibition-of-its-kind/", address: "151 Third St, San Francisco, CA 94103", lat: 37.7857, lng: -122.4011, img: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600",
      fullDescription: { en: `<p>"RM x SFMOMA" is the first museum exhibition RM has personally curated, bringing works from his private collection to the US for many for the first time.</p><p>The show cements a reputation Korean media had already given him: the Korea Art Market's 2025 report named RM one of the 20 most influential figures in the Korean art market, calling him a "passionate art collector and cultural influencer."</p>`,
        fr: `<p>« RM x SFMOMA » est la première exposition muséale personnellement organisée par RM, qui présente pour la première fois aux États-Unis des œuvres issues de sa collection privée.</p><p>Cette exposition confirme une réputation que les médias coréens lui attribuaient déjà : le rapport 2025 du Korea Art Market a désigné RM comme l'une des 20 personnalités les plus influentes du marché de l'art coréen, le qualifiant de « collectionneur d'art passionné et d'influenceur culturel ».</p>` },
      tipsList: [ { title: { en: `Plan around SF` }, text: { en: `SFMOMA sits in the SoMA district, walkable from Yerba Buena Gardens and the Contemporary Jewish Museum.` } }, { title: { en: `Go bilingual` }, text: { en: `Wall texts and labels for the show were written by RM himself, in both English and Korean.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Ticketed special exhibition; book ahead once the show opens, as an RM-linked exhibit is expected to draw large crowds.` } }, { title: { en: `What to expect` }, text: { en: `About 200 works pairing pieces from RM's personal collection (Yun Hyong-keun, Chang Ucchin, Kim Whanki and others) with SFMOMA's own holdings.` } }, { title: { en: `Extras` }, text: { en: `RM recorded a bilingual (English/Korean) audio guide himself and curated an in-gallery music playlist to accompany the art.` } } ] },
    { id: 193, name: "Busan Asiad Main Stadium", group: "BTS", member: "All", country: "South Korea", city: "Busan", category: "Concerts", year: "2022", episodeLink: "https://en.wikipedia.org/wiki/BTS:_Yet_to_Come_in_Cinemas", address: "344 World Cup-daero, Yeonje-gu, Busan", lat: 35.1902, lng: 129.0578, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>On October 15, 2022, BTS performed for free in front of the city of Busan to support its bid for the 2030 World Expo, playing to a completely packed stadium broadcast live around the world.</p><p>Just two days later, the announcement of their mandatory military service dropped, turning this concert into an emotionally loaded moment for fans — later immortalized on the big screen in the concert film "BTS: Yet to Come in Cinemas," released in February 2023 across 110 countries.</p>`,
        fr: `<p>Le 15 octobre 2022, BTS y a donné un concert gratuit devant environ 55 000 fans, en soutien à la candidature de Busan pour l'Exposition universelle 2030, retransmis dans le monde entier sur Weverse.</p><p>Ce concert s'est révélé être la dernière prestation du groupe au complet avant l'annonce de leur incorporation militaire, seulement deux jours plus tard, lui conférant une portée durable aux yeux des fans ; une version cinéma en a ensuite été tirée sous le titre « BTS: Yet to Come in Cinemas ».</p>` },
      tipsList: [ { title: { en: `Look out for` }, text: { en: `The first live performance of "Run BTS," from the anthology album Proof, captured that night.` } }, { title: { en: `Combine with` }, text: { en: `Haeundae Beach, where a giant outdoor screening was also held that same evening.` } } ],
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Multi-use stadium still in active use (football, athletics); check the schedule before visiting outside of an event.` } }, { title: { en: `How to get there` }, text: { en: `Sports Complex Station (Busan Metro Line 3), direct exit toward the stadium.` } }, { title: { en: `Context` }, text: { en: `The concert, announced to support Busan's bid for the 2030 World Expo, drew around 50,000 attendees on site and nearly 49 million streaming views on Weverse.` } } ] },

    // ==========================================
    // NOUVEAUX LIEUX (source : document fourni le 04/09/2026, liens et contenu vérifiés)
    // ==========================================
    { id: 194, name: "Le Méridien Moxy Myeongdong (Jimin Exhibition Seoul)", group: "BTS", member: "Jimin", country: "South Korea", city: "Seoul", category: "Pop-up Store", year: "2024", episode: "[HYBE INSIGHT] JIMIN Exhibition \"The Truth Untold\" — Oct 11 to Nov 3, 2024", episodeLink: "https://www.usbtsarmy.com/latest-news-and-events/hybe-insight-jimin-exhibition", address: "1-2F, 38 Myeongdong 8na-gil, Jung-gu, Seoul", lat: 37.5636, lng: 126.9834, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>In late 2024, HYBE Insight took over two floors of a hotel in the heart of Myeongdong for Jimin's first solo exhibition, "The Truth Untold" — a deeply personal walk through the concepts, photography and behind-the-scenes footage of his solo album era.</p><p>Fans queued through Myeongdong's busiest shopping street for a chance to see unreleased content and set pieces up close, turning a stretch of the city better known for skincare shops and street food into a pilgrimage site for the exhibition's run.</p>` },
      practicalInfo: [ { title: { en: `Format` }, text: { en: `Ticketed, limited-run pop-up exhibition — it closed November 3, 2024 and does not have a permanent home.` } }, { title: { en: `What to expect` }, text: { en: `Multiple themed rooms with photography, video, and physical set pieces from the "Truth Untold" concept.` } } ],
      tipsList: [ { title: { en: `Check for a return run` }, text: { en: `HYBE Insight exhibitions sometimes tour (this one later had Los Angeles and New York legs) — check official HYBE/Weverse channels before planning a trip around it.` } } ] },
    { id: 195, name: "Ace Mission Studios (Jimin Exhibition Los Angeles)", group: "BTS", member: "Jimin", country: "USA", city: "Los Angeles", category: "Pop-up Store", year: "2024", episode: "Jimin \"The Truth Untold\" — Los Angeles leg, late 2024", episodeLink: "https://jiminthetruthuntold.com/", address: "516 S Mission Rd, Los Angeles, CA 90033", lat: 34.0402, lng: -118.2115, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>After its Seoul debut, Jimin's "The Truth Untold" exhibition crossed the Pacific for a Los Angeles run at Ace Mission Studios, a converted industrial space east of Downtown LA popular for large-scale pop-up experiences.</p><p>The LA leg drew both local and international ARMY who had missed the original Seoul dates, cementing the exhibition as a genuine world tour rather than a one-off Seoul event.</p>` },
      practicalInfo: [ { title: { en: `Format` }, text: { en: `Ticketed, limited-run pop-up exhibition tied to specific dates in late 2024 — check official channels before visiting, as it does not have a permanent presence.` } } ],
      tipsList: [ { title: { en: `Plan around dates` }, text: { en: `Pop-up exhibitions like this one only run for a few weeks — confirm current dates on official HYBE/Weverse announcements before booking travel around it.` } } ] },
    { id: 196, name: "30 Wall Street (Jimin Exhibition New York)", group: "BTS", member: "Jimin", country: "USA", city: "New York", category: "Pop-up Store", year: "2025", episode: "Jimin \"The Truth Untold\" — New York leg, May 31 to June 29, 2025", episodeLink: "https://www.designscene.net/2025/06/bts-jimin-solo-exhibition.html", address: "30 Wall St, New York, NY 10005", lat: 40.7075, lng: -74.0092, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>The final leg of Jimin's "The Truth Untold" exhibition landed in New York's Financial District in the summer of 2025, taking over the historic 30 Wall Street building for a five-week run.</p><p>Closing out the exhibition's Seoul-LA-New York journey in one of Manhattan's most iconic financial addresses gave the tour a fittingly grand finale, with lines wrapping around the block during opening weekend.</p>` },
      practicalInfo: [ { title: { en: `Format` }, text: { en: `Ticketed, limited-run pop-up exhibition (May 31 – June 29, 2025) — it has since closed.` } }, { title: { en: `How to get there` }, text: { en: `Wall Street subway station (4/5 lines) is a short walk away.` } } ],
      tipsList: [ { title: { en: `Exhibition closed` }, text: { en: `This was the final, time-limited stop of the tour — the address itself (a historic Financial District building) remains worth a look even though the exhibition is over.` } } ] },
    { id: 197, name: "Torres Blancas", group: "BTS", member: "V", country: "Spain", city: "Madrid", category: "MV Location", year: "2024", episode: "\"Rainy Days\" music video (V, Layover) — filmed on the top floor", address: "Avenida de América, 37, 28002 Madrid, Spain", lat: 40.4381, lng: -3.6763, img: "https://commons.wikimedia.org/wiki/Special:FilePath/Madrid%20-%20Edificio%20Torres%20Blancas%2001.JPG",
      fullDescription: { en: `<p>Torres Blancas is one of Madrid's most distinctive modernist buildings, its curved, tree-like concrete silhouette designed by architect Francisco Javier Sáenz de Oíza in the 1960s — a striking, unmistakable landmark on the city's skyline.</p><p>V filmed part of the moody, sun-drenched "Rainy Days" music video from Layover on the building's top floor, its round windows and warm concrete framing some of the video's most striking shots.</p>` },
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Torres Blancas is a private residential building — the interior filming location is not open to the public, but the exterior is a well-known Madrid architectural landmark visible from Avenida de América.` } } ],
      tipsList: [ { title: { en: `Admire from outside` }, text: { en: `Since the interior isn't accessible to visitors, the best way to experience this location is to view (and photograph) the building's famous curved exterior from the street.` } } ] },
    { id: 198, name: "Kelenföld Power Plant", group: "BTS", member: "Jungkook", country: "Hungary", city: "Budapest", category: "MV Location", year: "2023", episode: "\"Standing Next to You\" music video (Jungkook, GOLDEN) — filmed here", episodeLink: "https://en.wikipedia.org/wiki/Standing_Next_to_You", address: "Hengermalom út 60, Budapest 1117, Hungary", lat: 47.4744, lng: 19.0396, img: "https://commons.wikimedia.org/wiki/Special:FilePath/Kelenf%C3%B6ldi%20H%C5%91er%C5%91m%C5%B1.jpg",
      fullDescription: { en: `<p>Kelenföld Power Plant is a decommissioned Art Deco power station in Budapest, celebrated for its ornate 1920s-30s industrial architecture and often used as a filming location thanks to its dramatic, atmospheric interior halls.</p><p>Jungkook filmed scenes for "Standing Next to You," the lead single from his solo album GOLDEN, inside the plant's grand machine hall — its retro-futuristic control panels and warm lighting giving the video's dance sequences a striking industrial-glam backdrop.</p>` },
      practicalInfo: [ { title: { en: `Access` }, text: { en: `A working heritage site — the plant occasionally opens for guided tours and events; it is not a standard walk-in tourist attraction, so check current opening details before visiting.` } } ],
      tipsList: [ { title: { en: `Combine with` }, text: { en: `Budapest has several other Art Deco and industrial-heritage sites nearby worth pairing with a visit here if the plant itself is closed to the public on the day.` } } ] },
    { id: 199, name: "KSPO Dome (Agust D D-Day The Final)", group: "BTS", member: "Suga", country: "South Korea", city: "Seoul", category: "Concerts", year: "2023", episode: "Agust D Tour 'D-Day' THE FINAL — Aug 4-6, 2023, 38,523 attendees", episodeLink: "https://en.wikipedia.org/wiki/D-Day_Tour", address: "10 Olympic-ro 42-gil, Songpa-gu, Seoul", lat: 37.5206, lng: 127.1265, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>KSPO Dome (formerly Olympic Gymnastics Arena), part of the Seoul Olympic Park complex, hosted the closing shows of Agust D's solo "D-Day" tour in August 2023 — the final stop of SUGA's first-ever solo world tour.</p><p>Over three nights and roughly 38,500 attendees, these shows closed out a tour that had taken Agust D across Asia, North America and Japan, marking a milestone as the first BTS member to headline a full solo world tour.</p>` },
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Multi-purpose indoor arena inside Seoul Olympic Park, still active for concerts and sporting events — check the venue calendar before visiting.` } }, { title: { en: `How to get there` }, text: { en: `Mongchontoseong Station (Seoul Subway Line 8) or Olympic Park Station (Line 5), both within walking distance.` } } ],
      tipsList: [ { title: { en: `Combine with` }, text: { en: `Seoul Olympic Park itself is worth exploring — sculpture gardens, museums and several other concert venues (including KSPO Dome's neighbors) sit within the same complex.` } } ] },
    { id: 200, name: "Jamsil Indoor Stadium (Agust D D-Day Seoul)", group: "BTS", member: "Suga", country: "South Korea", city: "Seoul", category: "Concerts", year: "2023", episode: "Agust D Tour 'D-Day' — Seoul leg, June 24-25 2023", episodeLink: "https://en.wikipedia.org/wiki/D-Day_Tour", address: "10 Baekjegobun-ro 45-gil, Songpa-gu, Seoul", lat: 37.5168, lng: 127.0719, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Jamsil Indoor Stadium, sitting right beside Seoul Olympic Stadium in the wider Jamsil Sports Complex, hosted the opening Seoul shows of Agust D's "D-Day" solo tour in June 2023 — the very first stop of SUGA's debut solo world tour.</p><p>As the hometown opening of a genuinely historic tour (the first solo world tour by a BTS member), these two nights carried extra emotional weight for the Seoul crowd, setting the tone for the year-long run that would follow.</p>` },
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Indoor arena within the Jamsil Sports Complex, still active for concerts and sporting events — check the venue calendar before visiting.` } }, { title: { en: `How to get there` }, text: { en: `Sports Complex Station (Seoul Subway Line 2), short walk to the Jamsil Sports Complex.` } } ],
      tipsList: [ { title: { en: `Combine with` }, text: { en: `Seoul Olympic Stadium (site of BTS's 2022 "Yet to Come" 10th-anniversary concert) is right next door — an easy double stop on the same visit.` } } ] },
    { id: 201, name: "Gwangju K-Pop Star Street (Chungjang-ro)", group: "BTS", member: "JHope", country: "South Korea", city: "Gwangju, Dong-gu", category: "Landmarks", year: "2024", episode: "j-hope's hometown street, murals + \"Hope World\" message sculpture; final episode of Hope on the Street filmed here", episodeLink: "https://english.visitkorea.or.kr/svc/contents/infoBscView.do?menuSn=508&vcontsId=177161", address: "94 Chungjang-ro, Dong-gu, Gwangju", lat: 35.1499, lng: 126.9169, img: "https://commons.wikimedia.org/wiki/Special:FilePath/Chungjang-ro%2C%20Gwangju.jpg",
      fullDescription: { en: `<p>This downtown Gwangju street was renovated into a K-pop landmark honoring the city's own stars, anchored by a "Hope World" mural and a message sculpture holding 21,800 fan notes to j-hope; his 2024 docuseries Hope on the Street closed its six episodes back here, reuniting him with Neuron, the dance crew he trained with before debuting.</p><p>Renovated into a K-pop landmark honoring the city's own stars, the street is anchored by a "Hope World" mural and a message sculpture holding 21,800 fan notes to j-hope. His 2024 docuseries Hope on the Street closed its six episodes back here, reuniting him with Neuron, the dance crew he trained with before debuting.</p>` },
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Open-air public street, free, best visited evening for the lit media facades.` } }, { title: { en: `How to get there` }, text: { en: `Geumnamno 4-ga Station, Exit 1, short walk.` } } ],
      tipsList: [ { title: { en: `Don't miss` }, text: { en: `The bench decorated with BTS song titles, which became a fan landmark after j-hope posted a proof-shot there himself.` } }, { title: { en: `Best time` }, text: { en: `Evening, for the lit media facades along the street.` } } ] },
    { id: 202, name: "United Nations Headquarters", group: "BTS", member: "All", country: "USA", city: "New York", category: "Landmarks", year: "2018-2021", episode: "RM's three UNICEF Generation Unlimited / LOVE MYSELF speeches (Sept 24 2018, 2020, Sept 20 2021) — the \"Permission to Dance\" video was also filmed here", episodeLink: "https://www.youtube.com/watch?v=ZhJ-LAQ6e_Y", ytId: "ZhJ-LAQ6e_Y", address: "405 E 42nd St, New York, NY 10017", lat: 40.7489, lng: -73.968, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>The United Nations Headquarters became an unlikely but deeply meaningful BTS location when RM addressed the General Assembly three times between 2018 and 2021, speaking on behalf of the group for the UNICEF Generation Unlimited and LOVE MYSELF campaigns — each speech built around the message "speak yourself."</p><p>The site took on a different kind of significance again when BTS filmed part of the "Permission to Dance" music video there in 2021, dancing from the General Assembly Hall out to the gardens overlooking the East River — turning one of the world's most solemn diplomatic stages into the backdrop for one of their most joyful releases.</p>` },
      practicalInfo: [ { title: { en: `Access` }, text: { en: `Guided public tours of UN Headquarters are available (ticketed, ID required) — the General Assembly Hall itself may not always be accessible depending on the day's official proceedings.` } }, { title: { en: `How to get there` }, text: { en: `Grand Central–42nd St subway station, then a 10–15 minute walk east toward the East River.` } } ],
      tipsList: [ { title: { en: `Rewatch first` }, text: { en: `Re-watching RM's 2018 "speak yourself" speech and the "Permission to Dance" music video before visiting makes recognizing the exact spots (the Assembly Hall, the riverside gardens) much more rewarding.` } } ] },
];

// ==========================================
// Messages éphémères "nouveau lieu ajouté"
// ==========================================
// Annonce, au lancement du site (une seule fois par session de navigation — voir
// sessionStorage plus bas), quelques lieux tirés au sort parmi ceux ajoutés récemment.
// NEW_LOCATION_IDS liste les ids concernés : actuellement les 43 lieux de concert des
// tournées historiques (ids 113–155, voir plus haut) — à mettre à jour avec les ids des
// prochains lieux ajoutés le jour où on en ajoutera de nouveaux.
const NEW_LOCATION_IDS = Array.from({ length: 43 }, (_, i) => 113 + i);
const NEW_LOCATION_TOAST_MAX = 4;
const NEW_LOCATION_TOAST_LIFESPAN_MS = 6000;
const NEW_LOCATION_TOAST_GAP_MS = 4500;

function renderOneNewLocationToast(loc) {
    const container = document.getElementById('new-location-toast-container');
    if (!container) return;
    const title = (loc.member && loc.member !== 'All') ? `${loc.member} (${loc.group}) — ${loc.name}` : `${loc.group} — ${loc.name}`;
    const subParts = [];
    const place = [loc.city, loc.country].filter(Boolean).join(', ');
    if (place) subParts.push(place);
    if (loc.year) subParts.push(loc.year);
    let sub = subParts.join(' · ');
    if (loc.episode) sub += (sub ? ' — ' : '') + loc.episode;

    const el = document.createElement('div');
    el.className = 'new-location-toast';
    el.innerHTML = `
        <div class="new-location-toast-icon">📍</div>
        <div class="new-location-toast-body">
            <div class="new-location-toast-label">${t('newLocationToastLabel')}</div>
            <div class="new-location-toast-title"></div>
            <div class="new-location-toast-sub"></div>
        </div>
        <button class="new-location-toast-close" type="button" aria-label="Close">&times;</button>
    `;
    el.querySelector('.new-location-toast-title').textContent = title;
    el.querySelector('.new-location-toast-sub').textContent = sub;
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

    const picks = [];
    const poolCopy = pool.slice();
    const count = Math.min(NEW_LOCATION_TOAST_MAX, poolCopy.length);
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        picks.push(poolCopy.splice(idx, 1)[0]);
    }
    picks.forEach((loc, i) => setTimeout(() => renderOneNewLocationToast(loc), i * NEW_LOCATION_TOAST_GAP_MS + 1200));
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
        visitedOption: "My Visited Places", wishlistOption: "My Wishlist", tripsOption: "My Trips", settingsOption: "Settings", logoutOption: "Logout",
        footerText: "Screen To Street is an independent fan-made guide.", footerMentions: "Legal Notice", footerAbout: "About Us", footerTOS: "Terms of Service", footerPrivacy: "Privacy Policy",
        allGroups: "All Groups", allMembers: "All Members", allAreas: "All Areas", allYears: "All Years", allCategories: "All Categories",
        checkVisited: "I visited this place", checkWishlist: "Add to Wishlist", tripWhich: "Which trip is this for?",
        tripName: "Trip name", tripWhen: "When are you planning to go?", tripFrom: "From", tripTo: "To", tripCreate: "Create trip", tripCancel: "Cancel",
        itiTitle: "Auto-Itinerary Generator", itiDesc: "Select a group, a country, and how many days you stay.", itiCreateBtn: "Create My Guide", itiCatLabel: "Categories (optional, select multiple)", itiExport: "Export Guide as PDF", itiSave: "Save to My Trips",
        noTripsFound: "No trips found.", selectTripToView: "Select a trip to view", deselectTripOption: "— No trip selected —", locationsWord: "location", locationsWordPlural: "locations",
        addAnotherVisit: "Add another visit",
        tabExplore: "Explore", tabMyItinerary: "My Itinerary", yourRating: "Your rating", foodQualityRating: "Food quality", valueForMoneyRating: "Value for money", accessibilityRating: "Easy to access?", siteQualityRating: "Site quality", wishlistStat: "{pct}% of users added this place to their wishlist", friendsVisitedStat: "Visited by: {names}", whenDidYouVisit: "When did you visit?", saveMemory: "Save memory", myVisitTab: "My Visit", tabReviews: "Reviews", tabInfo: "Info", tabStory: "Story", lGroup: "Group:", lMembers: "Members:", lCountry: "Country:", lCity: "City:", lDate: "Date:", lEpisode: "Episode:", lWatch: "Watch:", lOfficialLink: "Official Link", lWatchEpi: "Watch the Episode", lPractical: "Practical information & access", lAddress: "Address", lOpenMap: "Open in Google Maps", lStoryPlace: "The story of this place", lStoryBts: "Following in BTS's footsteps", lTipsTitle: "THE \"SCREEN TO STREET\" TIPS", lHowToGetThere: "How to get there:", memoryNotesLabel: "Your notes (optional)", memoryNotesPlaceholder: "What do you remember about this place?", reviewsCountLabel: "{n} public reviews", reviewsWriteLabel: "Write your review", reviewsComposePlaceholder: "Share what you thought...", reviewsComposeMakePublic: "Make this public", reviewsComposePost: "Post review", memoryPhotoLabel: "Add a photo (optional)", memoryPhotoChoose: "Choose a photo", memoryPhotoRemove: "Remove", memoryMakePublic: "Make this review public (visible to other users)", reviewsLoading: "Loading reviews…", reviewsEmpty: "No public reviews yet for this place — be the first to share yours from the \"My Visit\" tab!", shareTripSub: "Plan it together", shareTripInvite: "Invite", shareTripHint: "Tap the icon next to a name to switch between edit and view-only access.",
        backToMap: "← Back to Map", moreDetails: "More details", openInMaps: "Open in Google Maps", detailsLabel: "Details", aboutPlaceLabel: "About this place",
        accTitle: "Your Account", accChangePhoto: "Change Profile Picture", accResetPhoto: "Reset profile picture", accNameLabel: "Username", accChangeUsernameHint: "Change username", accEmailLabel: "Email address",
        accCountryLabel: "Country you're interested in", accCountryPlaceholder: "Select a country (optional)",
        accActivityTitle: "Your activity", accTrips: "Trips", accVisited: "Visited", accWishlist: "Wishlist", accPasses: "Passes & billing",
        friendsTitle: "Friends", friendsAddPlaceholder: "Add a friend by username", friendsAddBtn: "Add", friendsRequestsLabel: "Friend requests", friendsListLabel: "Your friends", friendsEmpty: "No friends yet — add one by their username above.", friendsAccept: "Accept", friendsDecline: "Decline", friendsCancel: "Cancel", friendsRemove: "Remove", friendsErrNotFound: "No user found with that username.", friendsErrSelf: "You can't add yourself.", friendsSentLabel: "Sent — waiting for a response", friendsRequestFrom: "{username} wants to be friends", shareWithFriendBtn: "Share", shareNoFriends: "Add a friend first to share locations.", sharesEmpty: "Nothing shared with you yet.", sharedByLabel: "{username} shared {location}",
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
        visitTitle: "My Visited Places", visitEmpty: "You haven't marked any place as visited yet. Explore the map and check \"I visited this place\"!",
        destTitle: "Explore Destinations", destSub: "Browse every country and city featured on Screen To Street", destCountries: "Countries", destCities: "Cities", destLocations: "Locations", destViewMap: "View on Map →",
        artTitle: "Explore Artists", artSub: "Discover every group featured on Screen To Street", artGroups: "Groups", artFeatured: "Featured group",

        gateLoginTitle: "Log in to continue", gateLoginDesc: "Log in if you already have an account, or sign up if you don't. You can also continue without an account — 3 locations included, free.", gateContinueFreeText: "Prefer not to create an account?", gateContinueFreeLink: "Continue free — 3 locations included",
        gateEmailLabel: "Email address", gatePasswordLabel: "Password", gateForgotPassword: "Forgot password?",
        gateLoginBtn: "Log in", gateOrDivider: "OR", gateGoogleBtn: "Continue with Google",
        gateSignupPrompt: "Don't have an account?", gateSignupLink: "Sign up",
        gateNoGroupsTitle: "Unlock a group to see the map", gateNoGroupsDesc: "You haven't unlocked any group yet. Click below to choose a pass and start exploring.",
        gateUnlockBtn: "Unlock a group", gateLogoutLink: "Log out",
        gateErrorInvalid: "Incorrect email or password.", gateErrorGeneric: "Something went wrong. Please try again.",
        gateResetSent: "Password reset email sent — check your inbox.", gateEnterEmailFirst: "Please enter your email address first.",
        tourModeLiveIn: "Live now — BTS is live in {city}", tourModeSchedule: "Tour Schedule", tourModeLive: "Live", tourModeDone: "Done", tourModeUpcoming: "Upcoming", tourModePrev: "Previous", tourModeNext: "Next",
        tourModeFooterNote: "Dates as announced by the tour — always double-check official ticketing sites before booking travel.",
        liveBadgeLabel: "Live", liveTimelineTitle: " & upcoming", liveTimelineEmpty: "Nothing scheduled right now — check back soon.", liveTimelineFooterNote: "Only official, publicly announced activities — dates as announced, always double-check official sources before booking travel.", liveFilterAll: "All", liveTodayLive: "Today · Live", liveKindGroup: "Group", liveKindSolo: "Solo", newBadgeLabel: "New", usernameCooldownNote: "You can only change this once every 7 days.", usernameConfirmTitle: "Change your username?", usernameConfirmCancel: "Cancel", usernameConfirmOk: "Yes, change it", subtitle: "Following the footsteps of your favorite artists", backToList: "← Back to list", chooserTourOption: "Tour route", chooserLiveOption: "All live activity", tripShareThis: "+ Share this trip", switchArtistLabel: "Switch artist", groupNoDataYet: "No tour or live data available yet for {group} — check back soon.", tripInviteLabel: "Invite people (optional)", shareTripUsernamePlaceholder: "Their username",
        tourModeGenericLabel: "Tour", tourModeMemberLiveIn: "{member} is live now — {event} in {city}", tourModeLiveNowOne: "Live now", tourModeLiveNowCount: "{n} live now", tourModeMoreCount: "+{n} more",
        tourModeEyebrow: "Tour Mode", tourModeChooseTour: "Choose a tour", tourModeStep: "Step {n} of {total}",
        tourModeHighlights: "Highlights", tourModeSurpriseSong: "Surprise song:", tourModeNoHighlightsYet: "No highlights added yet for this show.", tourModeNoSurpriseSongYet: "Not announced yet.",
        mapLoading: "Loading map…",
        demoTourBtn: "Tour",
        newLocationToastLabel: "New location added",
        paywallTitle: "You've reached your free limit (3/3)", paywallBody: "Loving the secret map? There are still 500+ addresses left to discover! Unlock every filming location, iconic restaurant, and address your idols frequent to plan the trip of your dreams.",
        paywallMonthlyName: "TRAVEL PASS (1 Month)", paywallMonthlyDesc: "Perfect for planning a short trip.", paywallFeatureFullAccess: "Full access to 500+ addresses", paywallFeatureGPS: "Exact GPS coordinates", paywallMonthlyPrice: "€9.99 / month", paywallMonthlyTerms: "No commitment", paywallBuyMonthly: "Get the Travel Pass",
        paywallVipName: "VIP PASS (Lifetime Access)", paywallVipBadge: "BEST VALUE", paywallVipDesc: "For true fans. Pay once, enjoy forever.", paywallFeatureUpdates: "Updates included (new locations added monthly)", paywallFeatureOffline: "Offline mode (coming soon)", paywallVipPrice: "€19.99 (one-time payment)", paywallBuyVip: "Get the VIP Pass",
        paywallActiveTitle: "You already have an active pass",
        paywallActiveDescMonthly: "Your Travel Pass is active until {date}. Thanks for supporting Screen To Street!", paywallActiveDescVip: "Your VIP Pass gives you lifetime access. Thanks for supporting Screen To Street!",
        freeViewsCounter: "{remaining}/3 free locations left",
        paymentTitle: "Complete your purchase", paymentDesc: "Enter your payment details to unlock the full guide.", paymentSummaryLabel: "Selected pass:", paymentTotalLabel: "Total due:",
        cardNum: "Card Number", expiry: "Expiry Date", cvc: "CVC", paySecurely: "Pay securely", processing: "Processing securely…", paymentBackLink: "← Back to map",
        paymentNoAccountWarning: "You don't seem to be logged in — ", paymentNoAccountLink: "sign up first"
    },
    fr: { 
        btnGenerateIti: "Générateur Itinéraire", filterGroup: "GROUPE", filterMember: "MEMBRE", filterArea: "RÉGION", filterYear: "ANNÉE", filterCategories: "CATÉGORIES", 
        locationsCount: "LIEUX", statsCountries: "PAYS", cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", 
        cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter",
        exploreDestOption: "Explorer les Destinations", exploreArtistsOption: "Explorer les Artistes", accountOption: "Mon Compte",
        visitedOption: "Mes Lieux Visités", wishlistOption: "Ma Wishlist", tripsOption: "Mes Voyages", settingsOption: "Paramètres", logoutOption: "Déconnexion",
        footerText: "Screen To Street est un guide indépendant créé par des fans.", footerMentions: "Mentions légales", footerAbout: "Qui sommes-nous", footerTOS: "CGU", footerPrivacy: "Confidentialité",
        allGroups: "Tous les groupes", allMembers: "Tous les membres", allAreas: "Toutes les régions", allYears: "Toutes les années", allCategories: "Toutes les catégories",
        checkVisited: "J'ai visité ce lieu", checkWishlist: "Ajouter à ma Wishlist", tripWhich: "Pour quel voyage ?",
        tripName: "Nom du voyage", tripWhen: "Quand prévoyez-vous d'y aller ?", tripFrom: "De", tripTo: "À", tripCreate: "Créer", tripCancel: "Annuler",
        itiTitle: "Générateur Itinéraire", itiDesc: "Sélectionnez un groupe, un pays, et le nombre de jours.", itiCreateBtn: "Créer mon guide", itiCatLabel: "Catégories (facultatif, sélection multiple)", itiExport: "Exporter en PDF", itiSave: "Sauvegarder dans My Trips",
        noTripsFound: "Aucun voyage trouvé.", selectTripToView: "Sélectionner un voyage", deselectTripOption: "— Aucun voyage sélectionné —", locationsWord: "lieu", locationsWordPlural: "lieux",
        addAnotherVisit: "Ajouter une autre visite",
        tabExplore: "Explorer", tabMyItinerary: "Mon Itinéraire", yourRating: "Votre note", foodQualityRating: "Qualité de la nourriture", valueForMoneyRating: "Rapport qualité/prix", accessibilityRating: "Facilement accessible ?", siteQualityRating: "Qualité du lieu", wishlistStat: "{pct}% des utilisateurs ont ajouté ce lieu à leur wishlist", friendsVisitedStat: "Visité par : {names}", whenDidYouVisit: "Quand avez-vous visité ce lieu ?", saveMemory: "Enregistrer le souvenir", myVisitTab: "Ma Visite", tabReviews: "Avis", tabInfo: "Infos", tabStory: "Histoire", lGroup: "Groupe :", lMembers: "Membres :", lCountry: "Pays :", lCity: "Ville :", lDate: "Date :", lEpisode: "Épisode :", lWatch: "Voir :", lOfficialLink: "Lien officiel", lWatchEpi: "Regarder l'épisode", lPractical: "Informations pratiques & accès", lAddress: "Adresse", lOpenMap: "Ouvrir dans Google Maps", lStoryPlace: "L'histoire de ce lieu", lStoryBts: "Sur les traces de BTS", lTipsTitle: "LES CONSEILS « SCREEN TO STREET »", lHowToGetThere: "Comment s'y rendre :", memoryNotesLabel: "Vos notes (facultatif)", memoryNotesPlaceholder: "Que retenez-vous de ce lieu ?", reviewsCountLabel: "{n} avis publics", reviewsWriteLabel: "Écrivez votre avis", reviewsComposePlaceholder: "Partagez votre avis...", reviewsComposeMakePublic: "Rendre cet avis public", reviewsComposePost: "Publier l'avis", memoryPhotoLabel: "Ajouter une photo (facultatif)", memoryPhotoChoose: "Choisir une photo", memoryPhotoRemove: "Retirer", memoryMakePublic: "Rendre cet avis public (visible par les autres utilisateurs)", reviewsLoading: "Chargement des avis…", reviewsEmpty: "Aucun avis public pour ce lieu pour l'instant — soyez le premier à partager le vôtre depuis l'onglet « Ma Visite » !", shareTripSub: "Organisez-le ensemble", shareTripInvite: "Inviter", shareTripHint: "Touchez l'icône à côté d'un nom pour basculer entre modification et lecture seule.",
        backToMap: "← Retour à la carte", moreDetails: "Plus de détails", openInMaps: "Ouvrir dans Google Maps", detailsLabel: "Détails", aboutPlaceLabel: "À propos de ce lieu",
        accTitle: "Votre compte", accChangePhoto: "Changer la photo de profil", accResetPhoto: "Réinitialiser la photo de profil", accNameLabel: "Identifiant", accChangeUsernameHint: "Changer d'identifiant", accEmailLabel: "Adresse e-mail",
        accCountryLabel: "Pays qui vous intéresse", accCountryPlaceholder: "Choisir un pays (optionnel)",
        accActivityTitle: "Votre activité", accTrips: "Voyages", accVisited: "Visités", accWishlist: "Wishlist", accPasses: "Pass et facturation",
        friendsTitle: "Amis", friendsAddPlaceholder: "Ajouter un ami par pseudo", friendsAddBtn: "Ajouter", friendsRequestsLabel: "Demandes d'ami", friendsListLabel: "Vos amis", friendsEmpty: "Pas encore d'ami — ajoutez-en un par son pseudo ci-dessus.", friendsAccept: "Accepter", friendsDecline: "Refuser", friendsCancel: "Annuler", friendsRemove: "Retirer", friendsErrNotFound: "Aucun utilisateur trouvé avec ce pseudo.", friendsErrSelf: "Vous ne pouvez pas vous ajouter vous-même.", friendsSentLabel: "Envoyée — en attente de réponse", friendsRequestFrom: "{username} souhaite devenir votre ami", shareWithFriendBtn: "Partager", shareNoFriends: "Ajoutez d'abord un ami pour partager des lieux.", sharesEmpty: "Rien n'a encore été partagé avec vous.", sharedByLabel: "{username} a partagé {location}",
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
        gateEmailLabel: "Adresse e-mail", gatePasswordLabel: "Mot de passe", gateForgotPassword: "Mot de passe oublié ?",
        gateLoginBtn: "Se connecter", gateOrDivider: "OU", gateGoogleBtn: "Continuer avec Google",
        gateSignupPrompt: "Vous n'avez pas de compte ?", gateSignupLink: "S'inscrire",
        gateNoGroupsTitle: "Débloquez un groupe pour voir la carte", gateNoGroupsDesc: "Vous n'avez encore débloqué aucun groupe. Cliquez ci-dessous pour choisir un pass et commencer à explorer.",
        gateUnlockBtn: "Débloquer un groupe", gateLogoutLink: "Se déconnecter",
        gateErrorInvalid: "E-mail ou mot de passe incorrect.", gateErrorGeneric: "Une erreur est survenue. Réessayez.",
        gateResetSent: "E-mail de réinitialisation envoyé — vérifiez votre boîte de réception.", gateEnterEmailFirst: "Merci d'indiquer d'abord votre adresse e-mail.",
        tourModeLiveIn: "En direct — BTS est en concert à {city}", tourModeSchedule: "Calendrier de la tournée", tourModeLive: "En direct", tourModeDone: "Terminé", tourModeUpcoming: "À venir", tourModePrev: "Précédent", tourModeNext: "Suivant",
        tourModeFooterNote: "Dates annoncées par la tournée — vérifiez toujours les sites de billetterie officiels avant de réserver un voyage.",
        liveBadgeLabel: "Live", liveTimelineTitle: " et à venir", liveTimelineEmpty: "Rien de prévu pour le moment — revenez bientôt.", liveTimelineFooterNote: "Uniquement des activités officielles et rendues publiques — dates annoncées, vérifiez toujours les sources officielles avant de réserver un voyage.", liveFilterAll: "Tous", liveTodayLive: "Aujourd'hui · En direct", liveKindGroup: "Groupe", liveKindSolo: "Solo", newBadgeLabel: "Nouveau", usernameCooldownNote: "Vous ne pouvez changer ceci qu'une fois tous les 7 jours.", usernameConfirmTitle: "Changer votre identifiant ?", usernameConfirmCancel: "Annuler", usernameConfirmOk: "Oui, changer", subtitle: "Sur les traces de vos artistes préférés", backToList: "← Retour à la liste", chooserTourOption: "Itinéraire de tournée", chooserLiveOption: "Toute l'activité en direct", tripShareThis: "+ Partager ce voyage", switchArtistLabel: "Changer d'artiste", groupNoDataYet: "Aucune donnée de tournée ou de live disponible pour {group} pour le moment — revenez bientôt.", tripInviteLabel: "Inviter des personnes (facultatif)", shareTripUsernamePlaceholder: "Leur pseudo",
        tourModeGenericLabel: "Tournée", tourModeMemberLiveIn: "{member} est en direct — {event} à {city}", tourModeLiveNowOne: "En direct maintenant", tourModeLiveNowCount: "{n} en direct maintenant", tourModeMoreCount: "+{n} autres",
        tourModeEyebrow: "Mode Tournée", tourModeChooseTour: "Choisir une tournée", tourModeStep: "Étape {n} sur {total}",
        tourModeHighlights: "Temps forts", tourModeSurpriseSong: "Chanson surprise :", tourModeNoHighlightsYet: "Aucun temps fort ajouté pour ce concert pour le moment.", tourModeNoSurpriseSongYet: "Pas encore annoncée.",
        mapLoading: "Chargement de la carte…",
        demoTourBtn: "Visite",
        newLocationToastLabel: "Nouveau lieu ajouté",
        paywallTitle: "Vous avez atteint votre limite gratuite (3/3)", paywallBody: "La carte secrète vous plaît ? Il reste encore plus de 500 adresses à découvrir ! Débloquez l'intégralité des lieux de tournages, restaurants iconiques et adresses fréquentées par vos idoles pour préparer le voyage de vos rêves.",
        paywallMonthlyName: "PASS VOYAGE (1 Mois)", paywallMonthlyDesc: "Parfait pour planifier un séjour court.", paywallFeatureFullAccess: "Accès total aux 500+ adresses", paywallFeatureGPS: "Coordonnées GPS exactes", paywallMonthlyPrice: "9,99 € / mois", paywallMonthlyTerms: "Sans engagement", paywallBuyMonthly: "Obtenir le Pass Voyage",
        paywallVipName: "PASS VIP (Accès à vie)", paywallVipBadge: "MEILLEUR CHOIX", paywallVipDesc: "Pour les vrais passionnés. Payez une fois, profitez-en pour toujours.", paywallFeatureUpdates: "Mises à jour incluses (nouveaux lieux ajoutés chaque mois)", paywallFeatureOffline: "Mode Hors-Ligne (bientôt disponible)", paywallVipPrice: "19,99 € (paiement unique)", paywallBuyVip: "Obtenir le Pass VIP",
        paywallActiveTitle: "Vous avez déjà un pass actif",
        paywallActiveDescMonthly: "Votre Pass Voyage est actif jusqu'au {date}. Merci de soutenir Screen To Street !", paywallActiveDescVip: "Votre Pass VIP vous donne un accès à vie. Merci de soutenir Screen To Street !",
        freeViewsCounter: "{remaining}/3 lieux gratuits restants",
        paymentTitle: "Finaliser votre achat", paymentDesc: "Renseignez vos informations de paiement pour débloquer le guide complet.", paymentSummaryLabel: "Pass sélectionné :", paymentTotalLabel: "Total dû :",
        cardNum: "Numéro de carte", expiry: "Date d'expiration", cvc: "CVC", paySecurely: "Payer en toute sécurité", processing: "Traitement sécurisé en cours…", paymentBackLink: "← Retour à la carte",
        paymentNoAccountWarning: "Vous ne semblez pas connecté(e) — ", paymentNoAccountLink: "inscrivez-vous d'abord"
    },
    es: {
        btnGenerateIti: "Generador de Itinerarios", filterGroup: "GRUPO", filterMember: "MIEMBRO", filterArea: "ZONA", filterYear: "AÑO", filterCategories: "CATEGORÍAS",
        locationsCount: "LUGARES", statsCountries: "PAÍSES", cookieText: "Utilizamos cookies para mejorar tu experiencia.", cookiePolicy: "Política de cookies",
        cookieManage: "Gestionar", cookieReject: "Rechazar", cookieAccept: "Aceptar",
        exploreDestOption: "Explorar Destinos", exploreArtistsOption: "Explorar Artistas", accountOption: "Tu Cuenta",
        visitedOption: "Lugares Visitados", wishlistOption: "Mi Lista de Deseos", tripsOption: "Mis Viajes", settingsOption: "Ajustes", logoutOption: "Cerrar sesión",
        footerText: "Screen To Street es una guía independiente creada por fans.", footerMentions: "Aviso Legal", footerAbout: "Sobre Nosotros", footerTOS: "Términos de Servicio", footerPrivacy: "Política de Privacidad",
        allGroups: "Todos los grupos", allMembers: "Todos los miembros", allAreas: "Todas las zonas", allYears: "Todos los años", allCategories: "Todas las categorías",
        checkVisited: "He visitado este lugar", checkWishlist: "Añadir a mi lista", tripWhich: "¿Para qué viaje es esto?",
        tripName: "Nombre del viaje", tripWhen: "¿Cuándo planeas ir?", tripFrom: "Desde", tripTo: "Hasta", tripCreate: "Crear viaje", tripCancel: "Cancelar",
        itiTitle: "Generador de Itinerarios", itiDesc: "Selecciona un grupo, un país y cuántos días te quedas.", itiCreateBtn: "Crear mi guía", itiCatLabel: "Categorías (opcional, selección múltiple)", itiExport: "Exportar guía en PDF", itiSave: "Guardar en Mis Viajes",
        noTripsFound: "No se encontraron viajes.", selectTripToView: "Selecciona un viaje para ver", deselectTripOption: "— Ningún viaje seleccionado —", locationsWord: "lugar", locationsWordPlural: "lugares",
        addAnotherVisit: "Añadir otra visita",
        tabExplore: "Explorar", tabMyItinerary: "Mi Itinerario", yourRating: "Tu valoración", foodQualityRating: "Calidad de la comida", valueForMoneyRating: "Relación calidad-precio", accessibilityRating: "¿Fácil acceso?", siteQualityRating: "Calidad del lugar", wishlistStat: "El {pct}% de los usuarios añadió este lugar a su lista de deseos", friendsVisitedStat: "Visitado por: {names}", whenDidYouVisit: "¿Cuándo visitaste este lugar?", saveMemory: "Guardar recuerdo", myVisitTab: "Mi Visita", tabReviews: "Reseñas", tabInfo: "Info", tabStory: "Historia", lGroup: "Grupo:", lMembers: "Miembros:", lCountry: "País:", lCity: "Ciudad:", lDate: "Fecha:", lEpisode: "Episodio:", lWatch: "Ver:", lOfficialLink: "Enlace oficial", lWatchEpi: "Ver el episodio", lPractical: "Información práctica y acceso", lAddress: "Dirección", lOpenMap: "Abrir en Google Maps", lStoryPlace: "La historia de este lugar", lStoryBts: "Siguiendo los pasos de BTS", lTipsTitle: "LOS CONSEJOS DE «SCREEN TO STREET»", lHowToGetThere: "Cómo llegar:", memoryNotesLabel: "Tus notas (opcional)", memoryNotesPlaceholder: "¿Qué recuerdas de este lugar?", reviewsCountLabel: "{n} reseñas públicas", reviewsWriteLabel: "Escribe tu reseña", reviewsComposePlaceholder: "Comparte lo que pensaste...", reviewsComposeMakePublic: "Hacer esto público", reviewsComposePost: "Publicar reseña", memoryPhotoLabel: "Añadir una foto (opcional)", memoryPhotoChoose: "Elegir una foto", memoryPhotoRemove: "Quitar", memoryMakePublic: "Hacer pública esta reseña (visible para otros usuarios)", reviewsLoading: "Cargando reseñas…", reviewsEmpty: "Todavía no hay reseñas públicas para este lugar — ¡sé el primero en compartir la tuya desde la pestaña «Mi Visita»!",
        backToMap: "← Volver al mapa", moreDetails: "Más detalles", openInMaps: "Abrir en Google Maps", detailsLabel: "Detalles", aboutPlaceLabel: "Sobre este lugar",
        accTitle: "Tu cuenta", accChangePhoto: "Cambiar foto de perfil", accResetPhoto: "Restablecer foto de perfil", accNameLabel: "Nombre de usuario", accChangeUsernameHint: "Cambiar nombre de usuario", accEmailLabel: "Correo electrónico",
        accCountryLabel: "País que te interesa", accCountryPlaceholder: "Elige un país (opcional)",
        accActivityTitle: "Tu actividad", accTrips: "Viajes", accVisited: "Visitados", accWishlist: "Lista de deseos", accPasses: "Pases y facturación",
        friendsTitle: "Amigos", friendsAddPlaceholder: "Añadir un amigo por nombre de usuario", friendsAddBtn: "Añadir", friendsRequestsLabel: "Solicitudes de amistad", friendsListLabel: "Tus amigos", friendsEmpty: "Aún no tienes amigos — añade uno por su nombre de usuario arriba.", friendsAccept: "Aceptar", friendsDecline: "Rechazar", friendsCancel: "Cancelar", friendsRemove: "Quitar", friendsErrNotFound: "No se encontró ningún usuario con ese nombre.", friendsErrSelf: "No puedes añadirte a ti mismo.", friendsSentLabel: "Enviada — esperando respuesta", friendsRequestFrom: "{username} quiere ser tu amigo", shareWithFriendBtn: "Compartir", shareNoFriends: "Añade primero un amigo para compartir lugares.", sharesEmpty: "Nadie ha compartido nada contigo todavía.", sharedByLabel: "{username} compartió {location}",
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
        gateEmailLabel: "Correo electrónico", gatePasswordLabel: "Contraseña", gateForgotPassword: "¿Olvidaste tu contraseña?",
        gateLoginBtn: "Iniciar sesión", gateOrDivider: "O", gateGoogleBtn: "Continuar con Google",
        gateSignupPrompt: "¿No tienes cuenta?", gateSignupLink: "Regístrate",
        gateNoGroupsTitle: "Desbloquea un grupo para ver el mapa", gateNoGroupsDesc: "Aún no has desbloqueado ningún grupo. Haz clic abajo para elegir un pase y empezar a explorar.",
        gateUnlockBtn: "Desbloquear un grupo", gateLogoutLink: "Cerrar sesión",
        gateErrorInvalid: "Correo o contraseña incorrectos.", gateErrorGeneric: "Algo salió mal. Inténtalo de nuevo.",
        gateResetSent: "Correo de restablecimiento enviado — revisa tu bandeja de entrada.", gateEnterEmailFirst: "Indica primero tu correo electrónico.",
        tourModeLiveIn: "En directo — BTS está actuando en {city}", tourModeSchedule: "Calendario de la gira", tourModeLive: "En directo", tourModeDone: "Finalizado", tourModeUpcoming: "Próximamente", tourModePrev: "Anterior", tourModeNext: "Siguiente",
        tourModeFooterNote: "Fechas anunciadas por la gira — comprueba siempre los sitios oficiales de venta de entradas antes de reservar un viaje.",
        liveBadgeLabel: "En vivo", liveTimelineTitle: " y próximos", liveTimelineEmpty: "Nada programado por ahora — vuelve pronto.", liveTimelineFooterNote: "Solo actividades oficiales y anunciadas públicamente — fechas según lo anunciado, comprueba siempre las fuentes oficiales antes de reservar un viaje.", liveFilterAll: "Todos", liveTodayLive: "Hoy · En vivo", liveKindGroup: "Grupo", liveKindSolo: "Solo", newBadgeLabel: "Nuevo", usernameCooldownNote: "Solo puedes cambiar esto una vez cada 7 días.", usernameConfirmTitle: "¿Cambiar tu nombre de usuario?", usernameConfirmCancel: "Cancelar", usernameConfirmOk: "Sí, cambiarlo", subtitle: "Siguiendo los pasos de tus artistas favoritos", backToList: "← Volver a la lista", chooserTourOption: "Ruta de la gira", chooserLiveOption: "Toda la actividad en directo", tripShareThis: "+ Compartir este viaje", switchArtistLabel: "Cambiar de artista", groupNoDataYet: "Aún no hay datos de gira ni de directo para {group} — vuelve pronto.", tripInviteLabel: "Invitar personas (opcional)", shareTripUsernamePlaceholder: "Su nombre de usuario",
        tourModeGenericLabel: "Gira", tourModeMemberLiveIn: "{member} está en directo — {event} en {city}", tourModeLiveNowOne: "En directo ahora", tourModeLiveNowCount: "{n} en directo ahora", tourModeMoreCount: "+{n} más",
        tourModeEyebrow: "Modo Gira", tourModeChooseTour: "Elegir una gira", tourModeStep: "Etapa {n} de {total}",
        tourModeHighlights: "Momentos destacados", tourModeSurpriseSong: "Canción sorpresa:", tourModeNoHighlightsYet: "Aún no se han añadido momentos destacados para este concierto.", tourModeNoSurpriseSongYet: "Aún no anunciada.",
        mapLoading: "Cargando el mapa…",
        demoTourBtn: "Recorrido",
        newLocationToastLabel: "Nuevo lugar añadido",
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
        visitedOption: "Luoghi Visitati", wishlistOption: "La Mia Wishlist", tripsOption: "I Miei Viaggi", settingsOption: "Impostazioni", logoutOption: "Esci",
        footerText: "Screen To Street è una guida indipendente creata dai fan.", footerMentions: "Note Legali", footerAbout: "Chi Siamo", footerTOS: "Termini di Servizio", footerPrivacy: "Privacy Policy",
        allGroups: "Tutti i gruppi", allMembers: "Tutti i membri", allAreas: "Tutte le zone", allYears: "Tutti gli anni", allCategories: "Tutte le categorie",
        checkVisited: "Ho visitato questo posto", checkWishlist: "Aggiungi alla wishlist", tripWhich: "Per quale viaggio è questo?",
        tripName: "Nome del viaggio", tripWhen: "Quando pensi di andarci?", tripFrom: "Da", tripTo: "A", tripCreate: "Crea viaggio", tripCancel: "Annulla",
        itiTitle: "Generatore di Itinerari", itiDesc: "Seleziona un gruppo, un paese e quanti giorni resti.", itiCreateBtn: "Crea la mia guida", itiCatLabel: "Categorie (opzionale, selezione multipla)", itiExport: "Esporta guida in PDF", itiSave: "Salva nei Miei Viaggi",
        noTripsFound: "Nessun viaggio trovato.", selectTripToView: "Seleziona un viaggio da vedere", deselectTripOption: "— Nessun viaggio selezionato —", locationsWord: "luogo", locationsWordPlural: "luoghi",
        addAnotherVisit: "Aggiungi un'altra visita",
        tabExplore: "Esplora", tabMyItinerary: "Il Mio Itinerario", yourRating: "La tua valutazione", foodQualityRating: "Qualità del cibo", valueForMoneyRating: "Rapporto qualità-prezzo", accessibilityRating: "Facile da raggiungere?", siteQualityRating: "Qualità del luogo", wishlistStat: "Il {pct}% degli utenti ha aggiunto questo posto alla propria wishlist", friendsVisitedStat: "Visitato da: {names}", whenDidYouVisit: "Quando hai visitato questo posto?", saveMemory: "Salva ricordo", myVisitTab: "La Mia Visita", tabReviews: "Recensioni", tabInfo: "Info", tabStory: "Storia", lGroup: "Gruppo:", lMembers: "Membri:", lCountry: "Paese:", lCity: "Città:", lDate: "Data:", lEpisode: "Episodio:", lWatch: "Guarda:", lOfficialLink: "Link ufficiale", lWatchEpi: "Guarda l'episodio", lPractical: "Informazioni pratiche e accesso", lAddress: "Indirizzo", lOpenMap: "Apri in Google Maps", lStoryPlace: "La storia di questo posto", lStoryBts: "Sulle orme dei BTS", lTipsTitle: "I CONSIGLI DI «SCREEN TO STREET»", lHowToGetThere: "Come arrivare:", memoryNotesLabel: "Le tue note (facoltativo)", memoryNotesPlaceholder: "Cosa ricordi di questo posto?", reviewsCountLabel: "{n} recensioni pubbliche", reviewsWriteLabel: "Scrivi la tua recensione", reviewsComposePlaceholder: "Condividi cosa ne pensi...", reviewsComposeMakePublic: "Rendi pubblica questa recensione", reviewsComposePost: "Pubblica recensione", memoryPhotoLabel: "Aggiungi una foto (facoltativo)", memoryPhotoChoose: "Scegli una foto", memoryPhotoRemove: "Rimuovi", memoryMakePublic: "Rendi pubblica questa recensione (visibile agli altri utenti)", reviewsLoading: "Caricamento recensioni…", reviewsEmpty: "Ancora nessuna recensione pubblica per questo posto — sii il primo a condividere la tua dalla scheda «La Mia Visita»!",
        backToMap: "← Torna alla mappa", moreDetails: "Maggiori dettagli", openInMaps: "Apri in Google Maps", detailsLabel: "Dettagli", aboutPlaceLabel: "Informazioni su questo luogo",
        accTitle: "Il tuo account", accChangePhoto: "Cambia foto profilo", accResetPhoto: "Ripristina foto profilo", accNameLabel: "Nome utente", accChangeUsernameHint: "Cambia nome utente", accEmailLabel: "Indirizzo email",
        accCountryLabel: "Paese che ti interessa", accCountryPlaceholder: "Scegli un paese (opzionale)",
        accActivityTitle: "La tua attività", accTrips: "Viaggi", accVisited: "Visitati", accWishlist: "Wishlist", accPasses: "Pass e fatturazione",
        friendsTitle: "Amici", friendsAddPlaceholder: "Aggiungi un amico tramite username", friendsAddBtn: "Aggiungi", friendsRequestsLabel: "Richieste di amicizia", friendsListLabel: "I tuoi amici", friendsEmpty: "Ancora nessun amico — aggiungine uno tramite il suo username qui sopra.", friendsAccept: "Accetta", friendsDecline: "Rifiuta", friendsCancel: "Annulla", friendsRemove: "Rimuovi", friendsErrNotFound: "Nessun utente trovato con questo username.", friendsErrSelf: "Non puoi aggiungere te stesso.", friendsSentLabel: "Inviata — in attesa di risposta", friendsRequestFrom: "{username} vuole essere tuo amico", shareWithFriendBtn: "Condividi", shareNoFriends: "Aggiungi prima un amico per condividere i luoghi.", sharesEmpty: "Nessuno ha ancora condiviso nulla con te.", sharedByLabel: "{username} ha condiviso {location}",
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
        gateEmailLabel: "Indirizzo email", gatePasswordLabel: "Password", gateForgotPassword: "Password dimenticata?",
        gateLoginBtn: "Accedi", gateOrDivider: "OPPURE", gateGoogleBtn: "Continua con Google",
        gateSignupPrompt: "Non hai un account?", gateSignupLink: "Registrati",
        gateNoGroupsTitle: "Sblocca un gruppo per vedere la mappa", gateNoGroupsDesc: "Non hai ancora sbloccato nessun gruppo. Clicca qui sotto per scegliere un pass e iniziare a esplorare.",
        gateUnlockBtn: "Sblocca un gruppo", gateLogoutLink: "Esci",
        gateErrorInvalid: "Email o password errati.", gateErrorGeneric: "Qualcosa è andato storto. Riprova.",
        gateResetSent: "Email di reimpostazione inviata — controlla la posta in arrivo.", gateEnterEmailFirst: "Inserisci prima il tuo indirizzo email.",
        tourModeLiveIn: "In diretta — I BTS si esibiscono a {city}", tourModeSchedule: "Calendario del tour", tourModeLive: "In diretta", tourModeDone: "Concluso", tourModeUpcoming: "In arrivo", tourModePrev: "Precedente", tourModeNext: "Successivo",
        tourModeFooterNote: "Date annunciate dal tour — verifica sempre i siti di biglietteria ufficiali prima di prenotare un viaggio.",
        liveBadgeLabel: "Live", liveTimelineTitle: " e prossimi", liveTimelineEmpty: "Nulla in programma al momento — torna a trovarci presto.", liveTimelineFooterNote: "Solo attività ufficiali e annunciate pubblicamente — date come annunciate, verifica sempre le fonti ufficiali prima di prenotare un viaggio.", liveFilterAll: "Tutti", liveTodayLive: "Oggi · Live", liveKindGroup: "Gruppo", liveKindSolo: "Solo", newBadgeLabel: "Nuovo", usernameCooldownNote: "Puoi modificarlo solo una volta ogni 7 giorni.", usernameConfirmTitle: "Vuoi cambiare il tuo nome utente?", usernameConfirmCancel: "Annulla", usernameConfirmOk: "Sì, cambialo", subtitle: "Sulle orme dei tuoi artisti preferiti", backToList: "← Torna alla lista", chooserTourOption: "Percorso del tour", chooserLiveOption: "Tutta l'attività dal vivo", tripShareThis: "+ Condividi questo viaggio", switchArtistLabel: "Cambia artista", groupNoDataYet: "Nessun dato di tour o live disponibile ancora per {group} — torna a trovarci presto.", tripInviteLabel: "Invita persone (facoltativo)", shareTripUsernamePlaceholder: "Il loro nome utente",
        tourModeGenericLabel: "Tour", tourModeMemberLiveIn: "{member} è in diretta — {event} a {city}", tourModeLiveNowOne: "In diretta ora", tourModeLiveNowCount: "{n} in diretta ora", tourModeMoreCount: "+{n} altri",
        tourModeEyebrow: "Modalità Tour", tourModeChooseTour: "Scegli un tour", tourModeStep: "Tappa {n} di {total}",
        tourModeHighlights: "Momenti salienti", tourModeSurpriseSong: "Canzone a sorpresa:", tourModeNoHighlightsYet: "Nessun momento saliente ancora aggiunto per questo concerto.", tourModeNoSurpriseSongYet: "Non ancora annunciata.",
        mapLoading: "Caricamento della mappa…",
        demoTourBtn: "Tour",
        newLocationToastLabel: "Nuovo luogo aggiunto",
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
        visitedOption: "Locais Visitados", wishlistOption: "Minha Wishlist", tripsOption: "Minhas Viagens", settingsOption: "Configurações", logoutOption: "Sair",
        footerText: "Screen To Street é um guia independente feito por fãs.", footerMentions: "Aviso Legal", footerAbout: "Sobre Nós", footerTOS: "Termos de Serviço", footerPrivacy: "Política de Privacidade",
        allGroups: "Todos os grupos", allMembers: "Todos os membros", allAreas: "Todas as regiões", allYears: "Todos os anos", allCategories: "Todas as categorias",
        checkVisited: "Eu visitei este lugar", checkWishlist: "Adicionar à wishlist", tripWhich: "Para qual viagem é isso?",
        tripName: "Nome da viagem", tripWhen: "Quando você planeja ir?", tripFrom: "De", tripTo: "Até", tripCreate: "Criar viagem", tripCancel: "Cancelar",
        itiTitle: "Gerador de Roteiros", itiDesc: "Selecione um grupo, um país e quantos dias você fica.", itiCreateBtn: "Criar meu guia", itiCatLabel: "Categorias (opcional, seleção múltipla)", itiExport: "Exportar guia em PDF", itiSave: "Salvar em Minhas Viagens",
        noTripsFound: "Nenhuma viagem encontrada.", selectTripToView: "Selecione uma viagem para ver", deselectTripOption: "— Nenhuma viagem selecionada —", locationsWord: "local", locationsWordPlural: "locais",
        addAnotherVisit: "Adicionar outra visita",
        tabExplore: "Explorar", tabMyItinerary: "Meu Itinerário", yourRating: "Sua avaliação", foodQualityRating: "Qualidade da comida", valueForMoneyRating: "Custo-benefício", accessibilityRating: "Fácil acesso?", siteQualityRating: "Qualidade do lugar", wishlistStat: "{pct}% dos usuários adicionaram este lugar à lista de desejos", friendsVisitedStat: "Visitado por: {names}", whenDidYouVisit: "Quando você visitou este lugar?", saveMemory: "Salvar lembrança", myVisitTab: "Minha Visita", tabReviews: "Avaliações", tabInfo: "Info", tabStory: "História", lGroup: "Grupo:", lMembers: "Membros:", lCountry: "País:", lCity: "Cidade:", lDate: "Data:", lEpisode: "Episódio:", lWatch: "Assistir:", lOfficialLink: "Link oficial", lWatchEpi: "Assistir ao episódio", lPractical: "Informações práticas e acesso", lAddress: "Endereço", lOpenMap: "Abrir no Google Maps", lStoryPlace: "A história deste lugar", lStoryBts: "Nos passos do BTS", lTipsTitle: "AS DICAS «SCREEN TO STREET»", lHowToGetThere: "Como chegar:", memoryNotesLabel: "Suas notas (opcional)", memoryNotesPlaceholder: "O que você lembra deste lugar?", reviewsCountLabel: "{n} avaliações públicas", reviewsWriteLabel: "Escreva sua avaliação", reviewsComposePlaceholder: "Compartilhe sua opinião...", reviewsComposeMakePublic: "Tornar isso público", reviewsComposePost: "Publicar avaliação", memoryPhotoLabel: "Adicionar uma foto (opcional)", memoryPhotoChoose: "Escolher uma foto", memoryPhotoRemove: "Remover", memoryMakePublic: "Tornar esta avaliação pública (visível para outros usuários)", reviewsLoading: "Carregando avaliações…", reviewsEmpty: "Ainda não há avaliações públicas para este lugar — seja o primeiro a compartilhar a sua na aba «Minha Visita»!",
        backToMap: "← Voltar ao mapa", moreDetails: "Mais detalhes", openInMaps: "Abrir no Google Maps", detailsLabel: "Detalhes", aboutPlaceLabel: "Sobre este local",
        accTitle: "Sua conta", accChangePhoto: "Alterar foto de perfil", accResetPhoto: "Redefinir foto de perfil", accNameLabel: "Nome de usuário", accChangeUsernameHint: "Alterar nome de usuário", accEmailLabel: "Endereço de e-mail",
        accCountryLabel: "País de interesse", accCountryPlaceholder: "Escolha um país (opcional)",
        accActivityTitle: "Sua atividade", accTrips: "Viagens", accVisited: "Visitados", accWishlist: "Wishlist", accPasses: "Passes e faturamento",
        friendsTitle: "Amigos", friendsAddPlaceholder: "Adicionar um amigo pelo nome de usuário", friendsAddBtn: "Adicionar", friendsRequestsLabel: "Pedidos de amizade", friendsListLabel: "Seus amigos", friendsEmpty: "Ainda sem amigos — adicione um pelo nome de usuário acima.", friendsAccept: "Aceitar", friendsDecline: "Recusar", friendsCancel: "Cancelar", friendsRemove: "Remover", friendsErrNotFound: "Nenhum usuário encontrado com esse nome.", friendsErrSelf: "Você não pode se adicionar.", friendsSentLabel: "Enviado — aguardando resposta", friendsRequestFrom: "{username} quer ser seu amigo", shareWithFriendBtn: "Compartilhar", shareNoFriends: "Adicione um amigo primeiro para compartilhar lugares.", sharesEmpty: "Ainda ninguém compartilhou nada com você.", sharedByLabel: "{username} compartilhou {location}",
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
        gateEmailLabel: "Endereço de e-mail", gatePasswordLabel: "Senha", gateForgotPassword: "Esqueceu a senha?",
        gateLoginBtn: "Entrar", gateOrDivider: "OU", gateGoogleBtn: "Continuar com Google",
        gateSignupPrompt: "Não tem uma conta?", gateSignupLink: "Cadastre-se",
        gateNoGroupsTitle: "Desbloqueie um grupo para ver o mapa", gateNoGroupsDesc: "Você ainda não desbloqueou nenhum grupo. Clique abaixo para escolher um passe e começar a explorar.",
        gateUnlockBtn: "Desbloquear um grupo", gateLogoutLink: "Sair",
        gateErrorInvalid: "E-mail ou senha incorretos.", gateErrorGeneric: "Algo deu errado. Tente novamente.",
        gateResetSent: "E-mail de redefinição enviado — verifique sua caixa de entrada.", gateEnterEmailFirst: "Informe primeiro seu endereço de e-mail.",
        tourModeLiveIn: "Ao vivo — BTS está se apresentando em {city}", tourModeSchedule: "Calendário da turnê", tourModeLive: "Ao vivo", tourModeDone: "Concluído", tourModeUpcoming: "Em breve", tourModePrev: "Anterior", tourModeNext: "Próximo",
        tourModeFooterNote: "Datas anunciadas pela turnê — sempre confira os sites oficiais de venda de ingressos antes de reservar uma viagem.",
        liveBadgeLabel: "Ao vivo", liveTimelineTitle: " e próximos", liveTimelineEmpty: "Nada programado no momento — volte em breve.", liveTimelineFooterNote: "Apenas atividades oficiais e anunciadas publicamente — datas conforme anunciadas, sempre confira as fontes oficiais antes de reservar uma viagem.", liveFilterAll: "Todos", liveTodayLive: "Hoje · Ao vivo", liveKindGroup: "Grupo", liveKindSolo: "Solo", newBadgeLabel: "Novo", usernameCooldownNote: "Você só pode alterar isso uma vez a cada 7 dias.", usernameConfirmTitle: "Alterar seu nome de usuário?", usernameConfirmCancel: "Cancelar", usernameConfirmOk: "Sim, alterar", subtitle: "Nos passos dos seus artistas favoritos", backToList: "← Voltar à lista", chooserTourOption: "Rota da turnê", chooserLiveOption: "Toda a atividade ao vivo", tripShareThis: "+ Compartilhar esta viagem", switchArtistLabel: "Trocar de artista", groupNoDataYet: "Ainda não há dados de turnê ou ao vivo para {group} — volte em breve.", tripInviteLabel: "Convidar pessoas (opcional)", shareTripUsernamePlaceholder: "O nome de usuário deles",
        tourModeGenericLabel: "Turnê", tourModeMemberLiveIn: "{member} está ao vivo agora — {event} em {city}", tourModeLiveNowOne: "Ao vivo agora", tourModeLiveNowCount: "{n} ao vivo agora", tourModeMoreCount: "+{n} mais",
        tourModeEyebrow: "Modo Turnê", tourModeChooseTour: "Escolher uma turnê", tourModeStep: "Etapa {n} de {total}",
        tourModeHighlights: "Melhores momentos", tourModeSurpriseSong: "Música surpresa:", tourModeNoHighlightsYet: "Nenhum destaque adicionado ainda para este show.", tourModeNoSurpriseSongYet: "Ainda não anunciada.",
        mapLoading: "Carregando o mapa…",
        demoTourBtn: "Tour guiado",
        newLocationToastLabel: "Novo local adicionado",
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
        visitedOption: "방문한 장소", wishlistOption: "위시리스트", tripsOption: "내 여행", settingsOption: "설정", logoutOption: "로그아웃",
        footerText: "Screen To Street는 팬이 만든 독립적인 가이드입니다.", footerMentions: "법적 고지", footerAbout: "소개", footerTOS: "이용약관", footerPrivacy: "개인정보처리방침",
        allGroups: "모든 그룹", allMembers: "모든 멤버", allAreas: "모든 지역", allYears: "모든 연도", allCategories: "모든 카테고리",
        checkVisited: "이 장소를 방문했어요", checkWishlist: "위시리스트에 추가", tripWhich: "어떤 여행을 위한 건가요?",
        tripName: "여행 이름", tripWhen: "언제 갈 계획인가요?", tripFrom: "부터", tripTo: "까지", tripCreate: "여행 만들기", tripCancel: "취소",
        itiTitle: "자동 일정 생성기", itiDesc: "그룹, 국가, 체류 일수를 선택하세요.", itiCreateBtn: "가이드 만들기", itiCatLabel: "카테고리 (선택 사항, 다중 선택 가능)", itiExport: "가이드 PDF로 내보내기", itiSave: "내 여행에 저장",
        noTripsFound: "여행을 찾을 수 없습니다.", selectTripToView: "볼 여행을 선택하세요", deselectTripOption: "— 선택된 여행 없음 —", locationsWord: "장소", locationsWordPlural: "장소",
        addAnotherVisit: "다른 방문 추가",
        tabExplore: "탐색", tabMyItinerary: "내 일정", yourRating: "평점", foodQualityRating: "음식 품질", valueForMoneyRating: "가성비", accessibilityRating: "접근이 쉬운가요?", siteQualityRating: "장소의 품질", wishlistStat: "사용자의 {pct}%가 이 장소를 위시리스트에 추가했습니다", friendsVisitedStat: "방문한 친구: {names}", whenDidYouVisit: "언제 방문하셨나요?", saveMemory: "추억 저장", myVisitTab: "내 방문", tabReviews: "후기", tabInfo: "정보", tabStory: "스토리", lGroup: "그룹:", lMembers: "멤버:", lCountry: "국가:", lCity: "도시:", lDate: "날짜:", lEpisode: "에피소드:", lWatch: "시청:", lOfficialLink: "공식 링크", lWatchEpi: "에피소드 보기", lPractical: "실용 정보 및 접근 방법", lAddress: "주소", lOpenMap: "구글 지도에서 열기", lStoryPlace: "이 장소의 이야기", lStoryBts: "BTS의 발자취를 따라", lTipsTitle: "'SCREEN TO STREET' 팁", lHowToGetThere: "가는 방법:", memoryNotesLabel: "나의 메모 (선택 사항)", memoryNotesPlaceholder: "이 장소에 대해 기억나는 것이 있나요?", reviewsCountLabel: "공개 후기 {n}개", reviewsWriteLabel: "후기 작성하기", reviewsComposePlaceholder: "느낀 점을 공유해보세요...", reviewsComposeMakePublic: "이 후기를 공개로 설정", reviewsComposePost: "후기 게시", memoryPhotoLabel: "사진 추가 (선택 사항)", memoryPhotoChoose: "사진 선택", memoryPhotoRemove: "제거", memoryMakePublic: "이 후기를 공개로 설정 (다른 사용자에게 표시됨)", reviewsLoading: "후기를 불러오는 중…", reviewsEmpty: "아직 이 장소에 대한 공개 후기가 없습니다 — '내 방문' 탭에서 첫 후기를 남겨보세요!",
        backToMap: "← 지도로 돌아가기", moreDetails: "자세히 보기", openInMaps: "구글 지도에서 열기", detailsLabel: "상세 정보", aboutPlaceLabel: "이 장소에 대해",
        accTitle: "내 계정", accChangePhoto: "프로필 사진 변경", accResetPhoto: "프로필 사진 재설정", accNameLabel: "아이디", accChangeUsernameHint: "아이디 변경", accEmailLabel: "이메일 주소",
        accCountryLabel: "관심 있는 국가", accCountryPlaceholder: "국가 선택 (선택 사항)",
        accActivityTitle: "내 활동", accTrips: "여행", accVisited: "방문함", accWishlist: "위시리스트", accPasses: "이용권 및 결제",
        friendsTitle: "친구", friendsAddPlaceholder: "사용자 이름으로 친구 추가", friendsAddBtn: "추가", friendsRequestsLabel: "친구 요청", friendsListLabel: "내 친구", friendsEmpty: "아직 친구가 없습니다 — 위에서 사용자 이름으로 친구를 추가해보세요.", friendsAccept: "수락", friendsDecline: "거절", friendsCancel: "취소", friendsRemove: "삭제", friendsErrNotFound: "해당 사용자 이름을 가진 사용자를 찾을 수 없습니다.", friendsErrSelf: "자기 자신은 추가할 수 없습니다.", friendsSentLabel: "전송됨 — 응답 대기 중", friendsRequestFrom: "{username}님이 친구가 되고 싶어합니다", shareWithFriendBtn: "공유", shareNoFriends: "장소를 공유하려면 먼저 친구를 추가하세요.", sharesEmpty: "아직 공유받은 것이 없습니다.", sharedByLabel: "{username}님이 {location}을(를) 공유했습니다",
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
        gateEmailLabel: "이메일 주소", gatePasswordLabel: "비밀번호", gateForgotPassword: "비밀번호를 잊으셨나요?",
        gateLoginBtn: "로그인", gateOrDivider: "또는", gateGoogleBtn: "Google로 계속하기",
        gateSignupPrompt: "계정이 없으신가요?", gateSignupLink: "회원가입",
        gateNoGroupsTitle: "지도를 보려면 그룹을 잠금 해제하세요", gateNoGroupsDesc: "아직 잠금 해제한 그룹이 없습니다. 아래를 클릭해 이용권을 선택하고 둘러보기를 시작하세요.",
        gateUnlockBtn: "그룹 잠금 해제하기", gateLogoutLink: "로그아웃",
        gateErrorInvalid: "이메일 또는 비밀번호가 올바르지 않습니다.", gateErrorGeneric: "문제가 발생했습니다. 다시 시도해주세요.",
        gateResetSent: "비밀번호 재설정 이메일을 보냈습니다 — 받은편지함을 확인해주세요.", gateEnterEmailFirst: "먼저 이메일 주소를 입력해주세요.",
        tourModeLiveIn: "라이브 중 — BTS가 {city}에서 공연 중입니다", tourModeSchedule: "투어 일정", tourModeLive: "라이브", tourModeDone: "종료", tourModeUpcoming: "예정", tourModePrev: "이전", tourModeNext: "다음",
        tourModeFooterNote: "투어 측이 발표한 날짜입니다 — 여행 예약 전 공식 티켓 판매 사이트를 꼭 확인하세요.",
        liveBadgeLabel: "라이브", liveTimelineTitle: " 및 예정", liveTimelineEmpty: "지금은 예정된 일정이 없습니다 — 곧 다시 확인해주세요.", liveTimelineFooterNote: "공식적으로 공개된 활동만 표시됩니다 — 발표된 날짜 기준이며, 여행 예약 전 항상 공식 출처를 확인하세요.", liveFilterAll: "전체", liveTodayLive: "오늘 · 라이브", liveKindGroup: "그룹", liveKindSolo: "솔로", newBadgeLabel: "신규", usernameCooldownNote: "7일에 한 번만 변경할 수 있습니다.", usernameConfirmTitle: "아이디를 변경하시겠습니까?", usernameConfirmCancel: "취소", usernameConfirmOk: "네, 변경합니다", subtitle: "당신이 좋아하는 아티스트의 발자취를 따라", backToList: "← 목록으로 돌아가기", chooserTourOption: "투어 경로", chooserLiveOption: "모든 라이브 활동", tripShareThis: "+ 이 여행 공유하기", switchArtistLabel: "아티스트 변경", groupNoDataYet: "{group}의 투어 또는 라이브 정보가 아직 없습니다 — 곧 다시 확인해주세요.", tripInviteLabel: "사람 초대하기 (선택 사항)", shareTripUsernamePlaceholder: "상대방 아이디",
        tourModeGenericLabel: "투어", tourModeMemberLiveIn: "{member} 라이브 중 — {city}에서 {event}", tourModeLiveNowOne: "지금 라이브", tourModeLiveNowCount: "지금 {n}건 라이브", tourModeMoreCount: "+{n}개 더보기",
        tourModeEyebrow: "투어 모드", tourModeChooseTour: "투어 선택", tourModeStep: "{total}단계 중 {n}단계",
        tourModeHighlights: "하이라이트", tourModeSurpriseSong: "깜짝 곡:", tourModeNoHighlightsYet: "이 공연의 하이라이트가 아직 등록되지 않았습니다.", tourModeNoSurpriseSongYet: "아직 발표되지 않았습니다.",
        mapLoading: "지도를 불러오는 중…",
        demoTourBtn: "투어",
        newLocationToastLabel: "새로운 장소 추가됨",
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
        visitedOption: "訪れた場所", wishlistOption: "ウィッシュリスト", tripsOption: "マイトリップ", settingsOption: "設定", logoutOption: "ログアウト",
        footerText: "Screen To Streetはファンによる独立系ガイドです。", footerMentions: "特定商取引法に基づく表記", footerAbout: "私たちについて", footerTOS: "利用規約", footerPrivacy: "プライバシーポリシー",
        allGroups: "すべてのグループ", allMembers: "すべてのメンバー", allAreas: "すべてのエリア", allYears: "すべての年", allCategories: "すべてのカテゴリー",
        checkVisited: "この場所を訪れました", checkWishlist: "ウィッシュリストに追加", tripWhich: "どの旅行のためですか？",
        tripName: "旅行の名前", tripWhen: "いつ行く予定ですか？", tripFrom: "開始", tripTo: "終了", tripCreate: "旅行を作成", tripCancel: "キャンセル",
        itiTitle: "自動旅程ジェネレーター", itiDesc: "グループ、国、滞在日数を選択してください。", itiCreateBtn: "ガイドを作成", itiCatLabel: "カテゴリー（任意、複数選択可）", itiExport: "ガイドをPDFで出力", itiSave: "マイトリップに保存",
        noTripsFound: "旅行が見つかりません。", selectTripToView: "表示する旅行を選択", deselectTripOption: "— 選択された旅行はありません —", locationsWord: "スポット", locationsWordPlural: "スポット",
        addAnotherVisit: "別の訪問を追加",
        tabExplore: "探索", tabMyItinerary: "マイ旅程", yourRating: "評価", foodQualityRating: "料理の質", valueForMoneyRating: "コストパフォーマンス", accessibilityRating: "アクセスしやすさ", siteQualityRating: "場所の質", wishlistStat: "ユーザーの{pct}%がこの場所をウィッシュリストに追加しました", friendsVisitedStat: "訪問した友達：{names}", whenDidYouVisit: "いつ訪れましたか？", saveMemory: "思い出を保存", myVisitTab: "マイビジット", tabReviews: "レビュー", tabInfo: "情報", tabStory: "ストーリー", lGroup: "グループ：", lMembers: "メンバー：", lCountry: "国：", lCity: "都市：", lDate: "日付：", lEpisode: "エピソード：", lWatch: "視聴：", lOfficialLink: "公式リンク", lWatchEpi: "エピソードを見る", lPractical: "実用情報とアクセス", lAddress: "住所", lOpenMap: "Googleマップで開く", lStoryPlace: "この場所の物語", lStoryBts: "BTSの足跡をたどって", lTipsTitle: "「SCREEN TO STREET」のヒント", lHowToGetThere: "行き方：", memoryNotesLabel: "メモ（任意）", memoryNotesPlaceholder: "この場所について覚えていることは？", reviewsCountLabel: "公開レビュー{n}件", reviewsWriteLabel: "レビューを書く", reviewsComposePlaceholder: "感想をシェアしましょう…", reviewsComposeMakePublic: "このレビューを公開する", reviewsComposePost: "レビューを投稿", memoryPhotoLabel: "写真を追加（任意）", memoryPhotoChoose: "写真を選択", memoryPhotoRemove: "削除", memoryMakePublic: "このレビューを公開する（他のユーザーに表示されます）", reviewsLoading: "レビューを読み込み中…", reviewsEmpty: "この場所にはまだ公開レビューがありません —「マイビジット」タブから最初のレビューを共有しましょう！",
        backToMap: "← 地図に戻る", moreDetails: "詳細を見る", openInMaps: "Googleマップで開く", detailsLabel: "詳細", aboutPlaceLabel: "この場所について",
        accTitle: "アカウント", accChangePhoto: "プロフィール写真を変更", accResetPhoto: "プロフィール写真をリセット", accNameLabel: "ユーザー名", accChangeUsernameHint: "ユーザー名を変更", accEmailLabel: "メールアドレス",
        accCountryLabel: "興味のある国", accCountryPlaceholder: "国を選択（任意）",
        accActivityTitle: "アクティビティ", accTrips: "旅行", accVisited: "訪問済み", accWishlist: "ウィッシュリスト", accPasses: "パスとお支払い",
        friendsTitle: "フレンド", friendsAddPlaceholder: "ユーザー名でフレンドを追加", friendsAddBtn: "追加", friendsRequestsLabel: "フレンド申請", friendsListLabel: "フレンド一覧", friendsEmpty: "まだフレンドがいません — 上のユーザー名で追加しましょう。", friendsAccept: "承認", friendsDecline: "拒否", friendsCancel: "キャンセル", friendsRemove: "削除", friendsErrNotFound: "そのユーザー名のユーザーが見つかりません。", friendsErrSelf: "自分自身は追加できません。", friendsSentLabel: "送信済み — 返信待ち", friendsRequestFrom: "{username}さんがフレンド申請をしています", shareWithFriendBtn: "共有", shareNoFriends: "場所を共有するには、まずフレンドを追加してください。", sharesEmpty: "まだ何も共有されていません。", sharedByLabel: "{username}さんが{location}を共有しました",
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
        gateEmailLabel: "メールアドレス", gatePasswordLabel: "パスワード", gateForgotPassword: "パスワードをお忘れですか？",
        gateLoginBtn: "ログイン", gateOrDivider: "または", gateGoogleBtn: "Googleで続ける",
        gateSignupPrompt: "アカウントをお持ちでないですか？", gateSignupLink: "新規登録",
        gateNoGroupsTitle: "地図を見るにはグループを解除してください", gateNoGroupsDesc: "まだグループを解除していません。下のボタンからパスを選んで探索を始めましょう。",
        gateUnlockBtn: "グループを解除する", gateLogoutLink: "ログアウト",
        gateErrorInvalid: "メールアドレスまたはパスワードが正しくありません。", gateErrorGeneric: "問題が発生しました。もう一度お試しください。",
        gateResetSent: "パスワード再設定メールを送信しました — 受信トレイをご確認ください。", gateEnterEmailFirst: "先にメールアドレスを入力してください。",
        tourModeLiveIn: "ライブ配信中 — BTSは{city}で公演中です", tourModeSchedule: "ツアースケジュール", tourModeLive: "ライブ", tourModeDone: "終了", tourModeUpcoming: "開催予定", tourModePrev: "前へ", tourModeNext: "次へ",
        tourModeFooterNote: "ツアー側が発表した日程です — 旅行の予約前に必ず公式チケットサイトをご確認ください。",
        liveBadgeLabel: "ライブ", liveTimelineTitle: "・今後の予定", liveTimelineEmpty: "現在予定はありません — また後でご確認ください。", liveTimelineFooterNote: "公式に発表された活動のみを表示しています — 発表された日程です。旅行の予約前に必ず公式情報をご確認ください。", liveFilterAll: "すべて", liveTodayLive: "本日・ライブ", liveKindGroup: "グループ", liveKindSolo: "ソロ", newBadgeLabel: "新着", usernameCooldownNote: "この変更は7日に1回だけ行えます。", usernameConfirmTitle: "ユーザー名を変更しますか？", usernameConfirmCancel: "キャンセル", usernameConfirmOk: "はい、変更します", subtitle: "お気に入りのアーティストの足跡をたどって", backToList: "← リストに戻る", chooserTourOption: "ツアールート", chooserLiveOption: "すべてのライブ活動", tripShareThis: "+ この旅行を共有", switchArtistLabel: "アーティストを変更", groupNoDataYet: "{group}のツアー・ライブ情報はまだありません — また後でご確認ください。", tripInviteLabel: "メンバーを招待（任意）", shareTripUsernamePlaceholder: "相手のユーザー名",
        tourModeGenericLabel: "ツアー", tourModeMemberLiveIn: "{member}がライブ配信中 — {city}で{event}", tourModeLiveNowOne: "現在ライブ中", tourModeLiveNowCount: "現在{n}件ライブ中", tourModeMoreCount: "他+{n}件",
        tourModeEyebrow: "ツアーモード", tourModeChooseTour: "ツアーを選択", tourModeStep: "ステップ {n}/{total}",
        tourModeHighlights: "ハイライト", tourModeSurpriseSong: "サプライズソング：", tourModeNoHighlightsYet: "この公演のハイライトはまだ追加されていません。", tourModeNoSurpriseSongYet: "まだ発表されていません。",
        mapLoading: "地図を読み込み中…",
        demoTourBtn: "ツアー",
        newLocationToastLabel: "新しい場所が追加されました",
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
        visitedOption: "已访问的地点", wishlistOption: "我的收藏清单", tripsOption: "我的行程", settingsOption: "设置", logoutOption: "退出登录",
        footerText: "Screen To Street 是由粉丝创建的独立指南。", footerMentions: "法律声明", footerAbout: "关于我们", footerTOS: "服务条款", footerPrivacy: "隐私政策",
        allGroups: "所有团体", allMembers: "所有成员", allAreas: "所有地区", allYears: "所有年份", allCategories: "所有分类",
        checkVisited: "我去过这个地方", checkWishlist: "添加到收藏清单", tripWhich: "这是为哪次行程添加的？",
        tripName: "行程名称", tripWhen: "您计划什么时候出发？", tripFrom: "开始日期", tripTo: "结束日期", tripCreate: "创建行程", tripCancel: "取消",
        itiTitle: "自动行程生成器", itiDesc: "选择一个团体、一个国家，以及停留天数。", itiCreateBtn: "生成我的指南", itiCatLabel: "类别（可选，可多选）", itiExport: "导出指南为 PDF", itiSave: "保存到我的行程",
        noTripsFound: "未找到任何行程。", selectTripToView: "选择要查看的行程", deselectTripOption: "— 未选择行程 —", locationsWord: "个地点", locationsWordPlural: "个地点",
        addAnotherVisit: "添加另一次访问",
        tabExplore: "探索", tabMyItinerary: "我的行程", yourRating: "你的评分", foodQualityRating: "食物质量", valueForMoneyRating: "性价比", accessibilityRating: "是否容易到达？", siteQualityRating: "场地质量", wishlistStat: "{pct}%的用户将这个地方加入了心愿单", friendsVisitedStat: "到访过的好友：{names}", whenDidYouVisit: "你什么时候去的？", saveMemory: "保存回忆", myVisitTab: "我的到访", tabReviews: "评价", tabInfo: "信息", tabStory: "故事", lGroup: "组合：", lMembers: "成员：", lCountry: "国家：", lCity: "城市：", lDate: "日期：", lEpisode: "集数：", lWatch: "观看：", lOfficialLink: "官方链接", lWatchEpi: "观看该集", lPractical: "实用信息与交通", lAddress: "地址", lOpenMap: "在谷歌地图中打开", lStoryPlace: "这个地方的故事", lStoryBts: "追随BTS的足迹", lTipsTitle: "「SCREEN TO STREET」小贴士", lHowToGetThere: "交通方式：", memoryNotesLabel: "你的备注（可选）", memoryNotesPlaceholder: "你还记得这个地方的什么？", reviewsCountLabel: "{n}条公开评价", reviewsWriteLabel: "写下你的评价", reviewsComposePlaceholder: "分享你的感受…", reviewsComposeMakePublic: "公开此评价", reviewsComposePost: "发布评价", memoryPhotoLabel: "添加照片（可选）", memoryPhotoChoose: "选择照片", memoryPhotoRemove: "移除", memoryMakePublic: "公开此评价（其他用户可见）", reviewsLoading: "正在加载评价…", reviewsEmpty: "该地点暂无公开评价——从「我的到访」标签页分享第一条评价吧！",
        backToMap: "← 返回地图", moreDetails: "更多详情", openInMaps: "在 Google 地图中打开", detailsLabel: "详情", aboutPlaceLabel: "关于这个地方",
        accTitle: "我的账户", accChangePhoto: "更换头像", accResetPhoto: "重置头像", accNameLabel: "用户名", accChangeUsernameHint: "更改用户名", accEmailLabel: "电子邮箱",
        accCountryLabel: "感兴趣的国家", accCountryPlaceholder: "选择国家（可选）",
        accActivityTitle: "我的动态", accTrips: "行程", accVisited: "已访问", accWishlist: "收藏清单", accPasses: "通行证与账单",
        friendsTitle: "好友", friendsAddPlaceholder: "通过用户名添加好友", friendsAddBtn: "添加", friendsRequestsLabel: "好友请求", friendsListLabel: "你的好友", friendsEmpty: "还没有好友——在上方通过用户名添加一个吧。", friendsAccept: "接受", friendsDecline: "拒绝", friendsCancel: "取消", friendsRemove: "移除", friendsErrNotFound: "未找到该用户名对应的用户。", friendsErrSelf: "不能添加自己。", friendsSentLabel: "已发送——等待回应", friendsRequestFrom: "{username} 想加你为好友", shareWithFriendBtn: "分享", shareNoFriends: "请先添加好友才能分享地点。", sharesEmpty: "还没有人与你分享任何内容。", sharedByLabel: "{username} 分享了 {location}",
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
        gateEmailLabel: "电子邮箱", gatePasswordLabel: "密码", gateForgotPassword: "忘记密码？",
        gateLoginBtn: "登录", gateOrDivider: "或", gateGoogleBtn: "使用 Google 继续",
        gateSignupPrompt: "还没有账户？", gateSignupLink: "注册",
        gateNoGroupsTitle: "解锁一个团体以查看地图", gateNoGroupsDesc: "您还没有解锁任何团体。点击下方选择通行证，开始探索吧。",
        gateUnlockBtn: "解锁一个团体", gateLogoutLink: "退出登录",
        gateErrorInvalid: "邮箱或密码不正确。", gateErrorGeneric: "出现了一些问题，请重试。",
        gateResetSent: "密码重置邮件已发送——请查收您的收件箱。", gateEnterEmailFirst: "请先输入您的电子邮箱。",
        tourModeLiveIn: "直播中 — BTS 正在{city}演出", tourModeSchedule: "巡演日程", tourModeLive: "直播中", tourModeDone: "已结束", tourModeUpcoming: "即将开始", tourModePrev: "上一个", tourModeNext: "下一个",
        tourModeFooterNote: "日期以巡演方公布为准——预订行程前请务必查看官方售票网站确认。",
        liveBadgeLabel: "直播", liveTimelineTitle: "与即将到来", liveTimelineEmpty: "目前暂无安排——请稍后再来查看。", liveTimelineFooterNote: "仅显示官方公开发布的活动——日期以官方公布为准，预订行程前请务必核实官方信息来源。", liveFilterAll: "全部", liveTodayLive: "今天 · 直播中", liveKindGroup: "团体", liveKindSolo: "单人", newBadgeLabel: "新增", usernameCooldownNote: "每7天只能更改一次。", usernameConfirmTitle: "要更改你的用户名吗？", usernameConfirmCancel: "取消", usernameConfirmOk: "是的，更改", subtitle: "追随你喜爱的艺人的足迹", backToList: "← 返回列表", chooserTourOption: "巡演路线", chooserLiveOption: "全部直播动态", tripShareThis: "+ 分享此行程", switchArtistLabel: "切换艺人", groupNoDataYet: "{group}暂无巡演或直播数据——请稍后再来查看。", tripInviteLabel: "邀请他人（可选）", shareTripUsernamePlaceholder: "对方的用户名",
        tourModeGenericLabel: "巡演", tourModeMemberLiveIn: "{member} 直播中 — 于{city}参加{event}", tourModeLiveNowOne: "现在直播中", tourModeLiveNowCount: "现在{n}个直播中", tourModeMoreCount: "+{n}个更多",
        tourModeEyebrow: "巡演模式", tourModeChooseTour: "选择巡演", tourModeStep: "第 {n} 步，共 {total} 步",
        tourModeHighlights: "精彩瞬间", tourModeSurpriseSong: "惊喜曲目：", tourModeNoHighlightsYet: "该场演出暂无精彩瞬间记录。", tourModeNoSurpriseSongYet: "尚未公布。",
        mapLoading: "地图加载中…",
        demoTourBtn: "导览",
        newLocationToastLabel: "新增地点",
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

    // Rafraîchit le libellé du sélecteur de voyage (My Itinerary) si aucun voyage n'est sélectionné
    const tripLabel = document.getElementById('trip-select-label');
    if(tripLabel && !localStorage.getItem('activeTripId')) {
        tripLabel.textContent = t('selectTripToView');
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
            map.flyTo([loc.lat, loc.lng], 16); window.openDetailsPanel(loc.id);
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

function addSingleLocationMarker(loc, wishlistData) {
    const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
    // Le remplissage de couleur reflète maintenant la wishlist, pas la visite (demande du
    // 06/09/2026) : avant, "visité" remplissait le marqueur, ce qui se confondait
    // visuellement avec le remplissage automatique des clusters (voir addClusterMarker) —
    // l'affichage reste "clair" (contour + icône coloré, fond blanc) tant que le lieu n'a
    // pas été ajouté à la wishlist.
    const isWishlisted = wishlistData.some(w => w.id === loc.id || w === loc.id);
    const baseColor = groupColors[loc.group] || '#334e68';

    let inlineStyle = `border-color: ${baseColor}; --marker-color: ${baseColor};`;
    inlineStyle += isWishlisted ? ` background-color: ${baseColor}; color: white;` : ` background-color: white; color: ${baseColor};`;

    const customIcon = L.divIcon({ className: 'custom-category-marker', html: `<div style="${inlineStyle}">${catIconSvg}</div>`, iconSize: [32,32], iconAnchor: [16,16] });
    const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markerGroup);
    marker.on('click', () => window.openDetailsPanel(loc.id));
    marker.on('mouseover', () => showMapHoverTip(loc, marker));
    marker.on('mouseout', () => hideMapHoverTip());
}

function addClusterMarker(cluster, wishlistData) {
    const count = cluster.locs.length;
    const isWishlisted = (loc) => wishlistData.some(w => w.id === loc.id || w === loc.id);
    // Le simple fait que des lieux se chevauchent (et forment donc un cluster) ne doit plus
    // remplir automatiquement le marqueur (demande du 06/09/2026) — même règle que pour un
    // marqueur individuel : "clair" par défaut, rempli seulement si TOUS les lieux du
    // cluster sont dans la wishlist (un cluster partiellement wishlisté reste clair plutôt
    // que de choisir arbitrairement lequel représenter).
    const allWishlisted = cluster.locs.length > 0 && cluster.locs.every(isWishlisted);

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
    if (!allWishlisted) {
        discStyle = `border-color:#94a3b8; --marker-color:#94a3b8; background-color:#fff; color:#94a3b8;`;
    } else if (distinctGroups.length > 1) {
        const step = 360 / distinctGroups.length;
        const slices = distinctGroups.map((g, i) => `${groupColors[g] || '#334e68'} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`).join(', ');
        discStyle = `border-color:#fff; --marker-color:#fff; background:conic-gradient(${slices}); color:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3);`;
    } else {
        const baseColor = groupColors[distinctGroups[0]] || '#334e68';
        discStyle = `border-color:${baseColor}; --marker-color:${baseColor}; background-color:${baseColor}; color:#fff;`;
    }
    // Le badge (span, pas div) et le conteneur (span aussi) évitent volontairement le
    // sélecteur CSS ".custom-category-marker div", qui appliquerait sinon le style rond du
    // marqueur à tout div descendant, y compris le conteneur et le badge.
    const html = `
        <span style="position:relative; display:inline-block;">
            <div style="${discStyle}">${CLUSTER_ICON_SVG}</div>
            <span class="cluster-badge">×${count}</span>
        </span>
    `;
    const clusterIcon = L.divIcon({ className: 'custom-category-marker', html, iconSize: [32, 32], iconAnchor: [16, 16] });
    const marker = L.marker(cluster.center, { icon: clusterIcon }).addTo(markerGroup);
    marker.on('click', () => { map.setView(cluster.center, Math.min(map.getZoom() + 3, 18)); });
}

function renderMapMarkers(locations, opts) {
    if (!map || !markerGroup) return;
    markerGroup.clearLayers();
    const wishlistData = getWishlistLocs();
    const clusters = clusterLocationsForZoom(locations, map.getZoom());

    clusters.forEach(cluster => {
        if (cluster.locs.length === 1) addSingleLocationMarker(cluster.locs[0], wishlistData);
        else addClusterMarker(cluster, wishlistData);
    });

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
    }
}

// DROPDOWN CUSTOM POUR LA SELECTION DE VOYAGE (SANS INJECTION HTML DANGEREUSE)
window.toggleTripDropdown = function(e) {
    if(e) e.stopPropagation();
    const dropdown = document.getElementById('trip-dropdown-list');
    const chevron = document.getElementById('trip-select-chevron');
    const header = document.getElementById('trip-select-header-box');
    if(!dropdown || !chevron) return;
    if(header && header.classList.contains('disabled')) return; // rien à sélectionner, on ne fait rien
    
    if(dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
        if(header) header.classList.add('open');
    } else {
        dropdown.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
        if(header) header.classList.remove('open');
    }
};

document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.custom-trip-select');
    const dropdown = document.getElementById('trip-dropdown-list');
    const chevron = document.getElementById('trip-select-chevron');
    const header = document.getElementById('trip-select-header-box');
    if(wrapper && !wrapper.contains(e.target) && dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
        if(header) header.classList.remove('open');
    }
});

window.loadItineraryTabOptions = function() {
    const dropdownList = document.getElementById('trip-dropdown-list');
    const headerBox = document.getElementById('trip-select-header-box');
    const label = document.getElementById('trip-select-label');
    if(!dropdownList) return;
    
    let trips = getMyTripsList();
    const activeId = localStorage.getItem('activeTripId');
    dropdownList.innerHTML = '';
    
    if(trips.length > 0) {
        // Des voyages existent : le sélecteur redevient normalement cliquable.
        if(headerBox) headerBox.classList.remove('disabled');

        // Option pour DÉSÉLECTIONNER le voyage actif : sans elle, une fois un voyage
        // choisi il n'y avait plus aucun moyen de revenir à "aucun voyage affiché" sur
        // la carte — clearTripFromMainMap() existait déjà mais n'était jamais relié à
        // un élément cliquable une fois qu'un voyage était sélectionné.
        let clearOpt = document.createElement('div');
        clearOpt.className = 'trip-option trip-option-clear' + (!activeId ? ' selected' : '');
        clearOpt.onclick = () => window.deselectItineraryTrip();
        clearOpt.textContent = t('deselectTripOption');
        dropdownList.appendChild(clearOpt);

        trips.forEach(tr => {
            let allAssignedIds = (tr.days || []).flat().map(Number);
            let durationTxt = tr.dateType === 'duration' ? (tr.duration || 'Flexible') : `${tr.days ? tr.days.length : 0} ${currentLang === 'fr' ? 'jours' : 'Days'}`;
            let locWord = allAssignedIds.length > 1 ? t('locationsWordPlural') : t('locationsWord');
            let locsTxt = `${allAssignedIds.length} ${locWord}`;
            const isActive = tr.id === activeId;

            // Création d'élément dynamique pour éviter tout bug lié aux apostrophes/guillemets dans le nom du trip
            let opt = document.createElement('div');
            opt.className = 'trip-option' + (isActive ? ' selected' : '');
            opt.onclick = () => selectCustomTrip(tr.id, tr.name);

            let body = document.createElement('div');
            body.className = 'trip-opt-body';

            let nameDiv = document.createElement('div');
            nameDiv.className = 'trip-opt-name';
            nameDiv.textContent = tr.name;

            let metaDiv = document.createElement('div');
            metaDiv.className = 'trip-opt-meta';
            metaDiv.innerHTML = `<span>${durationTxt}</span><span>&middot;</span><span>${locsTxt}</span>`;

            body.appendChild(nameDiv);
            body.appendChild(metaDiv);
            opt.appendChild(body);

            if(isActive) {
                let check = document.createElement('div');
                check.className = 'trip-opt-check';
                check.innerHTML = '✓';
                opt.appendChild(check);
            }

            dropdownList.appendChild(opt);
        });
    } else {
        // Aucun voyage : inutile de proposer un menu cliquable qui ne mènerait nulle
        // part — on le désactive et on l'indique directement dans le libellé.
        dropdownList.innerHTML = `<div class="trip-select-empty">${t('noTripsFound')}</div>`;
        if(headerBox) headerBox.classList.add('disabled');
        if(label) { label.textContent = t('noTripsFound'); label.style.color = '#94a3b8'; }
    }

    // NE PAS masquer/réinitialiser le voyage actif quand on rouvre l'onglet :
    // si un voyage était déjà sélectionné, on ré-affiche directement son itinéraire.
    if(activeId && trips.some(tr => tr.id === activeId)) {
        window.loadItineraryView(activeId);
    } else {
        document.getElementById('itinerary-content-container').classList.add('hidden');
        window.clearTripFromMainMap();
    }
};

window.selectCustomTrip = function(tripId, tripName) {
    const label = document.getElementById('trip-select-label');
    if(label) {
        label.textContent = tripName;
        label.style.color = '#1e293b';
    }
    
    window.toggleTripDropdown();
    localStorage.setItem('activeTripId', tripId);
    window.loadItineraryView(tripId);
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

    const tripLabelEl = document.getElementById('trip-select-label');
    if(tripLabelEl) { tripLabelEl.textContent = trip.name; tripLabelEl.style.color = '#1e293b'; }

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
                        <div class="timeline-loc" onclick="map.flyTo([${loc.lat}, ${loc.lng}], 16); window.openDetailsPanel(${loc.id});" style="cursor:pointer;">
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
    
    const label = document.getElementById('trip-select-label');
    if(label) {
        label.textContent = t('selectTripToView');
        label.style.color = '#64748b';
    }
    const dropdown = document.getElementById('trip-dropdown-list');
    if(dropdown) dropdown.classList.add('hidden');
    const chevron = document.getElementById('trip-select-chevron');
    if(chevron) chevron.style.transform = 'rotate(0deg)';
    const header = document.getElementById('trip-select-header-box');
    if(header) header.classList.remove('open');

    const cont = document.getElementById('itinerary-content-container');
    if(cont) cont.classList.add('hidden');

    if(document.getElementById('tab-explore-btn')) {
        renderLocations(true);
    }
}

// Choisie depuis l'option "Aucun voyage sélectionné" en tête du menu déroulant de
// l'onglet My Itinerary : oublie le voyage actif (sans ça, rouvrir l'onglet le
// re-sélectionnait automatiquement — voir loadItineraryTabOptions) et referme le menu.
window.deselectItineraryTrip = function() {
    localStorage.removeItem('activeTripId');
    const cont = document.getElementById('itinerary-content-container');
    if(cont) cont.classList.add('hidden');
    window.clearTripFromMainMap();
    const dropdown = document.getElementById('trip-dropdown-list');
    if(dropdown && !dropdown.classList.contains('hidden')) window.toggleTripDropdown();
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
function highlightSelectedLocationMarker(loc) {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
    if (window.__selectedLocMarkerTimeout) clearTimeout(window.__selectedLocMarkerTimeout);
    if (window.__selectedLocMarker) { map.removeLayer(window.__selectedLocMarker); window.__selectedLocMarker = null; }
    const pulseIcon = L.divIcon({
        className: '',
        html: `<div class="selected-loc-pulse-wrap"><span class="selected-loc-pulse-ring"></span><span class="selected-loc-pulse-ring selected-loc-pulse-ring2"></span><span class="selected-loc-pulse-dot"></span></div>`,
        iconSize: [40, 40], iconAnchor: [20, 20]
    });
    window.__selectedLocMarker = L.marker([loc.lat, loc.lng], { icon: pulseIcon, zIndexOffset: 9000, interactive: false }).addTo(map);
    window.__selectedLocMarkerTimeout = setTimeout(() => {
        if (window.__selectedLocMarker) { map.removeLayer(window.__selectedLocMarker); window.__selectedLocMarker = null; }
        window.__selectedLocMarkerTimeout = null;
    }, 3500);
}
window.highlightSelectedLocationMarker = highlightSelectedLocationMarker;

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
    if (videoContainer && videoSection) {
        videoContainer.innerHTML = "";
        if (loc.videoEmbeds && loc.videoEmbeds.length > 0) {
            loc.videoEmbeds.forEach(vidSrc => { videoContainer.innerHTML += `<div class="video-wrapper"><iframe src="${vidSrc}" frameborder="0" allowfullscreen></iframe></div>`; });
            videoSection.classList.remove('hidden');
        } else if (loc.ytId) {
            videoContainer.innerHTML = `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${loc.ytId}" frameborder="0" allowfullscreen></iframe></div>`;
            videoSection.classList.remove('hidden');
        } else { videoSection.classList.add('hidden'); }
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

    const heroBg = document.getElementById('detail-hero-bg');
    if(heroBg) {
        const bgImg = loc.ytId ? `https://img.youtube.com/vi/${loc.ytId}/maxresdefault.jpg` : loc.img;
        heroBg.style.backgroundImage = `linear-gradient(180deg, rgba(20,16,30,.15) 0%, rgba(20,16,30,.75) 100%), url('${bgImg}')`;
    }
    
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
                renderLocationRichContent(Object.assign({}, loc, remote));
            }
        });
    }

    const wishlistStatBox = document.getElementById('details-wishlist-stat');
    if (wishlistStatBox) {
        const pct = wishlistPercentForLocation(loc.id);
        if (pct != null) {
            wishlistStatBox.innerHTML = `<span>🔥</span><span>${t('wishlistStat').replace('{pct}', pct)}</span>`;
            wishlistStatBox.classList.remove('hidden');
        } else {
            wishlistStatBox.classList.add('hidden');
        }
    }

    const friendVisitBox = document.getElementById('details-friend-visits');
    if (friendVisitBox) {
        const visitors = friendsWhoVisited(loc.id);
        if (visitors.length > 0) {
            const names = visitors.map(f => f.username).join(', ');
            friendVisitBox.innerHTML = `<span>👥</span><span>${t('friendsVisitedStat').replace('{names}', names)}</span>`;
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
        const reader = new FileReader();
        reader.onload = async function(event) {
            pendingMemoryPhoto = await resizeImageDataUrl(event.target.result, 700);
            const preview = document.getElementById('memory-photo-preview');
            const previewImg = document.getElementById('memory-photo-preview-img');
            const removeBtn = document.getElementById('memory-photo-remove');
            if (previewImg) previewImg.src = pendingMemoryPhoto;
            if (preview) preview.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
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
                        userPhoto: localStorage.getItem('userPhoto') || null
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

let pendingReviewComposePhoto = null;
const reviewComposePhotoBtn = document.getElementById('review-compose-photo-btn');
if (reviewComposePhotoBtn) {
    reviewComposePhotoBtn.addEventListener('click', () => document.getElementById('review-compose-photo-input').click());
}
const reviewComposePhotoInput = document.getElementById('review-compose-photo-input');
if (reviewComposePhotoInput) {
    reviewComposePhotoInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(event) {
            pendingReviewComposePhoto = await resizeImageDataUrl(event.target.result, 700);
            const preview = document.getElementById('review-compose-photo-preview');
            const previewImg = document.getElementById('review-compose-photo-preview-img');
            if (previewImg) previewImg.src = pendingReviewComposePhoto;
            if (preview) preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });
}

window.postQuickReview = async function() {
    const notesEl = document.getElementById('review-compose-notes');
    const notes = notesEl ? notesEl.value.trim() : '';
    const rating = Number((document.getElementById('review-compose-rating-val') || {}).value) || 0;
    if (!notes && !rating) return;
    const photo = pendingReviewComposePhoto || null;
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
        const publishResult = await window.setLocationReview(String(locId), {
            rating, notes, photo,
            userName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
            userPhoto: localStorage.getItem('userPhoto') || null
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

    if (notesEl) notesEl.value = '';
    window.setReviewComposeStars(4);
    pendingReviewComposePhoto = null;
    const preview = document.getElementById('review-compose-photo-preview');
    if (preview) preview.classList.add('hidden');
    const photoInput = document.getElementById('review-compose-photo-input');
    if (photoInput) photoInput.value = '';
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

window.openLocModal = function(id) {
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
    if(modalHero) modalHero.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.8), transparent), url('${loc.img || ('https://img.youtube.com/vi/' + loc.ytId + '/hqdefault.jpg')}')`;

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
    for (let d = 0; d < days && pool.length > 0; d++) {
        const dayLocs = [];
        while (pool.length > 0) {
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
                <div style="padding: 12px; background: #faf9fc; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#D42759'" onmouseout="this.style.borderColor='#e2e8f0'" onclick="closeModal('list-modal'); window.openDetailsPanel(${loc.id}); map.flyTo([${loc.lat}, ${loc.lng}], 16);">
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
                <div style="padding: 12px; background: #faf9fc; border-radius: 8px; border: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
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
let sharedTripsCache = [];
window.refreshSharedTrips = async function() {
    sharedTripsCache = typeof window.listSharedTripsForMe === 'function' ? await window.listSharedTripsForMe() : [];
    window.renderTripsSidebar();
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
            <div style="display:flex; gap:8px; margin-top:6px;">
                <input id="share-trip-invite-input" placeholder="${currentLang === 'fr' ? 'Leur pseudo' : 'Their username'}" style="flex:1; border:1.5px solid #cbd5e1; border-radius:100px; padding:10px 14px; font-size:12px; font-family:'Poppins',sans-serif;">
                <button id="share-trip-invite-btn" style="background:#D42759; color:#fff; border:none; border-radius:100px; padding:10px 18px; font-size:12px; font-weight:700; font-family:'Poppins',sans-serif; cursor:pointer;" data-i18n="shareTripInvite">Invite</button>
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

    const inviteBtn = document.getElementById('share-trip-invite-btn');
    inviteBtn.onclick = async () => {
        const input = document.getElementById('share-trip-invite-input');
        const username = input.value.trim();
        const errorEl = document.getElementById('share-trip-error');
        if (errorEl) errorEl.classList.add('hidden');
        if (!username) return;
        inviteBtn.disabled = true;
        // Un voyage doit exister côté Firestore partagé AVANT de pouvoir y ajouter un
        // collaborateur (voir createSharedTrip()) — créé au tout premier partage, jamais
        // avant, pour ne pas alourdir Firestore d'un document par voyage jamais partagé.
        if (typeof window.createSharedTrip === 'function' && !trip.isShared) {
            await window.createSharedTrip(trip);
            trip.isShared = true;
            const idx = trips.findIndex(t => t.id === tripId);
            if (idx !== -1) { trips[idx] = trip; localStorage.setItem('myTrips', JSON.stringify(trips)); syncTrips(trips); }
        }
        const result = typeof window.inviteTripCollaborator === 'function' ? await window.inviteTripCollaborator(tripId, username, 'view') : { error: 'failed' };
        inviteBtn.disabled = false;
        if (result && result.error) {
            if (errorEl) {
                errorEl.textContent = currentLang === 'fr' ? `Aucun compte trouvé pour le pseudo « ${username} ».` : `No account found for the username "${username}".`;
                errorEl.classList.remove('hidden');
            }
            return;
        }
        input.value = '';
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

    let rowsHtml = `
        <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f6f4fb;">
            <div style="width:34px; height:34px; border-radius:50%; background:#D42759; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;">${ownerInitial}</div>
            <div style="flex:1;"><div style="font-size:12px; font-weight:700; color:#212832;">${ownerName}</div><div style="font-size:9px; color:#94a3b8;">${creatorLabel}</div></div>
        </div>`;

    Object.keys(members).forEach(uid => {
        const role = members[uid];
        const name = memberNames[uid] || uid;
        const initial = name.trim().charAt(0).toUpperCase();
        rowsHtml += `
        <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f6f4fb;">
            <div style="width:34px; height:34px; border-radius:50%; background:#8B5CF6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;">${initial}</div>
            <div style="flex:1;"><div style="font-size:12px; font-weight:700; color:#212832;">${name}</div></div>
            <div class="share-role-toggle" data-uid="${uid}" data-role="${role}" title="${role === 'edit' ? (currentLang === 'fr' ? 'Peut modifier' : 'Can edit') : (currentLang === 'fr' ? 'Lecture seule' : 'View only')}" style="width:28px; height:28px; border-radius:50%; background:${role === 'edit' ? '#FCE7F0' : '#f1f5f9'}; display:flex; align-items:center; justify-content:center; cursor:pointer;">${role === 'edit' ? editIconSvg : viewIconSvg}</div>
            <div class="share-remove-btn" data-uid="${uid}" title="${currentLang === 'fr' ? 'Retirer' : 'Remove'}" style="width:20px; height:20px; border-radius:50%; color:#cbd5e1; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; font-weight:700;">&times;</div>
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
    document.getElementById('sidebar-title').textContent = `MY TRIPS (${trips.length})`;

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
            <div class="trip-pill-meta">${dateStr} &middot; ${totalLocs} locations</div>
        `;
        listContainer.appendChild(pill);
    });

    // Voyages que d'AUTRES personnes ont partagés avec ce compte (jamais dans myTrips —
    // voir refreshSharedTrips()) : affichés à la suite, avec un badge indiquant qui les a
    // partagés et le niveau d'accès accordé, pas de glisser-déposer ni de suppression
    // (ce n'est pas notre voyage).
    if (sharedTripsCache.length > 0) {
        const sectionTitle = document.createElement('div');
        sectionTitle.style.cssText = 'font-size:10.5px; font-weight:800; color:#94a3b8; letter-spacing:.05em; text-transform:uppercase; margin:18px 0 8px;';
        sectionTitle.textContent = currentLang === 'fr' ? `Partagés avec moi (${sharedTripsCache.length})` : `Shared with me (${sharedTripsCache.length})`;
        listContainer.appendChild(sectionTitle);

        sharedTripsCache.forEach(t => {
            const roleLabel = t._myRole === 'edit' ? (currentLang === 'fr' ? 'Peut modifier' : 'Can edit') : (currentLang === 'fr' ? 'Lecture seule' : 'View only');
            const pill = document.createElement('div');
            pill.className = `trip-pill ${!activeTripAccess.isOwner && currentTrip && currentTrip.id === t._sharedTripId ? 'active' : ''}`;
            pill.onclick = () => window.openSharedTrip(t._sharedTripId);
            pill.innerHTML = `
                <div class="trip-pill-name">${t.name}</div>
                <div class="trip-pill-meta">${currentLang === 'fr' ? 'Partagé par' : 'Shared by'} ${t.ownerName || 'ARMY'} &middot; ${roleLabel}</div>
            `;
            listContainer.appendChild(pill);
        });
    }
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
        }
    } else {
        ownerName = currentTrip.ownerName || 'ARMY';
        members = currentTrip.members || {};
        memberNames = currentTrip.memberNames || {};
    }

    const palette = ['#D42759', '#8B5CF6', '#F06090', '#10b981', '#3b82f6', '#f59e0b'];
    let html = `<div class="trip-buddy-avatar" style="background:${palette[0]};" title="${ownerName}">${ownerName.charAt(0).toUpperCase()}</div>`;
    Object.keys(members).forEach((uid, i) => {
        const name = memberNames[uid] || uid;
        html += `<div class="trip-buddy-avatar" style="background:${palette[(i + 1) % palette.length]};" title="${name}">${name.charAt(0).toUpperCase()}</div>`;
    });
    container.innerHTML = html;
    container.classList.remove('hidden');
};

window.renderTrip = function() {
    if (!currentTrip) return;

    document.getElementById('edit-trip-name').value = currentTrip.name;
    if (typeof window.renderTripBuddiesAvatars === 'function') window.renderTripBuddiesAvatars();
    
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

window.switchEditDateTab = function(tab) {
    if(tab === 'specific') {
        document.getElementById('edit-date-specific-panel').classList.remove('hidden');
        document.getElementById('edit-date-flexible-panel').classList.add('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.add('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.remove('active');
    } else {
        document.getElementById('edit-date-specific-panel').classList.add('hidden');
        document.getElementById('edit-date-flexible-panel').classList.remove('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.remove('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.add('active');
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

window.addDay = function() {
    const box = document.getElementById('itinerary-box');
    const addBtn = box.querySelector('.add-day-btn');
    const newDayNum = document.querySelectorAll('.day-card').length + 1;
    
    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.day = newDayNum;
    card.setAttribute('draggable', 'true'); 
    card.setAttribute('ondragstart', 'dragStart(event, "day")');
    card.setAttribute('ondragover', 'allowDrop(event)');
    card.setAttribute('ondrop', 'drop(event)');
    card.setAttribute('ondragleave', 'dragLeave(event)');
    card.innerHTML = `
        <div class="day-header">
            <div class="day-title" style="color:${TRIP_DAY_COLORS[(newDayNum - 1) % TRIP_DAY_COLORS.length]};"><span class="drag-handle edit-only" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${newDayNum}</div>
            <div class="x-btn edit-only" style="display:flex;" onclick="removeDay(this)">✕</div>
        </div>
        <div class="day-items"></div>
    `;
    box.insertBefore(card, addBtn);
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

// LOGIQUE GOOGLE FLIGHTS STYLE TABS (NEW TRIP)
window.openNewTripModal = function() {
    document.getElementById('add-trip-modal').classList.remove('hidden');
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
    } else {
        document.getElementById('create-date-specific-panel').classList.add('hidden');
        document.getElementById('create-date-flexible-panel').classList.remove('hidden');
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
            await window.createSharedTrip(newTrip);
            newTrip.isShared = true;
            const idx2 = trips.findIndex(t => t.id === newTripId);
            if (idx2 !== -1) { trips[idx2] = newTrip; localStorage.setItem('myTrips', JSON.stringify(trips)); syncTrips(trips); }
        }
        if (typeof window.inviteTripCollaborator === 'function') {
            for (const username of createTripPendingInvitees) {
                await window.inviteTripCollaborator(newTripId, username, 'view');
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
