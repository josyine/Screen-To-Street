// ==========================================
// Contenu partagé "Explore Destinations" (destinations.html + map-destinations.html).
// ==========================================
// Demande du 12/09/2026 ("De même pour map-destinations.html et destinations.html") :
// même principe que artists-content.js (voir ce fichier pour le contexte détaillé) —
// script classique (pas de module ES), chargé à l'identique par les deux pages via
// <script src="destinations-content.js?...">, portant COUNTRIES/COUNTRY_DETAILS et la
// fonction qui construit la fiche détaillée, pour que les deux pages ne puissent plus
// diverger. Reste HORS de ce fichier (propre à chaque page) : le dictionnaire i18n
// t_dest (chrome de page + contenu court des CARTES résumé — badge/nom/texte par pays,
// noms de villes, libellés "Explorer X"/"Depuis XXXX" — qui reste écrit en dur dans le
// HTML de chaque page, comme c'était déjà le cas avant cette demande) et le câblage des
// crayons d'édition admin (modale + wireDestinationEditPencils(), qui n'existe que sur
// map-destinations.html).

// --- DONNÉES DES PAYS (bilingue) ---
// Uniquement ce dont la fiche détaillée enrichie (renderDestinationDetailHtml) a
// réellement besoin : nom/photo affichés dans le hero, nombre de lieux (corrigé en
// direct par correctDestinationNumbers ci-dessous) et la liste des villes couvertes.
window.COUNTRIES = {
  en: {
      southkorea: { name: "South Korea", photo: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=900", locations: 31, cities: [["Seoul",19],["Chuncheon",2],["Gangneung",2],["Yangju",1],["Wanju",1],["Busan",1],["Yongin",1],["Jecheon",1],["Seoul Area",1]] },
      france: { name: "France", photo: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900", locations: 6, cities: [["Paris",5],["Saint-Denis",1]] },
      portugal: { name: "Portugal", photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=900", locations: 2, cities: [["Lisbon",1],["Prior Velho",1]] },
      malta: { name: "Malta", photo: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=900", locations: 6, cities: [["Valletta",4],["St Paul's Bay",1],["Mdina",1]] },
      usa: { name: "United States", photo: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900", locations: 4, cities: [["Las Vegas",1],["Oahu, Hawaii",1],["Foxborough, MA",1],["Inglewood, CA",1]] },
      newzealand: { name: "New Zealand", photo: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900", locations: 4, cities: [["Canterbury",2],["Queenstown",2]] },
      norway: { name: "Norway", photo: "https://images.unsplash.com/photo-1601439678777-b2b3c56fa72e?w=900", locations: 2, cities: [["Bergen",2]] },
      sweden: { name: "Sweden", photo: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=900", locations: 1, cities: [["Stockholm",1]] },
      finland: { name: "Finland", photo: "https://images.unsplash.com/photo-1508189860359-777d945909ef?w=900", locations: 1, cities: [["Helsinki",1]] }
  },
  fr: {
      southkorea: { name: "Corée du Sud", photo: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=900", locations: 31, cities: [["Séoul",19],["Chuncheon",2],["Gangneung",2],["Yangju",1],["Wanju",1],["Busan",1],["Yongin",1],["Jecheon",1],["Seoul Area",1]] },
      france: { name: "France", photo: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900", locations: 6, cities: [["Paris",5],["Saint-Denis",1]] },
      portugal: { name: "Portugal", photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=900", locations: 2, cities: [["Lisbonne",1],["Prior Velho",1]] },
      malta: { name: "Malte", photo: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=900", locations: 6, cities: [["La Valette",4],["St Paul's Bay",1],["Mdina",1]] },
      usa: { name: "États-Unis", photo: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900", locations: 4, cities: [["Las Vegas",1],["Oahu, Hawaï",1],["Foxborough, MA",1],["Inglewood, CA",1]] },
      newzealand: { name: "Nouvelle-Zélande", photo: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900", locations: 4, cities: [["Canterbury",2],["Queenstown",2]] },
      norway: { name: "Norvège", photo: "https://images.unsplash.com/photo-1601439678777-b2b3c56fa72e?w=900", locations: 2, cities: [["Bergen",2]] },
      sweden: { name: "Suède", photo: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=900", locations: 1, cities: [["Stockholm",1]] },
      finland: { name: "Finlande", photo: "https://images.unsplash.com/photo-1508189860359-777d945909ef?w=900", locations: 1, cities: [["Helsinki",1]] }
  }
};

// Contenu enrichi (sections narratives développées, essentiels de voyage, répartition
// par groupe, liste des lieux nommés pour le KPI "Locations" cliquable) pour la fiche
// détaillée de chaque pays. Anglais uniquement pour l'instant, même logique de repli
// que GROUP_DETAILS sur artists-content.js : renderDestinationDetailHtml() y recourt
// quel que soit currentLang, en complément des champs déjà bilingues (name/cities) de
// COUNTRIES qui restent, eux, affichés dans la langue choisie. Les répartitions par
// groupe (`groups`) sont dérivées uniquement des chiffres déjà affichés ailleurs sur
// ces pages, jamais de chiffres inventés.
window.COUNTRY_DETAILS = {
  southkorea: {
    locationNames: ["Cafe Camptong", "Ossu Seiromushi", "Lotte World Adventure", "Ahwon Museum & Hotel", "Cafe Kitsuné Seoul", "Cheonggu Building", "The First BTS Dorm", "Hyangho Beach Bus Stop", "Iryeong Station", "Sunhyewon", "In the SOOP Estate", "Happy Meadow Ranch", "Cafe Magnate", "Oldeugnseu (Oldeugns)", "Cafe Hyuga", "Seoul Olympic Stadium", "HYBE Headquarters", "Yoojung Sikdang", "Gwanghwamun Square", "HiKR Ground", "The Min's", "Giani's Napoli", "MMCA Seoul", "K-Star Road", "Achasan Mountain", "Hakdong Park", "Laundry Pizza", "Yongin Daejanggeum Park", "Eulji Dabang", "Jumunjin Beach Bus Stop", "Jecheon Mosan Airfield"],
    essentials: { stay: "5–7 days", season: "Spring (Apr–May) or Autumn (Sep–Oct)", transport: "Seoul subway + KTX for countryside stops", timezone: "KST (UTC+9)" },
    groups: [["BTS", 30], ["Blackpink", 1]],
    sections: [
      ["Where it all began", "Long before it became a global pop-culture capital, Seoul was already a city of contrasts — centuries-old palaces sitting a few blocks from neon-lit shopping districts. Rookie-era practice rooms in Gangnam sit alongside purpose-built mountain retreats in Gangwon-do, each telling a different chapter of an artist's story."],
      ["The scene today", "Nine cities now share space on this map, from dense Seoul neighbourhoods — Gangnam, Songpa-gu, Yongsan — to quieter countryside filming spots hours outside the capital. It remains, by a wide margin, the most mapped country on Screen To Street."],
      ["Planning a visit", "Most Seoul locations sit within a short subway ride of each other, making a 3–4 day city stay realistic for covering the bulk of them; the countryside spots (Chuncheon, Gangneung) are better treated as separate day trips or overnight stays."]
    ]
  },
  france: {
    locationNames: ["Pozzetto", "Musée Nissim de Camondo", "Montmartre Stairs", "Wall of Love", "Palais de Tokyo", "Stade de France"],
    essentials: { stay: "3–4 days", season: "Spring (Apr–Jun) or Autumn (Sep–Oct)", transport: "Paris Métro + RER", timezone: "CET (UTC+1)" },
    groups: [["BTS", 6]],
    sections: [
      ["Where it all began", "Paris has long been a stage for K-pop's biggest fashion moments — Fashion Week runways, flagship store openings, and quiet afternoons in Montmartre captured between official schedules."],
      ["The scene today", "In 2026 the city also hosted a stop of the ARIRANG World Tour at the Stade de France, adding a very different kind of location — a full stadium show — to a map that had until then been mostly about fashion and quiet street moments."],
      ["Planning a visit", "The fashion-district and Montmartre stops cluster tightly enough to cover on foot over a single day; the Stade de France sits outside the city centre in Saint-Denis, reachable by RER, and is worth pairing with the Basilica of Saint-Denis nearby."]
    ]
  },
  portugal: {
    locationNames: ["Quinta da Francelha de Cima", "Museu de Marinha"],
    essentials: { stay: "2–3 days", season: "Spring (Mar–May) or Autumn (Sep–Oct)", transport: "Lisbon Metro + short taxi/rideshare rides", timezone: "WET (UTC+0)" },
    groups: [["BTS", 2]],
    sections: [
      ["Where it all began", "Portugal's spot on the map exists almost by accident of production choices — a historic estate near Lisbon Airport and the Navy Museum in Belém were both chosen as filming backdrops for a single music video shoot."],
      ["The scene today", "With just two confirmed locations, Portugal remains one of the smallest footprints on the map — but both stops put the country on ARMY's radar for the first time, and each draws a steady trickle of visiting fans exploring greater Lisbon."],
      ["Planning a visit", "Both locations sit close enough to central Lisbon to fold into a single day of sightseeing alongside Belém's more famous landmarks — the Tower of Belém and Jerónimos Monastery are a short walk from the Navy Museum stop."]
    ]
  },
  malta: {
    locationNames: ["Triton Fountain", "Upper Barrakka Gardens", "Cafe del Mar Malta", "Mdina Old City", "St. John's Co-Cathedral", "Valletta"],
    essentials: { stay: "3–4 days", season: "Spring (Apr–Jun) or Autumn (Sep–Oct)", transport: "Public buses + walking (compact island)", timezone: "CET (UTC+1)" },
    groups: [["BTS", 6]],
    sections: [
      ["Where it all began", "Bon Voyage Season 3 spent its entire run on this single Mediterranean island — golden limestone, baroque interiors and sweeping harbour views replacing the wood and water of the earlier Nordic seasons entirely."],
      ["The scene today", "It remains the most thoroughly mapped stop of any Bon Voyage season on the site, with locations spread across Valletta, St Paul's Bay and the silent medieval city of Mdina."],
      ["Planning a visit", "Malta is small enough that all three cities are reachable by public bus within roughly 30–45 minutes of each other, making it realistic to base yourself in Valletta for the whole stay and day-trip out to Mdina and St Paul's Bay."]
    ]
  },
  usa: {
    locationNames: ["Aha'oulu (Bon Voyage 2)", "Gillette Stadium", "SoFi Stadium", "Allegiant Stadium"],
    essentials: { stay: "7–10 days for multiple cities", season: "Spring or Autumn generally mildest, varies by region", transport: "Domestic flights + rental car between cities", timezone: "Multiple time zones (Pacific to Eastern)" },
    groups: [["BTS", 4]],
    sections: [
      ["Where it all began", "The United States map spans two very different eras: a 2017 Bon Voyage stop on Oahu's North Shore for a first, chaotic attempt at surfing, and a string of stadium shows years later during the group's biggest world tours."],
      ["The scene today", "Las Vegas, Massachusetts and California each hold a single stadium-show location, making the US the most geographically spread-out country on the entire map — no two stops are within reasonable driving distance of each other."],
      ["Planning a visit", "Given the distances involved, most fans treat each US location as a stop tied to a specific trip rather than a single dedicated itinerary — pairing a Las Vegas or Los Angeles visit with the nearest mapped stop makes more sense than trying to cover all four in one trip."]
    ]
  },
  newzealand: {
    locationNames: ["Lake Pukaki", "Mount Cook National Park", "Queenstown Skyline", "Nevis Swing"],
    essentials: { stay: "7–10 days", season: "Southern Hemisphere summer (Dec–Feb) for outdoor activities", transport: "Rental car — public transport is limited outside cities", timezone: "NZST/NZDT (UTC+12/+13)" },
    groups: [["BTS", 4]],
    sections: [
      ["Where it all began", "Bon Voyage Season 4 leaned harder into adventure than any season before it: camping under a genuinely dark sky at Lake Pukaki, hiking toward Aoraki/Mount Cook's glaciers, and — for the boldest members — a 300-metre freefall on the Nevis Swing outside Queenstown."],
      ["The scene today", "The four locations split between the Canterbury region and Queenstown, making this the most physically adventurous Bon Voyage season on the map — most of the stops are outdoor and scenery-driven rather than urban."],
      ["Planning a visit", "A rental car is close to essential here: the Canterbury and Queenstown locations sit roughly three to four hours apart by road, and several are only reachable via scenic drives with no public transport option."]
    ]
  },
  norway: {
    locationNames: ["Bryggen", "Fløyen"],
    essentials: { stay: "3–4 days", season: "Summer (Jun–Aug) for long daylight hours", transport: "Bergen Light Rail + Fløibanen funicular", timezone: "CET (UTC+1)" },
    groups: [["BTS", 2]],
    sections: [
      ["Where it all began", "Norway opened the very first season of Bon Voyage in 2016, with the group's earliest real off-the-clock trip built around Bergen's colourful Hanseatic wharf."],
      ["The scene today", "Both mapped locations sit in and around Bergen — the wharf itself and the mountaintop views from Fløyen just above it, reachable by funicular in a matter of minutes."],
      ["Planning a visit", "Both stops can comfortably be covered in a single day from central Bergen; the funicular up to Fløyen gets busy in peak summer, so an early-morning ride is worth planning for photos with fewer crowds."]
    ]
  },
  sweden: {
    locationNames: ["Gamla Stan"],
    essentials: { stay: "2–3 days", season: "Summer (May–Aug)", transport: "Stockholm Metro + walking in Gamla Stan", timezone: "CET (UTC+1)" },
    groups: [["BTS", 1]],
    sections: [
      ["Where it all began", "A single, unhurried stop in Stockholm's old town, Gamla Stan, during the Nordic leg of Bon Voyage Season 1 — one of the quietest, least scripted afternoons the show has ever filmed."],
      ["The scene today", "With only one confirmed location, Sweden's footprint on the map is deliberately modest — but Gamla Stan's cobbled lanes remain a popular stop for fans already in Stockholm for other reasons."],
      ["Planning a visit", "Gamla Stan is walkable from most central Stockholm hotels and pairs naturally with a broader day of sightseeing in the old town rather than standing alone as a dedicated trip."]
    ]
  },
  finland: {
    locationNames: ["Suomenlinna"],
    essentials: { stay: "2 days", season: "Summer (Jun–Aug)", transport: "Ferry from Helsinki + city trams", timezone: "EET (UTC+2)" },
    groups: [["BTS", 1]],
    sections: [
      ["Where it all began", "The final stop of Bon Voyage Season 1's Nordic leg: the sea fortress of Suomenlinna, spread across six islands just off Helsinki."],
      ["The scene today", "Like Sweden, Finland holds a single mapped location — but Suomenlinna's scale as a UNESCO World Heritage site means it draws a full afternoon on its own, well beyond the show's original visit."],
      ["Planning a visit", "Suomenlinna is reached by a short public ferry from Helsinki's market square, running year-round; plan for at least half a day to explore the fortress islands properly on foot."]
    ]
  }
};

// --- CHIFFRES EN DIRECT (demande du 12/09/2026) ---
window.COUNTRY_KEY_MAP = { 'South Korea': 'southkorea', 'France': 'france', 'Portugal': 'portugal', 'Malta': 'malta', 'United States': 'usa', 'New Zealand': 'newzealand', 'Norway': 'norway', 'Sweden': 'sweden', 'Finland': 'finland' };

window.computeCountryStats = function () {
    const stats = {};
    (window.STATIC_LOCATIONS || []).forEach(loc => {
        const key = window.COUNTRY_KEY_MAP[loc.country];
        if (!key) return;
        if (!stats[key]) stats[key] = { count: 0, cities: new Set(), groups: new Set() };
        stats[key].count++;
        if (loc.city) stats[key].cities.add(loc.city);
        if (loc.group) stats[key].groups.add(loc.group);
    });
    return stats;
};

// Recalcule les chiffres RÉELS (badge, .row-stat, sous-titre de la fiche détaillée) à
// partir de window.STATIC_LOCATIONS, à la place des chiffres figés dans COUNTRIES —
// suppose la même structure HTML sur destinations.html et map-destinations.html (une
// `.row[onclick^="openDetail"]` par pays, avec .row-photo-badge/.row-stat/.n à
// l'intérieur), donc une seule implémentation suffit pour les deux pages. Les LISTES de
// villes (city-pill, tableau détaillé au clic sur le KPI) restent celles écrites à la
// main dans COUNTRIES/le HTML, avec leurs noms déjà traduits — les régénérer depuis
// STATIC_LOCATIONS n'aurait que des noms anglais, ce qui casserait cette traduction.
window.correctDestinationNumbers = function (currentLang) {
    const stats = window.computeCountryStats();
    if (!Object.keys(stats).length) return; // locations-data.js pas encore chargé

    Object.keys(window.COUNTRIES).forEach(lang => {
        Object.keys(window.COUNTRIES[lang]).forEach(key => {
            const s = stats[key];
            if (s) window.COUNTRIES[lang][key].locations = s.count;
        });
    });

    const isFr = currentLang === 'fr';
    document.querySelectorAll('.row[onclick^="openDetail"]').forEach(rowEl => {
        const m = rowEl.getAttribute('onclick').match(/openDetail\('([^']+)'\)/);
        const key = m && m[1];
        const s = key && stats[key];
        if (!s) return;

        const badge = rowEl.querySelector('.row-photo-badge span');
        if (badge) badge.textContent = s.count + (isFr ? (s.count > 1 ? ' lieux' : ' lieu') : (s.count === 1 ? ' location' : ' locations'));

        const nums = rowEl.querySelectorAll('.row-stat .n');
        if (nums[0]) nums[0].textContent = s.count;
        if (nums[1]) nums[1].textContent = s.cities.size;
        if (nums[2]) nums[2].textContent = s.groups.size;
    });

    const totalLocs = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
    const allCities = new Set();
    Object.values(stats).forEach(s => s.cities.forEach(c => allCities.add(c)));
    const statNums = document.querySelectorAll('.stats-bar .stat-num');
    if (statNums[1]) statNums[1].textContent = allCities.size;
    if (statNums[2]) statNums[2].textContent = totalLocs;
};

// --- SURCHARGES ADMIN (photo/texte, demande du 13/09/2026) ---
// Voir window.getDestinationOverrides() dans firebase-init.js et la collection
// destinationOverrides dans firestore.rules. Une seule collection chargée une fois pour
// les 9 pays, mise en cache pour la session.
let _destOverridesCache = null;
window.loadDestinationOverrides = async function () {
    if (!window.getDestinationOverrides) return {}; // firebase-init.js pas encore chargé
    if (!_destOverridesCache) _destOverridesCache = await window.getDestinationOverrides();
    return _destOverridesCache;
};
window.clearDestinationOverridesCache = function () { _destOverridesCache = null; };
window.setDestinationOverrideCacheEntry = function (key, fields) {
    if (!_destOverridesCache) _destOverridesCache = {};
    _destOverridesCache[key] = Object.assign({}, _destOverridesCache[key], fields);
};
window.applyDestinationOverrides = async function () {
    const overrides = await window.loadDestinationOverrides();
    document.querySelectorAll('.row[data-country]').forEach(row => {
        const ov = overrides[row.dataset.country];
        if (!ov) return;
        if (ov.photo) {
            const photoEl = row.querySelector('.row-photo');
            if (photoEl) photoEl.style.backgroundImage = `url('${ov.photo}')`;
        }
        if (ov.text) {
            const blurbEl = row.querySelector('.row-blurb');
            if (blurbEl) blurbEl.textContent = ov.text;
        }
    });
};

// --- KPI CLIQUABLES DE LA FICHE DÉTAILLÉE ---
// Ouvre/ferme la liste détaillée sous une des 3 cartes KPI (lieux / villes / groupes).
// Chaque page définit un thin wrapper `function toggleKpi(type)` qui lui fournit son
// propre currentLang/lastOpenedCountry (variables locales à chaque page, comme
// lastOpenedGroup sur artists-content.js) ; l'état "quel KPI est ouvert" est, lui, geré
// ici pour ne pas dupliquer cette mécanique deux fois.
let _destActiveKpi = null;
window.resetDestinationKpiState = function () { _destActiveKpi = null; };
window.toggleKpiShared = function (type, currentLang, key) {
    const detail = document.getElementById('kpi-detail');
    const inner = document.getElementById('kpi-detail-inner');
    if (!detail || !inner || !key) return;
    document.querySelectorAll('.kpi-box').forEach(b => b.classList.remove('active'));

    if (_destActiveKpi === type) {
        detail.classList.remove('open');
        _destActiveKpi = null;
        return;
    }
    _destActiveKpi = type;
    const box = document.getElementById('kpi-' + type);
    if (box) box.classList.add('active');

    const d = window.COUNTRY_DETAILS[key];
    const c = (window.COUNTRIES[currentLang] || window.COUNTRIES.en)[key];
    const isFr = currentLang === 'fr';
    let html = '';
    if (type === 'locations') {
        html = d.locationNames.map(name => `<div class="kpi-detail-row"><span>${name}</span></div>`).join('');
    } else if (type === 'cities') {
        html = c.cities.map(([name, n]) => `<div class="kpi-detail-row"><span>${name}</span><span>${n} ${n > 1 ? (isFr ? 'lieux' : 'locations') : (isFr ? 'lieu' : 'location')}</span></div>`).join('');
    } else if (type === 'groups') {
        html = d.groups.map(([name, n]) => `<div class="kpi-detail-row"><span>${name}</span><span>${n} ${n > 1 ? (isFr ? 'lieux' : 'locations') : (isFr ? 'lieu' : 'location')}</span></div>`).join('');
    }
    inner.innerHTML = html;
    detail.classList.add('open');
};

// --- RENDU DE LA FICHE DÉTAILLÉE ---
// Construit le innerHTML de #detail-window pour un pays donné. Appelée par
// openDetail(key) sur destinations.html ET map-destinations.html.
// `t` : dictionnaire de traduction de la page appelante (t_dest[currentLang]).
// `overrides` : { photo, text } venant de loadDestinationOverrides()[key], ou {}.
window.renderDestinationDetailHtml = function (key, currentLang, t, overrides) {
    const c = (window.COUNTRIES[currentLang] || window.COUNTRIES.en)[key];
    const d = window.COUNTRY_DETAILS[key];
    const ov = overrides || {};
    const heroPhoto = ov.photo || c.photo;

    const cityRows = c.cities.map(([name, n]) => `<div class="city-row"><span>${name}</span><span>${n} ${n > 1 ? (currentLang === 'fr' ? 'lieux' : 'locations') : (currentLang === 'fr' ? 'lieu' : 'location')}</span></div>`).join('');

    const sectionsHtml = d.sections.map(([heading, text]) => `
        <div class="blog-heading">${heading}</div>
        <p class="para">${text}</p>
        <hr class="section-sep">
    `).join('');

    return `
        <div class="detail-hero" style="background-image:url('${heroPhoto}');">
          <div class="detail-hero-overlay"></div>
          <div class="detail-close" onclick="closeDetail()">✕</div>
          <div class="detail-hero-bottom">
            <div class="detail-name">${c.name}</div>
            <div class="detail-sub">${c.locations} ${t.lLocs.toLowerCase()}</div>
          </div>
        </div>
        <div class="detail-body">
          <div class="kpi3">
            <div class="kpi-box" id="kpi-locations" onclick="toggleKpi('locations')"><div class="kpi-n">${c.locations}</div><div class="kpi-l">${t.lLocs}</div></div>
            <div class="kpi-box" id="kpi-cities" onclick="toggleKpi('cities')"><div class="kpi-n">${c.cities.length}</div><div class="kpi-l">${t.lCities}</div></div>
            <div class="kpi-box" id="kpi-groups" onclick="toggleKpi('groups')"><div class="kpi-n">${d.groups.length}</div><div class="kpi-l">${t.lGroups}</div></div>
          </div>
          <div class="kpi-note">${t.exampleNote}</div>
          <div class="kpi-detail" id="kpi-detail"><div class="kpi-detail-inner" id="kpi-detail-inner"></div></div>

          <hr class="section-sep">

          <div class="detail-section-label">${t.tripEssentials}</div>
          <div class="trip-box">
            <b>${t.lStay}:</b> ${d.essentials.stay}<br>
            <b>${t.lSeason}:</b> ${d.essentials.season}<br>
            <b>${t.lTransport}:</b> ${d.essentials.transport}<br>
            <b>${t.lTimezone}:</b> ${d.essentials.timezone}
          </div>

          ${sectionsHtml}

          <div class="detail-section-label" style="margin-top:-4px;">${t.citiesTitle}</div>
          <div class="city-list">${cityRows}</div>
        </div>
    `;
};
