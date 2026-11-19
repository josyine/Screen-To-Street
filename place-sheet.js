// ==========================================
// TIROIR "LIEU" MOBILE (demande du 19/11/2026) — sur mobile uniquement, un clic sur "View"
// (bulle d'un marqueur, voir showMapHoverTip() dans script.js) ou un double-tap sur le
// marqueur lui-même n'ouvre plus la fiche lieu en plein écran directement : un tiroir
// glissant à 3 états (half/full/closed, façon Google Maps) s'ouvre d'abord à moitié d'écran,
// carte toujours visible et utilisable au-dessus. Glisser vers le haut l'ouvre en plein
// écran (la fiche lieu complète, inchangée). Sur ordinateur, rien ne change : "View"/double-
// clic ouvrent la fiche exactement comme avant cet ajout (voir isMobile() plus bas).
//
// Réutilise ENTIÈREMENT le rendu existant de la fiche lieu : #sidebar-details, rempli par
// window.openDetailsPanel() (script.js, jamais touché ni dupliqué ici) est simplement
// DÉPLACÉ (appendChild — un déplacement, pas une copie) hors de #app-sidebar et dans
// #place-sheet (voir map.html) le temps que le tiroir est utilisé, puis remis à sa place
// d'origine dès qu'on repasse en largeur ordinateur. Tous ses identifiants, écouteurs,
// onglets, cases à cocher et appels Firebase existants continuent de fonctionner sans
// changement, quel que soit l'endroit du DOM où il se trouve.
// ==========================================
(function () {
    const MOBILE_MAX_WIDTH = 768;
    function isMobile() { return !!(window.matchMedia && window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches); }
    function prefersReducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

    const sheet = document.getElementById('place-sheet');
    const veil = document.getElementById('place-sheet-veil');
    const handle = document.getElementById('place-sheet-handle');
    const backMapBtn = document.getElementById('place-sheet-backmap-btn');
    const detailsEl = document.getElementById('sidebar-details');

    // Page sans ce tiroir (ex: script partagé chargé ailleurs par erreur) — repli silencieux
    // sur le comportement d'origine plutôt qu'une erreur.
    if (!sheet || !veil || !handle || !detailsEl || typeof window.openLocationOrPickGroup !== 'function') {
        window.__openLocationMobileAware = function (loc) {
            if (typeof window.openLocationOrPickGroup === 'function') window.openLocationOrPickGroup(loc);
        };
        return;
    }

    // Emplacement d'origine de #sidebar-details (toujours son parent desktop normal avant le
    // tout premier déplacement) — capturé UNE SEULE FOIS ici, au chargement de la page, pour
    // pouvoir l'y remettre exactement (même position parmi ses frères) au passage en largeur
    // ordinateur. insertBefore(el, null) insère en dernier enfant, donc originalNextSibling
    // valant null (dernier enfant à l'origine) reste géré correctement.
    const originalParent = detailsEl.parentNode;
    const originalNextSibling = detailsEl.nextSibling;

    let state = 'closed'; // 'half' | 'full' | 'closed'
    let currentLoc = null;
    let inPopstateSync = false; // true pendant qu'on consomme NOTRE PROPRE history.back() programmatique (goTo()), pour que le popstate qui en résulte ne soit pas retraité une 2e fois

    function vh() { return window.innerHeight; }
    function pxForState(s) { return s === 'full' ? 0 : s === 'half' ? vh() * 0.5 : vh(); }

    function setBottomNavHidden(hidden) {
        const nav = document.getElementById('mobile-bottom-nav');
        if (nav) nav.classList.toggle('menu-open', hidden);
    }

    // ---------- rendu de l'état ----------
    function applyVisualState(next) {
        state = next;
        sheet.classList.remove('ps-half', 'ps-full', 'ps-closed', 'ps-dragging');
        sheet.classList.add('ps-' + next);
        sheet.style.transform = ''; // laisse la classe + la transition CSS reprendre la main (plus de suivi au doigt)
        sheet.setAttribute('aria-hidden', next === 'closed' ? 'true' : 'false');
        if (backMapBtn) backMapBtn.classList.toggle('hidden', next !== 'full');
        setBottomNavHidden(next === 'full');
        veil.classList.toggle('on', next === 'full');
        veil.style.opacity = '';
        if (next === 'half') {
            // Un simple tap sur la poignée/la photo en half ouvre en full (voir leurs
            // écouteurs plus bas) : la poignée doit donc pouvoir recevoir le focus clavier.
            handle.focus({ preventScroll: true });
        } else if (next === 'full' && document.activeElement === handle) {
            handle.blur();
        }
        if (next === 'closed') closeCleanup();
    }

    function closeCleanup() {
        currentLoc = null;
        // Même nettoyage que highlightSelectedLocationMarker() (script.js) utilise à
        // l'expiration de son propre minuteur — appelé ici immédiatement : "closed" = lieu
        // désélectionné tout de suite, pas seulement après 3,5s (demande explicite).
        if (typeof map !== 'undefined' && map) {
            if (window.__selectedLocMarkerTimeout) { clearTimeout(window.__selectedLocMarkerTimeout); window.__selectedLocMarkerTimeout = null; }
            if (window.__selectedLocMarker) { map.removeLayer(window.__selectedLocMarker); window.__selectedLocMarker = null; }
            if (window.__selectedLocMarkerHidden) { window.__selectedLocMarkerHidden.setOpacity(1); window.__selectedLocMarkerHidden = null; }
        }
        if (typeof window.closeDetailsPanel === 'function') window.closeDetailsPanel();
    }

    // ---------- historique (demande explicite, section 6) ----------
    // "full" et "half" possèdent chacun LEUR PROPRE entrée d'historique : avancer (closed->
    // half, half->full) en pousse une nouvelle ; reculer (full->half, half->closed) consomme
    // la dernière poussée via history.back() plutôt que d'en pousser une — exactement 2
    // niveaux, donc 2 pressions du bouton retour du téléphone pour revenir où on en était
    // avant le tout premier tap sur "View". inPopstateSync distingue un popstate RÉEL (tap de
    // la personne sur le bouton retour) de celui, synthétique, que history.back() ci-dessous
    // déclenche lui-même quand ON ferme/recule par geste ou bouton "Back to map".
    const ORDER = { closed: 0, half: 1, full: 2 };
    function goTo(next) {
        if (next === state) return;
        if (ORDER[next] > ORDER[state]) {
            history.pushState({ placeSheet: next }, '');
        } else if (history.state && history.state.placeSheet) {
            inPopstateSync = true;
            history.back();
        }
        applyVisualState(next);
    }
    window.addEventListener('popstate', () => {
        if (inPopstateSync) { inPopstateSync = false; return; }
        // Pression RÉELLE du bouton retour du téléphone : un seul niveau à la fois, jamais de
        // history.pushState/back() ici (le pop a déjà eu lieu de lui-même).
        if (state === 'full') applyVisualState('half');
        else if (state === 'half') applyVisualState('closed');
    });

    // ---------- clavier (demande explicite, section 7) ----------
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || state === 'closed') return;
        if (state === 'full') goTo('half'); else goTo('closed');
    });
    handle.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && state === 'half') { e.preventDefault(); goTo('full'); }
    });
    handle.addEventListener('click', () => { if (state === 'half') goTo('full'); });
    if (backMapBtn) backMapBtn.addEventListener('click', (e) => { e.preventDefault(); if (state === 'full') goTo('half'); });

    // ---------- ouverture ----------
    function reparentIntoSheet() {
        if (detailsEl.parentNode !== sheet) sheet.appendChild(detailsEl);
    }
    function reparentBackOut() {
        if (detailsEl.parentNode === sheet) originalParent.insertBefore(detailsEl, originalNextSibling);
    }

    // Point d'entrée unique (demande explicite : réutiliser openDetailsPanel() tel quel,
    // jamais le dupliquer) — appelé à la place de openLocationOrPickGroup() directement aux
    // 2 endroits de script.js où "View"/le double-tap l'appellent (showMapHoverTip()/
    // addSingleLocationMarker()). Sur ordinateur (ou si ce tiroir est absent, voir le repli
    // tout en haut), comportement RIGOUREUSEMENT identique à avant : openLocationOrPickGroup()
    // tel quel, jamais intercepté.
    window.__openLocationMobileAware = function (loc) {
        if (!isMobile()) { window.openLocationOrPickGroup(loc); return; }
        // "View" passe par openLocationOrPickGroup() (choix de groupe d'abord si ce lieu est
        // relié à d'autres pour un autre groupe, voir findLinkedGroupLocations()) — jamais
        // openDetailsPanel() directement ici, pour ne JAMAIS dupliquer cette logique de choix.
        // openForSheet() ci-dessous est celle qui engage réellement le tiroir, quel que soit
        // le chemin (choix de groupe ou non) par lequel openDetailsPanel() finit par être
        // appelée — voir le remplacement temporaire de window.openDetailsPanel juste en dessous.
        const originalOpenDetailsPanel = window.openDetailsPanel;
        window.openDetailsPanel = function (locId, fromList) {
            window.openDetailsPanel = originalOpenDetailsPanel; // ne sert qu'UNE fois, consommé immédiatement
            originalOpenDetailsPanel(locId, fromList);
            openForSheet(loc, locId);
        };
        window.openLocationOrPickGroup(loc);
    };

    function openForSheet(loc, locId) {
        currentLoc = loc;
        document.getElementById('app-sidebar').classList.remove('open', 'expanded');
        if (typeof window.setMobileChromeHidden === 'function') window.setMobileChromeHidden(false);
        reparentIntoSheet();
        sheet.setAttribute('aria-label', loc && loc.name ? loc.name : 'Place details');
        goTo('half');
    }

    // ---------- passage en largeur ordinateur pendant que le tiroir est ouvert ----------
    // (demande explicite, section 1) : ferme le tiroir et remet #sidebar-details à sa place
    // d'origine dans #app-sidebar, en l'ouvrant "classiquement" (comme openDetailsPanel() le
    // fait normalement sur ordinateur) plutôt que de le laisser coincé dans #place-sheet,
    // invisible au-dessus de cette largeur.
    const mq = window.matchMedia ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`) : null;
    function handleViewportChange(matchesMobile) {
        if (matchesMobile || state === 'closed') return;
        const loc = currentLoc;
        applyVisualState('closed'); // silencieux : pas de goTo()/history ici, on change simplement de contexte d'affichage, on ne "ferme" rien du point de vue de la personne
        reparentBackOut();
        setBottomNavHidden(false);
        const appSidebar = document.getElementById('app-sidebar');
        if (appSidebar) { appSidebar.classList.add('open', 'expanded'); }
        if (loc && typeof window.openDetailsPanel === 'function') window.openDetailsPanel(loc.id);
    }
    if (mq) {
        const onChange = (e) => handleViewportChange(e.matches);
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange); // repli Safari ancien
    }

    // ---------- gestes (Pointer Events, demande explicite section 5) ----------
    const DRAG_TAP_PX = 6; // en dessous de ce déplacement total : un tap, pas un glissement
    const DRAG_TAP_MS = 300;
    const FLING_VELOCITY = 0.5; // px/ms
    const VELOCITY_WINDOW_MS = 100; // n'utilise que les échantillons des N dernières ms pour la vitesse de relâchement (évite qu'un début de geste lent puis un arrêt ne fausse la vitesse finale)

    let drag = null; // {pointerId, startY, startPx, lastPx, samples:[{t,y}], engaged, fromContentTop}

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function beginDrag(e, opts) {
        drag = {
            pointerId: e.pointerId,
            startY: e.clientY,
            startPx: pxForState(state),
            lastPx: pxForState(state),
            samples: [{ t: performance.now(), y: e.clientY }],
            engaged: !!(opts && opts.immediate),
            target: e.target
        };
        if (drag.engaged) {
            try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* pas bloquant */ }
            sheet.classList.add('ps-dragging');
        }
    }

    function updateVeilDuring(px) {
        const halfPx = pxForState('half');
        if (px <= halfPx) {
            const progress = clamp((halfPx - px) / halfPx, 0, 1);
            veil.style.opacity = String(progress * 0.35);
            veil.classList.toggle('on', progress > 0);
        } else {
            veil.style.opacity = '0';
            veil.classList.remove('on');
        }
    }

    function onPointerMove(e) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const dy = e.clientY - drag.startY;

        if (!drag.engaged) {
            // En "full", un glissement depuis le contenu (pas la photo) n'engage le tiroir
            // QUE s'il part du scrollTop=0 ET va clairement vers le bas (demande explicite,
            // section 5) — sinon on laisse le défilement natif du contenu se produire
            // normalement, jamais interrompu ici (pas de preventDefault/capture tant que ce
            // choix n'est pas tranché).
            if (drag.fromContentTop) {
                if (detailsEl.scrollTop !== 0) { drag = null; return; } // le contenu a défilé entre-temps : plus jamais candidat pour ce geste
                if (dy < -DRAG_TAP_PX) { drag = null; return; } // glissement vers le haut = défilement normal du contenu
                if (dy < DRAG_TAP_PX) return; // pas encore assez de mouvement pour trancher
            } else if (Math.abs(dy) < DRAG_TAP_PX) {
                return; // zone "photo/poignée/tout le panneau en half" : attend un mouvement net avant d'engager, pour ne pas gêner un simple tap
            }
            drag.engaged = true;
            try { drag.target.setPointerCapture(drag.pointerId); } catch (err) { /* pas bloquant */ }
            sheet.classList.add('ps-dragging');
        }

        e.preventDefault();
        const px = clamp(drag.startPx + dy, 0, vh());
        drag.lastPx = px;
        sheet.style.transform = `translateY(${px}px)`;
        updateVeilDuring(px);

        drag.samples.push({ t: performance.now(), y: e.clientY });
        const cutoff = performance.now() - VELOCITY_WINDOW_MS;
        while (drag.samples.length > 2 && drag.samples[0].t < cutoff) drag.samples.shift();
    }

    function onPointerUp(e) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const d = drag; drag = null;
        try { e.target.releasePointerCapture(e.pointerId); } catch (err) { /* pas bloquant */ }

        const totalDy = e.clientY - d.startY;
        const elapsed = performance.now() - d.samples[0].t;

        if (!d.engaged) {
            // Jamais engagé (mouvement resté sous le seuil tout du long) : un tap, pas un
            // glissement. Sur la poignée/la photo en "half", ouvre en "full" (demande
            // explicite) — géré par les écouteurs click dédiés de la poignée/la photo plus
            // bas, rien à faire ici d'autre que réinitialiser proprement.
            sheet.classList.remove('ps-dragging');
            return;
        }

        sheet.classList.remove('ps-dragging');
        const first = d.samples[0], last = d.samples[d.samples.length - 1];
        const dt = Math.max(1, last.t - first.t);
        const velocity = (last.y - first.y) / dt; // px/ms, positif = vers le bas

        const order = ['full', 'half', 'closed'];
        let target;
        if (Math.abs(velocity) > FLING_VELOCITY && elapsed < 2000) {
            const idx = order.indexOf(state);
            target = velocity > 0 ? order[Math.min(order.length - 1, idx + 1)] : order[Math.max(0, idx - 1)];
        } else {
            const positions = { full: pxForState('full'), half: pxForState('half'), closed: pxForState('closed') };
            target = order.reduce((best, s) => Math.abs(positions[s] - d.lastPx) < Math.abs(positions[best] - d.lastPx) ? s : best, 'half');
        }
        goTo(target);
    }

    sheet.addEventListener('pointermove', onPointerMove);
    sheet.addEventListener('pointerup', onPointerUp);
    sheet.addEventListener('pointercancel', onPointerUp);

    // Zone "photo" (demande explicite : glisser depuis la photo marche dans les 2 états) —
    // engage le suivi du doigt immédiatement (opts.immediate), sans seuil préalable : c'est
    // déjà une zone de glissement dédiée (pas de scroll interne à préserver), contrairement
    // au reste du contenu en "full".
    document.getElementById('detail-hero-bg').addEventListener('pointerdown', (e) => {
        if (state === 'closed') return;
        beginDrag(e, { immediate: true });
    });
    // Attend que la cible EXISTE réellement : #detail-hero-bg vit dans #sidebar-details,
    // présent dès le chargement de la page (jamais recréé), donc getElementById ci-dessus
    // fonctionne dès l'exécution de ce fichier — pas besoin d'un MutationObserver.

    handle.addEventListener('pointerdown', (e) => {
        if (state !== 'half') return;
        beginDrag(e, { immediate: true });
    });

    // Zone "tout le panneau" en "half" (demande explicite) — exclut boutons/cases/onglets
    // (ils doivent garder leur comportement normal, jamais interprétés comme un geste).
    sheet.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.place-sheet-handle, .detail-hero')) return; // déjà gérés par leurs propres écouteurs ci-dessus
        if (state === 'half') {
            if (e.target.closest('button, a, input, label, select, textarea, [role="tab"], .tab-btn')) return;
            beginDrag(e, { immediate: true });
        } else if (state === 'full') {
            if (e.target.closest('button, a, input, label, select, textarea, [role="tab"], .tab-btn')) return;
            // Candidat seulement si parti du haut du contenu (scrollTop=0) — tranché au 1er
            // pointermove (voir onPointerMove), jamais ici : on ne sait pas encore si la
            // personne va tirer vers le bas (fermer) ou faire défiler normalement.
            beginDrag(e, { immediate: false });
            drag.fromContentTop = true;
        }
    });

    // Tap simple sur la photo/la poignée en "half" -> "full" (demande explicite). La photo
    // porte aussi le glissement (ci-dessus) : un vrai clic/tap (aucun mouvement notable)
    // déclenche ce click natif normalement, APRÈS le pointerup correspondant.
    document.getElementById('detail-hero-bg').addEventListener('click', () => { if (state === 'half') goTo('full'); });
})();
