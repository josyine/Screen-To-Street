// ==========================================
// PANNEAU "ITINÉRAIRE" (demande du 05/10/2026) — à pied / transports en commun vers un
// lieu, dans l'esprit de Google Maps.
// ==========================================
// Adapté du prototype itineraire.html fourni par l'admin : markup/CSS conservés à
// l'identique dans map.html (préfixe .sts-), ce fichier porte la logique de calcul
// d'itinéraire telle quelle. Point d'entrée : window.openLocationItinerary(loc), appelé
// depuis le bouton "Itinéraire" de la bulle .map-hover-tip (voir showMapHoverTip() dans
// script.js) — `loc` est un objet lieu du site (celebLocations/newLocations, avec
// `.lat`/`.lng`), converti ci-dessous au format {lat, lon, name, show, address} attendu
// par le module.
//
// Sources des trajets (identique au prototype, voir ses notes) :
// - À pied : routing.openstreetmap.de (OSRM), gratuit, sans clé, comme les tuiles Leaflet
//   du reste du site.
// - Transports : api.transitous.org (Transitous/MOTIS), gratuit, horaires GTFS ouverts —
//   couverture variable selon les villes ; si les transports ne s'affichent jamais pour
//   une zone qui en a normalement, c'est le premier point à vérifier.
// - Secours : estimation à vol d'oiseau à pied, "Pas de transports trouvés" + lien Google
//   Maps en transports, et proposition d'activer la localisation si elle est refusée.
(function () {
    // BUG corrigé (demande du 05/10/2026, "le bouton Itinéraire ne fonctionne pas car il
    // faut une clé API de carto.com") : le fond de carte du prototype (basemaps.cartocdn.com)
    // exige désormais une clé API CARTO pour un usage en production — remplacé par les
    // MÊMES tuiles que le reste du site (createOSMTileLayer() dans script.js, chargé avant
    // ce fichier et visible ici en tant que fonction globale classique, comme ALL_TOURS
    // l'est déjà pour tour-mode.js) : maps.wikimedia.org, gratuit et sans clé, avec son
    // propre repli automatique vers tile.openstreetmap.org en cas d'erreur réseau — voir
    // ensureMap() plus bas.
    const ICON_STORE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>';
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const Itinerary = (() => {
        const CFG = {
            walkUrl: (a, b) => `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`,
            transitUrl: (a, b) => `https://api.transitous.org/api/v1/plan?fromPlace=${a.lat},${a.lon}&toPlace=${b.lat},${b.lon}&time=${encodeURIComponent(new Date().toISOString())}&numItineraries=4`,
            demo: new URLSearchParams(location.search).has("demo")   // ?demo = données d'exemple, sans réseau (utile pour tester sans dépendre des deux services externes)
        };
        const $ = id => document.getElementById(id);
        const root = $("stsIt"), sheet = $("stsSheet");
        if (!root || !sheet) return { open: () => {}, close: () => {} }; // page sans le panneau (ex: pas encore chargé) — no-op plutôt qu'une erreur
        let imap = null, layer = null, me = null, to = null, from = null, reversed = false, mode = "walk";
        let walk = null, transit = null, sel = { walk: 0, transit: 0 }, watchId = null, req = 0;
        // Guidage en direct, étape par étape (demande du 08/10/2026, "vraiment être en mode
        // guidage comme dans Google Map") : guideSteps/guideIdx pour le mode "à pied" (étapes
        // OSRM, voir buildWalkSteps()), guideLegIdx pour le mode "transports" (progression
        // dans les legs marche/bus/métro déjà décodés par fetchTransit(), pas de virage par
        // virage disponible pour ce mode — Google Maps lui-même ne guide pas virage par
        // virage à l'intérieur d'un trajet en transports, seulement "marchez jusqu'à l'arrêt"
        // / "descendez à X").
        let guideSteps = [], guideIdx = 0, guideLegIdx = 0;
        // Distance initiale (position de départ -> destination), figée au lancement du
        // guidage, pour calculer le pourcentage de la barre de progression de la pastille
        // (demande du 09/10/2026) — jamais recalculée pendant la marche, sinon la barre
        // reculerait à chaque petit détour au lieu d'avancer de façon monotone.
        let guideStartDist = null;
        // "Y aller" direct depuis la notification de proximité (demande du 09/10/2026) :
        // démarre le guidage automatiquement dès que le trajet à pied est chargé, sans
        // attendre que la personne retouche "Démarrer" — voir open()/compute() plus bas.
        let autoGuideOnReady = false;

        const fmtMin = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; };
        const fmtKm = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
        const fmtH = d => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const toast = t => { const e = $("stsToast"); if (!e) return; e.textContent = t; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("on"), 2200); };
        const gmLink = m => { const a = from || me, b = to; return `https://www.google.com/maps/dir/?api=1${a ? `&origin=${a.lat},${a.lon}` : ""}&destination=${b.lat},${b.lon}&travelmode=${m === "walk" ? "walking" : "transit"}`; };

        /* --- position de l'utilisateur --- */
        function locate() {
            if (CFG.demo) return Promise.resolve({ lat: to.lat - 0.0062, lon: to.lon + 0.0049 });
            return new Promise((ok, ko) => {
                if (!navigator.geolocation) return ko(new Error("geo"));
                navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), ko, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
            });
        }

        /* --- calculs d'itinéraire --- */
        // Étapes de virage par virage (demande du 08/10/2026) : CFG.walkUrl demande déjà
        // steps=true à OSRM, mais la réponse n'était jusqu'ici lue que pour la ligne/durée/
        // distance globales — chaque "step" OSRM (maneuver.type/modifier/location, name de
        // la rue) était ignoré. maneuver.location est en [lon,lat] (GeoJSON), inversé ici en
        // [lat,lon] pour correspondre à Leaflet comme le reste du fichier.
        function buildWalkSteps(steps) {
            if (!Array.isArray(steps)) return [];
            return steps.filter(s => s.maneuver && s.maneuver.location).map(s => ({
                loc: [s.maneuver.location[1], s.maneuver.location[0]],
                type: s.maneuver.type, modifier: s.maneuver.modifier, name: s.name || ""
            }));
        }
        async function fetchWalk(a, b) {
            if (CFG.demo) return demoWalk(a, b);
            const r = await fetch(CFG.walkUrl(a, b)); if (!r.ok) throw new Error("walk");
            const j = await r.json(); if (!j.routes || !j.routes.length) throw new Error("walk");
            return j.routes.slice(0, 3).map(rt => ({
                duration: rt.duration, distance: rt.distance,
                via: (rt.legs[0] && rt.legs[0].summary) || "",
                line: rt.geometry.coordinates.map(([x, y]) => [y, x]),
                steps: buildWalkSteps(rt.legs[0] && rt.legs[0].steps)
            }));
        }
        async function fetchTransit(a, b) {
            if (CFG.demo) return demoTransit(a, b);
            const r = await fetch(CFG.transitUrl(a, b)); if (!r.ok) throw new Error("transit");
            const j = await r.json();
            const its = (j.itineraries || []).filter(it => it.legs.some(l => l.mode !== "WALK"));
            return its.slice(0, 4).map(it => ({
                duration: it.duration, start: it.startTime, end: it.endTime, transfers: it.transfers || 0,
                legs: it.legs.map(l => ({
                    mode: l.mode, line: l.routeShortName || "", color: l.routeColor ? ("#" + l.routeColor.replace("#", "")) : null,
                    headsign: l.headsign || "", from: l.from && l.from.name, to: l.to && l.to.name, dep: l.from && (l.from.departure || l.startTime), arr: l.to && (l.to.arrival || l.endTime),
                    duration: l.duration || ((new Date(l.endTime) - new Date(l.startTime)) / 1000), distance: l.distance || 0, stops: (l.intermediateStops || []).length,
                    path: decodeLeg(l)
                }))
            }));
        }
        // Polyline Google encodée (MOTIS l'envoie en précision 5, 6 ou 7 selon la version) — on choisit celle qui tombe près du départ
        function decodePoly(str, p) { let i = 0, lat = 0, lng = 0, out = [], f = Math.pow(10, p); while (i < str.length) { let b, s = 0, r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32); lat += r & 1 ? ~(r >> 1) : r >> 1; s = 0; r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32); lng += r & 1 ? ~(r >> 1) : r >> 1; out.push([lat / f, lng / f]); } return out; }
        function decodeLeg(l) {
            const g = l.legGeometry; if (!g || !g.points) return [[l.from.lat, l.from.lon], [l.to.lat, l.to.lon]];
            const tries = [g.precision, 7, 6, 5].filter(Boolean);
            for (const p of tries) { const pts = decodePoly(g.points, p); if (pts.length && Math.abs(pts[0][0] - l.from.lat) < 0.05 && Math.abs(pts[0][1] - l.from.lon) < 0.05) return pts; }
            return [[l.from.lat, l.from.lon], [l.to.lat, l.to.lon]];
        }

        /* --- données d'exemple (?demo) --- */
        function demoWalk(a, b) {
            const mid = (t, dx, dy) => [a.lat + (b.lat - a.lat) * t + dy, a.lon + (b.lon - a.lon) * t + dx];
            const steps = (p1, p2) => [
                { loc: [a.lat, a.lon], type: "depart", modifier: null, name: "la rue principale" },
                { loc: p1, type: "turn", modifier: "right", name: "Rue de la Gare" },
                { loc: p2, type: "turn", modifier: "left", name: "la rue principale" },
                { loc: [b.lat, b.lon], type: "arrive", modifier: null, name: "" }
            ];
            return [
                { duration: 18 * 60, distance: 1300, via: "la rue principale", line: [[a.lat, a.lon], mid(.3, .0012, -.0004), mid(.6, -.0006, .0008), [b.lat, b.lon]], steps: steps(mid(.3, .0012, -.0004), mid(.6, -.0006, .0008)) },
                { duration: 21 * 60, distance: 1500, via: "le front de mer", line: [[a.lat, a.lon], mid(.35, -.0022, .0002), mid(.7, -.0018, .0006), [b.lat, b.lon]], steps: steps(mid(.35, -.0022, .0002), mid(.7, -.0018, .0006)) }
            ];
        }
        function demoTransit(a, b) {
            const now = Date.now(), t = m => new Date(now + m * 60000).toISOString();
            const s1 = { lat: a.lat + .0012, lon: a.lon - .0004 }, s2 = { lat: b.lat - .0010, lon: b.lon + .0012 };
            const it = (off, dur, line) => ({
                duration: dur * 60, start: t(off), end: t(off + dur), transfers: 0, legs: [
                    { mode: "WALK", duration: 180, distance: 220, from: "Ma position", to: "Arrêt proche", dep: t(off), arr: t(off + 3), path: [[a.lat, a.lon], [s1.lat, s1.lon]] },
                    { mode: "BUS", line, color: "#F59E0B", headsign: "Centre-ville", from: "Arrêt proche", to: "Arrêt d'arrivée", dep: t(off + 4), arr: t(off + dur - 2), duration: (dur - 6) * 60, stops: 5, path: [[s1.lat, s1.lon], [s1.lat + .002, s1.lon + .0008], [s2.lat, s2.lon]] },
                    { mode: "WALK", duration: 120, distance: 140, from: "Arrêt d'arrivée", to: to.name, dep: t(off + dur - 2), arr: t(off + dur), path: [[s2.lat, s2.lon], [b.lat, b.lon]] }]
            });
            return [it(0, 12, "11"), it(15, 12, "11")];
        }

        /* --- carte du panneau --- */
        function ensureMap() {
            if (imap) return;
            imap = L.map("stsItMap", { zoomControl: false, attributionControl: true });
            createOSMTileLayer(imap).addTo(imap); // mêmes tuiles que le reste du site (script.js), sans clé API
            layer = L.layerGroup().addTo(imap);
        }
        const meIcon = () => L.divIcon({ className: "", html: '<div class="sts-me-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
        const toIcon = () => L.divIcon({ className: "", html: `<div class="sts-to-marker">${ICON_STORE.replace('width="18" height="18"', 'width="14" height="14"')}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
        const stopIcon = () => L.divIcon({ className: "", html: '<div class="sts-stop-marker"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
        function fit(bounds) {
            const top = root.querySelector(".sts-it-top").offsetHeight + 20, bot = sheet.offsetHeight + 20;
            imap.fitBounds(bounds, { paddingTopLeft: [30, top], paddingBottomRight: [30, bot], maxZoom: 17 });
        }
        function drawEnds() {
            const a = reversed ? to : from, b = reversed ? from : to;
            L.marker([a.lat, a.lon], { icon: reversed ? toIcon() : meIcon(), interactive: false }).addTo(layer);
            L.marker([b.lat, b.lon], { icon: reversed ? meIcon() : toIcon(), interactive: false }).addTo(layer);
        }
        function draw() {
            if (!imap) return; layer.clearLayers(); let pts = [];
            if (mode === "walk" && walk && walk.length) {
                walk.forEach((w, i) => { if (i !== sel.walk) L.polyline(w.line, { color: "#C9C3D6", weight: 6, opacity: .9 }).addTo(layer); });
                const w = walk[sel.walk]; pts = w.line;
                L.polyline(w.line, { color: "#fff", weight: 11, opacity: 1 }).addTo(layer);
                L.polyline(w.line, { color: "#9B3CEB", weight: 6, dashArray: w.estimate ? "8 10" : "1 11", lineCap: "round" }).addTo(layer);
            }
            if (mode === "transit" && transit && transit.length) {
                transit[sel.transit].legs.forEach(l => {
                    pts = pts.concat(l.path);
                    if (l.mode === "WALK") L.polyline(l.path, { color: "#9B3CEB", weight: 5, dashArray: "1 9", lineCap: "round" }).addTo(layer);
                    else {
                        L.polyline(l.path, { color: "#fff", weight: 12 }).addTo(layer); L.polyline(l.path, { color: l.color || "#F59E0B", weight: 7 }).addTo(layer);
                        L.marker(l.path[0], { icon: stopIcon(), interactive: false }).addTo(layer); L.marker(l.path[l.path.length - 1], { icon: stopIcon(), interactive: false }).addTo(layer);
                    }
                });
            }
            drawEnds();
            if (!pts.length) pts = [[from.lat, from.lon], [to.lat, to.lon]];
            fit(L.latLngBounds(pts));
        }

        /* --- contenu de la fiche du bas --- */
        const IC = {
            walk: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="2" fill="currentColor" stroke="none"/><path d="M10 21l2-6-3-3 1-5 4 3 3 1"/></svg>',
            bus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16"/></svg>',
            // AJOUT (demande du 08/10/2026, "aligne bien le métro", précisée le 09/10/2026
            // "l'icone du métro n'est pas aligné avec le numéro... aussi RER et bus") :
            // jusqu'ici SUBWAY/METRO réutilisaient IC.bus (silhouette de bus) faute d'icône
            // dédiée. Rond + "M" en trait (même style monoline que les autres icônes
            // ci-dessus, tracé plutôt que <text>, pour éviter tout souci de ligne de base) —
            // le vrai décalage visuel rapporté le 09/10 venait en réalité du <svg> inline
            // lui-même (display:inline par défaut du navigateur, corrigé en CSS ci-dessus/
            // voir .sts-chip svg dans map.html), pas de ce tracé, mais le rond est resserré
            // ici (r 9.5→9) pour rester lisible à 12px malgré tout.
            metro: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 15v-6l4 4 4-4v6"/></svg>',
            // AJOUT (demande du 09/10/2026, "icones de rer... soient bien alignés") : RAIL/
            // REGIONAL_RAIL/HIGHSPEED_RAIL/LONG_DISTANCE (= "Train" dans MODE_FR plus bas,
            // RER inclus) réutilisaient aussi IC.bus faute d'icône dédiée — silhouette de
            // train (toit arrondi + 2 roues), même style monoline.
            train: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="13" rx="4"/><path d="M5 10h14"/><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/></svg>',
            nav: '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 2l8 20-8-5-8 5z" fill="#fff"/></svg>',
            share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>'
        };
        const MODE_FR = { BUS: "Bus", TRAM: "Tram", SUBWAY: "Métro", METRO: "Métro", RAIL: "Train", REGIONAL_RAIL: "Train", HIGHSPEED_RAIL: "Train", LONG_DISTANCE: "Train", FERRY: "Ferry", COACH: "Car", CABLE_CAR: "Téléphérique", FUNICULAR: "Funiculaire" };
        // AJOUT (demande du 09/10/2026, "ajoute un icone quand c'est un bus") : silhouette de
        // bus déjà réutilisée pour tous les modes (métro/RER compris, faute d'icône dédiée)
        // avant les deux ajouts ci-dessus — reste maintenant le repli explicite pour BUS et
        // tout mode moins courant (ferry, car, téléphérique...).
        const transitIcon = l => (l.mode === "SUBWAY" || l.mode === "METRO") ? IC.metro
            : (l.mode === "RAIL" || l.mode === "REGIONAL_RAIL" || l.mode === "HIGHSPEED_RAIL" || l.mode === "LONG_DISTANCE") ? IC.train
            : IC.bus;
        const chip = l => l.mode === "WALK" ? `<span class="sts-chip">${IC.walk}${Math.max(1, Math.round(l.duration / 60))}</span>`
            : `<span class="sts-chip tr" style="background:${l.color || "#F59E0B"}">${transitIcon(l)}${esc(l.line || MODE_FR[l.mode] || "")}</span>`;
        const chips = it => `<div class="sts-chips">${it.legs.filter(l => !(l.mode === "WALK" && l.duration < 60)).map(chip).join("<i>›</i>")}</div>`;
        const loading = () => `<button class="sts-handle" data-act="toggle" aria-label="Agrandir ou réduire"></button><div class="sts-skel" style="width:45%;height:26px"></div><div class="sts-skel" style="width:70%"></div><div class="sts-skel" style="height:58px;border-radius:14px;margin:14px 0"></div><div class="sts-skel" style="height:50px;border-radius:14px"></div>`;

        function render() {
            const tail = `<a class="sts-gm" href="${gmLink(mode)}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>`;
            const startBtn = watchId != null ? `<button class="sts-cta stop" data-act="stop" type="button">Arrêter le guidage</button>` : `<button class="sts-cta" data-act="start" type="button">${IC.nav} Démarrer</button>`;
            let h = `<button class="sts-handle" data-act="toggle" aria-label="Agrandir ou réduire"></button>`;
            if (mode === "walk") {
                if (!walk) return sheet.innerHTML = loading();
                const w = walk[sel.walk], arr = new Date(Date.now() + w.duration * 1000);
                h += `<div class="sts-sum"><div><div class="sts-big">${fmtMin(w.duration)} <small>(${fmtKm(w.distance)})</small></div>
                  <div class="sts-sub">Arrivée ${fmtH(arr)} · ${w.estimate ? "estimation à vol d'oiseau" : (sel.walk === 0 ? "Le plus rapide à pied" : "Autre itinéraire")}</div></div>
                  <button class="sts-share" data-act="share" aria-label="Partager l'itinéraire" type="button">${IC.share}</button></div>`;
                if (walk.length > 1) h += `<div class="sts-alts">${walk.map((x, i) => `<button class="sts-alt" data-alt="${i}" aria-pressed="${i === sel.walk}" type="button"><b>${fmtMin(x.duration)}</b><span>${x.via ? "par " + esc(x.via) : fmtKm(x.distance)}</span></button>`).join("")}</div>`;
                else h += `<div style="height:14px"></div>`;
                if (w.estimate) h += `<div class="sts-msg">Le calcul détaillé est indisponible pour le moment : voici une estimation. Le guidage précis reste possible dans Google Maps.</div>`;
                h += startBtn + tail;
            } else {
                if (transit === null) return sheet.innerHTML = loading();
                if (!transit.length) {
                    h += `<div class="sts-big" style="font-size:19px">Pas de transports trouvés</div><div class="sts-msg">Aucun horaire de transport en commun n'est disponible pour ce trajet en ce moment. Essaie à pied, ou ouvre Google Maps pour d'autres options.</div>
                      <a class="sts-cta" href="${gmLink("transit")}" target="_blank" rel="noopener" style="text-decoration:none">Voir dans Google Maps</a>`;
                    return sheet.innerHTML = h;
                }
                const it = transit[sel.transit], first = it.legs.find(l => l.mode !== "WALK");
                h += `<div class="sts-sum"><div><div class="sts-big">${fmtMin(it.duration)} <small>${fmtH(it.start)} → ${fmtH(it.end)}</small></div>
                  <div class="sts-sub">${it.transfers ? `${it.transfers} correspondance${it.transfers > 1 ? "s" : ""}` : "Direct"}${first ? ` · ${MODE_FR[first.mode] || "Départ"} ${esc(first.line)} à ${fmtH(first.dep)}` : ""}</div></div>
                  <button class="sts-share" data-act="share" aria-label="Partager l'itinéraire" type="button">${IC.share}</button></div>`;
                h += `<div class="sts-alts">${transit.map((x, i) => `<button class="sts-alt" data-alt="${i}" aria-pressed="${i === sel.transit}" type="button"><b>${fmtMin(x.duration)}</b><span>${fmtH(x.start)} → ${fmtH(x.end)}</span>${chips(x)}</button>`).join("")}</div>`;
                h += `<ul class="sts-legs-detail">${it.legs.map(l => l.mode === "WALK"
                    ? `<li>${chip(l)}<span>Marche ${fmtMin(l.duration)}${l.distance ? ` · ${fmtKm(l.distance)}` : ""}</span></li>`
                    : `<li>${chip(l)}<span><b>${esc(l.from || "")}</b><br><span style="color:var(--sts-soft);font-size:12px">dir. ${esc(l.headsign)}${l.stops ? ` · ${l.stops + 1} arrêts` : ""} · descendre à ${esc(l.to || "")}</span></span><span class="t">${fmtH(l.dep)}</span></li>`).join("")}
                  <li><span class="sts-dot to"></span><b>${esc(to.name)}</b><span class="t">${fmtH(it.end)}</span></li></ul>`;
                h += startBtn + tail;
            }
            sheet.innerHTML = h;
        }
        function times() {
            const twEl = $("stsTWalk"), ttEl = $("stsTTransit");
            if (twEl) twEl.textContent = walk && walk.length ? fmtMin(walk[0].duration) : (walk ? "—" : "…");
            if (ttEl) ttEl.textContent = transit === null ? "…" : transit.length ? fmtMin(Math.min(...transit.map(t => t.duration))) : "—";
        }

        /* --- calcul complet --- */
        async function compute() {
            const id = ++req; walk = null; transit = null; sel = { walk: 0, transit: 0 }; times(); render();
            const a = reversed ? to : from, b = reversed ? from : to;
            fetchWalk(a, b).then(r => { if (id !== req) return; walk = r; }).catch(() => {
                if (id !== req) return;
                const d = L.latLng(a.lat, a.lon).distanceTo([b.lat, b.lon]) * 1.3; walk = [{ duration: d / 1.3, distance: d, estimate: true, line: [[a.lat, a.lon], [b.lat, b.lon]] }];
            }).finally(() => {
                if (id !== req) return; times(); if (mode === "walk") { render(); draw(); }
                if (autoGuideOnReady) { autoGuideOnReady = false; startGuide(); }
            });
            fetchTransit(a, b).then(r => { if (id !== req) return; transit = r; }).catch(() => { if (id !== req) return; transit = []; })
                .finally(() => { if (id !== req) return; times(); if (mode === "transit") { render(); draw(); } });
            draw();
        }

        /* --- guidage en direct, virage par virage (demande du 08/10/2026) --- */
        const TURN_FR = { uturn: "demi-tour", "sharp right": "fortement à droite", right: "à droite", "slight right": "légèrement à droite", straight: "tout droit", "slight left": "légèrement à gauche", left: "à gauche", "sharp left": "fortement à gauche" };
        const TURN_ANGLE = { uturn: 180, "sharp right": 120, right: 90, "slight right": 45, straight: 0, "slight left": -45, left: -90, "sharp left": -120 };
        const ARRIVE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
        const arrowIconHtml = angle => angle == null ? ARRIVE_ICON : `<svg width="22" height="22" viewBox="0 0 24 24" style="transform:rotate(${angle}deg)"><path d="M12 3l7 10h-4.5v8h-5v-8H5z" fill="#fff"/></svg>`;
        function stepInstruction(step, isFirst, isLast) {
            if (isLast) return `Vous arrivez à ${esc(to.name)}`;
            if (isFirst) return "Dirigez-vous vers " + esc(step.name || "votre destination");
            if (step.type === "roundabout" || step.type === "rotary") return "Au rond-point" + (step.name ? ", direction " + esc(step.name) : "");
            if (step.modifier && TURN_FR[step.modifier] && step.modifier !== "straight") return "Tournez " + TURN_FR[step.modifier] + (step.name ? " sur " + esc(step.name) : "");
            return "Continuez" + (step.name ? " sur " + esc(step.name) : "");
        }
        function renderGuideBanner(iconHtml, distText, instrText, progressPct) {
            const arrowEl = $("stsGuideArrow"), distEl = $("stsGuideDist"), instrEl = $("stsGuideInstr"), progEl = $("stsGuideProg");
            if (arrowEl) arrowEl.innerHTML = iconHtml;
            if (distEl) distEl.textContent = distText;
            if (instrEl) instrEl.textContent = instrText;
            if (progEl && progressPct != null) progEl.style.width = progressPct + "%";
        }
        // Pourcentage du trajet déjà parcouru, à partir de la distance à vol d'oiseau restante
        // jusqu'à la destination finale (pas jusqu'à la prochaine manœuvre, sinon la barre
        // sauterait à chaque virage) — bornée à [0,100] au cas où la position GPS dérive
        // légèrement au-delà du point de départ ou d'arrivée.
        function guideProgressPct(pos) {
            if (!guideStartDist) return 0;
            const left = L.latLng(pos).distanceTo([to.lat, to.lon]);
            return Math.max(0, Math.min(100, 100 - (left / guideStartDist * 100)));
        }
        // Chaque "step" OSRM est une manœuvre déjà exécutée à son propre point (guideSteps[i]
        // .loc EST le point de la manœuvre i, par ex. guideSteps[0] = le point de départ,
        // trivialement déjà atteint) — son instruction reste donc affichée tant qu'on n'a
        // pas atteint le point de la manœuvre SUIVANTE (steps[i+1]), jamais en comparant à
        // son propre point (BUG trouvé en testant : comparer au point courant avançait tout
        // de suite à l'étape suivante dès le départ, ou n'avançait jamais ensuite puisque ce
        // point, déjà dépassé, ne redevient jamais proche). Ne dépasse jamais la dernière
        // étape ("arrive"), gérée par ailleurs par le seuil d'arrivée déjà présent dans
        // startGuide() (toast + stopGuide()).
        function updateGuideForWalk(pos) {
            if (!guideSteps.length) return;
            const ll = L.latLng(pos);
            while (guideIdx < guideSteps.length - 1 && ll.distanceTo(guideSteps[guideIdx + 1].loc) < 18) guideIdx++;
            const isLast = guideIdx === guideSteps.length - 1;
            const step = guideSteps[guideIdx];
            const targetLoc = isLast ? step.loc : guideSteps[guideIdx + 1].loc;
            const d = Math.round(ll.distanceTo(targetLoc));
            const angle = isLast ? null : (step.modifier && TURN_ANGLE[step.modifier] != null ? TURN_ANGLE[step.modifier] : 0);
            renderGuideBanner(arrowIconHtml(angle), isLast ? "Arrivée" : "Dans " + fmtKm(d), stepInstruction(step, guideIdx === 0, isLast), guideProgressPct(pos));
        }
        // Pas de virage par virage pour les transports (Transitous ne fournit pas ce détail
        // pour les segments bus/métro, et Google Maps lui-même ne guide pas à ce niveau sur ce
        // mode) : on suit plutôt la progression entre legs marche/bus/métro déjà décodés par
        // fetchTransit() — "Marchez jusqu'à l'arrêt X", puis "Bus/Métro ... descendez à Y".
        function updateGuideForTransit(pos) {
            const it = transit && transit[sel.transit]; if (!it) return;
            const ll = L.latLng(pos), legs = it.legs;
            while (guideLegIdx < legs.length - 1 && ll.distanceTo(legs[guideLegIdx].path[legs[guideLegIdx].path.length - 1]) < 30) guideLegIdx++;
            const leg = legs[guideLegIdx];
            const endPt = leg.path[leg.path.length - 1];
            const d = Math.round(ll.distanceTo(endPt));
            const isLastLeg = guideLegIdx === legs.length - 1;
            let instr, angle;
            if (leg.mode === "WALK") {
                const next = legs[guideLegIdx + 1];
                instr = next ? `Marchez jusqu'à l'arrêt ${esc(next.from || "")}` : `Marchez jusqu'à ${esc(to.name)}`;
                angle = isLastLeg ? null : 0;
            } else {
                instr = `${MODE_FR[leg.mode] || "Transport"}${leg.line ? " " + esc(leg.line) : ""} · descendez à ${esc(leg.to || "")}`;
                angle = null;
            }
            renderGuideBanner(leg.mode === "WALK" ? arrowIconHtml(angle) : transitIcon(leg), isLastLeg && d < 30 ? "Arrivée" : "Dans " + fmtKm(d), instr, guideProgressPct(pos));
        }
        function showGuideBanner() { const b = $("stsGuideBanner"); if (b) b.classList.remove("hidden"); const top = $("stsItTop"); if (top) top.classList.add("guiding"); }
        function hideGuideBanner() { const b = $("stsGuideBanner"); if (b) b.classList.add("hidden"); const top = $("stsItTop"); if (top) top.classList.remove("guiding"); }
        function startGuide() {
            if (!navigator.geolocation || CFG.demo) { toast(CFG.demo ? "Guidage simulé (mode démo)" : "Localisation indisponible"); return; }
            guideIdx = 0; guideLegIdx = 0;
            guideSteps = (mode === "walk" && walk && walk[sel.walk] && walk[sel.walk].steps) || [];
            guideStartDist = me ? L.latLng([me.lat, me.lon]).distanceTo([to.lat, to.lon]) : null;
            showGuideBanner();
            sheet.classList.add("compact");
            if (me) { if (mode === "walk") updateGuideForWalk([me.lat, me.lon]); else updateGuideForTransit([me.lat, me.lon]); }
            watchId = navigator.geolocation.watchPosition(p => {
                const pos = [p.coords.latitude, p.coords.longitude];
                if (!startGuide.m) { startGuide.m = L.marker(pos, { icon: meIcon(), interactive: false, zIndexOffset: 1000 }).addTo(imap); } else startGuide.m.setLatLng(pos);
                imap.setView(pos, Math.max(imap.getZoom(), 18), { animate: true });
                if (mode === "walk") updateGuideForWalk(pos); else updateGuideForTransit(pos);
                const left = L.latLng(pos).distanceTo([to.lat, to.lon]);
                if (left < 40) { toast("Tu es arrivé(e) à " + to.name + " !"); stopGuide(); }
            }, () => toast("Impossible de suivre ta position"), { enableHighAccuracy: true, maximumAge: 5000 });
            render(); toast("C'est parti ! Suis le tracé violet");
            // Le changement de hauteur de .sts-it-top (bannière affichée, .sts-row/.sts-seg
            // masqués) et de .sts-sheet (passage en "compact") déplace le cadrage carte —
            // même délai que le toggle manuel existant (data-act="toggle" ci-dessous).
            setTimeout(draw, 320);
        }
        function stopGuide() {
            if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
            if (startGuide.m) { startGuide.m.remove(); startGuide.m = null; }
            hideGuideBanner();
            sheet.classList.remove("compact");
            guideSteps = []; guideIdx = 0; guideLegIdx = 0; guideStartDist = null;
            render(); draw();
        }

        /* --- événements --- */
        root.querySelectorAll(".sts-seg button").forEach(b => b.addEventListener("click", () => {
            mode = b.dataset.mode; root.querySelectorAll(".sts-seg button").forEach(x => x.setAttribute("aria-pressed", x === b)); render(); draw();
        }));
        sheet.addEventListener("click", async e => {
            const alt = e.target.closest("[data-alt]"); if (alt) { sel[mode] = +alt.dataset.alt; render(); draw(); return; }
            const a = e.target.closest("[data-act]"); if (!a) return;
            if (a.dataset.act === "toggle") { sheet.classList.toggle("compact"); setTimeout(draw, 320); }
            if (a.dataset.act === "start") startGuide();
            if (a.dataset.act === "stop") stopGuide();
            if (a.dataset.act === "share") {
                const data = { title: "Itinéraire vers " + to.name, text: `Je vais à ${to.name}${to.show ? " (" + to.show + ")" : ""} avec Screen To Street !`, url: gmLink(mode) };
                if (navigator.share) { try { await navigator.share(data); } catch (_) { } } else { try { await navigator.clipboard.writeText(data.url); toast("Lien de l'itinéraire copié"); } catch (_) { toast("Partage indisponible"); } }
            }
        });
        const swapBtn = $("stsSwap");
        if (swapBtn) swapBtn.addEventListener("click", () => {
            reversed = !reversed;
            const f = $("stsFrom"), t = $("stsTo"); const [fh, th] = [f.innerHTML, t.innerHTML]; f.innerHTML = th; t.innerHTML = fh; compute();
        });
        const backBtn = $("stsBack");
        if (backBtn) backBtn.addEventListener("click", () => close());
        const guideStopBtn = $("stsGuideStop");
        if (guideStopBtn) guideStopBtn.addEventListener("click", () => stopGuide());
        addEventListener("keydown", e => { if (e.key === "Escape" && root.classList.contains("on")) close(); });
        addEventListener("popstate", () => { if (root.classList.contains("on")) close(true); });

        /* --- API publique --- */
        async function open(spot, opts) {
            to = spot; reversed = false; mode = "walk";
            autoGuideOnReady = !!(opts && opts.autoGuide);
            root.querySelectorAll(".sts-seg button").forEach(x => x.setAttribute("aria-pressed", x.dataset.mode === "walk"));
            $("stsFrom").innerHTML = '<span class="sts-dot me"></span><span>Ma position</span>';
            $("stsTo").innerHTML = `<span class="sts-dot to"></span><b>${esc(spot.name)}</b>`;
            root.classList.add("on"); root.setAttribute("aria-hidden", "false"); history.pushState({ stsIt: 1 }, "");
            ensureMap(); setTimeout(() => imap.invalidateSize(), 400);
            walk = null; transit = null; times(); sheet.innerHTML = loading();
            imap.setView([spot.lat, spot.lon], 15); layer.clearLayers(); L.marker([spot.lat, spot.lon], { icon: toIcon() }).addTo(layer);
            try { from = me = await locate(); }
            catch (_) {
                sheet.innerHTML = `<button class="sts-handle"></button><div class="sts-big" style="font-size:19px">Où es-tu ?</div>
                  <div class="sts-msg">Autorise la localisation pour calculer ton itinéraire jusqu'à <b>${esc(spot.name)}</b>.</div>
                  <button class="sts-cta" id="stsRetry" type="button">Activer ma localisation</button>
                  <a class="sts-gm" href="${gmLink("walk")}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>`;
                const retryBtn = $("stsRetry"); if (retryBtn) retryBtn.onclick = () => open(spot);
                return;
            }
            compute();
        }
        function close(fromHistory) {
            stopGuide(); req++; root.classList.remove("on"); root.setAttribute("aria-hidden", "true");
            if (!fromHistory && history.state && history.state.stsIt) history.back();
        }
        return { open, close };
    })();

    // Point d'entrée depuis la bulle .map-hover-tip (voir showMapHoverTip() dans script.js)
    // — convertit un lieu du site (lat/lng) au format {lat, lon, name, show, address}
    // attendu par le module ci-dessus.
    window.openLocationItinerary = function (loc, opts) {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
        const spot = {
            id: String(loc.id),
            name: loc.name || '',
            show: [loc.category, loc.group].filter(Boolean).join(' · '),
            address: [loc.city, loc.country].filter(Boolean).join(', '),
            lat: loc.lat,
            lon: loc.lng
        };
        Itinerary.open(spot, opts);
    };
    window.Itinerary = Itinerary;
})();
