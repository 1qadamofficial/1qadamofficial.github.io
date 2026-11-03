/* 1QADAM — QR беттерінің логикасы. Баптаулар config.js файлында. */
(function () {
  var C = window.CONFIG || {};
  var QR = C.qr || {}, K = C.contact || {}, B = C.brand || {}, WEEKS = (C.weeks || []).map(function (w) { return typeof w === "string" ? { name: w } : (w || {}); });
  function $(i) { return document.getElementById(i); }
  function pad(n) { return ("0" + n).slice(-2); }

  var n = parseInt(document.body.getAttribute("data-n"), 10);
  var q = QR[n] || {}, id = pad(n);
  var total = Object.keys(QR).length || 15;
  var isFinal = n > WEEKS.length;
  var weekName = isFinal ? "Финал" : ((WEEKS[n - 1] || {}).name || "");
  var label = isFinal ? "Финалдық бейне" : (n + "-апта" + (weekName ? " · " + weekName : ""));
  var title = q.title || weekName || "Бұл 100 күн сен үшін";

  document.title = "QR " + id + " · " + title + " — 1QADAM";
  $("num").textContent = id;
  $("pos").textContent = "QR " + id + " / " + pad(total);
  $("week").textContent = label;
  $("author").textContent = [B.first, B.last].filter(Boolean).join(" ");
  $("ttl").textContent = title;
  if (B.slogan) $("slogan").textContent = B.slogan + ".";
  if (q.text) { $("quote").textContent = "«" + q.text + "»"; $("quote").hidden = false; }

  /* ---- бейне ---- */
  var box = $("video");
  var post = String(q.telegramPost || "").replace(/^https?:\/\/t\.me\//, "").replace(/^\/+/, "");
  if (q.enabled && post) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-post", post);
    s.setAttribute("data-width", "100%");
    s.setAttribute("data-userpic", "false");
    box.appendChild(s);
    $("alt").innerHTML = 'Бейне ашылмаса: <a href="https://t.me/' + post + '" target="_blank" rel="noopener">Telegram-да көру</a>';
    var done = function () { box.classList.add("ready"); };
    var watch = new MutationObserver(function () {
      var f = box.querySelector("iframe");
      if (f) { watch.disconnect(); f.addEventListener("load", done); setTimeout(done, 4000); }
    });
    watch.observe(box, { childList: true, subtree: true });
    setTimeout(function () {
      if (!box.classList.contains("ready")) { done(); if (!box.querySelector("iframe")) showSoon(true); }
    }, 10000);
  } else {
    showSoon(false);
  }

  function showSoon(failed) {
    box.classList.add("ready");
    var tg = K.telegram ? '<a href="' + K.telegram + '" target="_blank" rel="noopener">Telegram арнаға жазылу</a>' : "";
    box.innerHTML =
      '<div class="soon">' +
      '<span class="soon-badge">' + (failed ? "Байланыс әлсіз" : "Жақында") + '</span>' +
      '<h2>' + (failed ? "Бейне жүктелмеді" : "Бұл бейне дайындалып жатыр") + '</h2>' +
      '<p>' + (failed
        ? "Интернетті тексеріп, бетті жаңарт. Немесе бейнені Telegram арнасынан көр."
        : "Аптаң жалғаса берсін. Бейне шыққанда дәл осы QR-код оны ашады — кейін қайта сканерле.") + '</p>' +
      tg + '</div>';
    if (!failed) $("alt").textContent = "";
  }

  /* ---- навигация ---- */
  var next = $("next"), prev = $("prev");
  if (n < total) { next.href = "../" + pad(n + 1) + "/"; next.textContent = "Келесі QR →"; }
  else { next.href = "../../"; next.textContent = "Басты бет"; }
  if (n > 1) { prev.href = "../" + pad(n - 1) + "/"; prev.hidden = false; }

  /* ---- желілер ---- */
  var wa = K.whatsappNumber ? "https://wa.me/" + String(K.whatsappNumber).replace(/\D/g, "") : "";
  [["ig", K.instagram], ["tt", K.tiktok], ["tg", K.telegram], ["wa", wa]].forEach(function (p) {
    var a = $(p[0]);
    if (p[1]) a.href = p[1]; else a.parentNode.style.display = "none";
  });
})();
