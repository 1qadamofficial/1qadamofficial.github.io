/* 1QADAM — негізгі беттің логикасы. Баптаулар config.js файлында. */
(function () {
  var C = window.CONFIG || {};
  var P = C.product || {}, O = C.order || {}, K = C.contact || {}, B = C.brand || {};
  var QR = C.qr || {};
  var WEEKS = (C.weeks || []).map(function (w) { return typeof w === "string" ? { name: w } : (w || {}); });
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function fmt(n) { return Number(n || 0).toLocaleString("ru-RU"); }
  function pad(n) { return ("0" + n).slice(-2); }

  /* ---- баға: әдеттегі немесе мерзімді жеңілдік (Қазақстан уақыты, UTC+5) ---- */
  var MONTHS_TO = ["қаңтарға", "ақпанға", "наурызға", "сәуірге", "мамырға", "маусымға", "шілдеге", "тамызға", "қыркүйекке", "қазанға", "қарашаға", "желтоқсанға"];
  var regular = Number(P.price) || 0;
  var S = P.sale || {};
  var salePrice = Number(S.price) || 0;
  var saleOn = false, untilText = "";
  if (salePrice > 0 && salePrice < regular && /^\d{4}-\d{2}-\d{2}$/.test(S.until || "")) {
    var end = new Date(S.until + "T23:59:59+05:00");
    saleOn = !isNaN(end.getTime()) && Date.now() <= end.getTime();
    var up = S.until.split("-");
    untilText = Number(up[2]) + " " + MONTHS_TO[Number(up[1]) - 1] + " дейін";
  }
  var price = saleOn ? salePrice : regular;
  var wa = "https://wa.me/" + String(K.whatsappNumber || "").replace(/\D/g, "");
  var author = [B.first, B.last].filter(Boolean).join(" ");

  /* ---- мәтіндерді толтыру ---- */
  $$("[data-price]").forEach(function (e) { e.textContent = fmt(price); });
  $$("[data-old-price]").forEach(function (e) { e.textContent = fmt(regular) + " ₸"; e.hidden = !saleOn; });
  $$("[data-sale-note]").forEach(function (e) {
    e.textContent = (S.label ? S.label + " · " : "") + untilText;
    e.hidden = !saleOn;
  });
  $$("[data-slogan]").forEach(function (e) { e.textContent = B.slogan || ""; });
  $$("[data-author]").forEach(function (e) { e.textContent = author; });
  $$("[data-qr-count]").forEach(function (e) { e.textContent = Object.keys(QR).length; });
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  var handles = { instagram: K.instagramHandle, tiktok: K.tiktokHandle, telegram: K.telegramName };
  $$("[data-handle]").forEach(function (e) { e.textContent = handles[e.getAttribute("data-handle")] || ""; });
  $$("[data-link]").forEach(function (a) {
    var k = a.getAttribute("data-link");
    var url = k === "whatsapp" ? wa : K[k];
    if (url) a.href = url; else a.parentNode.style.display = "none";
  });

  /* ---- мобильді мәзір ---- */
  var menuBtn = $("#menuBtn"), links = $("#navLinks");
  function closeMenu() { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && links.classList.contains("open")) { closeMenu(); menuBtn.focus(); } });
  }
  var head = $(".site-head");
  function onScroll() { if (head) head.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---- 14 апта ---- */
  var wl = $("#weeks");
  if (wl) {
    var openBtn = null;
    function setOpen(btn) {
      if (openBtn && openBtn !== btn) openBtn.setAttribute("aria-expanded", "false");
      openBtn = btn;
      if (btn) btn.setAttribute("aria-expanded", "true");
    }
    WEEKS.forEach(function (w, i) {
      var li = document.createElement("li");
      if (i === WEEKS.length - 1) li.className = "final";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "wk";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-describedby", "wk-goal-" + (i + 1));
      btn.innerHTML = "<b>" + pad(i + 1) + "</b>";
      var t = document.createElement("span"); t.className = "wk-t";
      t.appendChild(document.createTextNode(w.name || ""));
      if (w.days) { var d = document.createElement("i"); d.textContent = w.days + " күн"; t.appendChild(d); }
      btn.appendChild(t);
      li.appendChild(btn);
      if (w.goal) {
        var g = document.createElement("div");
        g.className = "goal"; g.id = "wk-goal-" + (i + 1); g.setAttribute("role", "tooltip");
        g.innerHTML = "<em>Апта мақсаты</em>";
        g.appendChild(document.createTextNode(w.goal));
        li.appendChild(g);
      }
      btn.addEventListener("click", function () {
        setOpen(btn.getAttribute("aria-expanded") === "true" ? (btn.setAttribute("aria-expanded", "false"), null) : btn);
      });
      wl.appendChild(li);
    });
    document.addEventListener("click", function (e) { if (openBtn && !wl.contains(e.target)) { openBtn.setAttribute("aria-expanded", "false"); openBtn = null; } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openBtn) { openBtn.setAttribute("aria-expanded", "false"); openBtn = null; } });
  }

  /* ---- QR чиптері ---- */
  var chips = $("#chips");
  if (chips) {
    Object.keys(QR).sort(function (a, b) { return a - b; }).forEach(function (n) {
      var q = QR[n], id = pad(n), li = document.createElement("li"), el;
      var isFinal = Number(n) > WEEKS.length;
      var label = isFinal ? "Финал" : (n + "-апта" + (WEEKS[n - 1] && WEEKS[n - 1].name ? ": " + WEEKS[n - 1].name : ""));
      if (q.enabled) {
        el = document.createElement("a");
        el.href = "qr/" + id + "/";
        el.setAttribute("aria-label", "QR " + id + " — " + label);
      } else {
        el = document.createElement("span");
        el.setAttribute("aria-label", "QR " + id + " — жақында");
        el.title = "Жақында";
      }
      el.className = "chip" + (isFinal ? " final" : "") + (q.enabled ? "" : " off");
      el.textContent = id;
      li.appendChild(el); chips.appendChild(li);
    });
  }

  /* ---- суретті үлкейту ---- */
  var dlg = $("#viewer"), dImg = $("#viewerImg");
  $$(".zoom").forEach(function (b) {
    b.addEventListener("click", function () {
      var src = b.getAttribute("data-src"), alt = b.getAttribute("data-alt") || "";
      if (dlg && typeof dlg.showModal === "function") {
        dImg.src = src; dImg.alt = alt; dlg.showModal();
      } else { window.open(src, "_blank", "noopener"); }
    });
  });
  if (dlg) {
    $("#viewerClose").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---- тапсырыс формасы ---- */
  var form = $("#orderForm");
  if (!form) return;
  var qSel = $("#q"), total = $("#total"), note = $("#orderNote");
  var max = Math.max(1, Math.min(20, Number(P.maxQuantity) || 5));
  for (var i = 1; i <= max; i++) {
    var o = document.createElement("option"); o.value = i; o.textContent = i + " дана"; qSel.appendChild(o);
  }
  function updTotal() { total.textContent = "Жалпы: " + fmt(price * Number(qSel.value)) + " ₸"; }
  qSel.addEventListener("change", updTotal); updTotal();
  if (note) note.textContent = O.note || "";

  var availLine = $("#availLine"), heroNote = $(".hero-note");
  if (P.available === false) {
    var msg = P.unavailableText || "Қазір тапсырыс қабылдамаймыз.";
    $("#avail").textContent = msg;
    $("#sendBtn").disabled = true;
    if (availLine) availLine.textContent = "Тапсырыс уақытша тоқтатылған";
    if (heroNote) heroNote.classList.add("off");
  }

  function check(input, errId, text) {
    var ok = input.value.trim().length >= 2;
    input.setAttribute("aria-invalid", ok ? "false" : "true");
    $("#" + errId).textContent = ok ? "" : text;
    return ok;
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (P.available === false) return;
    var n = $("#n"), c = $("#c");
    var okN = check(n, "n-err", "Аты-жөніңді жаз.");
    var okC = check(c, "c-err", "Қала мен мекенжайды жаз.");
    if (!okN || !okC) { (okN ? c : n).focus(); return; }
    var qty = Number(qSel.value);
    var lines = [
      O.messageIntro || "Сәлеметсіз бе! 1QADAM ҰБТ күнделігіне тапсырыс бергім келеді.",
      "",
      "Аты-жөні: " + n.value.trim(),
      "Қала, мекенжай: " + c.value.trim(),
      "Саны: " + qty + " дана",
      "Жалпы сомасы: " + fmt(price * qty) + " ₸"
    ];
    if (saleOn) lines.push("Баға: " + fmt(price) + " ₸ (жеңілдік, " + untilText + ")");
    var m = $("#m").value.trim();
    if (m) lines.push("Тілек: " + m);
    window.open(wa + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
  });
  ["n", "c"].forEach(function (id) {
    $("#" + id).addEventListener("input", function () {
      if (this.getAttribute("aria-invalid") === "true" && this.value.trim().length >= 2) {
        this.setAttribute("aria-invalid", "false"); $("#" + id + "-err").textContent = "";
      }
    });
  });
})();
