// ==========================================
// MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Gère le badge (toujours visible sur la carte) et le panneau plein écran qu'il ouvre :
// une vraie carte Leaflet à gauche (même fond de carte que le reste du site, avec toutes
// les étapes et l'itinéraire de la tournée affichés par-dessus) et un rail clair à droite
// (sélecteur de tournée, liste complète des étapes, détail de l'étape sélectionnée,
// navigation précédent/suivant). S'appuie sur TOUR_MODE_DATA / MEMBER_EVENTS_DATA /
// getCurrentTourStop() / getCurrentMemberEvent() / getTourStopStatus() définis dans
// script.js (chargé avant ce fichier). Purement informatif et public : aucune donnée
// liée à un compte, donc affiché à l'identique en mode démo et pour un compte réel.
//
// À l'ouverture, l'étape affichée par défaut est la PROCHAINE à venir (celle en cours si
// une l'est déjà, sinon la suivante) — jamais un arrêt déjà passé au hasard. Si la
// tournée est entièrement terminée, on retombe sur sa toute première étape.
(function () {
    let currentStopIndex = 0;
    let tourModeLeafletMap = null;
    let tourModeMarkers = [];
    let liveMapMarker = null;
    let tourModeTipIndex = null;
    let tourModeMapResizeObserver = null;
    let tourModeMapUserInteracted = false;

    function fmtShowDates(showDates) {
        const locale = currentLang || 'en';
        const days = showDates.map(d => new Date(d + 'T00:00:00'));
        const groups = [];
        days.forEach(d => {
            const key = d.getFullYear() + '-' + d.getMonth();
            let g = groups[groups.length - 1];
            if (!g || g.key !== key) {
                g = { key, year: d.getFullYear(), month: d.toLocaleDateString(locale, { month: 'short' }), days: [] };
                groups.push(g);
            }
            g.days.push(d.getDate());
        });
        const segStrs = groups.map(g => `${g.month} ${g.days.join(', ')}`);
        const joined = segStrs.length === 1 ? segStrs[0] : segStrs.slice(0, -1).join(', ') + ' & ' + segStrs[segStrs.length - 1];
        return `${joined}, ${groups[groups.length - 1].year}`;
    }

    // La première étape non terminée (en cours, ou à venir) — jamais un arrêt déjà passé.
    // Si la tournée entière est terminée, on retombe sur la toute première étape.
    function getDefaultStopIndex() {
        const stops = TOUR_MODE_DATA.stops;
        const now = getTourNow();
        const idx = stops.findIndex(s => getTourStopStatus(s, now) !== 'done');
        return idx === -1 ? 0 : idx;
    }

    // Vraie carte Leaflet (mêmes tuiles que le reste du site, voir createOSMTileLayer
    // dans script.js) avec l'itinéraire de la tournée affiché par-dessus : un marqueur
    // numéroté par étape (magenta = passée, mauve clair = à venir, grand marqueur sombre
    // qui pulse = étape sélectionnée) relié par un tracé en pointillés dans l'ordre réel
    // de la tournée. Recréée à chaque ouverture du panneau (comme itiLeafletMap pour
    // l'Auto-Itinerary Generator) car son conteneur est à taille nulle tant que le
    // panneau est masqué.
    function ensureMap() {
        const container = document.getElementById('tour-mode-map-container');
        if (!container || typeof L === 'undefined') return null;
        if (tourModeLeafletMap) { tourModeLeafletMap.remove(); tourModeLeafletMap = null; }
        if (tourModeMapResizeObserver) { tourModeMapResizeObserver.disconnect(); tourModeMapResizeObserver = null; }
        tourModeMapUserInteracted = false;
        tourModeLeafletMap = L.map('tour-mode-map-container', { zoomControl: false }).setView([20, 0], 2);
        createOSMTileLayer(tourModeLeafletMap).addTo(tourModeLeafletMap);
        L.control.zoom({ position: 'bottomright' }).addTo(tourModeLeafletMap);
        tourModeLeafletMap.on('click', () => window.closeTourModeTip());
        tourModeLeafletMap.on('movestart zoomstart', () => window.closeTourModeTip());
        tourModeLeafletMap.on('dragstart zoomstart', () => { tourModeMapUserInteracted = true; });

        // Le conteneur de la carte est ouvert pendant que le panneau termine sa
        // transition CSS (voir openTourModePanel) et peut, sur mobile, être mesuré une
        // première fois avec une largeur incorrecte (barre d'adresse qui se rétracte,
        // transition pas totalement finie...) — Leaflet fige alors cette mauvaise taille
        // et la carte reste visuellement confinée à une bande étroite avec du gris
        // autour, jusqu'à interaction manuelle. Un ResizeObserver sur .tour-mode-mapwrap
        // corrige ça en continu, quelle que soit la cause du changement de taille.
        const mapwrapEl = document.getElementById('tour-mode-mapwrap') || document.querySelector('.tour-mode-mapwrap');
        if (typeof ResizeObserver !== 'undefined' && mapwrapEl) {
            tourModeMapResizeObserver = new ResizeObserver(() => { if (tourModeLeafletMap) tourModeLeafletMap.invalidateSize(); });
            tourModeMapResizeObserver.observe(mapwrapEl);
        }
        return tourModeLeafletMap;
    }

    function renderMap(fitAll) {
        const map = tourModeLeafletMap;
        if (!map) return;

        tourModeMarkers.forEach(m => map.removeLayer(m));
        tourModeMarkers = [];

        const latlngs = TOUR_MODE_DATA.stops.map(s => [s.lat, s.lng]);
        const routeLine = L.polyline(latlngs, { color: '#D42759', weight: 2, dashArray: '4 8', opacity: 0.85 }).addTo(map);
        tourModeMarkers.push(routeLine);

        const now = getTourNow();
        let activeLatLng = null;
        TOUR_MODE_DATA.stops.forEach((stop, i) => {
            const isActive = i === currentStopIndex;
            if (isActive) activeLatLng = [stop.lat, stop.lng];
            const status = getTourStopStatus(stop, now);
            const cls = isActive ? 'tour-mode-marker-active' : (status === 'upcoming' ? 'tour-mode-marker-upcoming' : 'tour-mode-marker-done');
            const size = isActive ? 28 : 22;
            const icon = L.divIcon({
                className: '',
                html: `<div style="position:relative;"><div class="tour-mode-marker ${cls}">${i + 1}</div>${isActive ? `<div class="tour-mode-marker-label">${stop.city}</div>` : ''}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            });
            const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
            marker.on('click', () => { tourModeGoToIndex(i); window.openTourModeTip(i); });
            // Survol (souris uniquement — un doigt sur mobile ne "survole" jamais, le clic
            // ci-dessus reste donc le seul chemin possible là-bas) : montre juste la bulle
            // d'info au même endroit qu'un clic, mais SANS déplacer/zoomer la carte ni
            // changer l'étape "active" de l'itinéraire — un simple aperçu, pas une
            // navigation. Un clic explicite garde tout son comportement habituel.
            marker.on('mouseover', () => {
                tourModeTipIndex = i;
                renderTipContent(i);
                const tip = document.getElementById('tour-mode-tip');
                if (tip) tip.classList.add('open');
                positionTip(i);
            });
            marker.on('mouseout', () => {
                if (tourModeTipIndex === i) window.closeTourModeTip();
            });
            tourModeMarkers.push(marker);
        });

        if (fitAll) {
            // Plusieurs passages différés (comme resettleMap pour la carte principale,
            // script.js) : tant que la personne n'a pas interagi avec CETTE carte
            // (glissé/zoomé/navigué), on invalide la taille puis on refait le cadrage —
            // au cas où la toute première mesure du conteneur était encore incorrecte.
            const doFit = () => {
                if (!tourModeLeafletMap || tourModeMapUserInteracted) return;
                tourModeLeafletMap.invalidateSize();
                // Sur mobile (.tour-mode-mapwrap ne fait que 38vh de haut, ~390px de large),
                // une marge de 40px de chaque côté (comme sur desktop) mange une part bien
                // plus grande d'un espace déjà restreint qu'elle ne le fait dans un grand
                // conteneur desktop — le tracé de la tournée se retrouvait avec beaucoup de
                // gris tout autour (demande du 04/09/2026 : "la carte affichée entièrement
                // sans les zones grises"). maxZoom relevé de 5 à 6 pour la même raison.
                const isMobile = window.innerWidth <= 800;
                tourModeLeafletMap.fitBounds(routeLine.getBounds(), { padding: isMobile ? [12, 12] : [40, 40], maxZoom: 6 });
            };
            doFit();
            // Délai supplémentaire (1500ms) en plus des existants : certains mobiles mettent
            // plus longtemps que 900ms à stabiliser la taille réelle du conteneur (animation
            // de la barre d'adresse, appareil lent...).
            [150, 400, 900, 1500].forEach(delay => setTimeout(doFit, delay));
        } else if (activeLatLng) {
            map.panTo(activeLatLng, { animate: true });
        }

        const pillEl = document.getElementById('tour-mode-map-pill');
        if (pillEl) pillEl.textContent = t('tourModeStep').replace('{n}', currentStopIndex + 1).replace('{total}', TOUR_MODE_DATA.stops.length);
    }

    function renderRailList() {
        const list = document.getElementById('tour-mode-rail-list');
        if (!list) return;
        list.innerHTML = TOUR_MODE_DATA.stops.map((stop, i) => {
            const status = getTourStopStatus(stop, getTourNow());
            const cls = i === currentStopIndex ? 'active' : (status === 'done' ? 'done' : '');
            return `<div class="tour-mode-rnode ${cls}" onclick="tourModeGoToIndex(${i}); openTourModeTip(${i});">
                <div class="tour-mode-rnode-num">${i + 1}</div>
                <div class="tour-mode-rnode-tx"><b>${stop.city}</b><span>${fmtShowDates(stop.showDates)}</span></div>
            </div>`;
        }).join('');
    }

    function renderStopInfo(idx) {
        const stop = TOUR_MODE_DATA.stops[idx];
        if (!stop) return;
        const status = getTourStopStatus(stop, getTourNow());
        const tagRow = document.getElementById('tour-mode-stop-tag-row');
        const tagText = document.getElementById('tour-mode-stop-tag-text');
        const titleEl = document.getElementById('tour-mode-stop-title');
        const subEl = document.getElementById('tour-mode-stop-sub');
        if (!tagRow || !tagText || !titleEl || !subEl) return;

        tagRow.className = 'tour-mode-stop-tag-row ' + (status === 'current' ? 'tour-mode-tag-live' : status === 'done' ? 'tour-mode-tag-done' : 'tour-mode-tag-upcoming');
        tagText.textContent = status === 'current' ? t('tourModeLive') : status === 'done' ? t('tourModeDone') : t('tourModeUpcoming');
        titleEl.textContent = stop.venue ? `${stop.venue} — ${stop.city}` : `${stop.city}, ${stop.country}`;
        subEl.textContent = `${fmtShowDates(stop.showDates)} · ${t('tourModeStep').replace('{n}', idx + 1).replace('{total}', TOUR_MODE_DATA.stops.length)}`;

        const prevBtn = document.getElementById('tour-mode-prev');
        const nextBtn = document.getElementById('tour-mode-next');
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx === TOUR_MODE_DATA.stops.length - 1;
    }

    function scrollActiveNodeIntoView() {
        const list = document.getElementById('tour-mode-rail-list');
        const active = list && list.querySelector('.tour-mode-rnode.active');
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function refresh(fitAll) {
        renderMap(fitAll);
        renderRailList();
        renderStopInfo(currentStopIndex);
        scrollActiveNodeIntoView();
    }

    window.tourModeNavigate = function (delta) {
        window.closeTourModeTip();
        tourModeMapUserInteracted = true;
        currentStopIndex = Math.max(0, Math.min(TOUR_MODE_DATA.stops.length - 1, currentStopIndex + delta));
        refresh();
    };
    window.tourModeGoToIndex = function (idx) {
        tourModeMapUserInteracted = true;
        currentStopIndex = Math.max(0, Math.min(TOUR_MODE_DATA.stops.length - 1, idx));
        refresh();
    };

    function renderMemberCard(memberEvent) {
        const card = document.getElementById('tour-mode-member-card');
        if (!card) return;
        if (!memberEvent) { card.classList.add('hidden'); card.innerHTML = ''; return; }
        card.classList.remove('hidden');
        card.innerHTML = `
            <span class="tour-mode-member-dot"></span>
            <div>
                <div class="tour-mode-member-name">${memberEvent.member} — ${memberEvent.eventName}</div>
                <div class="tour-mode-member-place">${memberEvent.city}, ${memberEvent.country}</div>
            </div>
        `;
    }

    // Sélecteur "Choisir une tournée" : liste toutes les tournées disponibles
    // (ALL_TOURS, définies dans script.js) — la tournée en cours (Arirang) en tête,
    // puis les tournées historiques par ordre chronologique inverse. En choisir une
    // change simplement la tournée AFFICHÉE dans ce panneau ; le badge "en direct" sur
    // la carte continue, lui, de ne regarder que la tournée réellement en cours (voir
    // getLiveTour() / LIVE_TOUR_ID côté script.js) — les tournées historiques restent
    // toujours "Terminé", ce qui est honnête.
    function renderTourSelect() {
        const label = document.getElementById('tour-mode-select-label');
        const menu = document.getElementById('tour-mode-select-menu');
        if (label) label.textContent = TOUR_MODE_DATA.tourName;
        if (menu) {
            menu.innerHTML = ALL_TOURS.map(tour => `
                <div class="tour-mode-select-option${tour.id === selectedTourId ? ' active' : ''}" onclick="tourModeSelectTour('${tour.id}')">
                    ${tour.tourName}${tour.id === selectedTourId ? ' <span>✓</span>' : ''}
                </div>
            `).join('');
        }
    }
    window.tourModeSelectTour = function (tourId) {
        window.closeTourModeTip();
        tourModeMapUserInteracted = false;
        selectedTourId = tourId;
        currentStopIndex = getDefaultStopIndex();
        renderTourSelect();
        refresh(true);
        const menu = document.getElementById('tour-mode-select-menu');
        if (menu) menu.classList.add('hidden');
    };
    window.tourModeToggleSelect = function (e) {
        e.stopPropagation();
        const menu = document.getElementById('tour-mode-select-menu');
        if (menu) menu.classList.toggle('hidden');
    };
    document.addEventListener('click', () => {
        const menu = document.getElementById('tour-mode-select-menu');
        if (menu) menu.classList.add('hidden');
    });

    window.openTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        window.closeTourModeTip();
        selectedTourId = LIVE_TOUR_ID; // toujours repartir de la tournée en cours à l'ouverture
        const memberEvent = getCurrentMemberEvent();
        currentStopIndex = getDefaultStopIndex();

        renderTourSelect();
        renderMemberCard(memberEvent);
        renderRailList();
        renderStopInfo(currentStopIndex);
        scrollActiveNodeIntoView();

        panel.classList.remove('hidden');
        requestAnimationFrame(() => panel.classList.add('open'));

        // Sélecteur "Switch artist" partagé avec le panneau Live (script.js) — purement
        // additif, ne touche à aucune des fonctions de rendu ci-dessus.
        const switcherGroup = window.selectedTourLiveGroup || 'BTS';
        document.querySelectorAll('.group-switcher-current').forEach(el => { el.textContent = switcherGroup; });
        const emptyOverlay = document.getElementById('tour-mode-empty-overlay');
        if (emptyOverlay) {
            const isBTS = switcherGroup === 'BTS';
            if (!isBTS && typeof t === 'function') emptyOverlay.textContent = t('groupNoDataYet').replace('{group}', switcherGroup);
            emptyOverlay.classList.toggle('hidden', isBTS);
        }

        // Le conteneur de la carte est à taille nulle tant que le panneau est masqué —
        // on attend la fin de la transition d'ouverture avant de créer la carte Leaflet,
        // sinon elle se dessinerait avec de mauvaises dimensions.
        setTimeout(() => { ensureMap(); renderMap(true); }, 320);
    };

    window.closeTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        window.closeTourModeTip();
        panel.classList.remove('open');
        setTimeout(() => {
            panel.classList.add('hidden');
            if (tourModeMapResizeObserver) { tourModeMapResizeObserver.disconnect(); tourModeMapResizeObserver = null; }
            if (tourModeLeafletMap) { tourModeLeafletMap.remove(); tourModeLeafletMap = null; }
            tourModeMarkers = [];
        }, 300);
    };

    // Badge "paquet de cartes" (demande du 06/09/2026) : quand PLUSIEURS choses sont en
    // direct en même temps (ex: la tournée du groupe ET un événement solo d'un membre se
    // chevauchent), le badge nomme désormais la plus pertinente pour CET utilisateur —
    // celle dont l'artiste a le plus de lieux dans sa wishlist, voir
    // getMostRelevantLiveEntry() dans script.js — avec un effet de cartes empilées et un
    // badge "+N more" signalant qu'il y en a d'autres, plutôt que l'ancien compteur générique
    // ("3 live now") qui ne nommait plus personne pour éviter d'induire en erreur. Cliquer
    // le badge garde le même comportement (ouvre le sélecteur Tour/Live, qui mène au
    // panneau Live listant tout ce qui est en cours). getLiveTimelineEntries() (plus haut
    // dans ce fichier) fusionne déjà tournée de groupe + événements solo et respecte le
    // sélecteur "Switch artist" (window.selectedTourLiveGroup) : la réutiliser ici évite de
    // dupliquer cette logique et généralise naturellement à d'autres artistes le jour où
    // ils auront de vraies données.
    window.initTourModeBadge = function () {
        const badge = document.getElementById('tour-mode-badge');
        const badgeMobile = document.getElementById('tour-mode-badge-mobile');
        if (!badge && !badgeMobile) return;
        const textEl = document.getElementById('tour-mode-badge-text');
        const moreEl = document.getElementById('tour-mode-badge-more');
        const memberEvent = getCurrentMemberEvent();
        const groupStop = getCurrentTourStop();

        const currentEntries = typeof getLiveTimelineEntries === 'function'
            ? getLiveTimelineEntries().filter(e => e.status === 'current')
            : [];
        const liveCount = currentEntries.length;
        const live = liveCount > 0;
        const stacked = liveCount > 1;

        let label;
        if (live) {
            const top = (typeof getMostRelevantLiveEntry === 'function' ? getMostRelevantLiveEntry(currentEntries) : currentEntries[0]) || currentEntries[0];
            label = top.member
                ? t('tourModeMemberLiveIn').replace('{member}', top.member).replace('{event}', top.eventName || top.title).replace('{city}', top.city)
                : t('tourModeLiveIn').replace('{city}', top.city);
        } else {
            label = t('tourModeGenericLabel');
        }

        [badge, badgeMobile].forEach(el => {
            if (!el) return;
            el.classList.remove('hidden');
            el.classList.toggle('tour-mode-badge-live', live);
        });
        // L'effet de cartes empilées ne s'applique qu'à la pilule desktop — la version
        // mobile est une simple icône ronde, pas de place pour cet effet visuel.
        if (badge) badge.classList.toggle('tour-mode-badge-stacked', stacked);
        if (textEl) textEl.textContent = label;
        const moreText = stacked ? t('tourModeMoreCount').replace('{n}', liveCount - 1) : '';
        if (moreEl) {
            moreEl.textContent = moreText;
            moreEl.classList.toggle('hidden', !stacked);
        }
        if (badgeMobile) badgeMobile.title = stacked ? `${label} ${moreText}` : label;

        renderLiveMapMarker(memberEvent || groupStop);
    };

    // Marqueur animé (pulsation) sur la VRAIE carte principale (pas seulement dans le
    // panneau Mode Tournée) à l'emplacement réel de ce qui est en cours — la tournée du
    // groupe, ou l'événement d'un membre seul s'il y en a un. `map` est la carte Leaflet
    // globale créée par script.js ; comme ce fichier se charge après, mais qu'une
    // condition d'affichage précoce (avant connexion, etc.) peut retarder sa création, on
    // retente une fois après un court délai si elle n'existe pas encore.
    let liveMarkerRetried = false;
    function renderLiveMapMarker(live) {
        if (typeof map === 'undefined' || !map) {
            if (!liveMarkerRetried) { liveMarkerRetried = true; setTimeout(() => renderLiveMapMarker(live), 800); }
            return;
        }
        if (liveMapMarker) { map.removeLayer(liveMapMarker); liveMapMarker = null; }
        if (!live) return;
        const icon = L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35); animation: tourModePulse 1.6s infinite;"></div>`,
            iconSize: [16, 16], iconAnchor: [8, 8]
        });
        liveMapMarker = L.marker([live.lat, live.lng], { icon, zIndexOffset: 2000 }).addTo(map);
        const label = live.member ? `${live.member} — ${live.eventName}<br>${live.city}, ${live.country}` : `🔴 ${TOUR_MODE_DATA.tourName}<br>${live.city}, ${live.country}`;
        liveMapMarker.bindTooltip(label, { direction: 'top', offset: [0, -8] });
    }

    // Bulle infos concert : apparaît au clic sur un pin de la carte (ou sur une étape du
    // rail, qui pointe alors la même bulle vers son pin sur la carte). Contenu : statut,
    // lieu/ville, dates, "Temps forts" et "Surprise song" — ces deux derniers sont des
    // champs optionnels (`stop.highlights` / `stop.surpriseSong`) sur chaque étape dans
    // script.js ; tant qu'ils ne sont pas renseignés avec de vraies infos, on affiche un
    // message honnête plutôt que d'inventer des anecdotes.
    // Un "stop" (une ville/salle) peut regrouper plusieurs soirs, chacun avec ses propres
    // temps forts et/ou surprise songs (ex: Las Vegas a 4 dates, chacune différente) — voir
    // `stop.nights` dans ARIRANG_TOUR (script.js). Tant qu'aucune vraie info n'a été
    // transmise pour une étape, on affiche un message honnête plutôt que d'inventer.
    function renderNightsHTML(stop) {
        if (!stop.nights || !stop.nights.length) {
            return `<div class="tour-mode-tip-empty-msg">${t('tourModeNoHighlightsYet')}</div>`;
        }
        const blocks = stop.nights.map(night => {
            let inner = '';
            // `night.highlights` est un objet {en, fr, es, ...} — le texte narratif est
            // traduit dans les 8 langues du site (voir ARIRANG_TOUR) et suit la langue
            // actuellement choisie dans la carte ; seuls les titres de chansons
            // (surpriseSongs, jamais traduits) et les noms propres à l'intérieur des
            // <b> restent identiques quelle que soit la langue.
            const hlText = night.highlights && getLocText(night.highlights);
            if (hlText && hlText.length) {
                inner += `<ul class="tour-mode-tip-hl">${hlText.map(h => `<li class="tour-mode-tip-hl-item">${h}</li>`).join('')}</ul>`;
            }
            if (night.surpriseSongs && night.surpriseSongs.length) {
                inner += `<div class="tour-mode-tip-ss"><span class="tour-mode-tip-ss-label">${t('tourModeSurpriseSong')}</span>${night.surpriseSongs.join(' · ')}</div>`;
            }
            if (!inner) return '';
            return `<div class="tour-mode-tip-night"><div class="tour-mode-tip-night-date">${fmtShowDates(night.dates)}</div>${inner}</div>`;
        }).filter(Boolean).join('');
        return blocks || `<div class="tour-mode-tip-empty-msg">${t('tourModeNoHighlightsYet')}</div>`;
    }

    function renderTipContent(idx) {
        const stop = TOUR_MODE_DATA.stops[idx];
        if (!stop) return;
        const status = getTourStopStatus(stop, getTourNow());
        const tagRow = document.getElementById('tour-mode-tip-tag-row');
        const tagText = document.getElementById('tour-mode-tip-tag-text');
        const titleEl = document.getElementById('tour-mode-tip-title');
        const dateEl = document.getElementById('tour-mode-tip-date');
        const nightsEl = document.getElementById('tour-mode-tip-nights');
        if (!tagRow || !tagText || !titleEl || !dateEl || !nightsEl) return;

        tagRow.className = 'tour-mode-stop-tag-row ' + (status === 'current' ? 'tour-mode-tag-live' : status === 'done' ? 'tour-mode-tag-done' : 'tour-mode-tag-upcoming');
        tagText.textContent = status === 'current' ? t('tourModeLive') : status === 'done' ? t('tourModeDone') : t('tourModeUpcoming');
        titleEl.textContent = stop.venue ? `${stop.venue} — ${stop.city}` : `${stop.city}, ${stop.country}`;
        dateEl.textContent = fmtShowDates(stop.showDates);
        nightsEl.innerHTML = renderNightsHTML(stop);
    }

    // `.tour-mode-tip` est en position:fixed (voir map.html) : on calcule donc ses
    // coordonnées par rapport à la FENÊTRE, pas au conteneur de la carte — d'où l'ajout
    // du décalage du conteneur (mapRect.left/top) à la position du pin dans la carte, et
    // le bornage contre window.innerWidth/innerHeight plutôt que la taille de la carte
    // elle-même (sur mobile, .tour-mode-mapwrap ne fait que 38vh et une bulle plus haute
    // doit pouvoir s'étendre par-dessus le rail en dessous sans être coupée).
    function positionTip(idx) {
        const map = tourModeLeafletMap;
        const stop = TOUR_MODE_DATA.stops[idx];
        const tip = document.getElementById('tour-mode-tip');
        const mapContainerEl = document.getElementById('tour-mode-map-container');
        const arrow = document.getElementById('tour-mode-tip-arrow');
        if (!map || !stop || !tip || !mapContainerEl) return;

        const localPt = map.latLngToContainerPoint([stop.lat, stop.lng]);
        const mapRect = mapContainerEl.getBoundingClientRect();
        const px = mapRect.left + localPt.x;
        const py = mapRect.top + localPt.y;
        const tipW = tip.offsetWidth || 270;
        const tipH = tip.offsetHeight || 260;
        let left = Math.max(8, Math.min(px - 30, window.innerWidth - tipW - 8));
        let top = py - 16 - tipH;
        let flipped = false;
        if (top < 8) { top = Math.min(py + 20, window.innerHeight - tipH - 8); flipped = true; }
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        if (arrow) {
            arrow.classList.toggle('flip', flipped);
            arrow.style.left = Math.max(14, Math.min(px - left - 8, tipW - 30)) + 'px';
        }
    }

    // Zoom sur l'étape sélectionnée en plus du recentrage, pour qu'elle soit clairement
    // visible même quand la carte était encore cadrée sur toute la tournée (vue monde) —
    // et seulement ici (pas dans tourModeNavigate/tourModeGoToIndex en général), pour ne
    // pas changer le comportement habituel du Précédent/Suivant qui garde le contexte de
    // toute la tournée.
    const TOUR_MODE_TIP_ZOOM = 9;
    window.openTourModeTip = function (idx) {
        if (!TOUR_MODE_DATA.stops[idx]) return;
        tourModeTipIndex = idx;
        renderTipContent(idx);
        const tip = document.getElementById('tour-mode-tip');
        const map = tourModeLeafletMap;
        if (map) {
            const stop = TOUR_MODE_DATA.stops[idx];
            tourModeMapUserInteracted = true;
            // map.setView() ci-dessous déclenche movestart/zoomstart de façon SYNCHRONE dès
            // que la vue change réellement (voir ensureMap() : ces évènements ferment la
            // bulle). Ouvrir la bulle avant cet appel la refermait donc aussitôt dans le
            // même clic — invisible au premier clic sur une étape, sauf si la carte était
            // déjà exactement sur ce point/zoom (d'où le besoin d'un second clic identique
            // pour que setView() devienne un no-op ne déclenchant plus ces évènements). On
            // déplace donc la vue D'ABORD, puis on ouvre la bulle une fois cela fait.
            map.setView([stop.lat, stop.lng], Math.max(map.getZoom(), TOUR_MODE_TIP_ZOOM), { animate: true });
            if (tip) tip.classList.add('open');
            positionTip(idx);
            map.once('moveend', () => { if (tourModeTipIndex === idx) positionTip(idx); });
        } else if (tip) {
            tip.classList.add('open');
            // La carte peut ne pas encore exister (clic sur une étape du rail juste après
            // l'ouverture du panneau, avant la fin des 320ms d'attente de ensureMap()) —
            // plutôt que de laisser la bulle sans position (invisible ou coincée en
            // 0,0), on la centre temporairement à l'écran ; positionTip() reprendra la
            // main normalement dès le prochain clic une fois la carte prête.
            tip.style.left = Math.max(8, (window.innerWidth - (tip.offsetWidth || 270)) / 2) + 'px';
            tip.style.top = Math.max(8, (window.innerHeight - (tip.offsetHeight || 260)) / 2) + 'px';
        }
    };
    window.closeTourModeTip = function () {
        tourModeTipIndex = null;
        const tip = document.getElementById('tour-mode-tip');
        if (tip) tip.classList.remove('open');
    };
    document.addEventListener('click', (e) => {
        const tip = document.getElementById('tour-mode-tip');
        if (!tip || !tip.classList.contains('open')) return;
        if (e.target.closest('#tour-mode-tip') || e.target.closest('.tour-mode-rnode') || e.target.closest('.leaflet-marker-icon')) return;
        window.closeTourModeTip();
    });

    // Balayage tactile (mobile) pour naviguer entre les étapes, en plus des boutons
    // Précédent/Suivant et du clic sur une étape — sans gêner le défilement vertical
    // normal de la liste du rail (on n'agit que si le geste est clairement horizontal).
    function attachSwipeNavigation(el) {
        if (!el) return;
        let startX = 0, startY = 0, tracking = false;
        el.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            tracking = true;
        }, { passive: true });
        el.addEventListener('touchend', (e) => {
            if (!tracking) return;
            tracking = false;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                tourModeNavigate(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }
    document.addEventListener('DOMContentLoaded', () => {
        window.initTourModeBadge();
        attachSwipeNavigation(document.getElementById('tour-mode-mapwrap') || document.querySelector('.tour-mode-mapwrap'));
        attachSwipeNavigation(document.getElementById('tour-mode-rail-list'));
        attachSwipeNavigation(document.querySelector('.tour-mode-stop-info'));
    });

    // Appelée par updateUI() (script.js) à chaque changement de langue : sans ça, si le
    // panneau Mode Tournée (ou sa bulle) est déjà ouvert au moment du changement, son
    // contenu déjà affiché restait dans l'ancienne langue jusqu'à la prochaine
    // navigation. Sans effet si le panneau est fermé (juste un re-rendu de DOM caché).
    window.refreshTourModeLanguage = function () {
        renderTourSelect();
        renderRailList();
        renderStopInfo(currentStopIndex);
        if (tourModeTipIndex !== null) renderTipContent(tourModeTipIndex);
    };
})();
