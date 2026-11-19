// Written in ES5-friendly style on purpose: older LG TVs ship Chromium 53.
(function () {
  "use strict";

  var SELF_ID = "dev.homeboard.launcher";
  var APP_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
  var WALL_RE = /^[A-Za-z0-9 _.-]{1,80}\.(jpe?g|png|webp)$/i;
  var ICON_RE = /^[a-z0-9-]{1,40}$/;
  var THEMES = ["dark", "light", "auto"];
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 461, ESC: 27 };

  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage");

  // ---------- config (validated, never trusted blindly) ----------

  function str(v, max) {
    return typeof v === "string" ? v.slice(0, max) : "";
  }
  function num(v, min, max) {
    return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : null;
  }
  function appList(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length && out.length < 40; i++) {
      var a = list[i];
      if (a && typeof a.id === "string" && APP_ID_RE.test(a.id)) {
        out.push({
          id: a.id,
          title: str(a.title, 40) || a.id,
          glyph: typeof a.icon === "string" && ICON_RE.test(a.icon) ? a.icon : ""
        });
      }
    }
    return out;
  }

  var raw = window.LAUNCHER_CONFIG || {};
  var rawWeather = raw.weather || {};
  var CFG = {
    city: str(rawWeather.city, 40),
    lat: num(rawWeather.latitude, -90, 90),
    lon: num(rawWeather.longitude, -180, 180),
    units: rawWeather.units === "celsius" ? "celsius" : "fahrenheit",
    clock24h: raw.clock24h === true,
    motion: raw.motion !== false,
    theme: THEMES.indexOf(raw.theme) >= 0 ? raw.theme : "dark",
    ambientMs: (num(raw.ambientMinutes, 0, 120) || 0) * 60000,
    wallpapers: (Array.isArray(raw.wallpapers) ? raw.wallpapers : [])
      .concat(Array.isArray(window.LAUNCHER_WALLPAPERS) ? window.LAUNCHER_WALLPAPERS : []).filter(function (w) {
      return typeof w === "string" && WALL_RE.test(w);
    }).slice(0, 100),
    wallpaperMs: (num(raw.wallpaperSeconds, 10, 86400) || 60) * 1000,
    slideMs: (num(raw.slideshowSeconds, 4, 3600) || 12) * 1000,
    apps: appList(raw.apps),
    inputs: appList(raw.inputs)
  };

  // ---------- storage (optional convenience only) ----------

  function load(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  // ---------- webOS Luna bridge ----------

  var Luna = (function () {
    var available = typeof window.PalmServiceBridge === "function" ||
      typeof window.PalmServiceBridge === "object";
    var live = [];

    function call(uri, params) {
      return new Promise(function (resolve, reject) {
        if (!available) { reject(new Error("not-on-tv")); return; }
        var bridge = new window.PalmServiceBridge();
        var settled = false;
        live.push(bridge);

        function finish(err, res) {
          if (settled) return;
          settled = true;
          var i = live.indexOf(bridge);
          if (i >= 0) live.splice(i, 1);
          if (err) reject(err); else resolve(res);
        }

        var timer = setTimeout(function () { finish(new Error("timeout")); }, 8000);
        bridge.onservicecallback = function (msg) {
          clearTimeout(timer);
          var res;
          try { res = JSON.parse(msg); } catch (e) { finish(new Error("bad-response")); return; }
          if (!res || res.returnValue === false) finish(new Error((res && res.errorText) || "luna-error"));
          else finish(null, res);
        };
        bridge.call(uri, JSON.stringify(params || {}));
      });
    }

    return { available: available, call: call };
  })();

  // ---------- toast ----------

  var toastEl = $("toast");
  var toastTimer = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2600);
  }

  // ---------- launching ----------

  function launch(app) {
    if (!app || !APP_ID_RE.test(app.id)) return;
    if (!Luna.available) {
      toast("Opening " + app.title + " works on the TV only");
      return;
    }
    Luna.call("luna://com.webos.applicationManager/launch", { id: app.id })
      .catch(function () { toast(app.title + " isn't installed or can't be opened"); });
  }

  function openTvSettings() {
    launch({ id: "com.palm.app.settings", title: "Settings" });
  }

  // ---------- installed apps (real icons + full list) ----------

  var installed = null; // id -> { id, title, icon }

  function safeIcon(path) {
    if (typeof path !== "string" || path.length > 512) return "";
    if (/^\/[A-Za-z0-9_\/.+-]+$/.test(path)) return path;
    if (/^file:\/\/\/[A-Za-z0-9_\/.+-]+$/.test(path)) return path;
    return "";
  }

  function loadInstalled() {
    return Luna.call("luna://com.webos.applicationManager/listLaunchPoints", {})
      .then(function (res) {
        var map = {};
        var points = Array.isArray(res.launchPoints) ? res.launchPoints : [];
        points.forEach(function (p) {
          if (!p || typeof p.id !== "string" || !APP_ID_RE.test(p.id) || p.id === SELF_ID) return;
          map[p.id] = {
            id: p.id,
            title: str(p.title, 40) || p.id,
            icon: safeIcon(p.largeIcon) || safeIcon(p.icon)
          };
        });
        installed = map;
        return map;
      });
  }

  // ---------- icons ----------

  var ICONS = {
    tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="12.5" rx="2"/><path d="M8 21h8M12 17.5V21"/></svg>',
    hdmi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5h18v4l-2.5 3h-13L3 12.5z"/><path d="M7.5 11.5h9"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/></svg>',
    rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 15z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 15z"/><path d="M8.5 19h.01M12 20.5h.01M15.5 19h.01"/></svg>',
    storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 15z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/></svg>',
    fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 9h16M3 13h18M5 17h14"/></svg>'
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function svgNode(name) {
    var wrap = document.createElement("span");
    wrap.innerHTML = ICONS[name]; // static strings only, never user data
    return wrap.firstChild;
  }

  // ---------- rendering ----------

  function makeTile(app) {
    var btn = el("button", "tile focusable");
    btn.type = "button";
    btn.setAttribute("aria-label", app.title);
    var card = el("span", "tile-card");
    var info = installed && installed[app.id];
    var icon = info && info.icon;

    // Order: icon shared by the TV (rooted / older firmware), bundled logo, typeset name.
    if (icon) {
      var img = document.createElement("img");
      img.alt = "";
      img.onerror = function () {
        card.removeChild(img);
        card.appendChild(fallbackFace(app));
      };
      img.src = icon;
      card.appendChild(img);
    } else {
      card.appendChild(fallbackFace(app));
    }

    btn.appendChild(card);
    btn.appendChild(el("span", "tile-label", app.title));
    btn._activate = function () { launch(app); };
    return btn;
  }

  function fallbackFace(app) {
    if (app.glyph) {
      var glyph = el("span", "tile-glyph");
      var url = 'url("icons/' + app.glyph + '.svg")';
      glyph.style.webkitMaskImage = url;
      glyph.style.maskImage = url;
      return glyph;
    }
    return el("span", "tile-name", app.title);
  }

  function makeChip(app, iconName) {
    var btn = el("button", "chip focusable");
    btn.type = "button";
    btn.appendChild(svgNode(iconName));
    btn.appendChild(el("span", "", app.title));
    btn._activate = function () { launch(app); };
    return btn;
  }

  function makePill(label, iconName, action) {
    var btn = el("button", "pill focusable");
    btn.type = "button";
    btn.appendChild(svgNode(iconName));
    var text = el("span", "", label);
    btn.appendChild(text);
    btn._activate = action;
    btn._label = text;
    return btn;
  }

  var themePill = null;

  function renderHome() {
    var keepFocus = document.activeElement;
    var keepIndex = -1;
    var all = focusables($("home"));
    if (keepFocus) keepIndex = all.indexOf(keepFocus);

    var appsRow = $("appsRow");
    var inputsRow = $("inputsRow");
    var dock = $("dock");
    appsRow.innerHTML = "";
    inputsRow.innerHTML = "";
    dock.innerHTML = "";

    CFG.apps.forEach(function (app) {
      var info = installed && installed[app.id];
      if (installed && !info) return; // hide apps this TV doesn't have
      appsRow.appendChild(makeTile(app));
    });
    CFG.inputs.forEach(function (input) {
      inputsRow.appendChild(makeChip(input, input.id.indexOf("hdmi") >= 0 ? "hdmi" : "tv"));
    });

    dock.appendChild(makePill("All apps", "grid", openAllApps));
    themePill = makePill("", "theme", cycleTheme);
    dock.appendChild(themePill);
    dock.appendChild(makePill("TV settings", "gear", openTvSettings));
    updateThemeLabel();

    var after = focusables($("home"));
    var target = after[keepIndex] || after[0];
    if (target && !overlayOpen) focusEl(target);
  }

  var overlayOpen = false;
  var lastHomeFocus = null;

  function openAllApps() {
    var grid = $("allAppsGrid");
    grid.innerHTML = "";
    var list;
    if (installed) {
      list = Object.keys(installed).map(function (k) { return installed[k]; });
      list.sort(function (a, b) { return a.title.localeCompare(b.title); });
    } else {
      list = CFG.apps.concat(CFG.inputs);
      grid.appendChild(el("p", "grid-note",
        Luna.available
          ? "This TV didn't share its app list, so you're seeing the apps from config.js."
          : "Preview mode: the full app list appears when this runs on the TV."));
    }
    list.forEach(function (app) { grid.appendChild(makeTile(app)); });

    lastHomeFocus = document.activeElement;
    overlayOpen = true;
    $("allApps").hidden = false;
    $("allAppsScroll").scrollTop = 0;
    var first = focusables($("allApps"))[0];
    if (first) focusEl(first);
  }

  function closeAllApps() {
    overlayOpen = false;
    $("allApps").hidden = true;
    if (lastHomeFocus && document.body.contains(lastHomeFocus)) focusEl(lastHomeFocus);
    else focusEl(focusables($("home"))[0]);
  }

  // ---------- focus + spatial navigation ----------

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(".focusable"));
  }

  function activeLayer() {
    return overlayOpen ? $("allApps") : $("home");
  }

  // .track and .overlay-scroll are position:relative, so offsetLeft/Top are relative to them.
  function keepVisible(node) {
    var scroller = node.offsetParent;
    if (!scroller || !scroller.classList ||
        !(scroller.classList.contains("track") || scroller.classList.contains("overlay-scroll"))) return;

    var margin = 120;
    if (scroller.scrollWidth > scroller.clientWidth) {
      var left = node.offsetLeft;
      var right = left + node.offsetWidth;
      if (right > scroller.scrollLeft + scroller.clientWidth - margin) {
        scroller.scrollLeft = right - scroller.clientWidth + margin;
      } else if (left < scroller.scrollLeft + margin) {
        scroller.scrollLeft = Math.max(0, left - margin);
      }
    }
    if (scroller.scrollHeight > scroller.clientHeight) {
      var top = node.offsetTop;
      var bottom = top + node.offsetHeight;
      if (bottom > scroller.scrollTop + scroller.clientHeight - 60) {
        scroller.scrollTop = bottom - scroller.clientHeight + 60;
      } else if (top < scroller.scrollTop + 20) {
        scroller.scrollTop = Math.max(0, top - 20);
      }
    }
  }

  function focusEl(node) {
    if (!node) return;
    try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); }
    keepVisible(node);
  }

  function rectOf(node) {
    var r = node.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 };
  }

  function move(dir) {
    var items = focusables(activeLayer());
    if (!items.length) return;
    var cur = document.activeElement;
    if (items.indexOf(cur) < 0) { focusEl(items[0]); return; }

    var a = rectOf(cur);
    var cands = [];
    items.forEach(function (node) {
      if (node === cur) return;
      var b = rectOf(node);
      var primary, secondary;
      var sameRow = b.t < a.b && b.b > a.t;
      if (dir === "left") { if (!sameRow || b.cx >= a.cx - 1) return; primary = a.l - b.r; secondary = Math.abs(b.cy - a.cy); }
      if (dir === "right") { if (!sameRow || b.cx <= a.cx + 1) return; primary = b.l - a.r; secondary = Math.abs(b.cy - a.cy); }
      if (dir === "up") { if (b.cy >= a.cy - 1) return; primary = a.t - b.b; secondary = Math.abs(b.cx - a.cx); }
      if (dir === "down") { if (b.cy <= a.cy + 1) return; primary = b.t - a.b; secondary = Math.abs(b.cx - a.cx); }
      cands.push({ node: node, p: Math.max(0, primary), s: secondary, x: b.l });
    });
    if (!cands.length) return;

    var nearest = Math.min.apply(null, cands.map(function (c) { return c.p; }));
    var band = cands.filter(function (c) { return c.p <= nearest + 40; });
    band.sort(function (x, y) { return x.s - y.s || x.p - y.p; });
    focusEl(band[0].node);
  }

  // ---------- clock ----------

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  var lastMinute = -1;
  function tickClock() {
    var now = new Date();
    var minuteKey = now.getHours() * 60 + now.getMinutes();
    if (minuteKey === lastMinute) return;
    lastMinute = minuteKey;

    var timeEl = $("time");
    var firstTick = timeEl.childNodes.length === 0;
    timeEl.innerHTML = "";
    if (!firstTick) {
      timeEl.classList.remove("is-ticking");
      void timeEl.offsetWidth; // restart the animation
      timeEl.classList.add("is-ticking");
    }
    var h = now.getHours();
    if (CFG.clock24h) {
      timeEl.appendChild(document.createTextNode(pad(h) + ":" + pad(now.getMinutes())));
    } else {
      var h12 = h % 12 || 12;
      timeEl.appendChild(document.createTextNode(h12 + ":" + pad(now.getMinutes())));
      timeEl.appendChild(el("span", "ampm", h < 12 ? "AM" : "PM"));
    }
    $("date").textContent = DAYS[now.getDay()] + ", " + MONTHS[now.getMonth()] + " " + now.getDate();

    if (currentTheme() === "auto") applyTheme();
  }

  // ---------- theme ----------

  function currentTheme() {
    var stored = load("hb-theme");
    return THEMES.indexOf(stored) >= 0 ? stored : CFG.theme;
  }

  function applyTheme() {
    var mode = currentTheme();
    var resolved = mode;
    if (mode === "auto") {
      var h = new Date().getHours();
      resolved = h >= 7 && h < 19 ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function updateThemeLabel() {
    if (!themePill) return;
    var mode = currentTheme();
    themePill._label.textContent = "Theme: " + mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function cycleTheme() {
    var next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
    save("hb-theme", next);
    applyTheme();
    updateThemeLabel();
  }

  // ---------- weather ----------

  function weatherInfo(code, isDay) {
    if (code === 0) return { text: "Clear", icon: isDay ? "sun" : "moon" };
    if (code <= 2) return { text: "Partly cloudy", icon: isDay ? "sun" : "moon" };
    if (code === 3) return { text: "Overcast", icon: "cloud" };
    if (code === 45 || code === 48) return { text: "Fog", icon: "fog" };
    if (code >= 51 && code <= 57) return { text: "Drizzle", icon: "rain" };
    if (code >= 61 && code <= 67) return { text: "Rain", icon: "rain" };
    if (code >= 71 && code <= 77) return { text: "Snow", icon: "snow" };
    if (code >= 80 && code <= 82) return { text: "Showers", icon: "rain" };
    if (code === 85 || code === 86) return { text: "Snow showers", icon: "snow" };
    if (code >= 95) return { text: "Thunderstorm", icon: "storm" };
    return { text: "", icon: "cloud" };
  }

  var weatherTimer = null;
  function loadWeather() {
    if (CFG.lat === null || CFG.lon === null || typeof window.fetch !== "function") return;
    clearTimeout(weatherTimer);

    var url = "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + encodeURIComponent(CFG.lat.toFixed(2)) +
      "&longitude=" + encodeURIComponent(CFG.lon.toFixed(2)) +
      "&current=temperature_2m,weather_code,is_day" +
      "&daily=temperature_2m_max,temperature_2m_min" +
      "&temperature_unit=" + CFG.units +
      "&timezone=auto&forecast_days=1";

    fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (res) {
        if (!res.ok) throw new Error("weather " + res.status);
        return res.json();
      })
      .then(function (data) {
        var cur = data && data.current;
        var daily = data && data.daily;
        var temp = cur && num(cur.temperature_2m, -100, 150);
        var code = cur && num(cur.weather_code, 0, 99);
        if (temp === null || code === null) throw new Error("weather shape");
        var hi = daily && Array.isArray(daily.temperature_2m_max) ? num(daily.temperature_2m_max[0], -100, 150) : null;
        var lo = daily && Array.isArray(daily.temperature_2m_min) ? num(daily.temperature_2m_min[0], -100, 150) : null;
        var info = weatherInfo(code, cur.is_day !== 0);

        var iconEl = $("weatherIcon");
        iconEl.innerHTML = "";
        iconEl.appendChild(svgNode(info.icon));
        $("weatherTemp").textContent = Math.round(temp) + "°";
        $("weatherText").textContent = info.text;
        var meta = [];
        if (hi !== null && lo !== null) meta.push("H " + Math.round(hi) + "°  L " + Math.round(lo) + "°");
        if (CFG.city) meta.push(CFG.city);
        $("weatherMeta").textContent = meta.join("  ·  ");
        $("weather").hidden = false;
        weatherTimer = setTimeout(loadWeather, 30 * 60000);
      })
      .catch(function () {
        weatherTimer = setTimeout(loadWeather, 5 * 60000);
      });
  }

  // ---------- wallpapers ----------

  var wallIndex = -1;
  var wallFront = $("wallA");
  var wallBack = $("wallB");

  var wallTimer = null;

  function scheduleWallpaper(ms) {
    clearTimeout(wallTimer);
    if (CFG.wallpapers.length > 1) wallTimer = setTimeout(nextWallpaper, ms);
  }

  function nextWallpaper() {
    if (!CFG.wallpapers.length) { stage.classList.add("no-wall"); return; }
    wallIndex = (wallIndex + 1) % CFG.wallpapers.length;
    var src = "wallpapers/" + encodeURIComponent(CFG.wallpapers[wallIndex]);
    var zoomClass = wallIndex % 2 ? "zoom-b" : "zoom-a";
    var img = new Image();
    img.onload = function () {
      wallBack.style.backgroundImage = 'url("' + src + '")';
      wallBack.classList.remove("zoom-a", "zoom-b", "is-visible");
      void wallBack.offsetWidth; // restart the zoom for this slide
      wallBack.classList.add(zoomClass, "is-visible");
      wallFront.classList.remove("is-visible");
      var t = wallFront; wallFront = wallBack; wallBack = t;
      stage.classList.remove("no-wall");
    };
    img.onerror = function () {
      if (wallFront.classList.contains("is-visible")) return;
      stage.classList.add("no-wall");
    };
    img.src = src;
    scheduleWallpaper(ambient ? CFG.slideMs : CFG.wallpaperMs);
  }

  // ---------- ambient mode ----------

  var ambient = false;
  var idleTimer = null;

  function resetIdle() {
    if (!CFG.ambientMs) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(enterAmbient, CFG.ambientMs);
  }
  function enterAmbient() {
    if (overlayOpen) closeAllApps();
    ambient = true;
    stage.classList.add("ambient");
    scheduleWallpaper(2500); // start the slideshow with a fresh photo
  }
  function exitAmbient() {
    ambient = false;
    stage.classList.remove("ambient");
    scheduleWallpaper(CFG.wallpaperMs);
    resetIdle();
  }

  // ---------- input ----------

  document.addEventListener("keydown", function (e) {
    var code = e.keyCode;
    resetIdle();

    if (ambient) {
      e.preventDefault();
      exitAmbient();
      return;
    }

    if (code === KEY.LEFT) { e.preventDefault(); move("left"); }
    else if (code === KEY.RIGHT) { e.preventDefault(); move("right"); }
    else if (code === KEY.UP) { e.preventDefault(); move("up"); }
    else if (code === KEY.DOWN) { e.preventDefault(); move("down"); }
    else if (code === KEY.ENTER) {
      e.preventDefault();
      var node = document.activeElement;
      if (node && typeof node._activate === "function") node._activate();
    } else if (code === KEY.BACK || code === KEY.ESC) {
      e.preventDefault();
      if (overlayOpen) closeAllApps();
    }
  });

  stage.addEventListener("mouseover", function (e) {
    var node = e.target;
    while (node && node !== stage && !(node.classList && node.classList.contains("focusable"))) node = node.parentNode;
    if (node && node !== stage && node !== document.activeElement) {
      try { node.focus({ preventScroll: true }); } catch (err) { node.focus(); }
    }
  });

  stage.addEventListener("click", function (e) {
    if (ambient) { exitAmbient(); return; }
    var node = e.target;
    while (node && node !== stage && typeof node._activate !== "function") node = node.parentNode;
    if (node && node !== stage) node._activate();
  });

  document.addEventListener("mousemove", function () {
    if (ambient) exitAmbient(); else resetIdle();
  });

  // Pressing Home -> launcher again while it's already running.
  document.addEventListener("webOSRelaunch", function () {
    if (overlayOpen) closeAllApps();
    if (ambient) exitAmbient();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { clearTimeout(idleTimer); return; }
    lastMinute = -1;
    tickClock();
    resetIdle();
    if (Luna.available) loadInstalled().then(renderHome, function () { /* keep current */ });
  });

  // ---------- scale the 1920x1080 stage to whatever screen we're on ----------

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = "translate(-50%, -50%) scale(" + s + ")";
  }
  window.addEventListener("resize", fit);

  // ---------- boot ----------

  fit();
  if (CFG.motion) {
    stage.classList.add("is-entering");
    // Drop the class once done: animation fill would otherwise pin transforms (breaks ambient mode).
    setTimeout(function () { stage.classList.remove("is-entering"); }, 1600);
  } else {
    stage.classList.add("still");
  }
  applyTheme();
  tickClock();
  setInterval(tickClock, 1000);
  renderHome();
  nextWallpaper();
  loadWeather();
  resetIdle();

  if (Luna.available) {
    loadInstalled().then(renderHome, function () { /* listLaunchPoints blocked: config icons stay */ });
  }
})();
