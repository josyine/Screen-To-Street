// ==========================================
// ÉCRAN DE CHARGEMENT — globe + anneau de progression (demande du 07/10/2026, remplace
// l'ancienne pastille à 3 points qui tournait en rond sans vraie notion de progression).
// ==========================================
// Chargé en <script src> juste après le <div class="stsl" id="stsl">...</div> (voir le
// HTML de chaque page) — le markup et le CSS (préfixés .stsl-) restent inline dans
// chaque <head>, AVANT tout <link> externe, pour s'afficher au tout premier rendu sans
// rien attendre ; seule la logique (plus volumineuse : données de contour des
// continents + dessin du globe en canvas) est ici, dans un fichier partagé, pour ne pas
// dupliquer ces ~150 lignes identiques dans chacune des pages du site.
//
// API StsLoader (exposée sur window, au cas où une page voudrait un jour piloter une
// vraie progression plutôt que la simulation ci-dessous) :
//   StsLoader.progress(0..1)   fait avancer la progression réelle (jamais en arrière)
//   StsLoader.done()           passe à 100 % puis joue la plongée dans le globe + fondu
//   StsLoader.reset()          réinitialise (non utilisé en production, utile pour tester)
const StsLoader = (() => {
const LAND = [
   [[-168,65],[-156,71],[-140,70],[-125,70],[-110,73],[-95,72],[-80,73],[-75,65],[-64,60],[-55,52],[-60,47],[-66,44],[-70,42],[-75,38],[-76,35],[-81,31],[-80,26],[-82,25],[-84,30],[-90,30],[-97,27],[-97,21],[-92,18],[-87,21],[-88,16],[-84,11],[-80,8],[-78,8],[-83,10],[-86,13],[-92,15],[-98,16],[-105,20],[-110,24],[-112,30],[-115,32],[-118,34],[-121,36],[-124,40],[-125,46],[-124,49],[-130,55],[-138,59],[-147,61],[-152,59],[-158,57],[-163,55],[-160,59],[-165,62]],
   [[-50,60],[-43,60],[-35,66],[-22,70],[-19,76],[-20,81],[-35,83],[-55,82],[-68,78],[-62,75],[-56,72],[-52,68]],
   [[-80,8],[-74,11],[-66,11],[-60,9],[-52,5],[-50,0],[-44,-2],[-35,-6],[-37,-12],[-39,-18],[-41,-22],[-48,-26],[-53,-33],[-57,-36],[-62,-39],[-65,-43],[-67,-47],[-68,-52],[-70,-55],[-74,-52],[-74,-45],[-73,-38],[-71,-30],[-70,-20],[-75,-15],[-79,-8],[-81,-4],[-80,1],[-78,4]],
   [[-10,36],[-9,39],[-9,43],[-2,43.5],[-1.5,46],[-4.5,48],[-1,49.5],[2,51],[4,52],[8,54],[9,57],[11,56],[12,54.5],[14,54],[20,54.5],[21,57],[24,59],[22,60.5],[21,63],[25,65.5],[22,66],[16,63],[12,60],[7,58],[5,61],[10,64],[14,67.5],[19,70],[26,71],[31,70],[41,67],[44,68],[56,68],[60,70],[68,73],[72,66],[60,60],[55,55],[50,47],[48,42],[42,43],[40,41],[36,36],[28,37],[26,40],[28,41],[24,40],[22,37],[21,40],[19,42],[16,44],[13,45.5],[12,44],[16,41],[16,38],[12,38],[15,40.5],[12,42],[10,44],[7,43.5],[3,43],[3,42],[0,40],[0,38],[-2,36.7],[-5,36]],
   [[-17,15],[-17,21],[-13,27],[-10,30],[-9,33],[-6,35.8],[-2,35],[3,36.8],[10,37],[11,33],[15,32],[20,31],[20,32.8],[25,32],[32,31.3],[34,31],[35,28],[37,22],[39,16],[43,12.5],[45,10.5],[51,11.8],[51,10],[48,5],[42,-1],[40,-5],[39,-10],[40,-15],[36,-20],[35,-24],[33,-27],[32,-29],[28,-33],[22,-34],[18,-34.5],[18,-30],[15,-26],[12,-18],[13,-11],[12,-5],[9,-1],[9,3],[7,4.5],[2,6],[-5,5],[-8,4.5],[-12,7.5],[-15,11],[-16.5,13]],
   [[36,36],[35,33],[34.5,30],[35,28],[38,22],[42,16],[43,13],[45,12.8],[52,15.5],[56,18],[58,21],[60,22.5],[57,24],[56,26.5],[52,24],[50,26],[48,30],[52,28],[57,26],[62,25],[67,25],[70,22],[73,18],[75,12],[77,8],[79,10],[80,15],[83,18],[87,21.5],[90,22],[92,21],[94,18],[97,16],[98,9],[99,7],[100,3],[103,1.5],[104,1.3],[103.5,4],[102,7],[100,13],[102,12.5],[105,8.5],[106,10.5],[109,12],[109,16],[106,19],[108,21.5],[111,21.5],[115,22.5],[119,25],[121,28],[122,30.5],[121,32],[119,35],[122,37],[119,37.5],[118,39],[121,40.8],[122,40],[124,39.8],[126,37.5],[126.5,35],[129,35.2],[129.5,37],[128,38.6],[130,42.5],[133,43],[136,44],[140,48],[141,52],[137,54],[141,58.5],[147,59.5],[155,59],[156,51],[160,54],[163,57],[163,60],[170,60],[178,62.5],[180,65],[180,69],[170,70],[160,70],[150,72],[140,73],[128,73],[113,74],[105,77.5],[96,76],[87,75],[80,73],[73,72],[68,73],[60,70],[56,68],[44,68],[41,67],[44,61],[50,47],[48,42],[42,43],[40,41]],
   [[130,31],[131,33.5],[133,34],[135,33.5],[136,34.5],[138,34.6],[140,35],[141,37],[141,40],[141.5,41.5],[140,41.5],[140,40],[139.5,38],[137,37],[136,35.7],[133,35.5],[131,34.5],[130,33.5]],
   [[141.5,42],[143.5,42.5],[145.5,43.3],[144.5,44.2],[142,45.4],[141.5,43.5]],
   [[114,-22],[114,-26],[115,-34],[118,-35],[123,-34],[129,-31.5],[132,-32],[135,-34.5],[138,-35.5],[139,-37.5],[141,-38.5],[144,-38.5],[147,-38],[150,-37.5],[151,-34],[153,-31],[153.5,-28],[153,-25],[151,-23],[149,-21],[146,-19],[145.5,-15],[143.5,-14],[142.5,-10.7],[141.5,-13],[141.5,-16.5],[140,-17.5],[137,-16],[136,-12.5],[133,-11.5],[130,-12.5],[129,-15],[126,-14],[122,-17],[121,-19.5],[117,-20.6]],
   [[-5.5,50],[1.5,51],[1.7,52.7],[0,53.5],[-1.5,55],[-2,56],[-3,58.5],[-5,58.6],[-6,57],[-5,55],[-3,54.5],[-4.5,53.3],[-4.5,52],[-5.2,51.7],[-3,51.4]],
   [[-10,51.5],[-6,52],[-6,54.5],[-8,55],[-10,54]],
   [[44,-25],[47,-25],[49.5,-17],[50.5,-15],[49,-12],[47.5,-14.5],[44,-17]],
   [[95,5.5],[98,3.5],[104,-2],[106,-6],[102,-4],[100,-1],[97,2]],
   [[105.5,-6.8],[111,-6.6],[114.5,-7.7],[114,-8.6],[108,-7.8]],
   [[109,1.5],[111,2.5],[114,4.5],[117,7],[119,5.2],[117.5,1],[116,-3.5],[111,-3],[109.5,-1]],
   [[120,-1],[123,1],[125,1.5],[121,-1],[121,-5],[119.5,-5.5],[119,-3]],
   [[131,-1],[138,-1.5],[145,-4],[150,-10.5],[143,-9],[138,-8.3],[133,-4]],
   [[120.5,18.5],[122.5,18],[122,14],[124,13],[123.5,10],[122,7],[126,6.5],[126,9.5],[124.5,12.5],[123.5,14],[121.5,14.5],[120,16]],
   [[166.5,-46],[171,-44],[173,-41],[174.5,-41.5],[172,-43.5],[169,-46.5]],
   [[172.7,-34.5],[175,-36.8],[178,-37.6],[176.5,-39.5],[174.8,-41.3],[174.6,-39],[174,-37]],
   [[-24,65.5],[-18,66.2],[-13.6,65.2],[-18,63.4],[-22.5,63.8]],
   [[-156,20.2],[-155.1,19.9],[-154.8,19.5],[-155.7,18.9],[-156,19.7]]
  ];
  const D2R = Math.PI / 180;
  const dense = LAND.map(poly => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.5)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out; });
  const C = {
    kona: ["Kona", -155.99, 19.64], la: ["Los Angeles", -118.24, 34.05], lis: ["Lisbonne", -9.14, 38.72], par: ["Paris", 2.35, 48.86], seo: ["Séoul", 126.98, 37.57], tok: ["Tokyo", 139.69, 35.69],
    bus: ["Busan", 129.07, 35.18], jej: ["Jeju", 126.53, 33.5], osa: ["Osaka", 135.5, 34.69], tai: ["Taipei", 121.56, 25.03], bkk: ["Bangkok", 100.5, 13.75]
  };
  const STEPS = ["On cherche les lieux de tes idols…", "On déplie la carte…", "On place les repères…", "Presque prêt !"];
  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

  function project(lon, lat, l0, p0) {
    const l = (lon - l0) * D2R, f = lat * D2R, f0 = p0 * D2R;
    return [Math.cos(f) * Math.sin(l), -(Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l)), Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l)];
  }

  // Dessin du globe minimaliste : continents + méridiens/parallèles + arcs de vol
  // (Lisbonne → Paris → Séoul → Tokyo, en écho au parcours réel du site) + quelques
  // villes qui s'allument au fil de la progression.
  function drawGlobe(ctx, W, dpr, o) {
    const { l0, p0, scale = 1, cities = [], arcs = [], night = null, now } = o;
    const cx = W / 2, cy = W / 2, r = W * .43 * scale;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, W);
    let g = ctx.createRadialGradient(cx, cy, r * .9, cx, cy, r * 1.18); g.addColorStop(0, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, 7); ctx.fill();
    g = ctx.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r); g.addColorStop(0, "#F4F0FC"); g.addColorStop(.55, "#DFD6F4"); g.addColorStop(1, "#C9BBEA");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = .8;
    const line = (fn, a, b, st) => { ctx.beginPath(); let pen = false; for (let v = a; v <= b; v += st) { const [x, y, c] = fn(v); if (c > 0) { pen ? ctx.lineTo(cx + x * r, cy + y * r) : ctx.moveTo(cx + x * r, cy + y * r); pen = true; } else pen = false; } ctx.stroke(); };
    for (let lon = -180; lon < 180; lon += 30) line(v => project(lon, v, l0, p0), -90, 90, 4);
    for (let lat = -60; lat <= 60; lat += 30) line(v => project(v, lat, l0, p0), -180, 180, 4);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(150,125,200,.45)"; ctx.lineWidth = .9; ctx.lineJoin = "round";
    dense.forEach(poly => {
      let any = false; const pts = poly.map(([lo, la]) => { const [x, y, c] = project(lo, la, l0, p0); if (c > 0) { any = true; return [x, y]; } const m = Math.hypot(x, y) || 1; return [x / m, y / m]; });
      if (!any) return; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * r, cy + y * r) : ctx.moveTo(cx + x * r, cy + y * r)); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    if (night != null) {
      const [nx, ny, nc] = project(night, 0, l0, p0);
      const ang = Math.atan2(ny, nx), dx = Math.cos(ang), dy = Math.sin(ang), off = nc * r;
      g = ctx.createLinearGradient(cx + dx * (off - r * .15), cy + dy * (off - r * .15), cx + dx * (off + r * .25), cy + dy * (off + r * .25));
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(55,35,105,.42)");
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    g = ctx.createRadialGradient(cx - r * .45, cy - r * .5, r * .2, cx, cy, r * 1.05); g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(.6, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(70,45,120,.22)");
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    arcs.forEach(([A, B, t]) => {
      if (t <= 0) return; const pts = []; const N = 40;
      const v = (lo, la) => [Math.cos(la * D2R) * Math.cos(lo * D2R), Math.cos(la * D2R) * Math.sin(lo * D2R), Math.sin(la * D2R)];
      const a = v(A[1], A[2]), b = v(B[1], B[2]); const om = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      for (let i = 0; i <= N * Math.min(1, t); i++) {
        const s = i / N, k1 = Math.sin((1 - s) * om) / Math.sin(om), k2 = Math.sin(s * om) / Math.sin(om);
        const P = [k1 * a[0] + k2 * b[0], k1 * a[1] + k2 * b[1], k1 * a[2] + k2 * b[2]]; const lift = 1 + .12 * Math.sin(Math.PI * s);
        const lat = Math.asin(P[2]) / D2R, lon = Math.atan2(P[1], P[0]) / D2R; const [x, y, c] = project(lon, lat, l0, p0); pts.push([x * lift, y * lift, c]);
      }
      ctx.strokeStyle = "#D42759"; ctx.lineWidth = 1.8; ctx.setLineDash([3, 4]); ctx.beginPath();
      pts.forEach(([x, y, c], i) => { if (c < -.1) return; i ? ctx.lineTo(cx + x * r, cy + y * r) : ctx.moveTo(cx + x * r, cy + y * r); }); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    ctx.strokeStyle = "rgba(160,140,210,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    cities.forEach(([city, alpha, side, dy, glow]) => {
      const [n, lo, la] = city; const [x, y, c] = project(lo, la, l0, p0); if (c <= .12 || alpha <= 0) return;
      const X = cx + x * r, Y = cy + y * r, a = Math.min(1, (c - .12) / .25) * alpha; ctx.globalAlpha = a;
      const ph = (now / 1000) % 1.6 / 1.6;
      if (glow) { const gg = ctx.createRadialGradient(X, Y, 0, X, Y, 16); gg.addColorStop(0, "rgba(255,214,120,.9)"); gg.addColorStop(1, "rgba(255,214,120,0)"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X, Y, 16, 0, 7); ctx.fill(); }
      ctx.fillStyle = `rgba(212,39,89,${.35 * (1 - ph)})`; ctx.beginPath(); ctx.arc(X, Y, 4 + ph * 10, 0, 7); ctx.fill();
      ctx.fillStyle = "#D42759"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X, Y, 4, 0, 7); ctx.fill(); ctx.stroke();
      if (c > .45 && side) {
        ctx.font = "700 10px Poppins,system-ui,sans-serif"; const tw = ctx.measureText(n).width + 14; let lx = side === "l" ? X - tw - 8 : X + 8; if (lx < 2) lx = X + 8; if (lx + tw > W - 2) lx = X - tw - 8; const ly = Y - 8.5 + (dy || 0) * 13;
        ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, tw, 17, 8.5) : ctx.rect(lx, ly, tw, 17); ctx.fill(); ctx.fillStyle = "#212832"; ctx.fillText(n, lx + 7, ly + 12);
      }
      ctx.globalAlpha = 1;
    });
  }

  const el = document.getElementById("stsl"), cv = document.getElementById("stslGlobe"), stage = document.getElementById("stslStage"),
    ringEl = document.getElementById("stslRing"), pctEl = document.getElementById("stslPct"), stepEl = document.getElementById("stslStep");
  // Page sans l'écran de chargement (ne devrait pas arriver, mais au cas où ce fichier
  // serait chargé seul quelque part) : API no-op plutôt qu'une erreur JS bloquante.
  if (!el || !cv) { return { progress() {}, done() {}, reset() {} }; }
  const ctx = cv.getContext("2d"), lit = (p, at, dur = .08) => Math.max(0, Math.min(1, (p - at) / dur));
  let W = 0, dpr = 1, prog = 0, shown = 0, raf = 0, t0 = 0, diving = null, lastStep = -1, finished = false;
  function size() { const d = Math.min(innerWidth * .72, innerHeight * .42, 300); stage.style.setProperty("--d", d + "px"); dpr = Math.min(2, devicePixelRatio || 1); W = d; cv.width = cv.height = Math.round(d * dpr); }
  // Rythme : dérive douce qui ralentit d'elle-même (≈8°/s au départ), centrée Europe → Asie
  function state(t, p, now) {
    return {
      l0: 52 + 42 * (1 - Math.exp(-t / 5)), p0: 30, now,
      cities: [[C.lis, lit(p, .02), "l", 1], [C.par, lit(p, .18), "r", -1], [C.seo, lit(p, .55), "l", -1], [C.tok, lit(p, .82), "r", 1]],
      arcs: [[C.lis, C.par, (p - .05) / .13], [C.par, C.seo, (p - .22) / .33], [C.seo, C.tok, (p - .6) / .22]]
    };
  }
  function loop(now) {
    shown += (prog - shown) * .08; if (Math.abs(prog - shown) < .001) shown = prog;
    const v = Math.round(shown * 100); pctEl.textContent = v; el.setAttribute("aria-valuenow", v); ringEl.style.strokeDashoffset = 100 - shown * 100;
    const k = Math.min(STEPS.length - 1, Math.floor(shown * STEPS.length)); if (k !== lastStep) { lastStep = k; stepEl.textContent = STEPS[k]; stepEl.classList.remove("flip"); void stepEl.offsetWidth; stepEl.classList.add("flip"); }
    // BUG corrigé (demande du 07/10/2026, "la partie finale avec le zoom sur la carte...
    // c'est pas assez fluide") : cette boucle continuait à redessiner le globe en canvas
    // à CHAQUE frame pendant toute la transition CSS de zoom (transform:scale), le
    // thread principal redessinant donc en même temps que le compositeur agrandissait
    // l'image — source directe de saccades, surtout sur mobile. Dès que la plongée
    // démarre, on fige la dernière image dessinée (plus aucun appel à drawGlobe, plus
    // aucune frame redemandée) et on laisse la transition CSS (transform + filter, voir
    // .stsl.diving .stsl-stage) tourner seule, sans rien sur le thread principal pour la
    // perturber. Le fondu de sortie (.out) est aussi déclenché un peu APRÈS le début du
    // zoom plutôt qu'en même temps que lui (chevauchement voulu, pas deux étapes qui
    // s'enchaînent) pour que le fond continue de masquer le canvas pixelisé pendant que
    // le flou monte en même temps — avant, le fond restait opaque pendant 900ms puis le
    // canvas se dévoilait déjà bien zoomé/anguleux, ce qui donnait l'impression de
    // saccade décrite.
    if (finished && !diving && shown > .995) {
      diving = now;
      el.classList.add("diving");
      setTimeout(() => { el.classList.add("out"); }, 450);
      setTimeout(() => { document.dispatchEvent(new CustomEvent("stsl:hidden")); }, 1350);
      raf = 0;
      return; // dernière frame avec le globe encore dessiné à l'instant présent — la suite est purement CSS
    }
    drawGlobe(ctx, W, dpr, state((now - t0) / 1000, shown, now));
    raf = requestAnimationFrame(loop);
  }
  function reset() { prog = 0; shown = 0; diving = null; finished = false; lastStep = -1; t0 = performance.now(); el.classList.remove("out", "diving"); size(); if (!raf) raf = requestAnimationFrame(loop); }
  addEventListener("resize", size); reset();
  return { progress(p) { prog = Math.max(prog, Math.min(1, p)); }, done() { prog = 1; finished = true; }, reset };
})();
window.StsLoader = StsLoader;

// ==========================================
// Intégration au vrai chargement de la page (remplace l'ancien hidePageLoader()) : le
// site n'a pas de signal de progression granulaire fiable (pas de compteur "X lieux
// chargés sur Y" exploitable ici), donc la progression affichée est une SIMULATION qui
// avance en ralentissant — exactement le même principe que la jauge de progression de
// YouTube/GitHub pendant un chargement de page classique. done() n'est appelé qu'au
// signal RÉEL de fin de chargement (évènement 'load', tout compris — polices, images) ou
// après 8s au maximum dans tous les cas, pour ne jamais rester bloqué si l'évènement ne
// se déclenche jamais (même filet de sécurité que l'ancien hidePageLoader()).
(function () {
    let finished = false;
    let simulated = 0;
    function tick() {
        if (finished) return;
        simulated = Math.min(0.92, simulated + 0.015 + Math.random() * 0.02);
        StsLoader.progress(simulated);
        setTimeout(tick, 70);
    }
    tick();
    function finish() {
        if (finished) return;
        finished = true;
        StsLoader.done();
    }
    window.addEventListener('load', finish);
    setTimeout(finish, 8000);
    // Retire l'élément du DOM une fois le fondu terminé (dispatché par StsLoader lui-même
    // dans loop() ci-dessus) — même principe que el.remove() dans l'ancien
    // hidePageLoader(), pour ne jamais laisser une couche plein écran inerte derrière.
    document.addEventListener('stsl:hidden', function () {
        const el = document.getElementById('stsl');
        if (el) el.remove();
    });
})();
