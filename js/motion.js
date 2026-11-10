/* 1QADAM — қозғалыс қабаты. Стильдер: css/motion.css.
   Motionsites Academy сабақтарындағы тәсілдер (кезекпен шығу, параллакс,
   курсорға еретін сурет, шыны мәзір) React-сыз, таза JS-пен бейімделді. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;
  root.classList.add("mo");
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---- hero тақырыбын жолдарға бөлу ---- */
  var h1 = document.querySelector(".hero h1");
  if (h1) {
    h1.innerHTML = h1.innerHTML.split(/<br\s*\/?>/i).map(function (l, i) {
      return '<span class="ln"><span style="--d:' + i + '">' + l.trim() + "</span></span>";
    }).join("");
  }
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("ready"); }); });

  /* ---- кезекпен шығатын блоктар ---- */
  var groups = [
    ".stats > div", ".pull blockquote, .pull figcaption", ".sec-head > *", ".parts > li",
    ".feature-band > *", ".stages > li", ".author > *", ".facts > li", ".qr-grid > div > *",
    ".order > * > *", ".faq > *", ".contacts > li"
  ];
  var items = [];
  groups.forEach(function (g) {
    var count = [];
    $$(g).forEach(function (el) {
      if (el.closest(".hero, .shelf, .rv, .qr-phone")) return;
      var p = el.parentNode, k = count.indexOf(p), n = 0;
      if (k < 0) { count.push(p, 1); } else { n = count[k + 1]; count[k + 1] = n + 1; }
      el.classList.add("rv");
      el.style.setProperty("--d", Math.min(n, 6));
      items.push(el);
    });
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
      if (e.target.matches(".stats > div")) countUp(e.target.querySelector("dd"));
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });

  /* ---- сандар 0-ден санап шығады (тек жай сан тұрған ұяшықтар) ---- */
  function countUp(dd) {
    if (!dd || dd.children.length) return;
    var target = parseInt(dd.textContent.replace(/\D/g, ""), 10);
    if (!target) return;
    var t0 = null, dur = 1200;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      dd.textContent = Math.round(target * e);
      if (k < 1) requestAnimationFrame(step);
    }
    dd.textContent = "0";
    requestAnimationFrame(step);
  }

  /* ---- телефон мәзірі сілтемелеріне реттік нөмір ---- */
  $$("#navLinks a").forEach(function (a, i) { a.style.setProperty("--i", i); });

  /* ---- hero: параллакс (скролл) + курсорға ілесу (тек тышқан бар құрылғыда) ---- */
  var art = document.querySelector(".hero-art"), hero = document.querySelector(".hero");
  if (!art || !hero) return;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, csy = 0, running = false, visible = true;
  function tick() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; csy += (sy - csy) * 0.12;
    art.style.setProperty("--px", cx.toFixed(4));
    art.style.setProperty("--py", cy.toFixed(4));
    art.style.setProperty("--sy", csy.toFixed(4));
    if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(sy - csy) > 0.001) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() { if (!running && visible) { running = true; requestAnimationFrame(tick); } }
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
  window.addEventListener("scroll", function () {
    if (!visible) return;
    sy = Math.max(0, Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight)));
    kick();
  }, { passive: true });
  if (fine) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    });
    hero.addEventListener("mouseleave", function () { tx = 0; ty = 0; kick(); });
  }
})();
