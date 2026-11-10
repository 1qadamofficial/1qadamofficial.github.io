/* 1QADAM — «Беттерден үлгі» сөресі.
   Күнделік беттері сөреде түбімен тұрады; ортадағы бет 3D бұрылып, бетін көрсетеді.
   Деректер: config.js → pages. */
(function () {
  var C = window.CONFIG || {};
  var PAGES = C.pages || [];
  var root = document.getElementById("pagesShelf");
  if (!root || !PAGES.length) return;

  var N = PAGES.length, COPIES = 3, TOTAL = N * COPIES;
  var PART = { start: "Бастау", weeks: "14 апта", final: "Финал" };
  var IMG = "assets/images/pages/";
  var TILT_Z = -4;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(pointer: fine)").matches;
  var EASE = "cubic-bezier(.2,.8,.2,1)", SHEET_EASE = "cubic-bezier(.76,0,.18,1)";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return ("0" + n).slice(-2); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function smooth(x) { return x * x * (3 - 2 * x); }
  function B(r) { return Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : (r > 0 ? .5 : -.5); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var view = $(".shelf-view", root), stage = $(".shelf-stage", root);
  var openBtn = $(".shelf-open", root), cursor = $(".shelf-cursor", root);
  var capT = $(".cap-title", root), capS = $(".cap-sub", root), capG = $(".cap-tag", root);
  var tabs = $$(".shelf-tabs button", root), ind = $(".shelf-ind", root);

  /* ---- беттерді салу (3 көшірме: шексіз сөре) ---- */
  var tapes = [], imgs = [];
  for (var v = 0; v < TOTAL; v++) {
    var p = PAGES[v % N];
    var t = el("div", "pg");
    t.setAttribute("aria-hidden", "true");
    var sp = el("div", "sp p-" + (p.part || "start"));
    sp.appendChild(el("b", null, pad(v % N + 1)));
    sp.appendChild(el("span", null, p.title));
    sp.appendChild(el("i", null, "1Q"));
    var cv = el("div", "cv");
    var im = el("img"); im.alt = ""; im.decoding = "async"; im.setAttribute("data-src", IMG + p.img);
    im.width = 819; im.height = 1158;
    cv.appendChild(im); imgs.push(im);
    t.appendChild(sp); t.appendChild(cv);
    t._v = v; t._sp = sp; t._cv = cv; t._lift = 0; t._liftT = 0; t._vis = true;
    stage.appendChild(t); tapes.push(t);
  }
  var loaded = false;
  function loadImgs() { if (loaded) return; loaded = true; imgs.forEach(function (i) { i.src = i.getAttribute("data-src"); }); }

  /* ---- өлшемдер ---- */
  var H, ws, d, gap, W, VH;
  var probe = el("div"); probe.style.cssText = "position:absolute;visibility:hidden;height:var(--H);width:1px;top:0;left:0";
  root.appendChild(probe);
  function measure() {
    H = probe.getBoundingClientRect().height || 400;
    ws = H * 0.13; d = H * 819 / 1158; gap = H * 0.03;
    W = root.clientWidth; VH = view.clientHeight;
    stage.style.setProperty("--ws", ws + "px");
    stage.style.setProperty("--d", d + "px");
    // «Ашу» шеңбері — ашық беттің төменгі сол жақ бұрышында
    openBtn.style.left = (W / 2 - d / 2 - 4) + "px";
    openBtn.style.top = (view.offsetTop + VH / 2 + H * .36) + "px";
    placeInd();
  }

  /* ---- күй ---- */
  var start = 0;
  var s = start + N, T = s, active = -1, activeV = start + N;
  var mx = -1e4, my = -1e4, cx = -1e4, cy = -1e4, tiltX = 0, tiltY = 0, onCover = false, isOpen = false;
  var dragging = false, down = null, suppress = false, wheelTimer = 0, inside = false, visible = false;

  /* ---- жазу (caption) ---- */
  function swap(box, text, dir) {
    if (reduce || !box.animate) { box.textContent = ""; box.appendChild(el("span", null, text)); return; }
    var olds = $$("span", box).filter(function (x) { return !x._leaving; });
    var n = el("span", null, text); box.appendChild(n);
    var o = { duration: 650, easing: EASE, fill: "both" };
    n.animate([{ transform: "translateY(" + dir * 105 + "%)" }, { transform: "translateY(0)" }], o);
    olds.forEach(function (x) {
      x._leaving = true;
      var cur = getComputedStyle(x).transform; if (!cur || cur === "none") cur = "translateY(0)";
      x.animate([{ transform: cur }, { transform: "translateY(" + -dir * 105 + "%)" }], o).onfinish = function () { x.remove(); };
    });
  }
  function setActive(i, dir) {
    if (i === active) return;
    active = i;
    var p = PAGES[i];
    swap(capT, p.title, dir);
    swap(capS, (PART[p.part] || "") + " · " + p.page + "-бет", dir);
    swap(capG, p.tag || "", dir);
    placeInd();
  }
  function placeInd() {
    if (active < 0) return;
    var part = PAGES[active].part, on = null;
    tabs.forEach(function (b) { var m = b.getAttribute("data-part") === part; b.classList.toggle("on", m); if (m) on = b; });
    if (on) { ind.style.width = on.offsetWidth + "px"; ind.style.transform = "translateX(" + on.offsetLeft + "px)"; }
  }

  /* ---- кадр ---- */
  var last = 0, raf = 0;
  function frame(now) {
    raf = 0;
    var dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    var k = reduce ? 1e3 : (dragging ? 18 : 5.2);
    s += (T - s) * (1 - Math.exp(-k * dt));
    if (Math.abs(T - s) < 1e-4) s = T;
    if (Math.abs(s) > TOTAL * 4) { var sh = Math.round(s / TOTAL) * TOTAL; s -= sh; T -= sh; }
    var ai = mod(Math.round(s), N);
    if (ai !== active) setActive(ai, T - s >= 0 ? 1 : -1);

    // курсор беттің үстінде ме?
    var rect = view.getBoundingClientRect(), midX = rect.left + W / 2, midY = rect.top + VH / 2;
    onCover = inside && !isOpen && Math.abs(mx - midX) < .55 * d && Math.abs(my - midY) < .55 * H && Math.abs(T - s) < .3;
    var tyT = onCover ? (mx - midX) / (.55 * d) * 9 : (inside ? (mx - midX) / W * 5 : 0);
    var txT = onCover ? -(my - midY) / (H / 2) * 6 : 0;
    var e7 = reduce ? 1 : 1 - Math.exp(-7 * dt);
    tiltY += (tyT - tiltY) * e7; tiltX += (txT - tiltX) * e7;

    var lim = W / 2 + 1.5 * d, e12 = reduce ? 1 : 1 - Math.exp(-12 * dt), best = 1e9;
    for (var j = 0; j < TOTAL; j++) {
      var t = tapes[j];
      var r = mod(t._v - s + TOTAL / 2, TOTAL) - TOTAL / 2;
      var x = r * (ws + gap) + (d - ws + 1.6 * gap) * B(r);
      if (Math.abs(x) > lim) { if (t._vis) { t.style.visibility = "hidden"; t._vis = false; } continue; }
      if (!t._vis) { t.style.visibility = ""; t._vis = true; }
      if (Math.abs(r) < best) { best = Math.abs(r); activeV = t._v; }
      var o = smooth(Math.max(0, 1 - Math.abs(r)));
      t._lift += (t._liftT - t._lift) * e12;
      var y = -o * .025 * H - t._lift * .045 * H, z = o * .2 * H;
      t.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px," + z.toFixed(2) + "px) rotateZ(" + (TILT_Z * o).toFixed(3) + "deg) rotateX(" + (tiltX * o).toFixed(3) + "deg) rotateY(" + (-90 * o + tiltY * o).toFixed(3) + "deg)";
      t.style.zIndex = Math.round(100 - Math.abs(r) * 4);
      t._sp.style.setProperty("--shade", (o * .55).toFixed(3));
      t._cv.style.setProperty("--shade", ((1 - o) * .5).toFixed(3));
    }

    var ps = isOpen ? 0 : smooth(Math.max(0, 1 - Math.abs(T - s) * 3));
    openBtn.style.transform = "scale(" + ps.toFixed(3) + ")";
    openBtn.tabIndex = ps > .5 ? 0 : -1;

    if (cursor && inside) {
      var e16 = 1 - Math.exp(-16 * dt);
      if (cx < -1e3) { cx = mx; cy = my; }
      cx += (mx - cx) * e16; cy += (my - cy) * e16;
      cursor.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      cursor.classList.toggle("open", onCover);
    }
    if (visible || Math.abs(T - s) > 1e-4) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

  /* ---- басқару ---- */
  function go(target) { T = target; kick(); }
  function step(n) { go(Math.round(T) + n); }
  function jumpTo(i) {
    var cur = mod(Math.round(T), N);
    var delta = mod(i - cur + N / 2, N) - N / 2;
    if (N % 2 === 0 && delta === -N / 2) delta = N / 2;
    go(Math.round(T) + Math.round(delta));
  }
  $(".shelf-arr.prev", root).addEventListener("click", function () { step(-1); });
  $(".shelf-arr.next", root).addEventListener("click", function () { step(1); });
  tabs.forEach(function (b) {
    b.addEventListener("click", function () {
      var part = b.getAttribute("data-part"), idx = 0;
      if (part !== "all") for (var i = 0; i < N; i++) if (PAGES[i].part === part) { idx = i; break; }
      jumpTo(idx);
    });
  });
  openBtn.addEventListener("click", function () { openDetail(); });

  tapes.forEach(function (t) {
    t.addEventListener("pointerenter", function () {
      var r = mod(t._v - s + TOTAL / 2, TOTAL) - TOTAL / 2;
      t._liftT = Math.abs(r) > .5 ? 1 : 0;
      if (cursor) cursor.classList.toggle("spine", Math.abs(r) > .5);
      kick();
    });
    t.addEventListener("pointerleave", function () { t._liftT = 0; if (cursor) cursor.classList.remove("spine"); kick(); });
    t.addEventListener("click", function () {
      if (suppress) { suppress = false; return; }
      var r = mod(t._v - s + TOTAL / 2, TOTAL) - TOTAL / 2;
      if (Math.abs(r) < .5) openDetail(); else go(Math.round(T + r));
    });
  });

  view.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(); }
  });

  // Тек көлденең айналдыру (тачпад немесе Shift + доңғалақ) — бетті тік айналдыруға кедергі жоқ.
  view.addEventListener("wheel", function (e) {
    if (isOpen) return;
    var dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY) || !dx) return;
    e.preventDefault();
    T += dx / (ws + gap) * .5; kick();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { go(Math.round(T)); }, 160);
  }, { passive: false });

  view.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    down = { x: e.clientX, T: T, id: e.pointerId };
  });
  view.addEventListener("pointermove", function (e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x;
    if (!dragging && Math.abs(dx) > 5) { dragging = true; try { view.setPointerCapture(e.pointerId); } catch (_) {} }
    if (dragging) { T = down.T - dx / (ws + gap); kick(); }
  });
  function endDrag() {
    if (dragging) { suppress = true; setTimeout(function () { suppress = false; }, 0); go(Math.round(T)); }
    dragging = false; down = null;
  }
  view.addEventListener("pointerup", endDrag);
  view.addEventListener("pointercancel", endDrag);

  /* ---- курсор: тек тышқанмен және тек осы бөлімде ---- */
  if (fine && cursor) {
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      if (!inside) { inside = true; cx = -1e4; root.classList.add("cur"); }
      var b = e.target.closest && e.target.closest("button,a");
      cursor.classList.toggle("btn", !!b);
      kick();
    });
    root.addEventListener("pointerleave", function () {
      inside = false; mx = my = -1e4; root.classList.remove("cur"); cursor.className = "shelf-cursor"; kick();
    });
  } else if (cursor) { cursor.remove(); cursor = null; }

  /* ---- бет туралы ақпарат: қағаз беттен өсіп шығады ---- */
  var dlg = document.getElementById("pgDetail");
  var dTitle = $(".pgd-title", dlg), dSub = $(".pgd-sub", dlg), dMeta = $(".pgd-meta", dlg), dDesc = $(".pgd-desc", dlg);
  var dQuote = $(".pgd-quote", dlg), dFill = $(".pgd-fill", dlg), dCount = $(".pgd-count", dlg);
  var dImg = $("#pgdImg"), blobs = $$("#pgdInk circle"), lines = $$(".pgd-text .m > *", dlg);
  var closeBtn = $(".pgd-close", dlg), zoomBtn = $(".pgd-zoom", dlg), orderBtn = $(".pgd-order", dlg);
  var BLOB_DELAY = [0, 120, 220, 300, 360, 420, 180];
  var anims = [], inkRaf = 0, lastFocus = null;

  function coverRect() {
    var t = tapes[activeV]; var r = t._cv.getBoundingClientRect();
    if (!r.width) { var vr = view.getBoundingClientRect(); return { left: vr.left + W / 2 - d / 2, top: vr.top + VH / 2 - H / 2, width: d, height: H }; }
    return r;
  }
  function insetOf(r) {
    var iw = innerWidth, ih = innerHeight;
    return "inset(" + Math.max(0, r.top) + "px " + Math.max(0, iw - r.right) + "px " + Math.max(0, ih - r.bottom) + "px " + Math.max(0, r.left) + "px round 4px)";
  }
  function ink(t0) {
    var dur = 1250;
    (function tick(now) {
      var el_ = now - t0, done = true;
      blobs.forEach(function (c, i) {
        var p = Math.min(1, Math.max(0, (el_ - BLOB_DELAY[i]) / dur));
        if (p < 1) done = false;
        c.setAttribute("r", (1 - Math.pow(1 - p, 3)) * 1300);
      });
      inkRaf = done ? 0 : requestAnimationFrame(tick);
    })(t0);
  }
  function openDetail() {
    if (isOpen) return;
    loadImgs();
    T = Math.round(T); kick();
    var i = mod(Math.round(T), N), p = PAGES[i];
    isOpen = true; lastFocus = document.activeElement;
    dTitle.textContent = p.title;
    dSub.textContent = (PART[p.part] || "") + " · " + p.page + "-бет";
    dMeta.textContent = (p.tag || "");
    dDesc.textContent = p.text || "";
    dQuote.textContent = p.quote ? "«" + p.quote.replace(/^«|»$/g, "") + "»" : "";
    dFill.textContent = "";
    (p.fill || []).forEach(function (f) { dFill.appendChild(el("li", null, f)); });
    $(".pgd-fill-wrap", dlg).hidden = !(p.fill && p.fill.length);
    dCount.textContent = pad(i + 1) + " / " + pad(N);
    dImg.setAttribute("href", IMG + p.img);
    zoomBtn.setAttribute("data-src", IMG + p.img);
    zoomBtn.setAttribute("data-alt", "«" + p.title + "» беті");
    blobs.forEach(function (c) { c.setAttribute("r", 0); });

    var r = coverRect();
    dlg.style.transformOrigin = (r.left + r.width / 2) + "px " + (r.top + r.height / 2) + "px";
    dlg.classList.add("show"); dlg.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("pgd-lock");
    dlg.scrollTop = 0;
    if (cursor) { root.classList.remove("cur"); cursor.className = "shelf-cursor"; }
    anims.forEach(function (a) { a.cancel(); }); anims = [];
    var q = reduce ? 1 : 1050;
    if (dlg.animate) {
      anims.push(dlg.animate([
        { clipPath: insetOf(r), transform: "rotate(" + TILT_Z + "deg)" },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", transform: "rotate(0deg)" }
      ], { duration: q, easing: SHEET_EASE, fill: "both" }));
      lines.forEach(function (ln, k) {
        anims.push(ln.animate([{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
          { duration: reduce ? 1 : 900, delay: reduce ? 0 : 620 + k * 75, easing: EASE, fill: "both" }));
      });
    }
    var t0 = performance.now() + (reduce ? -5000 : 520);
    cancelAnimationFrame(inkRaf);
    setTimeout(function () { ink(t0); }, reduce ? 0 : 520);
    setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, reduce ? 0 : 400);
  }
  function closeDetail(after) {
    if (!isOpen) return;
    var r = coverRect();
    var finish = function () {
      dlg.classList.remove("show"); dlg.setAttribute("aria-hidden", "true");
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      document.documentElement.classList.remove("pgd-lock");
      isOpen = false; kick();
      if (typeof after === "function") after();
      else if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (!dlg.animate || reduce) return finish();
    var a = dlg.animate([
      { clipPath: "inset(0px 0px 0px 0px round 0px)", transform: "rotate(0deg)" },
      { clipPath: insetOf(r), transform: "rotate(" + TILT_Z + "deg)" }
    ], { duration: 850, easing: SHEET_EASE, fill: "both" });
    anims.push(a); a.onfinish = finish;
  }
  closeBtn.addEventListener("click", function () { closeDetail(); });
  orderBtn.addEventListener("click", function (e) {
    e.preventDefault();
    closeDetail(function () { var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });
  });
  zoomBtn.addEventListener("click", function () {
    var v = document.getElementById("viewer"), vi = document.getElementById("viewerImg");
    if (v && typeof v.showModal === "function") { vi.src = zoomBtn.getAttribute("data-src"); vi.alt = zoomBtn.getAttribute("data-alt"); v.showModal(); }
    else window.open(zoomBtn.getAttribute("data-src"), "_blank", "noopener");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !isOpen) return;
    var v = document.getElementById("viewer"); if (v && v.open) return;
    closeDetail();
  });
  // фокусты диалог ішінде ұстау
  dlg.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = $$("button,a[href]", dlg).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });

  /* ---- іске қосу ---- */
  measure();
  setActive(start, 1);
  window.addEventListener("resize", function () { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) loadImgs(); });
    }, { rootMargin: "800px 0px" }).observe(root);
    new IntersectionObserver(function (en) {
      en.forEach(function (x) { visible = x.isIntersecting; if (visible) kick(); });
    }).observe(root);
  } else { loadImgs(); visible = true; }
  kick();
})();
